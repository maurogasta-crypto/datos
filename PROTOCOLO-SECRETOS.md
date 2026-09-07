# Protocolo de secretos — Casa Verde / CasaYourte / Rematetaller

Índice único para saber, desde cualquier chat, **dónde vive cada credencial real**
de los tres proyectos — sin que el valor de esa credencial toque nunca un
repositorio de git, un chat, ni la memoria de Claude.

## Regla de oro

**Ningún valor real de secreto entra jamás a un repositorio, sea público o
privado.** Este archivo y los de `secretos/*.md` documentan *nombres,
propósito y ubicación* — nunca el valor.

Dos motivos para que la regla no tenga excepción ni siquiera en un repo
"privado":

1. **La visibilidad de un repo puede cambiar**, se puede bifurcar, o alguien
   puede tener acceso de lectura sin que lo pienses dos veces.
2. **El historial de git es permanente.** Borrar el archivo después no
   alcanza — el valor queda en el historial de commits para siempre.

Y un caso puntual ya verificado en `casaverdecanas`: los `.md` dentro de
`interno/` se sirven en **texto plano y público** vía GitHub Pages, aunque el
nombre de la carpeta sugiera lo contrario. Ni siquiera una carpeta con nombre
"interno" es un escondite.

## Dónde vive cada tipo de dato

| Tipo de dato | Dónde va el valor real | Dónde NO va |
|---|---|---|
| Secreto de infraestructura consumido por una función que despliega **Netlify** (con o sin repo conectado) | Netlify → Site settings → Environment variables, del proyecto correspondiente | Nunca en el repo, ni en `netlify.toml`, ni en un `.env` commiteado |
| Secreto consumido por un workflow de **GitHub Actions** | Repo → Settings → Secrets and variables → Actions (un Environment por destino si hay más de uno) — **ver regla de carga manual abajo** | Nunca en el código del workflow |
| Dato específico de un usuario final en runtime (ej. una clave personal tipo CallMeBot) | Base de datos de la app (Firestore u equivalente), protegida por reglas de seguridad — no es una variable de entorno de infraestructura | Nunca como variable de entorno global compartida por todos los usuarios |
| Identificador público por diseño (Firebase `apiKey`, Cloudinary `cloud name`, upload preset sin firma) | El propio código — no es secreto, ya está pensado para viajar al navegador | No hace falta protegerlo; sí documentarlo como "público" para no confundirlo con un secreto |
| Credencial de acceso a una cuenta (login de Netlify, Firebase console, GitHub) | Gestor de contraseñas personal del administrador | Nunca en ningún repo ni documento |

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
otra forma (por ejemplo, Netlify con un .zip subido a mano, como
`casaverdecanas` — ver `secretos/casaverdecanas.md`), cargar el secreto en
GitHub no sirve de nada: nadie lo va a leer desde ahí. En ese caso el valor
real sigue viviendo donde el proceso de despliegue lo consume (Netlify,
Firebase, etc.), y así se documenta en la fila correspondiente de la tabla.

## Formato del índice por proyecto

Cada archivo `secretos/<proyecto>.md` es una tabla:

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|

- **Tipo**: uno de `secreto de infraestructura`, `dato en runtime`, `público por diseño`, `credencial de cuenta`.
- **Dónde vive el valor real**: la ubicación concreta (proyecto de Netlify, nombre del GitHub Secret, colección de Firestore), nunca el valor.
- **Verificado**: fecha de la última vez que alguien (Mauro o un chat de Claude con el repo real delante) confirmó que la fila sigue siendo cierta.

## Cómo se agrega un proyecto nuevo a este índice

1. Abrir un chat de Claude Code con **ese** repo agregado a la sesión (esta plataforma no permite mezclar repos de distintos dueños de GitHub en un mismo chat — cada proyecto necesita su propio chat).
2. Pedir: *"Revisá este repo siguiendo `PROTOCOLO-SECRETOS.md` del repo `casaverdecanas-blip/datos` y completá `secretos/<proyecto>.md` con lo que encuentres — sin escribir ningún valor real."*
3. El chat busca: variables `process.env.*`, referencias a claves en `.toml`/`.yml` de despliegue, cualquier `.env.example`, y las reglas de la base de datos si las hay.
4. Con eso arma o actualiza la tabla en `secretos/<proyecto>.md` de este repo, y agrega (si no existe) un `CLAUDE.md` corto en el proyecto con la sección "Secretos" descripta abajo.

## Qué queda documentado en cada repo del proyecto (no acá)

Cada repo (`casaverdecanas`, `CasaYourte`, `remate`) lleva su propio `CLAUDE.md`
con una sección breve:

```markdown
## Secretos
Este proyecto usa: VARIABLE_UNO, VARIABLE_DOS, ...
Los valores reales viven en [Netlify / GitHub Secrets de este repo / Firestore].
Índice completo y actualizado: `casaverdecanas-blip/datos` → `secretos/<proyecto>.md`.
```

Esto es información **no sensible** (nombres y ubicación tipo "vive en
Netlify", nunca el valor), así que es segura incluso en un repo público — y
es lo que hace que cualquier chat futuro en ese repo entienda el protocolo
sin que se lo tengas que reexplicar.

---
*Última actualización: 2026-09-07.*
