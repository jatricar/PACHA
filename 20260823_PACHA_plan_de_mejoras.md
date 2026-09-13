# PACHA — Plan de trabajo: mejoras antes de mostrarlo a colegas

Todo esto se construye junto y no se comparte con nadie hasta estar terminado, como pediste. Como es mucho trabajo, lo voy armando en tandas dentro de esta conversación — te aviso en cada una qué quedó listo y qué sigue.

## Alcance acordado

| Ítem | Decisión |
|---|---|
| Nombre | **PACHA** — Plant Abiotic Condition and Health Algorithms |
| Idiomas | Español (default) + Inglés, ampliable a futuro |
| Login | Google, registro abierto (cualquiera con cuenta Google) |
| Aislamiento de datos | Cada usuario ve solo sus propios lotes |
| Panel de administrador | Solo vos: usuarios registrados, sus lotes, métricas de uso detalladas (cultivos consultados, recálculos, tiempo de uso) — pensado para mejorar la app y evaluar publicidad relevante a futuro (la integración de anuncios en sí queda para más adelante) |
| Planes de usuario | Freemium: 5 lotes máx. Premium: 50 lotes máx. Vos administrás quién es premium desde el panel de administrador |
| Herramienta de validación (predicción vs. cosecha real por zona) | Solo para vos/nosotros, no la ven los colegas |
| Rediseño visual | Liviano: mismo dashboard, tarjetas que se expanden al tocar |
| Selector de ubicación | Mapa interactivo (estilo Booster), en vez de solo lat/long a mano |
| Diagrama de fenología | Línea de tiempo ilustrada de las etapas BBCH |
| Bug de fecha de cosecha | Corregir — usa una tasa de crecimiento fija/optimista en vez de estacional |
| Bug "0% clima real" en Render | Investigar por qué en producción no llega el clima real (localmente sí funcionaba) |

## Orden de construcción

1. ✅ **Rebranding + base de idiomas** (español/inglés) — *esta tanda*
2. **Corrección del bug de cosecha** + investigación del "0% clima real" en Render — el más urgente técnicamente
3. **Login con Google + separación de datos por usuario + planes freemium/premium (5 / 50 lotes)** — requiere que configures algunas cosas en Supabase/Google Cloud (te voy a guiar paso a paso, como hicimos con Render/Vercel)
4. **Panel de administrador** (usuarios, lotes, métricas de uso) — depende del punto 3
5. **Selector de ubicación en mapa**
6. **Diagrama de fenología ilustrado**
7. **Tarjetas expandibles** (rediseño liviano)
8. **Herramienta de validación interna** (comparar predicción vs. cosecha real conocida en distintas zonas)

## Por qué este orden

- El bug de cosecha y el de "0% clima real" son errores de cálculo puros — no dependen de ninguna otra decisión, así que van primero.
- El login tiene que ir antes que el panel de administrador (no se puede mostrar "usuarios registrados" si todavía no existe el registro).
- Las mejoras visuales (mapa, diagrama, tarjetas) son las que menos dependen de las demás, así que quedan para el final, cuando ya esté sólida la base.

---

*Te aviso al cerrar cada tanda. Si en algún punto querés cambiar el orden o el alcance, decímelo y ajustamos.*
