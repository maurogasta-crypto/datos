# panel de datos

Tablero personal de Mauro: **qué está pendiente en cada proyecto, quién lo tiene
que hacer y cómo fue cambiando**, más un lugar para los datos sensibles que no
pueden estar en ningún repositorio ni en ningún chat.

| | |
|---|---|
| Panel | https://maurogasta-crypto.github.io/datos/ |
| Repositorio | `maurogasta-crypto/datos` — **público a propósito** |
| Despliegue | GitHub Pages con *Source: GitHub Actions* — ver abajo |
| Base de datos | Firebase **`datos-830f8`** (Firestore + Authentication) |
| Reglas | [`reglas.txt`](reglas.txt) — copia; la autoridad es la consola |

## ⚠ Dos repositorios se llaman `datos`. No son el mismo

Es la trampa más fácil de este ecosistema y conviene tenerla clara **antes** de
subir nada:

| Repositorio | Qué es | Visibilidad | Qué va adentro |
|---|---|---|---|
| **`maurogasta-crypto/datos`** — *éste* | el panel: HTML, CSS y JavaScript | **público** | un cascarón, cero datos |
| `casaverdecanas-blip/datos` | los protocolos y el índice de secretos | privado | reglas de trabajo y *dónde* vive cada credencial, nunca su valor |

Que se llamen igual no los vuelve intercambiables: **acá no entra nada que no
sea código del panel.** Ni fichas, ni titularidades, ni contactos, ni números,
ni partes de ejemplo. Este repositorio lo lee cualquiera.

## Por qué este repositorio es público

**Porque el que sea privado no protegería nada, y hacerlo privado sí rompería el
panel.** Conviene entender esto antes de tocar nada:

- GitHub Pages **no sirve un sitio privado**. En una cuenta gratis, Pages ni
  siquiera funciona desde un repositorio privado; con GitHub Pro funciona pero
  **el sitio publicado es público igual**. El control de acceso en Pages existe
  sólo en GitHub Enterprise Cloud.
- Y aunque se pudiera: lo que hay en este repositorio es un **cascarón**. HTML,
  CSS y JavaScript. **No hay un solo dato adentro.**

**Lo que protege los datos son las reglas de Firestore y Authentication**, no
dónde vive el archivo. Es exactamente el mismo modelo de los otros tres sitios
del ecosistema. Que alguien lea este código no le sirve de nada: sin tu
contraseña, Firestore le contesta `permission-denied` a todo.

> La configuración de Firebase que está en `firebase-init.js` **no es un
> secreto**: identifica el proyecto ante la API web y no da un solo permiso.
> Está a la vista a propósito, para que nadie la confunda con una credencial y
> la "proteja" rompiendo el panel. Ver `PROTOCOLO-SECRETOS.md` en el repo
> privado `datos`.

## Las dos zonas, que nunca se mezclan

Es la idea de fondo de todo el panel:

| | Quién lo escribe | ¿Pasa por el chat? | Dónde |
|---|---|---|---|
| **El estado de los proyectos** — pendientes, tandas, historia | lo genera Claude, lo aplica Mauro de un toque | **sí**, y está bien: no es sensible | `proyectos/`, `pendientes/`, `tandas/` |
| **Las fichas** — titularidad de cuentas, contactos, números | **sólo Mauro**, escribiendo en el panel | **nunca** | `fichas/` |

**Claude no tiene —ni debe tener— credenciales de `datos-830f8`.** No puede
escribir en esta base, y eso no es una limitación a resolver: es el motivo por
el que lo de la segunda fila está a salvo. El flujo es el mismo que la pantalla
de traducción de CasaYourte: Claude genera un JSON, Mauro lo carga, lo mira y lo
aplica. Nada se escribe sin que lo hayas visto.

### El panel es el canal

Es el motivo de existir de todo esto, y funciona como una ronda:

1. **Yo mando un parte.** Además de qué está pendiente, trae **preguntas**: lo
   que necesito que confirmes, aceptes, valides o decidas, y lo que depende de
   que hagas algo.
2. **Vos contestás acá, a tu ritmo.** Tocás un pendiente, lo abrís, escribís la
   respuesta, marcás en qué estado quedó y de quién depende ahora. Podés dejarlo
   a medias y volver mañana.
3. **Sacás el paquete** con «Sacar lo que hay» y me lo pasás.
4. **Yo trabajo esa ronda entera** y devuelvo el parte siguiente.

Lo que esto compra: **que nada quede olvidado por avanzar.** Mientras se
desarrolla un punto, los anteriores no se hunden en el historial de una
conversación — quedan acá, contados, con su pregunta a la vista.

El chat sigue abierto para lo que se resuelva al vuelo. Son dos caminos, no uno
que reemplaza al otro.

**El apretón de manos.** Cada pendiente lleva una marca `tocado`: se enciende
cuando vos guardás algo y **se apaga sola** cuando yo mando un parte que lo
incluye —o sea, cuando ya lo vi—. La exportación trae la lista `tocados` arriba
de todo: es lo primero que miro, y evita tener que comparar a ojo contra lo que
mandé.

**Tu respuesta no se pisa.** Si mi parte no menciona la respuesta de un
pendiente, queda la tuya. Perder una respuesta por no haberla repetido sería
exactamente lo que este circuito viene a evitar.

### El parte entra y sale

La solapa «El parte» tiene las dos direcciones, y las dos son del estado de los
proyectos — **nunca de las fichas**:

- **Entra** por «Elegir un archivo»: se elige el `.json` que te pasé y el panel
  lo lee y lo revisa solo, sin pegar nada. El textarea sigue estando para cuando
  ya lo tenés en el portapapeles.
- **Sale** por «Ver el estado» o «Bajar el archivo»: el contenido de la base en
  el mismo formato en que entra. Para respaldarlo, para mirarlo, y sobre todo
  **para dárselo a un chat nuevo** — es lo único que evita que cada conversación
  arranque adivinando en qué quedó cada proyecto.

La vuelta es sin pérdida: meter de nuevo lo que salió tiene que contestar «no
hay nada nuevo», y eso está probado.

Que el estado se pueda sacar y las fichas no, no es una inconsistencia: son las
dos zonas. El estado ya viaja por el chat porque no es sensible; las fichas no
viajan a ningún lado.

## La puerta

La primera vez, y en este orden:

1. **Crear tu usuario** en Firebase → proyecto `datos-830f8` → Authentication →
   Users → Add user, con tu mail y una contraseña. Es el único usuario que va a
   existir.
2. **Entrar al panel** con ese mail. Todavía no vas a poder leer ni escribir
   nada, y está bien.
3. **Solapa «La puerta»**: ahí está tu UID y el texto de las reglas **con tu UID
   ya adentro**, con un botón para copiarlo.
4. **Publicarlas**: Firebase → Firestore Database → Reglas → seleccionar todo,
   pegar, **Publicar**. Completo, nunca un pedazo: las reglas se suman.
5. **Probar que están vivas**: el botón «Probar» de esa misma solapa intenta
   leer una colección que las reglas no declaran. **Tiene que decir
   "denegado"** — esa negativa es lo único que demuestra que lo publicado es tu
   texto y no lo que Firebase dejó al crear la base.

> **No guardes nada sensible antes del paso 5.** Si la base quedó en modo de
> prueba, está abierta a cualquiera que sepa el `projectId` hasta que la cierres.

## Por qué hay un workflow, si acá no había ninguno

`.github/workflows/pages.yml` publica el sitio. Es el único, no usa ningún
secreto —el token lo da GitHub para esa corrida— y **existe por una razón
concreta, no por costumbre**:

GitHub **no dispara compilaciones a partir de push hechos por una app de
GitHub**. Es su protección contra bucles infinitos, y todos los push de un
agente son de esa clase. Con la publicación «desde una rama», el sitio se quedó
sirviendo la tanda 1 mientras el repositorio ya iba por la cuarta: cinco commits
en `main` y ni una publicación nueva. No había forma de que una tanda llegara al
teléfono sin que Mauro tocara el repositorio a mano cada vez.

El workflow se dispara con un push a `main` **y también a pedido**
(`workflow_dispatch`), que es lo que permite que un agente pida la publicación
después de subir.

**Requiere que Pages esté en `Settings → Pages → Source: GitHub Actions`.** Con
la opción vieja («Deploy from a branch») este archivo no hace nada y el problema
vuelve.

## Los archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | el panel entero: tablero, el parte, fichas, la puerta |
| `nucleo.js` | el núcleo: la puerta, avisos, errores con causa, fechas locales |
| `firebase-init.js` | **el único contacto con el SDK de Firebase** |
| `estilos.css` | el sistema de diseño; los respiros son variables, no números |
| `reglas.txt` | copia de las reglas de Firestore, para referencia |
| `.github/workflows/pages.yml` | publica el sitio; el único workflow, sin secretos |

## Los sellos de versión

Cada archivo con lógica lleva su número, **visible arriba del panel**. Ante
cualquier rareza, lo primero que se mira es qué versión está sirviendo el
teléfono.

| Archivo | Constante | Valor |
|---|---|---|
| `nucleo.js` | `P.VERSION` | `nucleo-3` |
| `index.html` | `P.PANEL` | `panel-5` |
| `estilos.css` | (en el comentario) | `estilos-3` |
| `firebase-init.js` | (en el comentario) | `init-1` |

> Esta tabla es derivada. Si no coincide con lo que muestra el panel, **manda el
> panel**: la tabla se copia a mano y se desactualiza en silencio.

**El sello también va en la dirección**, y esto no es decorativo: `index.html`
pide `estilos.css?v=estilos-3` y `nucleo.js?v=nucleo-3`. Sin ese número, el
teléfono se queda con el archivo viejo y el sello de arriba miente. **Si subís
un sello, subí el número de la dirección en la misma tanda.**

Y una trampa que ya casi pasa: `index.html` y `nucleo.js` piden
`firebase-init.js` **por la misma dirección, letra por letra**. Si una llevara
`?v=` y la otra no, serían dos módulos distintos para el navegador, con dos
`initializeApp()` — y Firebase falla con «app already exists».

## Al trabajar acá

- **No hay build ni terminal.** HTML/CSS/JS servido tal cual, y se edita desde
  el celular por la web de GitHub. Nada de `npm`.
- **Hay un banco de pruebas, y no está acá.** Corre este código contra un DOM de
  verdad y un Firestore de mentira: 41 comprobaciones, entre ellas que el estado
  exportado se pueda volver a importar sin pérdida y que ninguna ficha asome en
  él. Vive en el repo privado `casaverdecanas-blip/datos` → `pruebas/panel/`,
  justamente para no traerle `npm` a este repositorio. Si tocás el panel, corrélo.
- **El núcleo es `nucleo.js` y no se duplica.** Si algo hace falta en dos
  pantallas, sube ahí en la misma tanda.
- **Una colección nueva entra con su regla, en la misma tanda.** Rige el cierre
  `if false`: sin bloque propio, queda inaccesible.
- **Las reglas se editan completas, nunca por fragmentos.**
- **Acá no se sube ningún dato.** Ni de ejemplo. Este repositorio es público.
  Ojo con el repositorio homónimo: ver el recuadro del principio.
- Sigue los protocolos del repo **privado** `casaverdecanas-blip/datos`.

## Las fichas

La segunda zona: titularidad de cuentas, contactos, números. **Se escriben en el
panel y no salen de ahí.** Cada ficha tiene un título, un proyecto, los datos que
le pongas —un renglón por dato— y notas libres.

Tres cosas que son decisiones, no huecos:

- **No hay botón de exportar.** No es un olvido. Un control que junte todas las
  fichas en un texto listo para pegar es exactamente el camino por el que esto se
  filtraría; sin ese botón, el camino no existe. Copiar **un** valor suelto sí:
  para eso está el botón de cada renglón.
- **Acá no van contraseñas.** Viven en tu gestor de contraseñas y en ningún
  documento — tampoco en éste. Guardar una acá sería mover un secreto a un lugar
  que no es el suyo.
- **Borrar borra de verdad**, sin papelera y sin copia en ningún lado. Es el
  precio de que esto no viva en un repositorio, y por eso pregunta antes.

La colección `fichas/` ya tenía su regla desde la tanda 1, así que esta tanda no
toca `reglas.txt` ni pide volver a publicar nada en la consola.

## Lo que falta

- **La app instalable.** Un `sw.js` con lista `SHELL` y contador que no se pueda
  saltear, para que el panel abra sin señal. Con él se va, de paso, la arista de
  la caché: hoy los módulos se piden sin número de versión en la dirección, así
  que un cambio en `nucleo.js` puede tardar en llegar al teléfono y el sello de
  arriba queda mostrando el número viejo.
