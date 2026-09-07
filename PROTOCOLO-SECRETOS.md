# Protocolo de secretos — Casa Verde / CasaYourte / Rematetaller

Índice único para saber, desde cualquier chat, **dónde vive cada credencial real**
de los tres proyectos — sin que el valor de esa credencial toque nunca un
repositorio de git, un chat, ni la memoria de Claude.

## Regla de oro

**Ningún valor real de secreto entra jamás a un repositorio, sea público o
privado, ni a un chat — de Mauro o de un agente.** Este archivo y los de
`secretos/*.md` documentan *nombres, propósito y ubicación* — nunca el
valor.

**Corolario para cualquier agente:** nunca pedís el valor de un secreto, por
ningún medio, y nunca lo cargás por API aunque exista la herramienta para
hacerlo. Tu entregable siempre es el nombre exacto de la variable y el
lugar donde Mauro tiene que pegarlo a mano.

Dos motivos para que la regla no tenga excepción ni siquiera en un repo
"privado":

1. **La visibilidad de un repo puede cambiar**, se puede bifurcar, o alguien
   puede tener acceso de lectura sin que lo pienses dos veces.
2. **El historial de git es permanente.** Borrar el archivo después no
   alcanza — el valor queda en el historial de commits para siempre.

**Regla general para cualquier repositorio publicado** (GitHub Pages,
Netlify con el repo conectado, o cualquier hosting que sirva el repo tal
cual): **no existe "archivo interno".** Si el archivo está en el repo, está
en internet, la carpeta se llame como se llame — verificado en
`casaverdecanas`: los `.md` dentro de `interno/` se sirven en texto plano y
público vía GitHub Pages. Esto no aplica igual a `datos`, que es privado:
ahí el riesgo no es la publicación sino que el historial es permanente si
algún día cambia de visibilidad o se bifurca.

## Antes de clasificar: ¿este proyecto tiene backend o build?

No todos los proyectos del ecosistema tienen el mismo reparto de secretos.
Antes de usar la tabla de abajo:

- **¿Despliega funciones de servidor (Netlify, Cloud Functions) o corre un
  build?** → seguí la rama "con backend": Netlify env vars, GitHub Actions
  Secrets, etc.
- **¿Es un sitio estático puro** (HTML/CSS/JS servido tal cual, sin build,
  sin funciones — como `CasaYourte`, verificado 2026-09-07)? → no hay
  `.env` que crear ni Netlify que configurar. El reparto real es:
  identificadores públicos en el código, todo lo sensible detrás de las
  reglas de seguridad de la base de datos, y credenciales de cuenta en el
  gestor de contraseñas. **Un agente no debe inventar un `.env` ni una
  variable de entorno que nada va a leer** — la ausencia de configuración
  no es un defecto a corregir, es la arquitectura del proyecto.

## Dónde vive cada tipo de dato

| Tipo de dato | Dónde va el valor real | Dónde NO va |
|---|---|---|
| Secreto de infraestructura consumido por una función que despliega **Netlify** (con o sin repo conectado) | Netlify → Site settings → Environment variables, del proyecto correspondiente | Nunca en el repo, ni en `netlify.toml`, ni en un `.env` commiteado |
| Secreto consumido por un workflow de **GitHub Actions** | Repo → Settings → Secrets and variables → Actions (un Environment por destino si hay más de uno) — **ver regla de carga manual abajo** | Nunca en el código del workflow |
| Dato específico de un usuario final en runtime (ej. una clave personal tipo CallMeBot) | Base de datos de la app (Firestore u equivalente), protegida por reglas de seguridad — no es una variable de entorno de infraestructura | Nunca como variable de entorno global compartida por todos los usuarios |
| Identificador público por diseño (Firebase `apiKey`, Cloudinary `cloud name`, upload preset sin firma) | El propio código — no es secreto, ya está pensado para viajar al navegador | No hace falta protegerlo; sí documentarlo como "público" para no confundirlo con un secreto |
| Credencial de acceso a una cuenta (login de Netlify, Firebase console, GitHub) | Gestor de contraseñas personal del administrador | Nunca en ningún repo ni documento |
| Configuración de seguridad publicada en una consola, con copia en el repo (ej. reglas de Firestore) | La autoridad real es la consola (Firebase, etc.); el archivo del repo es una copia de referencia que puede haberse desincronizado | No se asume que el archivo del repo es lo que está corriendo — hay que verificar contra la consola |
| Capacidad resignada a propósito por no tener un secreto (ej. sin `api_secret` de Cloudinary, el panel no puede borrar archivos) | Ningún lado — es una decisión, no una configuración pendiente | No se "completa" agregando la clave sin que Mauro lo pida explícitamente: la ausencia es la elección |

Un identificador público (Firebase `apiKey`, Cloudinary `cloud name`) puede
estar copiado en varios archivos cuando el proyecto no tiene build para
importarlo desde un solo lugar — no es un descuido. En ese caso, la fila del
índice lista **todas** las ubicaciones y marca cuál es la fuente canónica
(la que se edita primero) y cuáles son copias que hay que actualizar a mano
si la canónica cambia.

## GitHub Secrets: quién carga el valor, y cuándo aplica

**Ningún chat de Claude carga un valor en GitHub Secrets — lo carga Mauro,
directo en la web de GitHub.** No es una limitación de permisos que se pueda
pedir que se levante: es estructural, por dos razones.

1. **No hay herramienta para eso.** Las herramientas de GitHub disponibles en
   estos chats cubren archivos, branches, PRs y Actions — ninguna crea ni
   actualiza un secreto de repositorio.
2. **Aunque la hubiera, no convendría usarla.** Para cargar un valor por API,
   Claude tendría que recibir ese valor en texto plano dentro de la
   conversación primero. Eso es exactamente lo que este protocolo existe para
   evitar — el momento de pegarlo en el chat ya sería la exposición, aunque
   después GitHub lo guarde cifrado y no se pueda releer.

**Circuito correcto:**

1. Un chat de Claude identifica el nombre exacto de la variable y en qué
   workflow/función se consume (leyendo el código, nunca preguntando el
   valor).
2. Mauro carga el valor él mismo: `github.com/<owner>/<repo>` → Settings →
   Secrets and variables → Actions → New repository secret.
3. Mauro confirma "ya está" en el chat (sin pegar el valor).
4. El chat actualiza `secretos/<proyecto>.md` para que diga "vive en GitHub
   Secrets de este repo" — nunca el valor.

**Antes de recomendar GitHub Secrets como destino, verificar que aplica.**
GitHub Secrets solo sirve si el repo efectivamente **despliega o corre algo
vía GitHub Actions** que lea esa variable. Si el proyecto se despliega de
otra forma (Netlify con un .zip a mano, como `casaverdecanas`) o no tiene
ningún workflow propio (sitio estático puro, como `CasaYourte` — solo corre
el `pages-build-deployment` que GitHub genera solo), cargar un secreto en
GitHub Actions no sirve de nada: nadie lo va a leer desde ahí. Un agente que
no pueda ver la lista de secretos ya cargados en Settings → Secrets and
variables → Actions (las herramientas disponibles no siempre lo exponen) no
debe asumir que no hay ninguno — anota `no verificable desde la sesión` (ver
formato del índice) en vez de "no hay".

## Formato del índice por proyecto

Cada archivo `secretos/<proyecto>.md` es una tabla:

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|

- **Tipo**: uno de `secreto de infraestructura`, `dato en runtime`,
  `público por diseño`, `credencial de cuenta`, `ausente por diseño`,
  `configuración de seguridad (copia en repo, autoridad en consola)`.
- **Dónde vive el valor real**: la ubicación concreta (proyecto de Netlify,
  nombre del GitHub Secret, colección de Firestore); si hay más de una
  ubicación (copias por falta de build), listarlas todas y marcar la
  canónica. Nunca el valor.
- **Consumida por**: qué archivo o función la usa — o "nadie" si es una
  ausencia deliberada.
- **Verificado**: no alcanza con sí/no ni con una fecha sola — los archivos
  cambian de línea y de nombre. Usar uno de estos formatos:
  - `archivo:línea, <fecha>` — un agente lo comprobó leyendo el código real.
  - `declarado por Mauro, <fecha>` — algo que solo él puede confirmar (qué
    nombres están cargados en GitHub Secrets, si las reglas del repo
    coinciden con las publicadas en la consola).
  - `no verificable desde la sesión` — el agente no tuvo forma de
    comprobarlo con las herramientas disponibles; no se completa como si se
    hubiera verificado algo que no se verificó.
  - El índice central trata como **caduca** una fila verificada hace más de
    6 meses.

## Incidente: qué hacer si un secreto ya se commiteó

Si un valor real ya quedó commiteado (ya pasó una vez en este ecosistema,
ver `PROTOCOLO-GENERAL.md` § 1), el orden es:

1. **Rotar el valor en la consola del servicio primero.** Mientras no se
   rote, sigue siendo válido aunque se borre del repo o se reescriba el
   historial.
2. **Recién después, limpiar el repo** — borrar el archivo, y si hace falta
   reescribir el historial (con confirmación explícita de Mauro, ver reglas
   de git en `PROTOCOLO-GENERAL.md` § 2).
3. **Anotar en el índice si estuvo expuesta y cuándo se rotó.** Sin ese
   registro, nadie puede saber después si la exposición sigue vigente.

Limpiar el repo sin rotar el valor deja la sensación de que el problema se
resolvió cuando no es así. **Pendiente real de este ecosistema:** la clave
de Cloudinary de `casaverdecanas` que se expuso en `datos` (ver
`PROTOCOLO-GENERAL.md` § 1) todavía no se rotó — Mauro decidió postergarlo,
no que se haya resuelto.

## Cómo se agrega un proyecto nuevo, y qué queda en el `CLAUDE.md` de cada repo

Eso ya no es específico de secretos — ver `PROTOCOLO-GENERAL.md`, secciones 3
y 4: ahí está la mecánica de sesiones (un chat, un dueño de GitHub) y la
estructura estándar del `CLAUDE.md` que cada proyecto tiene que llevar,
incluida su sección "Secretos".

---
*Última actualización: 2026-09-07 (incorpora observaciones de la revisión de CasaYourte).*
