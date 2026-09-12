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
| Reglas | [`reglas.txt`](reglas.txt) — la **plantilla**; el panel le pone los UID y la autoridad es la consola |
| Reglamento | [`protocolos/`](protocolos/) — el de los cuatro proyectos, acá desde el 2026-09-12 |

## ⚠ Dos repositorios se llaman `datos`. No son el mismo

Es la trampa más fácil de este ecosistema y conviene tenerla clara **antes** de
subir nada:

| Repositorio | Qué es | Visibilidad | Qué va adentro |
|---|---|---|---|
| **`maurogasta-crypto/datos`** — *éste* | el panel **y el reglamento**: HTML, CSS, JavaScript, `protocolos/` y `herramientas/` | **público** | un cascarón y reglas de trabajo. Cero datos |
| `casaverdecanas-blip/datos` | lo que no puede ser público | privado | `secretos/` (hasta que esté en `fichas/`), los partes viejos y los fixtures del banco |

**Esto cambió el 2026-09-12**, y vale saber qué cambió y qué no. Los protocolos
se mudaron acá: tenerlos en un repositorio privado de otro dueño costaba, en cada
sesión nueva, acordarse de agregarlo — y una regla que sólo llega si alguien se
acordó de algo no es una regla. Antes de traerlos se auditó el repo privado
entero: tres archivos traían titularidad de cuentas o los UID del agente, y eso
se reemplazó por un puntero a la bóveda.

Lo que **no** cambió: **acá no entra un solo dato.** Ni fichas, ni
titularidades, ni contactos, ni números, ni partes. Este repositorio lo lee
cualquiera, y los `.md` se sirven en texto plano por Pages. La diferencia es que
ahora «dato» y «regla» son cosas distintas: la regla es pública, el dato no.

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
> la "proteja" rompiendo el panel. Ver
> [`protocolos/PROTOCOLO-SECRETOS.md`](protocolos/PROTOCOLO-SECRETOS.md).

## Las dos zonas, que nunca se mezclan

Es la idea de fondo de todo el panel:

| | Quién lo escribe | ¿Pasa por el chat? | Dónde |
|---|---|---|---|
| **El estado de los proyectos** — pendientes, tandas, historia, reglamento | Claude, directo, desde el 2026-09-11 | **sí**, y está bien: no es sensible | `proyectos/`, `pendientes/`, `tandas/`, `protocolos/` |
| **La bóveda** — titularidad de cuentas, contactos, números, contraseñas | **sólo Mauro**, escribiendo en el panel | **nunca** | `fichas/`, `claves/` |

**Esto cambió el 2026-09-11, y conviene saber exactamente cuánto.**

Hasta esa mañana Claude no tenía credenciales de `datos-830f8`: generaba un
JSON, Mauro lo pegaba y lo aplicaba. Eso costaba un toque suyo por tanda, y era
la fricción que pidió sacar. Ahora el agente escribe la primera fila directo.

Lo que **no** cambió es la segunda fila, y ahí está todo lo que importa: la
bóveda le está negada, de lectura y de escritura, por las reglas publicadas —
no por la buena voluntad de ningún archivo. Entra con un usuario común de
Authentication, así que todo lo que hace pasa por las mismas reglas que
cualquiera.

**Y `fichas/` entró a la bóveda esa misma tarde.** La v2 de las reglas se la
había dado al agente, confiando en que ahí no fueran contraseñas. La primera
verificación del acceso encontró adentro de una ficha un usuario y una
contraseña reales de un servicio. Las reglas hicieron exactamente lo que decían
hacer; el dato estaba en el lugar equivocado. **El sello es por lugar, no por
contenido:** ninguna regla puede adivinar que un campo llamado `valor` es una
clave, así que la colección donde una credencial *puede* aparecer es una bóveda,
se llame como se llame.

Se perdió que el agente mantuviera las fichas técnicas solo. Se ganó que no
quede ninguna colección abierta donde una contraseña pueda caer por descuido.

### El tablero: en qué app, qué primero, y qué traba qué

Arriba de todo hay un **selector de app**. Todo lo que se ve cuelga de él —los
contadores, la lista, y las reglas de la otra solapa—, y se recuerda en el
teléfono: quien abre el panel casi siempre viene a seguir con lo de ayer.

Debajo, la lista **no es una lista**: son dos bloques.

| | |
|---|---|
| **Te toca a vos** | lo que no puede avanzar sin Mauro |
| **Lo hago yo** | lo que espera a un agente |

Están separados a propósito, y no como un cartelito adentro de cada tarjeta:
son dos trabajos distintos y se leen en momentos distintos.

**La urgencia.** Tres niveles —*primero*, *después*, *cuando se pueda*— y no
cinco: con cinco nadie usa los del medio y todo termina siendo «alta». La
propone Claude al escribir el pendiente; Mauro la corrige acá si no coincide con
lo que le urge.
Dentro de cada bloque manda la urgencia, no el nombre.

**Las trabas.** Un pendiente puede declarar `esperaA: ["otro:id"]`. De ahí sale
todo lo demás **solo**:

- la que espera se muestra apagada y va al final: no se puede empezar;
- la que traba dice a cuántas traba;
- arriba de la lista aparece un aviso con cuántas cosas se destrabarían;
- cuando la que trababa se marca hecha, **la traba desaparece sola**. Es
  derivada, no un dato que alguien tenga que acordarse de borrar.

Se declara en una sola dirección a propósito. Escribir las dos puntas es
garantizar que un día una quede sin la otra.

### El panel es el canal, y desde `panel-16` es el canal entero

Es el motivo de existir de todo esto. Ahora funciona así:

1. **Yo escribo en la base.** Qué está pendiente, y **preguntas**: lo que
   necesito que confirmes, aceptes, valides o decidas.
2. **Vos contestás acá, a tu ritmo.** Tocás un pendiente, lo abrís, escribís la
   respuesta, marcás en qué estado quedó y de quién depende ahora. Podés dejarlo
   a medias y volver mañana.
3. **Yo lo leo de la base** al empezar la ronda siguiente.

Lo que esto compra: **que nada quede olvidado por avanzar.** Mientras se
desarrolla un punto, los anteriores no se hunden en el historial de una
conversación — quedan acá, contados, con su pregunta a la vista.

El chat sigue abierto para lo que se resuelva al vuelo. Son dos caminos, no uno
que reemplaza al otro.

> **La solapa «Parte» se retiró en `panel-16`.** Era el paso 3 de la versión
> vieja: un JSON que yo generaba, que vos pegabas y aplicabas después de
> revisarlo. Existía porque hasta el 2026-09-11 un agente no tenía credenciales
> de `datos-830f8` — y desde que las tiene, era un rodeo de dos pasos para
> llegar a un lugar donde ya estaba parado. Se fue entera: la entrada por
> archivo, la revisión, el aplicar por lotes y la exportación.
>
> **Lo único que se perdió con ella es la exportación**, que era la única forma
> de sacar un respaldo desde el teléfono. Hoy el respaldo lo hace el agente con
> `node herramientas/firestore.mjs panel bajar`, que vive acá. Si algún
> día hace falta un botón para bajarlo sin agente, se agrega — pero como un
> volcado de la base, no como el formato de intercambio que era.

**El apretón de manos.** Cada pendiente lleva una marca `tocado`: se enciende
cuando vos guardás algo y **se apaga sola** cuando yo vuelvo a escribir ese
pendiente, o sea cuando ya lo vi. Sirve para lo mismo que antes: que no haya que
comparar a ojo qué tocaste desde la última vez.

> **Y acá hay un grado menos de garantía que antes, que conviene decir en voz
> alta.** Hasta `panel-15`, si mi parte no mencionaba tu respuesta, el panel la
> preservaba: era un mecanismo. Hoy escribo con `escribir()` de
> `herramientas/firestore.mjs`, que **reemplaza el documento entero** — de ahí
> sale que `tocado` se apague solo, y de ahí sale también que tu respuesta se
> pierda si no la leí antes de escribir. O sea que lo que la protege ya no es un
> mecanismo sino **la disciplina de leer antes de escribir**. El banco lo prueba
> en las dos direcciones (grupo 13), justamente para que no se olvide.

### Lo primero: qué depende de vos, y en qué orden

Arriba del tablero, desde `panel-16`. El panel ya sabía todas estas cosas y las
tenía repartidas en tres pantallas, así que para saber qué hacer primero había
que recorrerlas y sumar de cabeza. Ahora están juntas y cada una lleva a su
lugar de un toque.

**El orden no es estético, y conviene que no se toque:**

1. **Las reglas sin publicar.** Primero porque son lo único de la lista que deja
   una base abierta mientras espera, y porque nadie más que vos puede hacerlas:
   publicar reglas es entrar a la consola de Firebase con tu cuenta.
2. **Las preguntas sin responder.** Segundas porque cada una tiene a un agente
   parado esperando.
3. **Los pendientes que te esperan.** Últimos porque no bloquean a nadie más, y
   porque ya tienen su propia urgencia adentro.

Las trabas no entran ahí: tienen su propio aviso, arriba de la lista, y no
dependen del filtro. Repetirlas sería ruido.

Cuando no hay nada, lo dice. Un bloque vacío deja la duda de si no hay nada o si
no cargó.

### Las tandas: cómo fue cambiando

Desde `panel-17`. El panel se describe desde el día uno como «qué está
pendiente, quién lo tiene que hacer **y cómo fue cambiando**». Las dos primeras
tenían pantalla; la tercera no — por eso `tandas/` estaba declarada en las
reglas y vacía desde que se creó.

Es una solapa de **lectura**, y a propósito: es el registro de lo que hizo un
agente. Si se pudiera editar dejaría de ser un registro para pasar a ser otra
lista que mantener. Lo escribe quien hizo el trabajo, con la herramienta, en la
misma tanda.

Cada tanda lleva `fecha`, `titulo`, `proyectos` (puede tocar varios), `entrega`,
`porQue` y opcionalmente los `sellos` que subieron. Sigue al selector de app
como todo lo demás, y se ordena de la más nueva a la más vieja: lo que se quiere
ver al abrir es qué pasó último.

### Las reglas

Los protocolos vivían sólo en `casaverdecanas-blip/datos`, que se lee desde una
computadora. Acá se trabaja desde el teléfono, así que en la práctica no se
leían — y **una regla que nadie lee no es una regla**. Ahora están en la solapa
«Reglas», y se pueden tocar.

Cada regla tiene un **ámbito**, que **sale del catálogo de proyectos**: un
proyecto nuevo trae su ámbito solo, sin tocar código. La distinción es el punto:

- **Para todos** — vale en los cinco proyectos.
- **Un sitio** — sólo ahí, porque usa otras herramientas o puede otras cosas.
  Netlify existe en Casa Verde y no en los otros; sólo `remate` separa monedas.

Y una **vigencia**: vigente, propuesta o retirada. Una regla que dejó de
aplicarse se marca retirada en vez de borrarse: así queda por qué existió.

**La auditoría.** Arriba de la solapa hay una caja con la fecha de la última.
Es el momento de mirar si una mejora que salió en un sitio se aplicó en los
otros que hacen lo mismo — **una herramienta que sirve en uno y no se llevó a
los demás es trabajo hecho dos veces**. Lo que salga de la auditoría entra como
pendientes, igual que todo.

Las reglas las escribo yo en la base, como los pendientes, y vos las corregís
acá. Cada una que tocás queda marcada con `tocado`, así sé cuáles revisar sin
compararlas a ojo.

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

**La compilación vieja de Pages —la de «Deploy from a branch»— no corre para
los push de una app de GitHub**, y todos los push de un agente son de esa clase.
El sitio se quedó sirviendo la tanda 1 mientras el repositorio ya iba por la
cuarta: cinco commits en `main` y ni una publicación. Parecía caché del
teléfono, y no lo era.

Un workflow propio sí corre: comprobado el 2026-09-09, dos publicaciones
seguidas disparadas por push de la app. Así que **cada tanda se publica sola**.
El `workflow_dispatch` está igual, para pedirla a mano cuando haga falta —por
ejemplo después de cambiar un ajuste de Pages, que no es un push.

**Requiere que Pages esté en `Settings → Pages → Source: GitHub Actions`.** Con
la opción vieja («Deploy from a branch») este archivo no hace nada y el problema
vuelve.

## Los archivos

| Archivo | Qué hace |
|---|---|
| `index.html` | el panel entero: tablero, sitios, las reglas, fichas, la puerta |
| `nucleo.js` | el núcleo: la puerta, avisos, errores con causa, fechas locales |
| `firebase-init.js` | **el único contacto con el SDK de Firebase**, que baja diferido: ver «El SDK no viene puesto» |
| `estilos.css` | el sistema de diseño; los respiros son variables, no números |
| `reglas.txt` | **la plantilla de las reglas de Firestore**, con marcadores en vez de UID. La lee el panel |
| `pruebas-reglas.mjs` | el banco de pruebas de «La puerta»: `node pruebas-reglas.mjs`, sin npm |
| `protocolos/` | **el reglamento del ecosistema**, desde el 2026-09-12. Los cuatro protocolos y `ESTADO-DE-LOS-TRES.md` |
| `herramientas/` | `firestore.mjs`, con lo que una sesión de Claude lee y escribe las cuatro bases, y cómo darle de alta en una nueva |
| `sw.js` | el service worker: hace que se instale y abra sin señal |
| `manifest.json` | nombre, colores e iconos de la app instalada |
| `icono-192.png` · `icono-512.png` · `apple-touch-icon.png` | el icono del tablero |
| `.github/workflows/pages.yml` | publica el sitio; el único workflow, sin secretos |

## Los sellos de versión

Cada archivo con lógica lleva su número, **visible arriba del panel**. Ante
cualquier rareza, lo primero que se mira es qué versión está sirviendo el
teléfono.

| Archivo | Constante | Valor |
|---|---|---|
| `nucleo.js` | `P.VERSION` | `nucleo-4` |
| `index.html` | `P.PANEL` | `panel-17` |
| `estilos.css` | (en el comentario) | `estilos-8` |
| `firebase-init.js` | (en el comentario) | `init-3` |
| `sw.js` | `VERSION` | `panel-shell-v8` |

> Esta tabla es derivada. Si no coincide con lo que muestra el panel, **manda el
> panel**: la tabla se copia a mano y se desactualiza en silencio.

**El sello también va en la dirección**, y esto no es decorativo: `index.html`
pide `estilos.css?v=estilos-8` y `nucleo.js?v=nucleo-4`. Sin ese número, el
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

## Las reglas, y el usuario del agente

Desde el **2026-09-11** hay **dos identidades** en `datos-830f8`:

| | Qué puede |
|---|---|
| **Mauro** | todo, sin excepción |
| **El agente** (Claude Code) | `proyectos/`, `pendientes/`, `tandas/`, `protocolos/` — lectura y escritura. Nada más |

La solapa «La puerta» tiene un campo para pegar el **UID del agente**. Se pega
**una sola vez**: queda guardado en ese teléfono y las reglas salen completas
cada vez que entrás. Si está vacío, salen igual, pero sólo para vos: el lugar
del agente queda con un valor que ningún usuario de Firebase puede tener.

### De dónde sale el texto que se pega (cambió en `panel-15`)

**`reglas.txt` es la plantilla, y es la única copia del texto.** Los dos UID
están puestos como marcadores —`TU-UID-ACA` y `UID-DEL-AGENTE`— porque este
repositorio es público y **un UID real no entra nunca**. El panel baja ese
mismo archivo, le pone los valores adentro y muestra el resultado en la
solapa. Esa versión completa existe en pantalla y en ningún otro lado: ni en un
archivo, ni en un commit, ni en un chat.

Hasta `panel-14` las reglas estaban escritas **dos veces**: en `reglas.txt` y,
otra vez a mano, adentro de `index.html`. Dos copias del mismo texto que había
que acordarse de tocar juntas — el error que este ecosistema ya cometió cuatro
veces con los sellos. Ahora si cambiás una línea de `reglas.txt`, cambia sola
la que el panel ofrece copiar.

Dos detalles que hacen que esto no muerda:

- El párrafo de `reglas.txt` que dice «esto es una plantilla, no se pega tal
  cual» está entre dos marcas `--8<--`, y **el panel lo reemplaza** por el que
  corresponde. Pegar en la consola un texto que dice «esto no se pega» es pedir
  que alguien —vos, en seis meses— dude de lo que está viendo. Si borrás las
  marcas no se rompe nada: sale el texto entero.
- Si `reglas.txt` no baja, el panel lo **dice** y apaga el botón de copiar.
  Entregar medias reglas es peor que no entregar ninguna, porque se pegan igual
  y el que pega no se entera.

**Se prueba con `node pruebas-reglas.mjs`** (17 casos, sin npm y sin navegador).
No prueba la mecánica de reemplazar texto, que es trivial: prueba que
`reglas.txt`, **tal como está hoy en el repositorio**, produce reglas correctas
—que no quedan marcadores sueltos, que no se coló un UID real, que la bóveda
sigue siendo de una sola persona— y los casos límite de las marcas. Es la red
que reemplaza a la segunda copia.

**La bóveda son dos colecciones, desde la v3 (11-sep-2026):**

- **`claves/`** — contraseñas, códigos de recuperación, segundos factores:
  cualquier cosa que **abra** algo. Lo fue desde el día uno.
- **`fichas/`** — titularidad de cuentas, contactos, números. Entró después de
  que la primera verificación encontrara una contraseña real adentro de una
  ficha. Ver «Las dos zonas».

Sólo vos, y sólo desde el panel. Son las dos líneas de las reglas que no se
negocian, y el bloque 33 del banco lo verifica en cada corrida — incluido que
ninguna de las dos quede cerca de `equipo()` en el texto.

> **Por qué un usuario común y no una cuenta de servicio.** Una cuenta de
> servicio (Admin SDK) **saltea todas las reglas**: con ella la bóveda dejaría de
> estar sellada, no por una decisión sino porque las reglas ya no se aplicarían.
> El agente entra con un usuario de Authentication como cualquiera, para quedar
> adentro del mismo sistema de permisos que todo lo demás.

La contraseña del agente vive en las variables de entorno del entorno de Claude
Code, cargadas a mano. No está en este repositorio ni en ningún chat.

**Lo mismo está escrito en dos lugares, a propósito.** La herramienta que el
agente usa para hablar con la base —`herramientas/firestore.mjs` del repo
privado `datos`— tiene su propia lista de colecciones selladas, y corta antes
de salir a la red. Ese archivo da el mensaje claro; **estas reglas dan la
garantía**. Si cambia uno, cambia el otro en la misma tanda.

## Los sitios

Una **pestaña por proyecto** (solapa «Sitios»), y una más, «Todos», con el
panorama. Nace de un problema concreto: para contestar «¿cómo está casayourte?»
había que abrir cuatro cosas que nunca se miran juntas — la ficha técnica
adentro del tablero, el enlace público de memoria, las reglas en la consola de
Firebase y la explicación en el README de su repositorio.

Cada pestaña tiene, de arriba abajo:

| | Qué muestra |
|---|---|
| **Quién es y dónde se ve** | un resumen de una línea y tres botones: ver el sitio, el repositorio, y el documento que explica cómo funciona |
| **Previsualización** | el sitio real, adentro del panel, detrás de un botón |
| **Con qué está hecha** | la ficha técnica de siempre, sin los botones de fichas |
| **Quién entra a su base** | el proyecto de Firebase, dónde vive el texto de las reglas, si están publicadas, **qué colecciones NO lee el agente**, y el botón para copiarlas |
| **Qué falta** | los contadores de ese proyecto y los cuatro pendientes más urgentes |

### Publicar las reglas de un sitio, desde el panel

Desde `panel-16`. Antes el panel decía «pendiente de publicar» y ahí se
terminaba: para publicarlas había que acordarse de en qué repositorio vive el
archivo, abrirlo en GitHub, **seleccionar todo el texto en un teléfono** —que es
lo peor de todo— y recién después ir a la consola. Cuatro pasos para una tarea
que el panel ya sabía que estaba pendiente.

Ahora hay dos botones: **Copiar las reglas** baja el texto y lo deja en el
portapapeles, y **Abrir la consola** lleva a la pantalla de reglas de esa base.

- El texto se baja de `raw.githubusercontent.com`, que es la única dirección de
  GitHub que sirve el archivo pelado **y** manda `Access-Control-Allow-Origin`.
  La que guarda `proyectos/` es la de mirarlo, y se convierte en el momento. Los
  cuatro repositorios son públicos, así que esto no necesita ningún servidor.
- Se baja **al tocar**, no al pintar la pantalla: son cuatro archivos de varios
  kilobytes y bajarlos todos para copiar uno es regalar la conexión.
- **La base del propio panel es la excepción.** Su `reglas.txt` es una plantilla
  con marcadores, no un archivo para pegar: publicarla tal cual dejaría afuera a
  todo el mundo, porque ningún usuario tiene un uid llamado `TU-UID-ACA`. Para
  esa base el botón lleva a «La puerta», que es donde se le ponen los UID. Y si
  igual se intentara copiar una plantilla, el panel lo detecta y se niega: es el
  cinturón por si otro proyecto adopta la misma forma y nadie se acuerda.
- Si el archivo no baja, lo dice con el motivo. Un 404 no es un problema de
  señal: significa que el archivo se movió y hay que corregir `reglasUrl`.

**La previsualización va detrás de un botón, no puesta.** Cuatro `iframe` son
cuatro sitios enteros bajando en un teléfono cada vez que se abre la pantalla.
Y puede quedar en blanco sin que sea un error del panel: hay servidores que
prohíben que su página se muestre metida adentro de otra. Para eso el botón
«Ver el sitio» sigue estando, y es el camino que siempre funciona. El marco va
con `sandbox` y sin `allow-same-origin`: la página de adentro se muestra, pero
no puede tocar el almacenamiento ni la sesión del panel.

Todo lo que se pinta ahí sale de `proyectos/`, que **no es sensible**: los
campos `sitio` y `acceso` los escribe el agente. Las fichas siguen en su
pantalla y no se mezclan — es la regla de fondo del panel, y esta pantalla no
la toca.

Los campos nuevos son **todos opcionales**, y falta cualquiera sin romper nada:
un proyecto recién dado de alta tiene nombre y poco más, y la pantalla tiene
que servir igual desde ese día.

```
sitio  { url, repo, readme, resumen, sinPrevia }
acceso { base, reglas, reglasUrl, estado, selladas[], nota }
```

**La vista «Todos»** ordena los proyectos por lo que queda abierto, con una
barra de cuánto está hecho, y marca en rojo los que tienen **reglas sin
publicar**. La pregunta que contesta es «¿por dónde sigo?», y por eso lo
primero de cada fila es el número y no el nombre.

## La ficha técnica de cada app

Al elegir una app en el selector, arriba de los contadores aparece **con qué
está hecha**: repositorio y quién lo administra, enlace público, base de datos,
Netlify si usa, y lo que sea que tenga configurado.

**Son las dos zonas de siempre, y el renglón es el puente entre ellas.**

| | De dónde sale | Quién la escribe |
|---|---|---|
| Lo que se ve de entrada | `proyectos/<id>.tecnica` | lo escribe Claude directo en la base. **No es sensible** |
| Lo que trae el botón «ver» | `fichas/`, filtradas por proyecto | **sólo Mauro**, en la solapa Fichas. **No viaja** |

Un renglón de `tecnica` es `{ clave, valor, nota?, buscar? }`. `buscar` es con
qué se rastrean las fichas de ese proyecto, y existe porque el renglón puede
llamarse «Base de datos» y la ficha «Firebase»; si no está, se busca por
`clave`.

**El botón dice cuántas fichas hay antes de tocarlo**, y se apaga si no hay
ninguna: un botón que a veces no muestra nada enseña a no tocarlo.

> **Lo que no hace, y no es un olvido.** No hay ningún botón que junte las
> fichas en un texto listo para pegar — ni acá ni en la solapa Fichas. Ese
> botón sería el camino por el que lo sensible se filtraría, y sin él el camino
> no existe. Para copiar un valor suelto está el botón de cada campo, que copia
> **uno** y a propósito. El banco de pruebas lo verifica en el bloque 32.

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

## La app instalable

Se instala en el teléfono y abre sin señal.

**Cómo se instala.** Abrí https://maurogasta-crypto.github.io/datos/ en Chrome →
menú de tres puntos → **Instalar aplicación** (o «Añadir a la pantalla de
inicio»). Queda con su icono, sin la barra del navegador.

**Cómo funciona.** `sw.js` guarda el cascarón —`index.html`, `estilos.css`,
`nucleo.js`, los iconos— y **Firestore guarda los datos** con su caché
persistente (`firebase-init.js`). Sin las dos cosas, el panel abriría sin señal
y estaría vacío, que no sirve de nada.

### El SDK no viene puesto

**Lo que el cascarón guarda no alcanza para que el panel funcione**, y hasta el
sello `init-2` eso se veía de la peor manera. `firebase-init.js` empezaba con
tres `import` estáticos desde `gstatic.com`. Un `import` estático es una
dependencia dura: si el CDN no contesta —falta de señal, una red que filtra
dominios, gstatic caído— ese módulo no evalúa; y como `nucleo.js` lo importa,
tampoco evalúa; y como el panel importa el núcleo, tampoco. **La página quedaba
en blanco, sin un solo mensaje** — justo después de que el service worker
hubiera servido perfecto el HTML, el CSS y el JS. La app instalada parecía rota.

Desde `init-3` el SDK entra por `import()` dinámico, dentro de un `try`, cuando
el arranque lo pide. Si no llega, **el panel abre igual y dice qué falta**, con
un botón de Reintentar para cuando vuelva la señal.

Lo que hace que eso no obligara a reescribir el panel entero: `firebase-init.js`
exporta `let`, no `const`. Un `export let` es un **enlace vivo** — quien hizo
`import { doc } from "./firebase-init.js"` ve el valor que la variable tenga al
usarla, no el que tenía al importar. Así `cargarFirebase()` los rellena y los
treinta y pico de lugares que escriben `doc(db, …)` siguen igual.

> **La contra, que hay que saber:** antes de que `cargarFirebase()` resuelva,
> `db`, `auth` y todas las funciones del SDK valen `undefined`. Nada que dependa
> de Firebase puede correr al nivel superior del módulo. Por eso el arranque la
> espera primero, y por eso el banco de pruebas tiene el bloque 30, que corre el
> panel con el SDK caído a propósito.

Salió del hallazgo **A2** de la primera auditoría de protocolos: la regla
`general:cdn-diferido` estaba escrita, era de ámbito general, estaba vigente, y
no se cumplía en ninguno de los cuatro sitios. Este es el primero que la aplica.
Los otros tres siguen pendientes.

### Red primero, caché de respaldo

La estrategia es **red primero, caché de respaldo**: estando en línea siempre se
sirve lo último, y la caché sólo entra cuando la red falló. Con caché primero,
una tanda nueva no llegaría hasta que el teléfono decidiera revalidar — y esto
se toca todos los días. Es la misma estrategia de CasaYourte, traída tal cual.

> **Si cambia un archivo de la lista `SHELL`, sube la `VERSION` de `sw.js`.**
> Si no, el teléfono sirve una mezcla de viejo y nuevo: parece que el despliegue
> no hizo nada y en realidad hizo la mitad.

La lista `SHELL` **no repite los `?v=`** a propósito: sería la tercera copia del
mismo número —el sello, la dirección y la lista—, y ese es el error que este
ecosistema ya cometió cuatro veces. En su lugar, la búsqueda en caché ignora la
parte del `?` (`ignoreSearch`). Eso el panel se lo devuelve a los otros: allá la
lista sí repite los nombres.

## Lo que falta

- **Nada urgente.** La lista original de la tanda 1 está completa.
