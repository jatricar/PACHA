import React, { useState, useCallback, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { Search, Loader2 } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import "leaflet/dist/leaflet.css";

// Leaflet's default marker icon references image files by a relative path
// that Vite's bundler doesn't resolve automatically, which silently shows a
// broken-image icon instead of a pin. Rebuilding the icon from the same
// package's CDN-hosted images sidesteps that without adding a bundler step.
const pinIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/** Reports clicks anywhere on the map as a new pin position. */
function ClickHandler({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
}

/** Smoothly recenters the map - but only when triggered externally (GPS
 * button, search result, typing coordinates by hand), not on every click or
 * drag, which would otherwise yank the view right after the user places
 * the pin where they wanted it. */
function FlyToLocation({ lat, lon, flyKey }) {
  const map = useMap();
  useEffect(() => {
    if (flyKey === 0) return;
    // Zoom in close enough to tell neighboring fields apart (roughly
    // parcel-level, not just which town) - a plain city-level zoom after a
    // search or GPS fix isn't enough to pick the right field on satellite imagery.
    map.flyTo([lat, lon], Math.max(map.getZoom(), 14), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flyKey]);
  return null;
}

/**
 * Interactive location picker: search by place name, click or drag the pin
 * to set coordinates. `latitude`/`longitude` are the controlled position;
 * `onChange(lat, lon)` fires on every pin move (click, drag, search, or the
 * parent form passing in new values e.g. from the GPS button).
 */
export function LocationMapPicker({ latitude, longitude, onChange }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [flyKey, setFlyKey] = useState(0);
  const lastEmitted = useRef({ lat: latitude, lon: longitude });

  useEffect(() => {
    const same =
      Math.abs(latitude - lastEmitted.current.lat) < 1e-6 &&
      Math.abs(longitude - lastEmitted.current.lon) < 1e-6;
    if (!same) {
      lastEmitted.current = { lat: latitude, lon: longitude };
      setFlyKey(k => k + 1);
    }
  }, [latitude, longitude]);

  const handlePick = useCallback((lat, lon) => {
    const rounded = { lat: parseFloat(lat.toFixed(4)), lon: parseFloat(lon.toFixed(4)) };
    lastEmitted.current = rounded;
    onChange(rounded.lat, rounded.lon);
  }, [onChange]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearchError(false);
    try {
      // Nominatim: OpenStreetMap's free geocoding API, no key required.
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      );
      const results = await res.json();
      if (results && results.length > 0) {
        handlePick(parseFloat(results[0].lat), parseFloat(results[0].lon));
      } else {
        setSearchError(true);
      }
    } catch {
      setSearchError(true);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.6rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search
            size={14}
            style={{ position: "absolute", left: "0.7rem", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", pointerEvents: "none" }}
          />
          <input
            className="input-glass"
            style={{ paddingLeft: "2.1rem" }}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSearchError(false); }}
            placeholder={t("fieldModal.mapSearchPlaceholder")}
          />
        </div>
        <button type="submit" className="btn-outline" style={{ padding: "0 1rem" }} disabled={searching}>
          {searching ? <Loader2 size={16} className="animate-spin" /> : t("fieldModal.mapSearchButton")}
        </button>
      </form>

      {searchError && (
        <p style={{ fontSize: "0.75rem", color: "var(--accent-amber)", margin: "-0.2rem 0 0.6rem" }}>
          {t("fieldModal.mapSearchNotFound")}
        </p>
      )}

      <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid var(--border-glass)" }}>
        <MapContainer
          center={[latitude, longitude]}
          zoom={5}
          style={{ height: "280px", width: "100%", background: "var(--bg-dark)" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          {/* Roads, towns and field boundaries drawn on top of the satellite
              photo - without this the imagery alone gives no reference points
              to tell neighboring fields apart, same as plain aerial photos. */}
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
          <Marker
            position={[latitude, longitude]}
            icon={pinIcon}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                handlePick(pos.lat, pos.lng);
              }
            }}
          />
          <ClickHandler onPick={handlePick} />
          <FlyToLocation lat={latitude} lon={longitude} flyKey={flyKey} />
        </MapContainer>
      </div>

      <p style={{ fontSize: "0.72rem", color: "var(--text-subtle)", margin: "0.4rem 0 0" }}>
        {t("fieldModal.mapHint")}
      </p>
    </div>
  );
}
