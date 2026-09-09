# Secretos — rematetaller/remate

Revisado **leyendo el código real del repositorio** el **2026-09-09**, en la
sesión que le agregó las luces del depósito. Reemplaza la ficha anterior, que
decía «pendiente» porque una sesión previa no había podido acceder al repo por
ser de otro dueño de GitHub — **eso ya no es una limitación:** se puede agregar
a la sesión.

**Aviso:** este repositorio es **público**, y sus `.md` de `interno/` se sirven
en texto plano aunque la carpeta sugiera lo contrario. Su propio `CLAUDE.md`
documenta nombres y ubicaciones — nunca valores.

## Antes de la tabla: qué forma tiene este proyecto

**Sitio estático servido por GitHub Pages**, sin build, sin npm, sin
`package.json`, sin workflows propios (no existe `.github/`). Firebase (Auth +
Firestore, proyecto `remate-acbc9`) y Cloudinary se acceden directo desde el
navegador; la seguridad la aplican las reglas de Firestore.

**Desde el 2026-09-09 (tanda 25) tiene exactamente UNA función de servidor:**
`api/tuya.mjs`, en **Vercel**, el puente a las luces del depósito. Con ella
entran las cinco primeras variables de entorno del proyecto — hasta esa fecha
la respuesta correcta a «¿usa variables de entorno?» era **no**, y no era un
defecto: no había nada que las leyera.

**El sitio no se mudó.** GitHub Pages sigue publicando todo; de Vercel sale
únicamente `/api/tuya`, y `vercel.json` redirige cualquier otra dirección de
ese dominio al sitio real.

**GitHub Secrets sigue sin aplicar:** no hay workflows que los consuman, así
que cargar algo ahí no lo leería nadie. (Hubo un `.github/workflows/main.yml`
el 2026-09-07, mal escrito, que corrió una vez y se retiró el mismo día.)

## La tabla

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|
| `TUYA_CLIENT_ID` | Access ID de la app de Tuya IoT Platform; identifica la aplicación al firmar | secreto de infraestructura | Vercel → proyecto de remate → Settings → Environment Variables | `api/tuya.mjs` | `api/tuya.mjs:60`, 2026-09-09 |
| `TUYA_CLIENT_SECRET` | Access Secret: la clave con la que se firma cada pedido a Tuya (HMAC-SHA256) | secreto de infraestructura | Vercel → mismo proyecto → Environment Variables | `api/tuya.mjs` | `api/tuya.mjs:61`, 2026-09-09 |
| `TUYA_REGION` | Centro de datos de Tuya: `us`/`eu`/`cn`/`in` (por defecto `us`) | configuración, no secreto | Vercel → mismo proyecto | `api/tuya.mjs` | `api/tuya.mjs:65`, 2026-09-09 |
| `TUYA_LUCES` | JSON alias → identificador del aparato, etiqueta y comando. El panel manda el **alias**; el identificador real no sale del servidor | configuración con datos internos | Vercel → mismo proyecto | `api/tuya.mjs` | `api/tuya.mjs:70`, 2026-09-09 |
| `ORIGENES_PERMITIDOS` | Lista blanca de orígenes (CORS). Un `*` acá dejaría que cualquier página del mundo usara la sesión de quien la visite | configuración de seguridad | Vercel → mismo proyecto. Por defecto `https://rematetaller.github.io` | `api/tuya.mjs` | `api/tuya.mjs:90`, 2026-09-09 |
| `PUENTE_LUCES` | La dirección de la función. **No es secreto** —sin token de Firebase válido no hace nada— y por eso va en el código | público por diseño | `interno/utils.js`, una línea. Se escribe a mano al crear el proyecto de Vercel | `interno/luces.html` vía `utils.js` | `interno/utils.js:148`, 2026-09-09 |
| `firebaseConfig.*` | Identifican el proyecto Firebase ante la API web; **no dan permisos** — eso lo hacen las Firestore Rules | público por diseño | `interno/utils.js` líneas 110-117 (única copia en código) | todo el panel y las dos páginas públicas | leído del repo, 2026-09-09 |
| `CLOUDINARY.cloud` / `.preset` | Cloud name y upload preset **sin firma** | público por diseño | `interno/utils.js` líneas 133-136. El preset se define en Cloudinary → Settings → Upload | `subirFoto()` | leído del repo, 2026-09-09 |
| `api_secret` de Cloudinary | Firmaría borrados y operaciones privilegiadas | **ausente por diseño** | No existe acá. Consecuencia asumida: al sacar un documento del registro, el archivo queda en Cloudinary | Nadie | ausencia confirmada en todo el repo, 2026-09-09 |
| Credencial de servidor de Firebase (*service account*) | Le permitiría al puente leer toda la base | **ausente por diseño** | No existe. `api/tuya.mjs` lee `usuarios/{uid}` con el token de la propia persona, así que no puede leer nada que ella no pudiera. Un service account sería una llave maestra de ventas, documentos y llaves de compradores **para prender una luz** | Nadie | ausencia confirmada en todo el repo, 2026-09-09 |
| Contraseña de cada administrador | Login a `interno/login.html` | dato en runtime | Firebase Authentication. **No se comparten entre personas**: se entra por "Recuperar contraseña" | `signInWithEmailAndPassword` | leído del repo, 2026-09-09 |
| `usuarios/{uid}` → `rol`, `activo`, `permisos` | Quién entra y qué puede hacer — **incluido el permiso `luces`**, que aplica la función de Vercel leyendo esta misma ficha | dato en runtime | Firestore, protegido por las reglas | `configuracion.html`, `utils.js`, `api/tuya.mjs` | leído del repo, 2026-09-09 |
| `llaves/{codigo}` | La llave del comprador **es la credencial** | dato en runtime | Firestore. El `get` por código está abierto a propósito; **listar llaves sin sesión está cerrado** | `index.html`, `comprador.html`, `interno/llaves.html` | doc § 5.1, 2026-09-09 |
| Reglas de Firestore | Autoridad real de acceso | configuración de seguridad (copia en repo, autoridad en consola) | La autoridad es lo publicado en la **consola de Firebase**. La copia vive en `/firestore.rules`, **v0.7** desde la tanda 25 | Firestore | copia leída del repo, 2026-09-09. **Que la consola tenga la v0.7 sólo lo puede confirmar Mauro** |

**Los valores los carga Mauro a mano en la web de Vercel.** Ningún chat pide el
valor de una credencial ni lo carga por API.

## Titularidad de las cuentas

*(Pendiente de completar por Mauro — dato de contacto, no secreto.)*

Al 2026-09-09 no estaba documentado el titular de: la consola de **Firebase**
(`remate-acbc9`), la de **Cloudinary** (`r9u5oous`), la de **Tuya**, ni la
cuenta de **Vercel** que va a desplegar el puente.

Lo único verificable desde el repositorio es la cuenta de **GitHub**: los
commits están firmados por el usuario **`rematetaller`**, con la dirección
`rematetaller@gmail.com` (metadatos de autor, ya públicos en cada commit de un
repo público). Eso **no dice** quién es titular de las otras consolas — y la de
Vercel todavía no existe: se crea al poner en marcha las luces. El
procedimiento para averiguar o crear una cuenta de Vercel, y por qué conviene
que sea **una sola para Harmonía y para remate**, está en `DESPLIEGUE.md` del
repo de Harmonía.

## Un dato de arrastre que conviene no perder

**La clave de Cloudinary que se expuso en `datos` el 2026-09-07 sigue sin
rotarse** (ver `PROTOCOLO-GENERAL.md` § 1). Una sesión posterior confirmó que
**no pertenece a CasaYourte**; queda por confirmar de cuál de los proyectos es
—este usa Cloudinary— y rotarla. Mauro decidió postergarlo, no que se haya
resuelto.
