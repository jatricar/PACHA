import asyncio
import logging
import math
import time
from datetime import datetime, timedelta, timezone, date as date_cls
from typing import List, Dict, Any, Optional, Tuple

import httpx

logger = logging.getLogger("pacha.weather")

# Identify the app to MET Norway / NOAA per their API usage policies.
# (MET Norway requires a descriptive User-Agent; NWS requires one too.)
USER_AGENT = "PACHA-AbioticStressApp/1.0 (agronomic-advisory; contact: [email protected])"


def calculate_svp(temp_c: float) -> float:
    """Calculate Saturation Vapor Pressure in kPa given temperature in Celsius."""
    return 0.61078 * math.exp((17.27 * temp_c) / (temp_c + 237.3))


def calculate_vpd(temp_c: float, relative_humidity_pct: float) -> float:
    """Calculate Vapor Pressure Deficit in kPa."""
    svp = calculate_svp(temp_c)
    vp = svp * (relative_humidity_pct / 100.0)
    return max(0.0, svp - vp)


def calculate_hargreaves_pet(temp_max: float, temp_min: float, temp_avg: float, lat_deg: float) -> float:
    """Estimate Potential Evapotranspiration (mm/day) using the Hargreaves formula."""
    temp_range = max(0.1, temp_max - temp_min)
    ra = 15.0 - 0.1 * abs(lat_deg)
    pet = 0.0023 * (temp_avg + 17.8) * math.sqrt(temp_range) * ra * 0.408
    return max(0.5, round(pet, 2))


class WeatherAggregatorEngine:
    def __init__(self):
        self.timeout = 10.0
        self.gdd_series_timeout = 20.0  # wider date-range responses need more time
        self.era5_timeout = 45.0
        self.fetch_retry_attempts = 2
        self.fetch_retry_delay = 1.5
        # In-memory cache for the 30-year ERA5 climatology so we don't
        # re-download ~30 years of daily data on every single request.
        self._era5_cache: Dict[str, Dict[str, Any]] = {}
        self._era5_cache_ttl_seconds = 24 * 3600  # 24h
        # Cache for the "since planting" real daily series used for GDD
        # accumulation (keyed by lat/lon/planting_date/today).
        self._gdd_series_cache: Dict[str, Dict[str, Any]] = {}
        self._gdd_series_cache_ttl_seconds = 6 * 3600  # 6h

    async def _fetch_with_retries(self, coro_func, *args, **kwargs):
        """Calls coro_func with a couple of retries on transient failures
        (timeouts, connection resets, brief rate-limit blips), logging every
        failed attempt so the real cause is visible in server logs instead of
        being silently swallowed."""
        last_exc = None
        for attempt in range(1, self.fetch_retry_attempts + 1):
            try:
                return await coro_func(*args, **kwargs)
            except Exception as e:
                last_exc = e
                logger.warning(
                    "%s failed (attempt %d/%d): %s: %s",
                    getattr(coro_func, "__name__", str(coro_func)),
                    attempt, self.fetch_retry_attempts, type(e).__name__, e
                )
                if attempt < self.fetch_retry_attempts:
                    await asyncio.sleep(self.fetch_retry_delay)
        raise last_exc

    # ------------------------------------------------------------------
    # Source 1: Open-Meteo forecast (global coverage)
    # ------------------------------------------------------------------
    async def fetch_open_meteo_forecast(self, lat: float, lon: float) -> Dict[str, Dict[str, Any]]:
        return await self._fetch_open_meteo_daily(lat, lon, past_days=0, forecast_days=7)

    async def _fetch_open_meteo_daily(self, lat: float, lon: float, past_days: int = 0, forecast_days: int = 7, timeout: Optional[float] = None) -> Dict[str, Dict[str, Any]]:
        """Open-Meteo's forecast endpoint also serves recently-observed actuals
        via `past_days` (up to 92), which is real recorded weather, not a
        prediction - this is what lets us backfill GDD accumulation with real
        data for fields planted up to ~3 months ago."""
        url = (
            "https://api.open-meteo.com/v1/forecast"
            f"?latitude={lat}&longitude={lon}"
            "&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,"
            "relative_humidity_2m_mean,precipitation_sum"
            f"&past_days={past_days}&forecast_days={forecast_days}&timezone=auto"
        )
        async with httpx.AsyncClient(timeout=timeout or self.timeout) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        tmax = daily.get("temperature_2m_max", [])
        tmin = daily.get("temperature_2m_min", [])
        tavg = daily.get("temperature_2m_mean", [])
        rhavg = daily.get("relative_humidity_2m_mean", [])
        precip = daily.get("precipitation_sum", [])

        out: Dict[str, Dict[str, Any]] = {}
        for i, d in enumerate(dates):
            out[d] = {
                "temp_max": tmax[i] if i < len(tmax) and tmax[i] is not None else None,
                "temp_min": tmin[i] if i < len(tmin) and tmin[i] is not None else None,
                "temp_avg": tavg[i] if i < len(tavg) and tavg[i] is not None else None,
                "humidity_avg": rhavg[i] if i < len(rhavg) and rhavg[i] is not None else None,
                "precipitation": precip[i] if i < len(precip) and precip[i] is not None else 0.0,
            }
        # Drop days missing the essentials (temp_max/temp_min) rather than
        # silently feeding None into the ensemble math.
        return {d: v for d, v in out.items() if v["temp_max"] is not None and v["temp_min"] is not None}

    # ------------------------------------------------------------------
    # Source 2: MET Norway (Locationforecast 2.0) - global coverage
    # ------------------------------------------------------------------
    async def fetch_met_norway_forecast(self, lat: float, lon: float) -> Dict[str, Dict[str, Any]]:
        url = f"https://api.met.no/weatherapi/locationforecast/2.0/compact?lat={lat:.4f}&lon={lon:.4f}"
        headers = {"User-Agent": USER_AGENT}
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        timeseries = data.get("properties", {}).get("timeseries", [])
        buckets: Dict[str, Dict[str, Any]] = {}

        for entry in timeseries:
            ts = entry.get("time")
            if not ts:
                continue
            date_str = ts[:10]

            instant = entry.get("data", {}).get("instant", {}).get("details", {})
            temp = instant.get("air_temperature")
            rh = instant.get("relative_humidity")

            # Prefer the finer-grained next_1_hours precip block when available
            # (only present for the first ~48h); fall back to next_6_hours.
            next1 = entry.get("data", {}).get("next_1_hours", {}).get("details", {})
            next6 = entry.get("data", {}).get("next_6_hours", {}).get("details", {})
            precip = next1.get("precipitation_amount")
            if precip is None:
                precip = next6.get("precipitation_amount")

            b = buckets.setdefault(date_str, {"temps": [], "rhs": [], "precip": 0.0})
            if temp is not None:
                b["temps"].append(temp)
            if rh is not None:
                b["rhs"].append(rh)
            if precip is not None:
                b["precip"] += precip

        out: Dict[str, Dict[str, Any]] = {}
        for date_str, b in buckets.items():
            if not b["temps"]:
                continue
            out[date_str] = {
                "temp_max": max(b["temps"]),
                "temp_min": min(b["temps"]),
                "temp_avg": sum(b["temps"]) / len(b["temps"]),
                "humidity_avg": (sum(b["rhs"]) / len(b["rhs"])) if b["rhs"] else 65.0,
                "precipitation": round(b["precip"], 1),
            }
        return out

    # ------------------------------------------------------------------
    # Source 3: NOAA / National Weather Service (api.weather.gov) - USA only
    # ------------------------------------------------------------------
    async def fetch_nws_forecast(self, lat: float, lon: float) -> Dict[str, Dict[str, Any]]:
        headers = {"User-Agent": USER_AGENT, "Accept": "application/geo+json"}
        async with httpx.AsyncClient(timeout=self.timeout, headers=headers) as client:
            points_resp = await client.get(f"https://api.weather.gov/points/{lat:.4f},{lon:.4f}")
            points_resp.raise_for_status()
            props = points_resp.json().get("properties", {})

            forecast_url = props.get("forecast")
            grid_url = props.get("forecastGridData")
            if not forecast_url:
                # Outside NWS coverage (non-US location) - not an error, just N/A.
                raise ValueError("NWS: location outside U.S. coverage")

            forecast_resp = await client.get(forecast_url)
            forecast_resp.raise_for_status()
            periods = forecast_resp.json().get("properties", {}).get("periods", [])

            # Quantitative precipitation (mm) comes from the gridpoint endpoint,
            # not the human-readable forecast endpoint.
            precip_by_date: Dict[str, float] = {}
            if grid_url:
                try:
                    grid_resp = await client.get(grid_url)
                    if grid_resp.status_code == 200:
                        qp = grid_resp.json().get("properties", {}).get("quantitativePrecipitation", {})
                        for v in qp.get("values", []):
                            date_str = str(v.get("validTime", ""))[:10]
                            amount = v.get("value")
                            if date_str and amount:
                                precip_by_date[date_str] = precip_by_date.get(date_str, 0.0) + amount
                except Exception:
                    pass  # precip is a nice-to-have here; temp/RH still valid without it

        buckets: Dict[str, Dict[str, Any]] = {}
        for period in periods:
            start = period.get("startTime", "")
            date_str = start[:10]
            temp_f = period.get("temperature")
            rh = (period.get("relativeHumidity") or {}).get("value")
            if temp_f is None:
                continue
            temp_c = (temp_f - 32) * 5.0 / 9.0
            b = buckets.setdefault(date_str, {"temps": [], "rhs": []})
            b["temps"].append(temp_c)
            if rh is not None:
                b["rhs"].append(rh)

        out: Dict[str, Dict[str, Any]] = {}
        for date_str, b in buckets.items():
            if not b["temps"]:
                continue
            out[date_str] = {
                "temp_max": max(b["temps"]),
                "temp_min": min(b["temps"]),
                "temp_avg": sum(b["temps"]) / len(b["temps"]),
                "humidity_avg": (sum(b["rhs"]) / len(b["rhs"])) if b["rhs"] else 65.0,
                "precipitation": round(precip_by_date.get(date_str, 0.0), 1),
            }
        return out

    # ------------------------------------------------------------------
    # Synthetic fallback (only used if ALL live sources fail)
    # ------------------------------------------------------------------
    def generate_synthetic_3source_ensemble(self, lat: float, lon: float, base_date: datetime = None) -> List[Dict[str, Any]]:
        """Physics-consistent seasonal-cycle estimate, used ONLY when every live
        weather API is unreachable. Every day this produces is tagged with
        data_source='synthetic_fallback' so callers/UI can flag it clearly."""
        if base_date is None:
            base_date = datetime.now(timezone.utc)

        forecasts = []
        for d in range(7):
            curr = base_date + timedelta(days=d)
            date_str = curr.strftime("%Y-%m-%d")
            day_of_year = curr.timetuple().tm_yday
            seasonal_temp = 22.0 + 8.0 * math.sin(2 * math.pi * (day_of_year - 80) / 365) * (1 if lat >= 0 else -1)

            s_a_max = seasonal_temp + 4.5 + (math.sin(d * 1.2) * 2.0)
            s_a_min = seasonal_temp - 4.5 + (math.cos(d * 0.9) * 1.5)
            s_a_rh = 60.0 + (math.sin(d) * 15.0)
            s_a_pr = max(0.0, (math.sin(d * 2.1) - 0.4) * 12.0)

            s_b_max = seasonal_temp + 5.0 + (math.sin(d * 1.1) * 1.8)
            s_b_min = seasonal_temp - 4.0 + (math.cos(d * 0.85) * 1.7)
            s_b_rh = 63.0 + (math.sin(d + 0.3) * 14.0)
            s_b_pr = max(0.0, (math.sin(d * 2.0) - 0.35) * 10.0)

            s_c_max = seasonal_temp + 4.0 + (math.sin(d * 1.3) * 2.2)
            s_c_min = seasonal_temp - 5.0 + (math.cos(d * 0.95) * 1.3)
            s_c_rh = 58.0 + (math.sin(d - 0.2) * 16.0)
            s_c_pr = max(0.0, (math.sin(d * 2.2) - 0.45) * 14.0)

            avg_max = round((s_a_max + s_b_max + s_c_max) / 3.0, 1)
            avg_min = round((s_a_min + s_b_min + s_c_min) / 3.0, 1)
            avg_temp = round((avg_max + avg_min) / 2.0, 1)
            avg_rh = round(max(20.0, min(95.0, (s_a_rh + s_b_rh + s_c_rh) / 3.0)), 1)
            avg_pr = round((s_a_pr + s_b_pr + s_c_pr) / 3.0, 1)

            vpd_max = round(calculate_vpd(avg_max, avg_rh * 0.8), 2)
            vpd_avg = round(calculate_vpd(avg_temp, avg_rh), 2)
            pet = calculate_hargreaves_pet(avg_max, avg_min, avg_temp, lat)

            forecasts.append({
                "date": date_str,
                "temp_max": avg_max,
                "temp_min": avg_min,
                "temp_avg": avg_temp,
                "humidity_avg": avg_rh,
                "vpd_max": vpd_max,
                "vpd_avg": vpd_avg,
                "precipitation": avg_pr,
                "pet": pet,
                "sources_averaged": 0,
                "sources_used": [],
                "is_forecast": True,
                "data_source": "synthetic_fallback",
            })
        return forecasts

    # ------------------------------------------------------------------
    # Public: real 3-source ensemble with automatic fallback
    # ------------------------------------------------------------------
    async def _safe_fetch(self, coro_func, lat: float, lon: float, name: str) -> Tuple[str, Optional[Dict[str, Dict[str, Any]]]]:
        try:
            data = await coro_func(lat, lon)
            return (name, data if data else None)
        except Exception as e:
            logger.warning("Weather source '%s' failed for (%s, %s): %s: %s", name, lat, lon, type(e).__name__, e)
            return (name, None)

    async def get_7day_ensemble_forecast(self, lat: float, lon: float) -> List[Dict[str, Any]]:
        """Averages Open-Meteo + MET Norway + NOAA/NWS for the next 7 days.
        Falls back to a synthetic estimate only if ALL three live sources fail
        (or return too little usable data). NWS only covers U.S. coordinates,
        so outside the U.S. the ensemble is a real 2-source average, which is
        expected and reflected in sources_used/data_source per day."""
        results = await asyncio.gather(
            self._safe_fetch(self.fetch_open_meteo_forecast, lat, lon, "open_meteo"),
            self._safe_fetch(self.fetch_met_norway_forecast, lat, lon, "met_norway"),
            self._safe_fetch(self.fetch_nws_forecast, lat, lon, "nws"),
        )
        sources = {name: data for name, data in results if data}

        target_dates = []
        today = datetime.now(timezone.utc).date()
        for i in range(7):
            target_dates.append((today + timedelta(days=i)).strftime("%Y-%m-%d"))

        ensemble = []
        for date_str in target_dates:
            day_values = []
            used = []
            for name, data in sources.items():
                if date_str in data:
                    day_values.append(data[date_str])
                    used.append(name)
            if not day_values:
                continue

            tmax = sum(v["temp_max"] for v in day_values) / len(day_values)
            tmin = sum(v["temp_min"] for v in day_values) / len(day_values)
            tavg = sum(v.get("temp_avg", (v["temp_max"] + v["temp_min"]) / 2.0) for v in day_values) / len(day_values)
            rh = sum(v["humidity_avg"] for v in day_values) / len(day_values)
            pr = sum(v["precipitation"] for v in day_values) / len(day_values)

            vpd_max = round(calculate_vpd(tmax, rh * 0.8), 2)
            vpd_avg = round(calculate_vpd(tavg, rh), 2)
            pet = calculate_hargreaves_pet(tmax, tmin, tavg, lat)

            ensemble.append({
                "date": date_str,
                "temp_max": round(tmax, 1),
                "temp_min": round(tmin, 1),
                "temp_avg": round(tavg, 1),
                "humidity_avg": round(rh, 1),
                "vpd_max": vpd_max,
                "vpd_avg": vpd_avg,
                "precipitation": round(pr, 1),
                "pet": pet,
                "sources_averaged": len(used),
                "sources_used": used,
                "is_forecast": True,
                "data_source": "live" if len(used) >= 2 else "partial_live",
            })

        # If we recovered fewer than 5 of the 7 days from live sources, the
        # forecast is too patchy to trust - use the synthetic estimate instead
        # (and say so explicitly).
        if len(ensemble) < 5:
            return self.generate_synthetic_3source_ensemble(lat, lon)

        return ensemble

    # ------------------------------------------------------------------
    # Historical baseline - real ERA5 climatology via Open-Meteo's archive API
    # ------------------------------------------------------------------
    async def get_historical_baseline(self, lat: float, lon: float, years: int = 30) -> Dict[str, Any]:
        cache_key = f"{round(lat, 2)}_{round(lon, 2)}_{years}"
        cached = self._era5_cache.get(cache_key)
        if cached and (time.time() - cached["fetched_at"]) < self._era5_cache_ttl_seconds:
            return cached["data"]

        try:
            monthly = await self._fetch_with_retries(self._fetch_era5_monthly_climatology, lat, lon, years)
            monthly["_meta"] = {"data_source": "era5_archive", "years_used": years}
            self._era5_cache[cache_key] = {"data": monthly, "fetched_at": time.time()}
            return monthly
        except Exception as e:
            logger.error(
                "get_historical_baseline: ERA5 climatology fetch failed after retries for (%s, %s): %s: %s",
                lat, lon, type(e).__name__, e
            )
            fallback = self._generate_synthetic_historical_baseline(lat, lon)
            fallback["_meta"] = {"data_source": "synthetic_fallback", "years_used": 0}
            # Cache the fallback too (briefly counted via same TTL) so a slow/down
            # endpoint doesn't add 30s of latency to every single request.
            self._era5_cache[cache_key] = {"data": fallback, "fetched_at": time.time()}
            return fallback

    # ------------------------------------------------------------------
    # Real daily series since planting date, for GDD accumulation.
    # Combines: ERA5 archive (for anything older than ~92 days) + Open-Meteo
    # forecast API's `past_days` (real recorded actuals for the last ~92 days,
    # available with ~1 day of lag) + the live 7-day forecast.
    # Returns None only if every source failed - caller then falls back to
    # the latitude-aware synthetic estimate in phenology_gdd.py.
    # ------------------------------------------------------------------
    async def get_gdd_weather_series(self, lat: float, lon: float, planting_date: date_cls) -> Optional[Dict[str, Dict[str, Any]]]:
        today = datetime.now(timezone.utc).date()
        cache_key = f"{round(lat, 3)}_{round(lon, 3)}_{planting_date.isoformat()}_{today.isoformat()}"
        cached = self._gdd_series_cache.get(cache_key)
        if cached and (time.time() - cached["fetched_at"]) < self._gdd_series_cache_ttl_seconds:
            return cached["data"]

        if planting_date > today:
            # Future planting date - nothing to backfill yet.
            return None

        days_since_planting = (today - planting_date).days
        combined: Dict[str, Dict[str, Any]] = {}

        # Open-Meteo's forecast endpoint can only look back 92 days for real
        # recorded actuals. Anything older has to come from the ERA5 archive.
        recent_past_days = min(days_since_planting, 92)

        try:
            recent = await self._fetch_with_retries(
                self._fetch_open_meteo_daily, lat, lon,
                past_days=recent_past_days, forecast_days=7, timeout=self.gdd_series_timeout
            )
            combined.update(recent)
        except Exception as e:
            logger.error(
                "get_gdd_weather_series: Open-Meteo past_days fetch failed after retries for (%s, %s), past_days=%d: %s: %s",
                lat, lon, recent_past_days, type(e).__name__, e
            )

        if days_since_planting > 92:
            archive_end = planting_date + timedelta(days=(days_since_planting - 92 - 1))
            try:
                older = await self._fetch_with_retries(
                    self._fetch_era5_raw_daily, lat, lon, planting_date, archive_end
                )
                # Recent (higher-quality, more current) data wins on overlap.
                combined = {**older, **combined}
            except Exception as e:
                logger.error(
                    "get_gdd_weather_series: ERA5 archive fetch failed after retries for (%s, %s), %s..%s: %s: %s",
                    lat, lon, planting_date, archive_end, type(e).__name__, e
                )

        if not combined:
            logger.error(
                "get_gdd_weather_series: ALL sources failed for (%s, %s), planting_date=%s - falling back to seasonal estimate",
                lat, lon, planting_date
            )
            self._gdd_series_cache[cache_key] = {"data": None, "fetched_at": time.time()}
            return None

        self._gdd_series_cache[cache_key] = {"data": combined, "fetched_at": time.time()}
        return combined

    async def get_multi_year_daily_series(self, lat: float, lon: float, years_back: int = 20) -> Dict[str, Dict[str, Any]]:
        """Raw daily ERA5 records (date -> temp_max/temp_min/temp_avg/humidity_avg/
        precipitation) for a long continuous historical window, e.g. for
        simulating a crop's development against many individual past years'
        real weather rather than a single climatological average. One HTTP
        call covers the whole window; callers slice it per simulated year.
        Cached like get_historical_baseline, since a report covering many
        stations would otherwise re-fetch decades of data on every retry."""
        cache_key = f"multiyear_{round(lat, 2)}_{round(lon, 2)}_{years_back}"
        cached = self._era5_cache.get(cache_key)
        if cached and (time.time() - cached["fetched_at"]) < self._era5_cache_ttl_seconds:
            return cached["data"]

        end_date = datetime.now(timezone.utc).date() - timedelta(days=7)
        try:
            start_date = end_date.replace(year=end_date.year - years_back)
        except ValueError:
            start_date = end_date.replace(month=2, day=28, year=end_date.year - years_back)

        daily_series = await self._fetch_with_retries(self._fetch_era5_raw_daily, lat, lon, start_date, end_date)
        self._era5_cache[cache_key] = {"data": daily_series, "fetched_at": time.time()}
        return daily_series

    async def _fetch_era5_monthly_climatology(self, lat: float, lon: float, years: int) -> Dict[str, Any]:
        # ERA5 reanalysis via Open-Meteo's archive API typically lags ~5-7 days
        # behind real time, so end a week back to guarantee availability.
        end_date = datetime.now(timezone.utc).date() - timedelta(days=7)
        try:
            start_date = end_date.replace(year=end_date.year - years)
        except ValueError:
            # Feb 29 edge case
            start_date = end_date.replace(month=2, day=28, year=end_date.year - years)

        daily_series = await self._fetch_era5_raw_daily(lat, lon, start_date, end_date)
        if not daily_series:
            raise ValueError("ERA5 archive returned no data for these coordinates")

        buckets = {m: {"tmax": [], "tmin": [], "rh": [], "precip_by_year": {}} for m in range(1, 13)}
        for d, v in daily_series.items():
            year = int(d[0:4])
            month = int(d[5:7])
            b = buckets[month]
            if v.get("temp_max") is not None:
                b["tmax"].append(v["temp_max"])
            if v.get("temp_min") is not None:
                b["tmin"].append(v["temp_min"])
            if v.get("humidity_avg") is not None:
                b["rh"].append(v["humidity_avg"])
            if v.get("precipitation") is not None:
                b["precip_by_year"][year] = b["precip_by_year"].get(year, 0.0) + v["precipitation"]

        monthly_hist: Dict[str, Any] = {}
        for month in range(1, 13):
            b = buckets[month]
            if not b["tmax"] or not b["tmin"]:
                raise ValueError(f"Insufficient ERA5 data for month {month}")
            hist_max = sum(b["tmax"]) / len(b["tmax"])
            hist_min = sum(b["tmin"]) / len(b["tmin"])
            hist_avg = (hist_max + hist_min) / 2.0
            hist_rh = (sum(b["rh"]) / len(b["rh"])) if b["rh"] else 65.0
            hist_pr_total = (
                sum(b["precip_by_year"].values()) / len(b["precip_by_year"])
                if b["precip_by_year"] else 0.0
            )
            hist_vpd = calculate_vpd(hist_avg, hist_rh)

            monthly_hist[str(month)] = {
                "month": month,
                "hist_temp_max": round(hist_max, 1),
                "hist_temp_min": round(hist_min, 1),
                "hist_precipitation": round(hist_pr_total, 1),
                "hist_vpd_avg": round(hist_vpd, 2),
            }
        return monthly_hist

    async def _fetch_era5_raw_daily(self, lat: float, lon: float, start_date: date_cls, end_date: date_cls) -> Dict[str, Dict[str, Any]]:
        """Raw per-day ERA5 records (date -> temp_max/temp_min/humidity_avg/precipitation)
        for an arbitrary date range. Used both for the 30-year climatology
        (aggregated by month) and for real GDD backfill on older plantings."""
        if start_date > end_date:
            return {}
        url = (
            "https://archive-api.open-meteo.com/v1/archive"
            f"?latitude={lat}&longitude={lon}"
            f"&start_date={start_date.isoformat()}&end_date={end_date.isoformat()}"
            "&daily=temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,relative_humidity_2m_mean"
            "&timezone=auto"
        )
        async with httpx.AsyncClient(timeout=self.era5_timeout) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()

        daily = data.get("daily", {})
        dates = daily.get("time", [])
        tmax = daily.get("temperature_2m_max", [])
        tmin = daily.get("temperature_2m_min", [])
        tavg = daily.get("temperature_2m_mean", [])
        precip = daily.get("precipitation_sum", [])
        rh = daily.get("relative_humidity_2m_mean", [])

        out: Dict[str, Dict[str, Any]] = {}
        for i, d in enumerate(dates):
            out[d] = {
                "temp_max": tmax[i] if i < len(tmax) and tmax[i] is not None else None,
                "temp_min": tmin[i] if i < len(tmin) and tmin[i] is not None else None,
                "temp_avg": tavg[i] if i < len(tavg) and tavg[i] is not None else None,
                "humidity_avg": rh[i] if i < len(rh) and rh[i] is not None else None,
                "precipitation": precip[i] if i < len(precip) and precip[i] is not None else 0.0,
            }
        return {d: v for d, v in out.items() if v["temp_max"] is not None and v["temp_min"] is not None}

    def _generate_synthetic_historical_baseline(self, lat: float, lon: float) -> Dict[str, Any]:
        """Latitude-based climatological estimate, used ONLY if the ERA5 archive
        call fails (network down, coordinates unreachable, timeout, etc.)."""
        monthly_hist: Dict[str, Any] = {}
        for month in range(1, 13):
            lat_rad = math.radians(lat)
            temp_amplitude = 12.0 * abs(math.sin(lat_rad))
            base_temp = 24.0 - 0.3 * abs(lat)
            month_angle = 2 * math.pi * (month - 1) / 12

            hist_max = base_temp + temp_amplitude * math.cos(month_angle - 0.5) + 4.0
            hist_min = base_temp + temp_amplitude * math.cos(month_angle - 0.5) - 5.0
            hist_avg = (hist_max + hist_min) / 2.0
            hist_rh = 65.0 + 10.0 * math.sin(month_angle)
            hist_pr = max(10.0, 70.0 + 50.0 * math.sin(month_angle + 1.0))
            hist_vpd = calculate_vpd(hist_avg, hist_rh)

            monthly_hist[str(month)] = {
                "month": month,
                "hist_temp_max": round(hist_max, 1),
                "hist_temp_min": round(hist_min, 1),
                "hist_precipitation": round(hist_pr, 1),
                "hist_vpd_avg": round(hist_vpd, 2),
            }
        return monthly_hist


weather_engine = WeatherAggregatorEngine()
