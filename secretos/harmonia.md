# Secretos — toromboto/harmonia

Revisado leyendo el código real del repositorio el **2026-09-09**, en la misma
sesión que sumó el instrumento de gestos. Sigue el formato de
`../PROTOCOLO-SECRETOS.md`.

**Aviso:** este repositorio es **público**. Su propio `CLAUDE.md` documenta
nombres de variables y dónde vive cada valor — nunca el valor.

## Antes de la tabla: qué forma tiene este proyecto

Es el único del ecosistema con **build y funciones de servidor**: React + Vite
compilado por **Vercel**, con despliegue automático desde GitHub, y desde el
2026-09-09 una función serverless en `api/`. Por eso acá **sí** corresponde la
rama "con backend" del protocolo (variables de entorno), a diferencia de
`CasaYourte` y `remate`, donde inventar un `.env` habría sido un error.

**No usa GitHub Actions propios** — sólo el `pages-build-deployment` que no
aplica acá, porque publica Vercel. GitHub Secrets no tiene destino en este
repo: cargar algo ahí no lo leería nadie.

**No usa Firebase, ni Cloudinary, ni base de datos.** Todo el estado del
usuario vive en el `localStorage` del teléfono.

## La tabla

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|
| `TUYA_CLIENT_ID` | Access ID de la app de Tuya IoT Platform; identifica la aplicación al firmar cada pedido | secreto de infraestructura | Vercel → proyecto de Harmonía → Settings → Environment Variables | `api/tuya.js` | `api/tuya.js:41`, 2026-09-09 |
| `TUYA_CLIENT_SECRET` | Access Secret; la clave con la que se firma cada pedido (HMAC-SHA256) | secreto de infraestructura | Vercel → mismo proyecto → Environment Variables | `api/tuya.js` | `api/tuya.js:42`, 2026-09-09 |
| `TUYA_REGION` | Centro de datos de Tuya: `us` / `eu` / `cn` / `in`. Por defecto `us` | configuración, no secreto | Vercel → mismo proyecto | `api/tuya.js` | `api/tuya.js:48`, 2026-09-09 |
| `TUYA_DISPOSITIVOS` | JSON: alias → identificador de dispositivo y comandos permitidos. El navegador manda el **alias**; el identificador real no sale del servidor | configuración con datos internos | Vercel → mismo proyecto | `api/tuya.js` | `api/tuya.js:52`, 2026-09-09 |
| `HARMONIA_CLAVE` | Frase compartida entre `gestos.html` y la función. Sin ella la función no responde nada, ni el diagnóstico | secreto de infraestructura (compartido con el teléfono) | Vercel → mismo proyecto. La copia del teléfono vive en el `localStorage` de ese teléfono, escrita a mano en la propia página | `api/tuya.js`, `public/gestos/iot.js` | `api/tuya.js:43`, 2026-09-09 |
| Login de la consola de Tuya | Crear el proyecto en la nube, vincular la cuenta de la app, ver los Device ID | credencial de cuenta | Gestor de contraseñas personal de Mauro | Nadie — uso manual en la consola | ausencia confirmada en todo el repo, 2026-09-09 |
| Login de Vercel | Cargar las variables, forzar un despliegue | credencial de cuenta | Gestor de contraseñas personal de Mauro | Nadie — uso manual | ausencia confirmada en todo el repo, 2026-09-09 |
| *local key* de cada dispositivo Tuya | Permitiría manejar los aparatos por red local, sin pasar por la nube | **ausente por diseño** | No existe acá. Consecuencia asumida: cada orden hace una ida y vuelta a la nube de Tuya, entre 200 y 600 ms | Nadie | ausencia confirmada, 2026-09-09 |

**Los valores los carga Mauro a mano en la web de Vercel.** Ningún chat pide el
valor de una credencial ni lo carga por API: su entregable es el nombre exacto
de la variable y el lugar donde pegarla.

## Titularidad de las cuentas

*(Pendiente de completar por Mauro — dato de contacto, no secreto.)*

**Y esta sección vacía ya costó algo concreto:** el 2026-09-09, al ir a cargar
las variables de entorno del puente de Tuya, no había forma de saber con qué
cuenta se despliega Harmonía en Vercel. No es un descuido del repositorio —
**Vercel no escribe nada en el repo**: no hay `vercel.json`, no hay `.vercel/`,
no hay configuración. El repositorio no puede contestar esa pregunta ni ahora
ni nunca.

Lo único verificable desde el código, y verificado leyéndolo:

| Qué | Valor | Cómo se comprobó |
|---|---|---|
| Cuenta de GitHub que escribe el repositorio | usuario **`toromboto`** (id 284471731) | los 50 commits del historial, y la API de GitHub |
| Dirección de correo de esos commits | `canavosiomariano@gmail.com` | metadatos de autor de los commits — **ya son públicos**, van en cada commit de un repo público. No es una contraseña ni un secreto: es el dato de contacto que esta sección existe para registrar |
| Cómo se edita | desde la **web de GitHub** (committer `web-flow`) | metadatos de los commits |

**Eso NO dice cuál es la cuenta de Vercel.** Dice cuál hay que mirar: la cuenta
de Vercel se creó autorizando alguna cuenta de GitHub, y esa autorización sí
queda registrada del lado de GitHub. El procedimiento para averiguarlo —tres
pasos que se hacen desde el teléfono, sin saber ninguna contraseña de Vercel—
está en `DESPLIEGUE.md`, en el propio repo de Harmonía.

**Falta completar acá, cuando Mauro lo confirme:** el titular de la cuenta de
**Vercel** y el de la consola de **Tuya**. La contraseña no — ésa vive en el
gestor de contraseñas y en ningún documento.

## Dos cosas que conviene que queden anotadas

**La clave de la sala no es autenticación seria, y está bien que se sepa.**
`HARMONIA_CLAVE` impide que cualquiera que descubra la dirección `/api/tuya`
encienda las luces desde el otro lado del mundo. Pero está en el `localStorage`
de un teléfono: quien tenga el teléfono desbloqueado la tiene. Es la diferencia
entre una puerta cerrada y una puerta que no está. Si el prototipo deja de ser
prototipo, el reemplazo es Firebase Auth —como en los otros tres proyectos—, no
una clave más larga.

**El patrón de la función con lista blanca le sirve a los otros.** El navegador
manda un **alias** (`"luz"`) y el servidor lo traduce al identificador real y
firma. Ni la credencial ni el identificador del aparato salen del servidor, y
un alias no habilita mandarle cualquier comando: sin una lista `comandos`
explícita, el único permitido es el declarado. Es candidato a regla general —
sirve para cualquier cosa que hoy se llame desde el cliente con una credencial
cerca. Ver la auditoría de `PROTOCOLO-GENERAL.md` § 7.
