# PACHA — Estado del proyecto y próximos pasos

*Última actualización: este documento resume todo lo hecho hasta ahora para que puedas retomarlo sin perderte.*

---

## 📍 Dónde estás parado ahora mismo

Ya tenés la app **funcionando localmente y conectada a Supabase** (confirmado: viste la fila "Javi prueba 20260817" en la tabla `fields` de Supabase). Lo que falta es **subirla a internet** (Render + Vercel) para que tus colegas puedan verla sin que vos tengas la PC prendida.

**Falta exactamente esto, en este orden:**
1. Rotar la contraseña de Supabase (quedó expuesta en el chat)
2. Deploy del backend en Render
3. Deploy del frontend en Vercel
4. Probar la URL pública

Nada de lo anterior (los 3 puntos de mejoras técnicas) hace falta retocarlo — ya está hecho y probado. Ver detalle en la sección "Qué se hizo" más abajo si querés repasar.

---

## 🗂️ Carpeta del proyecto

```
C:\Users\lolit\OneDrive\Desktop\Plant Abiotic Condition and Health Algorithms\
├── backend\        (FastAPI + Python)
├── frontend\       (React + Vite)
├── render.yaml      (config para desplegar el backend en Render)
└── .gitignore
```

## 🔑 Cuentas ya creadas

| Servicio | Cuenta / URL | Para qué |
|---|---|---|
| GitHub | github.com/jatricar → repo `PACHA` | Guarda el código, conecta con Render y Vercel |
| Supabase | supabase.com/dashboard/org/klepmyqwebjagnqjtrbx → proyecto `pacha` | Base de datos (reemplaza el SQLite local) |
| Render | *(a crear en el próximo paso)* | Va a alojar el backend (FastAPI) |
| Vercel | vercel.com/jatricar1 | Va a alojar el frontend (la web/app) |

---

## ✅ Qué se hizo (por si querés repasar el detalle)

### 1. La app se puso a andar localmente
Backend (FastAPI) corriendo en `localhost:8000`, frontend (React) en `localhost:5173`. Verificado con tests automáticos y uso real.

### 2. Se corrigieron 3 errores científicos reales en el código
- **Clima**: antes usaba fórmulas inventadas en vez de clima real. Ahora usa 3 fuentes reales (Open-Meteo, MET Norway, NOAA/NWS) para el pronóstico, y el archivo ERA5 real para el histórico de 30 años. Si alguna fuente falla, el sistema lo avisa claramente en pantalla (banner naranja/azul) en vez de mostrar datos falsos sin decirlo.
- **Fenología (GDD)**: había un bug que trataba el invierno del hemisferio sur como si fuera verano (por eso tu cebada en Mar del Plata daba 1200°C-día en vez de los ~558 reales). Corregido — ahora usa clima real desde la fecha de siembra, con un indicador de "% clima real" visible en pantalla.
- **Heladas**: el sistema ignoraba los umbrales de frío específicos de cada cultivo (ej. el arroz sufre frío a partir de 8°C, no de -2°C como asumía el código viejo). Corregido.

### 3. Preparación para mostrarlo online
- `.gitignore` para no subir carpetas pesadas innecesarias (`venv`, `node_modules`) a GitHub
- La app ahora es instalable como "aplicación" en el celular/PC (PWA) sin pasar por tiendas de apps — gratis
- La URL del backend se volvió configurable (antes estaba fija a `localhost`, lo cual rompía en producción)

### 4. Migración de base de datos: SQLite → Supabase
La base de datos local (que se podía borrar sola en Render) se reemplazó por Supabase (Postgres gratis y persistente). **Ya confirmado funcionando** con tu prueba real.

### 5. Código subido a GitHub
`github.com/jatricar/PACHA` — confirmado con `git push` exitoso.

---

## 🔜 Próximos pasos concretos (uno a la vez)

### Paso 1: Rotar la contraseña de Supabase
Por qué: la pegaste en este chat, y aunque es privado, es buena práctica no dejarla dando vueltas.
- Supabase → tu proyecto `pacha` → **Project Settings** → **Database** → botón **"Reset database password"**
- Guardá la contraseña nueva en algún lugar seguro (un gestor de contraseñas, o al menos un archivo de texto que no subas a ningún lado)
- Vas a necesitar actualizarla en 2 lugares después: tu terminal local (variable `DATABASE_URL`) y Render (paso 2)

### Paso 2: Backend en Render
1. Entrá a **render.com**, creá cuenta con tu GitHub
2. **"New +"** → **"Blueprint"** → elegí el repo `jatricar/PACHA`
3. Render detecta el archivo `render.yaml` solo
4. Te va a pedir el valor de `DATABASE_URL` → pegá la connection string de Supabase (con la contraseña **nueva** del paso 1), formato:
   ```
   postgresql://postgres.ypkiqljimobynpymfubv:TU_PASSWORD_NUEVA@aws-0-ca-central-1.pooler.supabase.com:5432/postgres
   ```
5. **"Apply"** y esperá el deploy (unos minutos)
6. Copiá la URL que te da, algo como `https://pacha-backend.onrender.com` — **guardala, la necesitás en el paso 3**

### Paso 3: Frontend en Vercel
1. En **vercel.com/jatricar1** → **"Add New Project"** → elegí el repo `PACHA`
2. **Root Directory**: escribí `frontend`
3. En **"Environment Variables"** agregá:
   - Key: `VITE_API_BASE_URL`
   - Value: la URL de Render + `/api`, ej. `https://pacha-backend.onrender.com/api`
4. **"Deploy"** → te da una URL tipo `https://pacha.vercel.app`

### Paso 4: Probar todo
- Abrí la URL de Vercel en el navegador
- **Importante**: el primer pedido puede tardar 30-60 segundos porque Render "duerme" el backend gratis tras 15 min sin uso — no es que esté roto, solo hay que esperar el primer arranque
- Creá un campo de prueba, confirmá que aparece en Supabase (Table Editor)
- Desde el celular, abrí la misma URL → menú del navegador → "Agregar a pantalla de inicio" para instalarla como app

---

## 💬 Cómo seguir desde acá

Cuando quieras retomar, decime en qué paso estás (por ejemplo *"estoy en el Paso 2, Render me tira tal error"*) y seguimos desde ahí puntualmente, sin repasar todo lo anterior. No hace falta que hagas todo de una sentada — cada paso es independiente y podés pausar entre uno y otro.
