// PACHA i18n dictionary.
// Add a new language by adding a new top-level key here (e.g. "pt")
// and adding it to LanguageContext's supported list.

export const translations = {
  es: {
    app: {
      loading: "Consultando el ensemble de 3 fuentes climáticas, el histórico ERA5 y el modelo de fenología...",
      connectionError: "No se pudo conectar con el servidor de PACHA. Intentá de nuevo en unos segundos.",
      weatherFallbackBoth: "El pronóstico y el histórico climático no se pudieron obtener en vivo (sin conexión a Open-Meteo / MET Norway / NWS / ERA5). Se muestra una estimación sintética basada en latitud — no es clima real.",
      weatherFallbackForecast: "El pronóstico de 7 días no se pudo obtener en vivo. Se muestra una estimación sintética basada en latitud — no es clima real.",
      weatherFallbackHistorical: "El histórico climático (ERA5) no se pudo obtener en vivo. Se muestra una estimación sintética basada en latitud — no es clima histórico real.",
      weatherPartialLive: "Pronóstico en vivo, pero solo 1 de las 3 fuentes meteorológicas respondió para esta ubicación (normal fuera de EE.UU., donde NWS no cubre)."
    },
    navbar: {
      subtitle: "Predicción de estrés abiótico y recomendaciones anti-estrés para los 10 cultivos más cultivados del mundo",
      recalculate: "Recalcular",
      recalculateTitle: "Recalcular ensemble de 3 fuentes y fenología",
      newField: "Nuevo Lote"
    },
    fieldModal: {
      title: "Agregar Lote y Cultivo",
      subtitle: "Cargá coordenadas por GPS, mapa, o en lote por CSV",
      tabSingle: "Carga Individual",
      tabBatch: "Carga Masiva (CSV)",
      fieldName: "Nombre del Lote",
      locationLabel: "Ubicación",
      mapSearchPlaceholder: "Buscar lugar, ciudad o dirección...",
      mapSearchButton: "Buscar",
      mapSearchNotFound: "No se encontró ese lugar. Probá con otro nombre o marcá directamente en el mapa.",
      mapHint: "Hacé clic en el mapa o arrastrá el pin para ajustar la ubicación exacta.",
      latitude: "Latitud",
      longitude: "Longitud",
      gpsLocating: "Ubicando...",
      gpsButton: "GPS",
      gpsTitle: "Detectar ubicación GPS del dispositivo",
      gpsError: "No se pudo obtener la ubicación GPS. Ingresala manualmente.",
      gpsUnsupported: "Tu navegador no soporta geolocalización.",
      cropSpecies: "Especie (10 cultivos principales)",
      variety: "Variedad / Híbrido",
      varietyPlaceholder: "ej. Pioneer 1197",
      maturityClass: "Clase de Madurez",
      maturityEarly: "Precoz (85% GDD)",
      maturityMedium: "Media (100% GDD)",
      maturityLate: "Tardía (115% GDD)",
      plantingDate: "Fecha de Siembra",
      submitButton: "Guardar y Analizar Lote",
      batchLabel: "Pegá contenido CSV (Formato: nombre, latitud, longitud, cultivo, fecha_siembra, variedad, madurez)",
      batchPlaceholder: "Lote Norte, 41.8781, -87.6298, maize, 2026-05-10, Pioneer 1197, medium\nLote Sur, -12.5500, -55.7200, soybean, 2026-10-15, M7739, early",
      batchInvalid: "Formato de CSV inválido. Asegurate de incluir: nombre,latitud,longitud,cultivo,fecha_siembra",
      batchSubmit: "Cargar Lotes en Lote"
    },
    crops: {
      maize: "Maíz",
      sugarcane: "Caña de Azúcar",
      wheat: "Trigo",
      rice: "Arroz",
      potato: "Papa",
      sugar_beet: "Remolacha Azucarera",
      soybean: "Soja",
      cassava: "Mandioca",
      oil_palm: "Palma Aceitera",
      barley: "Cebada"
    },
    phenology: {
      sectionTitle: "Motor de Fenología y Tiempo Térmico",
      variety: "Variedad",
      planted: "Sembrado",
      daysAgo: "hace {n} días",
      harvestDate: "Fecha Estimada de Cosecha",
      harvestUncertain: "No determinada aún",
      accumulatedGdd: "GDD ACUMULADO",
      realWeatherPct: "{pct}% clima real desde siembra",
      maturityGddReq: "GDD REQ. MADUREZ",
      currentStage: "ETAPA ACTUAL",
      seasonProgress: "Progreso de la Temporada del Cultivo",
      completed: "Completado",
      phaseGermination: "Germinación",
      phaseGrowth: "Crecimiento",
      phaseFlowering: "Floración",
      phaseFilling: "Llenado",
      phaseRipening: "Maduración"
    },
    stress: {
      sectionTitle: "Motor de Diagnóstico en Tiempo Real",
      matrixTitle: "Matriz de Riesgo de Estrés Abiótico"
    },
    weather: {
      sectionTitle: "Inteligencia Meteorológica",
      chartsTitle: "Pronóstico Ensemble de 7 Días vs. Clima Histórico de 30 Años",
      sourcesNote: "Promediado de 3 fuentes meteorológicas (Open-Meteo, MET Norway, NOAA)",
      tempChartTitle: "Temperatura (°C): Pronóstico vs. Línea Base de 30 Años",
      waterChartTitle: "Balance Hídrico (Precip. vs PET) y VPD (kPa)",
      legendFcstMax: "Pronóst. Temp. Máx",
      legendFcstMin: "Pronóst. Temp. Mín",
      legendHistMax: "Máx. Histórica (30a)",
      legendPrecip: "Precip. (mm)",
      legendPet: "Demanda PET (mm)",
      legendVpd: "VPD Máx. (kPa)"
    },
    recommendations: {
      sectionTitle: "Plan de Acción Agronómico Anti-Estrés",
      title: "Recomendación de Productos Anti-Estrés con Base Científica",
      subtitle: "Bioestimulantes y mitigantes nutricionales según etapa fenológica y severidad del estrés",
      printButton: "Imprimir Informe",
      dosage: "Dosis",
      activeIngredients: "INGREDIENTES ACTIVOS",
      applicationWindow: "VENTANA DE APLICACIÓN",
      rationale: "FUNDAMENTO CIENTÍFICO Y MODO DE ACCIÓN BIOLÓGICO:"
    },
    savedFields: {
      label: "Lotes Guardados ({n}):",
      deleteTitle: "Eliminar lote guardado",
      usage: "{used}/{limit} lotes usados ({tier})",
      usageLimitReached: "Alcanzaste el límite de tu plan. Contactá al administrador para ampliarlo."
    },
    auth: {
      appTagline: "Predicción científica de estrés abiótico para tus cultivos",
      signInWithGoogle: "Ingresar con Google",
      signingIn: "Conectando...",
      signOut: "Cerrar sesión",
      loginError: "No se pudo iniciar sesión: {error}",
      adminPanel: "Panel de Admin"
    },
    admin: {
      title: "Panel de Administrador",
      backToApp: "Volver a la app",
      usersTab: "Usuarios",
      usageTab: "Uso de la App",
      colEmail: "Email",
      colSignedUp: "Registrado",
      colLastSignIn: "Última conexión",
      colFields: "Lotes",
      colTier: "Plan",
      makeFree: "Pasar a Free",
      makePremium: "Pasar a Premium",
      totalUsers: "Usuarios Totales",
      totalFields: "Lotes Totales",
      totalEvents: "Eventos Registrados",
      eventsByType: "Eventos por Tipo",
      topCrops: "Cultivos Más Consultados",
      noAuthNote: "Nota: la tabla auth.users no está disponible en este entorno (normal en desarrollo local con SQLite)."
    }
  },

  en: {
    app: {
      loading: "Querying 3-Source Forecast Ensemble, ERA5 Historical Climate, and GDD Phenology...",
      connectionError: "Could not connect to the PACHA backend. Please try again in a few seconds.",
      weatherFallbackBoth: "The forecast and historical climate could not be fetched live (no connection to Open-Meteo / MET Norway / NWS / ERA5). Showing a latitude-based synthetic estimate — not real weather.",
      weatherFallbackForecast: "The 7-day forecast could not be fetched live. Showing a latitude-based synthetic estimate — not real weather.",
      weatherFallbackHistorical: "The historical climate (ERA5) could not be fetched live. Showing a latitude-based synthetic estimate — not real historical climate.",
      weatherPartialLive: "Live forecast, but only 1 of 3 weather sources responded for this location (normal outside the U.S., where NWS doesn't cover)."
    },
    navbar: {
      subtitle: "Abiotic stress prediction and anti-stress recommendations for the top 10 world crops",
      recalculate: "Recalculate",
      recalculateTitle: "Recalculate 3-source ensemble & phenology",
      newField: "New Field"
    },
    fieldModal: {
      title: "Add Field Location & Crop",
      subtitle: "Upload coordinates via GPS, map, or batch CSV",
      tabSingle: "Single Field Entry",
      tabBatch: "CSV Batch Upload",
      fieldName: "Field Name / Identifier",
      locationLabel: "Location",
      mapSearchPlaceholder: "Search for a place, city, or address...",
      mapSearchButton: "Search",
      mapSearchNotFound: "That place couldn't be found. Try a different name, or pin the location directly on the map.",
      mapHint: "Click anywhere on the map or drag the pin to fine-tune the exact location.",
      latitude: "Latitude",
      longitude: "Longitude",
      gpsLocating: "Locating...",
      gpsButton: "GPS",
      gpsTitle: "Detect device GPS location",
      gpsError: "Unable to retrieve GPS location. Please enter manually.",
      gpsUnsupported: "Geolocation is not supported by your browser.",
      cropSpecies: "Plant Species (Top 10 Global Crops)",
      variety: "Variety / Hybrid Name",
      varietyPlaceholder: "e.g. Pioneer 1197",
      maturityClass: "Maturity Class",
      maturityEarly: "Early Maturity (85% GDD)",
      maturityMedium: "Medium Maturity (100% GDD)",
      maturityLate: "Late Maturity (115% GDD)",
      plantingDate: "Planting Date",
      submitButton: "Save & Analyze Crop Field",
      batchLabel: "Paste CSV content (Format: name, latitude, longitude, crop_id, planting_date, variety, maturity)",
      batchPlaceholder: "Field North, 41.8781, -87.6298, maize, 2026-05-10, Pioneer 1197, medium\nField South, -12.5500, -55.7200, soybean, 2026-10-15, M7739, early",
      batchInvalid: "Invalid CSV format. Please ensure it includes: name,latitude,longitude,crop_id,planting_date",
      batchSubmit: "Batch Upload Fields"
    },
    crops: {
      maize: "Maize (Corn)",
      sugarcane: "Sugarcane",
      wheat: "Wheat",
      rice: "Rice",
      potato: "Potato",
      sugar_beet: "Sugar Beet",
      soybean: "Soybean",
      cassava: "Cassava",
      oil_palm: "Oil Palm",
      barley: "Barley"
    },
    phenology: {
      sectionTitle: "Phenology & Thermal Time Engine",
      variety: "Variety",
      planted: "Planted",
      daysAgo: "{n} days ago",
      harvestDate: "Est. Harvest Date",
      harvestUncertain: "Not yet determined",
      accumulatedGdd: "ACCUMULATED GDD",
      realWeatherPct: "{pct}% real weather since planting",
      maturityGddReq: "MATURITY GDD REQ.",
      currentStage: "CURRENT STAGE",
      seasonProgress: "Crop Development Season Progress",
      completed: "Completed",
      phaseGermination: "Germination",
      phaseGrowth: "Growth",
      phaseFlowering: "Flowering",
      phaseFilling: "Filling",
      phaseRipening: "Ripening"
    },
    stress: {
      sectionTitle: "Real-Time Diagnostic Engine",
      matrixTitle: "Abiotic Plant Stress Risk Matrix"
    },
    weather: {
      sectionTitle: "Meteorological Intelligence",
      chartsTitle: "7-Day Ensemble Forecast vs 30-Year Historical Climate",
      sourcesNote: "Averaged from 3 Meteorological Sources (Open-Meteo, MET Norway, NOAA)",
      tempChartTitle: "Temperature (°C) Forecast vs 30-Year Baseline",
      waterChartTitle: "Water Balance (Precip vs PET) & VPD (kPa)",
      legendFcstMax: "Fcst Max Temp",
      legendFcstMin: "Fcst Min Temp",
      legendHistMax: "30-Yr Hist Max",
      legendPrecip: "Precip (mm)",
      legendPet: "PET Demand (mm)",
      legendVpd: "Max VPD (kPa)"
    },
    recommendations: {
      sectionTitle: "Agronomic Anti-Stress Action Plan",
      title: "Scientifically Proved Anti-Stress Product Advisory",
      subtitle: "Biostimulant & nutritional mitigants tailored to phenology stage and stress severity",
      printButton: "Print Advisory Report",
      dosage: "Dosage",
      activeIngredients: "ACTIVE INGREDIENTS",
      applicationWindow: "APPLICATION WINDOW",
      rationale: "SCIENTIFIC RATIONALE & BIOLOGICAL MODE OF ACTION:"
    },
    savedFields: {
      label: "Saved Fields ({n}):",
      deleteTitle: "Delete saved field",
      usage: "{used}/{limit} fields used ({tier})",
      usageLimitReached: "You've reached your plan's limit. Contact the admin to raise it."
    },
    auth: {
      appTagline: "Scientific abiotic stress prediction for your crops",
      signInWithGoogle: "Sign in with Google",
      signingIn: "Connecting...",
      signOut: "Sign out",
      loginError: "Could not sign in: {error}",
      adminPanel: "Admin Panel"
    },
    admin: {
      title: "Admin Panel",
      backToApp: "Back to app",
      usersTab: "Users",
      usageTab: "App Usage",
      colEmail: "Email",
      colSignedUp: "Signed Up",
      colLastSignIn: "Last Sign-In",
      colFields: "Fields",
      colTier: "Plan",
      makeFree: "Set Free",
      makePremium: "Set Premium",
      totalUsers: "Total Users",
      totalFields: "Total Fields",
      totalEvents: "Logged Events",
      eventsByType: "Events by Type",
      topCrops: "Most-Queried Crops",
      noAuthNote: "Note: the auth.users table isn't available in this environment (expected on local SQLite dev)."
    }
  }
};

export const supportedLanguages = [
  { code: "es", label: "ES", name: "Español" },
  { code: "en", label: "EN", name: "English" }
];
