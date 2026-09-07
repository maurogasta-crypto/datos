# Secretos — casaverdecanas-blip/casaverdecanas

Revisado directamente sobre el repo (clon del 2026-09-07). Ver
`../PROTOCOLO-SECRETOS.md` para las reglas generales.

**Despliegue de las funciones de servidor: Netlify, proyecto `serene-scone-76bd4e`
(login con Google — hay una segunda cuenta vieja de Netlify Drop que NO sirve,
ver Libro 1 · §2.1 de `interno/CASAVERDEDOCUMENTACION.md`). El repo NO está
conectado a Netlify a propósito (se sube un .zip a mano) — por eso GitHub
Secrets no aplica acá: nada en este proyecto se despliega vía GitHub Actions.**

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|
| `GEMINI_API_KEY` | Lee facturas con Gemini | secreto de infraestructura | Netlify → proyecto `serene-scone-76bd4e` → Environment variables | `netlify/functions/claude-proxy.js` | 2026-09-07 |
| `CLOUDINARY_API_KEY` | Lista fotos para el editor visual del sitio | secreto de infraestructura | Netlify → mismo proyecto → Environment variables | `netlify/functions/cloudinary-listar.js` | 2026-09-07 |
| `CLOUDINARY_API_SECRET` | Idem — firma las llamadas a la API de Cloudinary | secreto de infraestructura | Netlify → mismo proyecto → Environment variables | `netlify/functions/cloudinary-listar.js` | 2026-09-07 |
| `CALLMEBOT_PHONE` / `CALLMEBOT_APIKEY` | Aviso por WhatsApp | mixto — ver nota | ver nota | `netlify/functions/notify-whatsapp.js` | 2026-09-07 (sin confirmar el detalle) |
| Cloudinary cloud name / upload preset (sin firma) | URLs y subida de imágenes desde el navegador | público por diseño | ya está en el código (correcto, no requiere cambio) | varias páginas `.html` | 2026-09-07 |
| Firebase `apiKey` y config del proyecto `casaverde-20` | Identifica el proyecto Firebase | público por diseño | ya está en `interno/firebase-init.js` (correcto, no requiere cambio) | todo el panel interno | 2026-09-07 |
| Reglas de acceso reales | Qué puede leer/escribir cada usuario | — | `interno/firestore.rules`, público a propósito (no es el secreto, es lo que lo aplica) | Firestore | 2026-09-07 |
| Acceso a Netlify (cuenta `serene-scone-76bd4e`) | Publicar despliegues, ver logs, tocar env vars | credencial de cuenta | Cuenta de Google del administrador | — | 2026-09-07 |

**Nota sobre CallMeBot:** la documentación interna (`interno/CASAVERDEDOCUMENTACION.md`,
sección de comunicación/avisos) menciona que la clave de CallMeBot pasó de
vivir en una variable de entorno global a guardarse **por persona, en
Firestore, protegida por reglas** — para no compartir una sola clave entre
todo el equipo. No confirmé si la variable de entorno global sigue existiendo
como respaldo o ya se retiró del todo; conviene chequearlo en Netlify
directamente antes de asumir cualquiera de las dos.

## Lo que ya estaba bien (no tocar)

- Ninguna función usa valores hardcodeados: todas leen `process.env`.
- El propio `netlify.toml` ya documenta, en comentarios, qué variables
  necesita cada función — eso es exactamente el tipo de documentación "segura"
  que describe el protocolo (nombres, no valores).
- La distinción entre "público por diseño" (Firebase apiKey, Cloudinary cloud
  name) y "secreto de terceros" ya está explícitamente escrita en
  `interno/CASAVERDEDOCUMENTACION.md`.

## Lo que faltaba y se agregó en este repo

- Un `CLAUDE.md` en la raíz con una sección "Secretos" corta que apunte a este
  índice (antes no existía ningún `CLAUDE.md`).
- Un `.gitignore` con `.env*` como resguardo, por si en algún momento se usa
  un `.env` local para desarrollo (hoy no se usa; las funciones toman las
  variables directo de Netlify).
