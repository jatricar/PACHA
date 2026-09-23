# PACHA — Estado del proyecto y hoja de ruta (al 21/09/2026)

*Este documento es un resumen para retomar el proyecto en una conversación nueva de Claude, después de una tanda larga de trabajo de UI/UX. Subilo al chat nuevo y decile algo como: "Este es el estado de PACHA, seguimos desde acá — mi primer tema es [1/2/3/4]". Si hace falta ver el código real de algún archivo mencionado acá, pedile a Claude que lo pida como adjunto — este documento no incluye el código, solo el estado.*

---

## Qué es PACHA

App de predicción de estrés abiótico y recomendaciones anti-estrés para los 10 cultivos agrícolas más importantes del mundo (maíz, trigo, arroz, papa, remolacha azucarera, soja, mandioca, palma aceitera, cebada, caña de azúcar). El usuario carga un lote (ubicación + cultivo + fecha de siembra), y la app calcula en qué etapa fenológica (escala BBCH) está el cultivo usando un modelo de grados-día de crecimiento (GDD) alimentado con clima real, detecta riesgos de estrés (calor, frío, VPD alto/bajo, sequía, anegamiento) específicos de esa etapa, y sugiere productos/acciones concretas.

**Infraestructura**: Backend FastAPI en Render (plan gratis), Frontend React/Vite en Vercel, base de datos Postgres en Supabase. Repo: `github.com/jatricar/PACHA`. Login con Google vía Supabase Auth. Instalable como PWA.

---

## Funcionalidades completadas

### Motor científico
- Clima real de 3 fuentes (Open-Meteo, MET Norway, NOAA) con respaldo sintético marcado cuando falla alguna
- Histórico climático real (ERA5) por ubicación
- GDD acumulado con clima real desde la siembra, consciente del hemisferio
- Fecha de cosecha proyectada por simulación estacional
- Umbrales de helada, calor y VPD específicos por cultivo y por etapa BBCH

### Cuentas y permisos
- Login Google, freemium (5 lotes) / premium (50 lotes), admin sin límite
- Panel de administrador puede: ver todos los usuarios y sus lotes, **ver/crear/eliminar/renombrar/analizar lotes de cualquier usuario en su nombre** (para cuando un colega pide ayuda en vez de hacerlo él mismo)
- Renombrado de lotes (por el dueño o el admin) — deliberadamente solo el nombre, no ubicación/cultivo/fecha, para no invalidar un análisis que el usuario ya vio

### UI/UX (tanda recién cerrada)
- Página de ingreso pública: descripción del proyecto, "cómo funciona" en 3 pasos, ejemplo ilustrativo del diagnóstico (datos inventados, no toca el motor real), selector de idioma, botón de contacto por WhatsApp
- Selector de ubicación en mapa satelital (Esri World Imagery + capa de rutas/lugares), sin API key
- Diagrama de fenología ilustrado (íconos por fase: germinación/crecimiento/floración/llenado/maduración), con marcador de posición exacta dentro de la etapa actual
- Tarjetas del dashboard expandibles/contraíbles (fenología, estrés, clima, recomendaciones), con preferencia guardada por sección
- Traducción completa ES/EN, incluyendo contenido generado por el backend (nombres de etapas, alertas de estrés, recomendaciones) — no solo textos fijos de la interfaz
- Contacto por WhatsApp (`wa.me/5492233129470`) en la página de ingreso y en la barra superior de la app

### Reporte Mundial (admin, pestaña nueva en el panel)
- Simula, para 217 estaciones (10 países líderes productores + Argentina, por cada uno de los 10 cultivos, más 3 lotes reales tuyos ya cargados), qué le diría PACHA a un productor ahí — usando **20-25 años de clima histórico real, año por año** (no un promedio), con la misma matemática de GDD y los mismos umbrales de estrés que usa la app en vivo
- Corre en segundo plano (job con progreso consultable), porque son ~217 llamadas a una API externa
- **Caché durable en Supabase** (tabla `weather_archive_cache`): cada estación que se descarga con éxito queda guardada para siempre — si el proceso se corta a mitad de camino, el siguiente intento retoma donde quedó en vez de arrancar de cero. Con el tiempo, generar el reporte es casi instantáneo.
- **Corrió con éxito el 21/09: 217/217 estaciones, cero fallos, 100% desde caché.**
- Descarga de JSON completo con el detalle año por año de cada estación (para revisión/calibración)
- **Pendiente marcado por vos**: la visualización actual (tabla por cultivo) no es todo lo útil que esperabas — queda para el punto 2 de la hoja de ruta, más abajo

### Ficha de Referencia por Cultivo (admin, solo lectura)
- Por cultivo: temperatura base/óptima, GDD total requerido, multiplicadores por madurez, fórmula exacta de cálculo
- Etapas BBCH con su rango de % del ciclo y sus umbrales de calor/VPD reales
- Los 6 tipos de estrés con qué miden, de dónde sale el umbral, puntos de corte de severidad con el valor real de ese cultivo, y productos recomendados asociados
- Notas de transparencia: el campo `t_max` existe en los datos pero el motor nunca lo usa; fotoperíodo y vernalización **no** forman parte del modelo actual (solo temperatura acumulada)

---

## Bugs reales corregidos en el camino (memoria institucional)

- El campo "Variedad" mostraba siempre el nombre del cultivo en vez de lo que cargaba el usuario
- Nombres de etapas fenológicas en español: **dos causas distintas**, una atrás de la otra — primero un regex de categorización que solo reconocía palabras clave en inglés; corregido eso, apareció una segunda causa real: un esquema de validación de respuesta (Pydantic, `GrowthStageSchema`) que no declaraba el campo nuevo y FastAPI lo descartaba silenciosamente antes de llegar al navegador. Lección: verificar siempre contra la respuesta HTTP real, no contra la función Python directa.
- Tiles de mapa CARTO requerían API key sin avisar visualmente — se cambió a Esri World Imagery (gratis, sin key)
- El modal de carga de lote no tenía scroll propio y quedaba atrapado
- El Reporte Mundial se bloqueaba con HTTP 429 por exceso de velocidad contra la API climática — corregido con límite de velocidad + backoff, y resuelto de raíz con el cacheo durable

---

## Decisiones de arquitectura ya tomadas (para no re-discutir de cero)

- El Reporte Mundial es **solo para el admin por ahora**, no público — se decidirá mostrarlo más ampliamente según los resultados
- El informe semanal por mail quedó **en pausa a propósito** (ver pendientes)
- Riesgo histórico premium (lotes propios): ya se definió el enfoque — reutilizar el motor del Reporte Mundial pero on-demand (sin job en segundo plano, porque son pocos lotes por usuario, no 217)

---

## Pendientes explícitos (arrastrados)

1. **Rotar la contraseña de Supabase** — pendiente desde hace mucho tiempo, mencionado varias veces, nunca ejecutado. La contraseña actual circuló en texto plano por el chat y en un `.env` subido dentro de un zip.
2. **Informe semanal por mail**: en pausa hasta hablar con los primeros usuarios. Cuando se retome: servicio recomendado **Resend** (gratis, 3.000 mails/mes) — requiere comprar un dominio propio (~USD 10-15/año) y verificarlo con registros DNS. Disparo semanal recomendado: **GitHub Actions** (gratis, versionado con el código) en vez de Render Cron Job (~USD 1/mes mínimo).
3. **Riesgo histórico para usuarios premium** (acotado a sus propios lotes) — diseño acordado, falta construir.
4. **Mejorar la visualización del Reporte Mundial** — la tabla actual no alcanza (ver sugerencias más abajo).

---

## Próximos temas (los 4 que planteaste)

1. **Difusión/Monetización**: nichos de mercado, canales de difusión, cómo conseguir contactos de clientes, pros/contras de app nativa, productos derivados, B2B, B2C, marca blanca, addons/publicidad.
2. **Validación/Mejora de la herramienta**: etapas fenológicas editables por usuario (¿para ML?), testeo de predicción fenológica contra bases de datos públicas, fuentes meteorológicas adicionales, revisión de umbrales/recomendaciones, bibliografía científica por tema (consulta admin), **+ mejorar visualización del Reporte Mundial**.
3. **DevOps/SysAdmin**: hosting, dominios, región óptima de Supabase (¿São Paulo?), manejo de UTC/timezones, límites actuales y escalado futuro.
4. **Premium/Customización**: simulación histórica para lotes propios (ya diseñado), informe periódico por mail/WhatsApp, módulo de suelo (CC/PMP/textura/MO), módulo de nutrición/fertilización.

*(Sugerencias y preguntas puntuales sobre cada uno de estos 4 temas quedaron en la conversación de UI/UX del 21/09 — pedíselas a quien lea este documento si hace falta retomarlas, o directamente decidí con el usuario cómo priorizar antes de construir nada.)*
