# PACHA — Estado actualizado y próximos pasos

*Actualizado después de cerrar login, planes y panel de administrador en producción.*

---

## ✅ Completamente terminado y funcionando en producción

### Infraestructura
- Backend en Render, frontend en Vercel, base de datos en Supabase — los tres conectados y funcionando
- `.env` local con carga automática (ya no hay que escribir variables a mano en la terminal)

### Motor científico
- Clima real de 3 fuentes (Open-Meteo, MET Norway, NOAA) con respaldo sintético claramente marcado cuando alguna falla
- Histórico climático real (ERA5) por ubicación
- GDD acumulado con clima real desde la siembra, consciente del hemisferio
- Fecha de cosecha proyectada por simulación estacional (ya no una tasa fija optimista)
- Umbrales de helada específicos por cultivo (no genéricos)

### Producto
- Rebranding completo a **PACHA**
- Selector de idioma Español/Inglés (interfaz fija traducida; contenido generado por el backend —nombres de etapas, texto de recomendaciones— sigue en inglés, pendiente)
- **Login con Google** (vía Supabase Auth, verificación JWT robusta con JWKS)
- **Cada usuario ve solo sus propios lotes**
- **Planes freemium (5 lotes) / premium (50 lotes)**, administrables a mano
- **Panel de administrador**: usuarios registrados, sus lotes, y métricas de uso (eventos por tipo, cultivos más consultados)
- App instalable como PWA (ícono propio, funciona como app nativa)
- Corregido: menús que quedaban tapados por otras tarjetas (ahora usan Portal, técnica robusta)
- Corregido: recálculo innecesario en segundo plano (bug del objeto de usuario)

### Cuenta de Google / OAuth
- App configurada con logo, política de privacidad y términos de servicio (publicados en `pacha-red.vercel.app/privacy.html` y `/terms.html`)
- Modo actual: **"Prueba"**, con usuarios de prueba agregados a mano — suficiente para este piloto con colegas, no hace falta publicar la app todavía

---

## 🔜 Pendiente (nada urgente, se puede ir de a uno)

### 1. Calibración del modelo de cosecha
El cálculo de fecha de cosecha ya usa el método correcto, pero el valor de "GDD requerido para madurez" de cada cultivo viene de bibliografía general, no está ajustado a tu zona. Vos mismo notaste que para trigo/cebada en Mar del Plata da un poco temprano. Esto se resuelve con la **herramienta de validación interna** que quedó pendiente (comparar predicción del modelo vs. fechas de cosecha reales conocidas, en varias zonas, sin esperar una temporada completa a campo).

### 2. Selector de ubicación en mapa
Reemplazar la carga de latitud/longitud a mano por un mapa interactivo (estilo Booster), para que cargar un lote sea más intuitivo.

### 3. Diagrama ilustrado de fenología
Las etapas del cultivo (BBCH) hoy se muestran como texto en recuadros — la idea original era un dibujo/línea de tiempo más visual.

### 4. Tarjetas expandibles (rediseño liviano)
Que cada sección del dashboard (fenología, estrés, clima, recomendaciones) se pueda expandir/contraer al tocarla, en vez de mostrarse todo siempre.

### 5. Seguridad — pendiente hace tiempo, sin apuro pero no lo olvides
A lo largo de tantas capturas de pantalla, la contraseña de Supabase, el `SUPABASE_JWT_SECRET`, y la `SUPABASE_ANON_KEY` quedaron expuestos varias veces en este chat. Ahora que todo está estable, es un buen momento para:
- Rotar la contraseña de la base de datos en Supabase (y actualizarla en tu `.env` local y en Render)
- No hace falta rotar la `ANON_KEY` (es pública por diseño) ni el `JWT_SECRET` es tan crítico ya que ahora usamos JWKS como método principal, pero no está de más

### 6. Traducir el contenido generado por el backend
Nombres de etapas fenológicas, motivos de alertas de estrés, y texto de recomendaciones siguen en inglés. Requiere duplicar esas bases de datos en español o agregar una capa de traducción en el backend — es un trabajo más grande, aparte.

### 7. Publicar la app de Google (cuando quieras abrirla a cualquiera)
Por ahora "Prueba" + usuarios de prueba alcanza. El día que quieras que cualquiera con Gmail pueda entrar sin que vos agregues su email a mano, hay que verificar el dominio en Google Search Console y ajustar la página principal para que no esté detrás del login.

---

## 💬 Cómo seguir

Decime cuál de estos te interesa más ahora, o si preferís que hagamos una ronda de feedback con tus colegas primero (ya podés compartirles el link y agregarlos como usuarios de prueba) antes de seguir construyendo — a esta altura, probablemente valga la pena escuchar qué dicen ellos antes de invertir más tiempo en rediseño visual.
