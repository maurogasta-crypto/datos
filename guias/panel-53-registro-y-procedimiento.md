# panel-53 · Registro de tanda y procedimiento de intervención para invitados

Repositorio `datos` · 10-nov-2026 · pedido de Mauro

> **Para quien lea esto sin haber estado en la sesión** (una sesión automática de Claude, un invitado, un chat nuevo): este archivo tiene tres partes.
> **Parte 1** es el registro de lo que se hizo y lo que quedó pendiente. **Parte 2** es el procedimiento que se siguió, explicado paso a paso, para que cualquier invitado lo repita. **Parte 3** es lo que hay que construir en el panel para que ese procedimiento sea una guía automática, sin IA en el medio.
> Lo que está marcado **[verificado]** se comprobó en la sesión. Lo marcado **[a validar]** es una propuesta o algo que no se pudo ver.

---

## Parte 1 · Registro de la tanda

### El pedido

1. Que Florencia (invitada, colaboradora) vea la sección **«Otros pendientes»** con su historia, igual que la ve Mauro, y poder **habilitarla o quitarla por persona**.
2. Que Mauro pueda entrar al **panel completo** (`index.html`) con su sesión de administrador.

### Lo que se subió al repositorio: solo `index.html`

Tiene dos cambios **[verificado con `node --check`; no probado en el navegador]**:

1. **Redirección de invitados (`entrarAlPanel`).** Antes, cualquier cuenta con ficha en `personas/` iba a `invitado.html`. Mauro tiene ficha, así que no podía entrar al panel. Ahora, si hay ficha, se hace `getDoc(lineas/_acceso)`. `lineas/` solo la lee el equipo, así que:
   - `permission-denied` significa que es un invitado y va a `invitado.html`.
   - Si contesta, o falla por otro motivo (sin red), se queda en el panel.
2. **Casilla en Puerta.** En la tarjeta de cada persona hay una casilla «Ve "Otros pendientes", con su historia». Viene tildada por defecto. **Guardar** escribe `pendientes: true/false` en `personas/{uid}` con `merge`. El alta (`Aprobar`) no escribe el campo.

> **Actualización 12-nov-2026.** El `invitado.html` del zip `subir-al-repositorio-panel-53.zip` YA trae este interruptor (`persona.pendientes !== false`), además de los puntos de enlace de «Intervenir una sección». Una versión anterior del zip lo había perdido; se corrigió. Subir ese `invitado.html` cierra la mitad que falta de la casilla de Puerta. Si todavía no están publicados `intervenir.js` ni las reglas v10, subirlo solo es inofensivo: la sección nueva simplemente no aparece.

### Lo que NO se subió, y deja la función a medias

`invitado.html` quedó como estaba. Quien **lee** el campo `pendientes` es una versión modificada de `invitado.html` que no se subió. Sin ella, la casilla guarda el dato pero no cambia lo que ve nadie.

Cambio pendiente en `invitado.html`, dentro de `pintar()`, en la línea que arma «Otros pendientes»: reemplazar

```
${sueltos.length ? `<details class="nivel"><summary>…Otros pendientes…
```

por

```
${sueltos.length && persona.pendientes !== false ? `<details class="nivel"><summary>…Otros pendientes…
```

Sin el campo, o con `true`, la sección se ve como siempre. `chat.js` no cambia.

### Lo que se probó y se descartó

Se probó un campo `preguntas: true` con una tarjeta aparte de «preguntas de desarrollo». **Se revirtió.** Sacaba de «Otros pendientes» los pendientes abiertos con `pregunta` escrita (como R15) para quien no tuviera el campo, incluido Mauro. **No hay que volver a esa versión.**

### Sin cambios

`reglas.txt` no cambió. Los invitados siguen pudiendo leer todos los pendientes de sus proyectos (`allow read: if persona() && resource.data.proyecto in susProyectos()`). La casilla **solo oculta la sección en pantalla**; no es una barrera de seguridad.

### Pendiente de verificar

Si Florencia no ve «Otros pendientes» con la casilla tildada, el motivo está en sus datos y no en la pantalla. Se prueba con **👁 Ver como** en su tarjeta de Puerta, revisando:

- que Casa Verde esté marcado en su ficha;
- que el id coincida con el campo `proyecto` de los pendientes;
- que diga «Entra» y no «Pausado».

### Nota técnica

El sello visible (`P.PANEL = "panel-52"`) no se cambió; el cambio quedó marcado como panel-53 solo en un comentario. Si `sw.js` lleva versión de caché, hay que subirla para que los teléfonos tomen el `index.html` nuevo **[a validar: no se vio `sw.js`]**.

---

## Parte 2 · El procedimiento, tal como se hizo

Este es el recorrido de la sesión, convertido en pasos que sirven para cualquier intervención. Lo hizo Mauro con su chat de Claude; lo mismo vale para Florencia, Mariano o cualquier invitado futuro.

### Paso 1 · Decir qué se quiere cambiar y qué se ve mal

Se empezó con el síntoma, en una frase y con una captura: «Florencia no ve las preguntas de diseño» y «no puedo entrar al panel con mi cuenta de administrador».

**Regla:** primero el síntoma, sin proponer la solución. El chat necesita saber qué se ve mal y qué se esperaba ver.

### Paso 2 · Llevar al chat los archivos correctos

Se llevaron, de a poco y a medida que el chat los pedía:

| Qué se quería cambiar | Archivos que se llevaron | Qué más se llevó |
|---|---|---|
| Qué ve un invitado en su página | `invitado.html`, `chat.js`, `reglas.txt` | Un pendiente y una ficha de `personas/`, copiados de la consola de Firebase |
| Cómo se habilita o pausa a una persona, y quién entra al panel | `index.html` (función `pintarPersonas` y `entrarAlPanel`), `reglas.txt` | La ficha de la persona |
| Quién puede leer o escribir qué | `reglas.txt` | Nada más; las reglas **publicadas** las arma el panel en «La puerta» |

**Reglas de este paso:**

- Se llevan **solo** los archivos de la tabla, no el repositorio entero.
- Nunca se pega un UID real ni una clave en el chat. `reglas.txt` del repositorio es una plantilla con marcadores (`TU-UID-ACA`) justamente por eso.
- Además de archivos, se lleva **un dato real**: el chat no puede adivinar los campos de un documento. En esta sesión, ver los campos de `casaverde:A7` y `casayourte:D10` en la consola mostró que ninguno tenía `tipo`, y eso cambió el diagnóstico.

### Paso 3 · Que el chat diagnostique antes de tocar

Orden que se siguió:

1. Leer `reglas.txt` y responder si las **reglas** dejan o no.
2. Leer la página y responder si la **pantalla** filtra algo.
3. Mirar los datos reales para ver si el problema está en los datos.

Solo después de ubicar la causa se escribe un cambio. En esta sesión la causa de lo de Mauro estaba en una sola línea de `index.html`.

### Paso 4 · Que el chat entregue archivos completos, revisados y acotados

- **Archivos completos**, listos para subir. Nunca fragmentos para pegar.
- **Revisados** con `node --check` antes de entregar.
- **Cambios mínimos**: una línea o un bloque, no una reescritura.
- **Con una prueba** cuando se puede (en la sesión se probó el filtro de preguntas con datos de ejemplo).
- **Sin tocar `reglas.txt`** salvo que sea imprescindible. Las reglas se pegan completas en la consola y las publica Mauro; un invitado no las toca.

### Paso 5 · Probar sin riesgo antes de subir

- Para ver lo que ve otra persona: **👁 Ver como** en su tarjeta de Puerta (`invitado.html?como=<uid>`). Solo anda con la sesión de Mauro y no manda nada.
- Para ver lo que ve un invitado nuevo: la misma vista con `?como=mail:<mail>`.
- **Probar siempre con dos cuentas**: la del invitado y la del administrador. En esta sesión un cambio que parecía correcto hacía desaparecer pendientes del panel de Mauro (ver «Lo que salió mal»).

### Paso 6 · Subir al repositorio de pruebas y verlo funcionando

El invitado **no** sube al repositorio estable: sube a la **copia de pruebas** (ver «Los dos repositorios», en la Parte 3). Esa copia se publica sola, así que el cambio se ve funcionando a los pocos minutos, en su propia dirección.

- Se sube **cada archivo modificado completo**.
- Antes de subir, se anota **qué se sube y qué no**. Subir la mitad de un cambio deja una función a medias: en esta sesión se subió `index.html` y no `invitado.html`, y por eso quedó una casilla que guarda un dato que nadie lee.
- Si el sitio tiene `sw.js` con versión de caché, se sube la versión para que los teléfonos tomen los archivos nuevos.
- Se abre la dirección de pruebas, se espera a que termine la publicación y se comprueba el cambio **con la cuenta del invitado y con una de administrador**.

### Paso 7 · Devolver el resultado al chat del panel

Es lo que cierra el ciclo. Se vuelve al **chat del panel** (el mismo desde donde se bajó el archivo `.md`) y se carga un registro con esta forma:

```
## <sello> · registro de tanda · <fecha>

**Pedido:** qué se quería y quién lo pidió.
**Lo que se subió:** archivos y qué cambia en cada uno.
**Lo que NO se subió:** y qué función queda a medias por eso.
**Lo que se probó y se descartó:** y por qué, para que nadie lo repita.
**Sin cambios:** lo que no se tocó (reglas, datos…).
**Pendiente de verificar:** qué falta comprobar y cómo.
**Nota técnica:** sellos, caché, versiones.
```

Ese registro es lo que lee la próxima sesión automática. Sin él, la próxima sesión no sabe qué quedó en producción.

### Lo que salió mal en esta sesión (para no repetirlo)

1. **Un arreglo que ocultaba contenido al administrador.** Se sacó de «Otros pendientes» un tipo de pendiente y se lo mostraba en otra tarjeta solo para quien tuviera un campo nuevo. Mauro no lo tenía, así que perdía sus propias preguntas. *Se evita con el paso 5: probar con la cuenta del administrador y la del invitado.*
2. **Asumir cómo se guardan los datos.** Se supuso que las preguntas de diseño eran `tipo: "consulta"`. No lo eran. *Se evita con el paso 2: llevar un documento real de la consola.*
3. **Una redirección que trataba al administrador como invitado.** Mauro tiene ficha en `personas/`, y `index.html` mandaba a `invitado.html` a cualquiera con ficha. *Se evita preguntándole a la base, no suponiendo por la ficha.*
4. **Subir una parte.** Ver el paso 6.

---

## Parte 3 · Lo que hay que construir en el panel

**Objetivo (pedido de Mauro, aclarado):** una herramienta para **modificaciones pequeñas y no graves**, con la que alguien como Mariano **vea en vivo los cambios que hace con su chat**, sin intervención de IA en la guía y sin poner en riesgo lo que usan los clientes.

Tiene cuatro piezas: dos repositorios, un kit mínimo de archivos obligatorios, un alcance claro de qué se puede tocar, y la guía interactiva dentro del panel.

### Los dos repositorios

Se trabaja con **dos copias del mismo proyecto**:

| | Repositorio de pruebas | Repositorio estable |
|---|---|---|
| Para qué | Donde los invitados intervienen y ven sus cambios | Lo que usan los clientes y la web |
| Quién escribe | Los invitados habilitados, **directo**, sin revisión previa | **Solo Mauro** |
| Qué pasa si algo sale mal | Se rompe la copia de pruebas y se restaura | No se enteró nadie |
| Publicación | Automática, en su propia dirección | La actual |

**Flujo:** el invitado sube a pruebas, ve el cambio funcionando, lo devuelve al chat del panel con el registro (Paso 7) y **Mauro decide si lo lleva al estable**. Con este esquema el problema de «dejar que un invitado escriba en `main`» desaparece, porque ese `main` es el de la copia.

Qué significa «en tiempo real»: no es instantáneo. El repositorio actual tarda unos 2 minutos en publicar desde que se sube un cambio, según lo que ya muestra su flujo de publicación **[a validar para la copia de pruebas]**. Es lo más cerca de «en vivo» que se logra con este stack.

**Dos cosas a resolver antes de abrirlo a invitados [a validar, Mauro decide]:**

1. **¿La copia de pruebas usa la misma base de Firestore que el estable?** Si es la misma, un cambio hecho en pruebas puede escribir o borrar datos reales, aunque las reglas limiten lo que cada persona puede tocar. Lo más seguro es una base de pruebas aparte, con datos de ejemplo.
2. **Claves y permisos.** Ningún archivo de la copia de pruebas debe llevar claves de terceros ni UID reales. El repositorio es público: lo que se sube ahí lo ve cualquiera.

### Alcance: qué es una «modificación pequeña»

**Sí:** textos, estilos, mostrar u ocultar una sección, ordenar o filtrar una lista, cambiar una etiqueta, agregar una casilla que guarda un campo que ya se lee.

**No, y se lleva solo para leer:**
- `reglas.txt`: las reglas las publica Mauro, completas, desde la consola.
- `firebase-init.js` y todo lo que maneje claves o la conexión a Firebase.
- Estructura de datos: crear, renombrar o borrar colecciones o campos que otras páginas leen.
- Los flujos de publicación (`.github/workflows`) y la carpeta `servidor/`.

Si el cambio que pide el invitado cae en la segunda lista, el chat debe decirle que **eso lo hace Mauro** y anotarlo como pedido en el panel.

### El kit: se genera, no se baja a mano

**Cambió en la primera prueba (ver Parte 4).** La lista de archivos obligatorios que se había propuesto no sirve tal cual: `CLAUDE.md` pesa 65 KB y `README.md` 84 KB, unas 45 mil unidades de lectura solo entre los dos, y un chat con cupo gratuito se llena antes de empezar. Y `nucleo.js` trae en su cabecera frases que ya no son ciertas.

En cambio, el panel **arma un solo `.md` por intervención** (`paquete.js`, sello `paquete-1`), con todo lo que ese chat necesita y nada más:

| Qué trae el paquete | De dónde sale |
|---|---|
| Cómo trabajar (los 7 pasos) y las reglas del repositorio que el chat no puede romper | Un texto único en `paquete.js` y la lista `reglasDelRepo` de `secciones.json` |
| Una tabla «qué es cada parte y si se EDITA o es SOLO LEER» | `secciones.json`, campo `para` de cada archivo |
| **Las piezas** (funciones) que se pueden editar, recortadas con su número de línea | El código mismo: no se manda el archivo entero |
| **De qué depende cada pieza**: qué trae de cada módulo, qué `P.*` del núcleo usa, qué colecciones de Firestore toca, a qué otras piezas llama, quién la llama y qué elementos de la página usa | Leído del código, sin IA |
| Las **definiciones de las `P.*`** que usa, más lo que ésas usan | `nucleo.js`, recortado; la cabecera no viaja |
| Las **reglas de Firestore** de las colecciones que toca, con las funciones que llaman | `reglas.txt`, recortado a esos bloques |
| La plantilla de la devolución | `paquete.js` |

**Lo que se logra:** una intervención de la solapa Puerta pesa unas 11 mil unidades de lectura, contra más de 100 mil de mandar `index.html` y la documentación enteros.

### La guía interactiva dentro del panel

Todo sale de un archivo de mapa del repositorio, **sin IA**. Ya existe la base: el resumen en Markdown, el paquete por área, la carga de la respuesta del chat, la vista previa y las rutas crudas de GitHub **[verificado en `chat.js` e `invitado.html`; no se vio `areas.json`]**.

**Ya hecho en la tanda `paquete-1` (probado, sin subir):**

- `paquete.js`: arma el paquete, calcula las dependencias y aplica por nombre lo que devuelve el chat.
- `secciones.json`: el mapa de qué tocar, con tres intervenciones de ejemplo (`puerta-personas`, `pagina-invitado`, `textos-de-errores`).
- `herramientas/secciones.mjs`: lo arma desde la terminal (`node herramientas/secciones.mjs armar <id>`).
- `pruebas/paquete.mjs`: 61 comprobaciones, incluidas las de los archivos reales.

**Falta, por orden:**

1. **El selector en `invitado.html`.** El invitado elige «qué quiero cambiar» y el panel lee los archivos de GitHub (`raw.githubusercontent.com`, sin credencial) y llama a `construir`. El panel ya hace esa lectura para el resumen, así que no hace falta nada nuevo de red.
2. **«Aplicar cambios».** Una caja donde el invitado pega la respuesta de su chat: el panel reemplaza cada pieza por su nombre, rechaza lo que el paquete no dejó editar y lo que no parsea, y le da el archivo completo para subir. Hoy esa función existe en `paquete.js` pero no tiene pantalla; mientras tanto el paso 5 del paquete dice «reemplazá cada pieza por su nombre».
3. **La devolución guiada.** Un formulario con la plantilla del Paso 7 que se carga en el chat del panel.
4. **Que el mapa no se desactualice.** Si una pieza cambia de nombre, el paquete lo avisa arriba («el mapa está desactualizado»). Falta una comprobación en el banco de `ronda` o de `panel` que lo mire.
5. **El texto del primer archivo.** El «Cómo usarlo» de `resumenMd` pasa a explicar el paquete y a decir cuál bajar según lo que se quiera tocar.

### Texto propuesto para el primer archivo que se descarga

Para reemplazar la sección «Cómo usarlo» de `resumenMd`:

```
## Cómo usarlo

Este panel tiene dos copias: la de PRUEBAS, donde vos intervenís y ves tus cambios, y la ESTABLE, que usan los clientes. Vos sólo tocás la de pruebas.

1. En el panel, elegí «qué quiero cambiar» y bajá el PAQUETE: un solo archivo con el contexto mínimo, las piezas que podés editar, de qué depende cada una y las reglas que importan. Dáselo entero a tu chat antes de pedirle nada.
2. Escribí en «Tu pedido», dentro del paquete, qué querés cambiar y qué ves mal (una frase y, si podés, una captura).
3. Pedile que primero DIAGNOSTIQUE (qué dicen las reglas, qué hace la pantalla, qué dicen los datos) y recién después proponga un cambio.
4. Pedile archivos COMPLETOS, revisados con `node --check`, con el cambio más chico posible. Esto es para modificaciones pequeñas: si toca reglas, claves o la estructura de los datos, no lo hagas: pedíselo a Mauro.
5. Subí a la copia de PRUEBAS todos los archivos de un mismo cambio y esperá un par de minutos a que se publique. Probalo con tu cuenta.
6. Volvé al panel y cargá la devolución con el formulario: pedido, qué subiste, qué no, qué probaste y descartaste, qué falta verificar. Mauro decide si lo lleva a la copia estable.

> Para tu chat: proponé, explicá el porqué de cada cambio, y no toques reglas, claves ni la estructura de los datos.
```

---

## Parte 4 · Resultado de la primera prueba (este chat de cobayo)

Se siguió el procedimiento con este chat como si fuera el de un invitado, con los archivos que Mauro pasó. Lo que salió:

### Lo que funcionó

- **Armar el paquete sin IA.** `construir` recortó `entrarAlPanel` y `pintarPersonas` de `index.html` (214 KB), calculó sus dependencias y trajo solo 10 de las 31 piezas de `nucleo.js` y solo las reglas de `lineas`, `personas` y `solicitudes`. Los tres paquetes de ejemplo pesan 3, 9 y 11 mil unidades de lectura.
- **La vuelta, de punta a punta.** Se tomó la pieza `pintar` del paquete, se le hizo el cambio de una línea de «Otros pendientes» y se aplicó con `aplicarCambios`. El `invitado.html` resultante es **idéntico, byte por byte**, al que ya se había entregado a mano.
- **Las protecciones.** Una pieza que el paquete no dejó editar, una pieza nueva, un código que no parsea o una pieza repetida se rechazan, y el archivo queda como estaba.
- **Los archivos reales.** Las 141 funciones de `index.html`, `invitado.html`, `nucleo.js`, `chat.js` y `errores.js` se recortan enteras y parsean.

### Lo que la prueba mostró que estaba mal en el plan anterior

1. **El kit obligatorio era demasiado pesado.** `CLAUDE.md` (65 KB) y `README.md` (84 KB) no se pueden mandar enteros a un chat gratuito. Se reemplazó por las reglas esenciales del repositorio en `secciones.json` (nueve renglones, todos sacados de `CLAUDE.md`).
2. **Me equivoqué con `esquema.js`.** Lo había descrito como «el mapa del proyecto por niveles». No lo es: dibuja el esquema de globos de la página del invitado. Los datos del mapa viven en `proyectos/<id>` de Firestore, no en un archivo. No va en el kit.
3. **`nucleo.js` se contradice a sí mismo.** Su cabecera dice «Sello: nucleo-8» y «este panel es de UNA sola persona, no hay roles ni invitaciones», pero el código dice `nucleo-13` y hay invitados desde `panel-35`. Un chat que lo leyera entero se llevaría un contexto falso. El paquete no manda la cabecera. **Conviene corregirla**: es un comentario, no cambia el comportamiento.
4. **El reconocimiento de piezas de `chat.js` no ve `async function`.** Su regla (`DECL`) solo reconoce `function`, `const` y `let`, y en `index.html` la mayoría de las pantallas son `async function`. Por eso `paquete.js` tiene su propio reconocimiento y **no toca** las funciones de áreas de `chat.js`, que son copia exacta de tocatoca y las compara `pruebas/chat.mjs`.
5. **La regla vigente del repositorio es empujar directo a `main`**, y hoy no hay una copia de pruebas que yo pueda ver. El modelo de los dos repositorios sigue siendo una propuesta; el paquete tiene el campo `destino` en `secciones.json` para el día que exista.

### Pendiente de Mauro

- Confirmar el **mapa de intervenciones**: son tres de ejemplo. Falta decidir cuáles se ofrecen a los invitados y con qué piezas.
- Decidir si la **copia de pruebas** existe y con qué base de datos (ver Parte 3).
- Subir los archivos nuevos: `paquete.js`, `secciones.json`, `herramientas/secciones.mjs` y `pruebas/paquete.mjs`. Todos son archivos nuevos. **No cambian ningún archivo existente**, así que no afectan a quien use el panel hoy. Si `paquete.js` se va a pedir desde el navegador, hay que sumarlo a la lista `SHELL` de `sw.js` y subir su `VERSION` **[a validar: no se vio `sw.js`]**.
- Anotar en `CLAUDE.md` y en el `README.md` (que mantiene la regla «el README tiene que decir la verdad») qué es `paquete.js` y su banco.

---

## Parte 5 · El mecanismo genérico por secciones y el semáforo (tanda `paquete-2`)

Mauro aclaró que lo buscado **no es una herramienta para este panel**, sino un mecanismo para **cualquier sitio**: dejar registrado qué archivos y piezas forman una sección de dependencia cerrada, para que alguien edite esa sección completa en un chat gratuito y devuelva algo terminado.

### Qué es cada cosa

| Pieza | Para qué | Dónde vive |
|---|---|---|
| `secciones.json` | El mapa de un sitio: qué archivos y piezas forman cada sección, cuáles se EDITAN y cuáles son SOLO LEER, el nombre del espacio compartido (`P`, `CV2`…) | **En la raíz del repositorio de cada sitio** (como `areas.json`, pero de varios archivos) |
| `paquete.js` | Arma el paquete `.md` y reparte lo que devuelve el chat. **No sabe nada de ningún sitio**: todo lo toma del mapa | El panel |
| `semaforo.js` + `ediciones/` | El aviso «estoy editando esta sección» | El panel y las reglas v10 |
| `intervenir.js` | La pantalla del invitado: elegir, bajar, traer | El panel |
| `herramientas/secciones.mjs` | Desde la terminal: `analizar` propone un mapa para un sitio que no lo tiene, `verificar` arma todas las secciones y avisa si alguna quedó desactualizada, `armar` arma un paquete | El panel |

### Cómo se suma un sitio nuevo

1. Correr `node herramientas/secciones.mjs analizar <carpeta> --espacio <CV2|P|…>` sobre el sitio: propone **una sección por página**, con lo que esa página importa como SOLO LEER. Sale marcado `REVISAR`.
2. Una persona (o una sesión) lo revisa: pone el título y el «qué es» de cada sección, y para las páginas grandes elige las **piezas** (`tramos`) que se pueden editar en vez de la página entera.
3. Se publica como `secciones.json` en la raíz del repositorio del sitio, y el sitio queda registrado en el panel con su `sitio.repo`.

**Probado con Casa Verde** (otro sitio, otro espacio de nombres, sin tocar el código): el analizador propuso nueve secciones, y el paquete del «Gestor de sesiones» salió de ocho piezas de `gestion-sesiones.html` y dos del motor de honorarios, con el núcleo `CV2` recortado, en unas 7 mil unidades de lectura. Devolver las ocho piezas sin cambios deja el archivo **idéntico**, y un cambio de una línea cambia **una sola línea**.

### El semáforo

- **Se pone** cuando la persona toca «Bajar el paquete y avisar que la edito». Si otra persona tiene el aviso vivo, el panel no deja bajarlo con aviso (se puede bajar «solo para mirar»).
- **Se levanta** cuando la persona trae la respuesta y quedan archivos listos sin conflicto. También se puede soltar a mano.
- **Vence solo** a las 24 h (tope de las reglas: 48 h): si alguien se olvida, no queda trabado. Se rompe hacia el verde.
- **No es solo un cartel:** las reglas v10 no dejan a una persona pisar el aviso vivo de otra, ni escribir uno a nombre ajeno, ni en un proyecto que no es suyo.
- **Choques por demora de publicación:** el aviso guarda una huella de cada pieza al bajar. Al traer la respuesta, el panel lee los archivos como están **en ese momento**; si una pieza cambió, avisa y **no levanta el aviso**.

### Qué está cubierto y qué no, de lo que Mauro pidió

| Pedido | Estado |
|---|---|
| Mecanismo para cualquier sitio, con secciones de dependencia cerrada | **Sí.** Probado con dos sitios. El veredicto «¿está cerrada?» se calcula con los `import`/`export` del sitio |
| Un chat gratuito resuelve la fracción y devuelve algo terminado | **Sí, por tamaño** (3 a 15 mil unidades por paquete). No se probó con un chat gratuito ajeno a este |
| Devolver los archivos y reemplazar los de GitHub | **Parcial.** El panel arma los archivos completos y da «Archivo completo», «Copiar» y enlaces a GitHub para reemplazar. **El commit lo hace la persona**, que necesita permiso de escritura en el repositorio. Un commit directo desde el panel exigiría un token en un servidor (no se construyó: es una decisión de seguridad de Mauro) |
| Semáforo desde que se baja hasta que se trae la respuesta | **Sí**, con las reglas v10 publicadas antes que el código |
| Documentación para que otra sesión retome | **Sí.** Al traer la respuesta se crea un pedido en el panel con el resumen y la respuesta completa; «Ya lo subí» lo anota después |
| La sesión general revisa y corrige | **Falta una pieza:** la ronda todavía no lee `ediciones/`, así que no ve quién está editando qué |

### Lo que hay que hacer, en este orden

1. **Publicar las reglas v10** (`reglas.txt` actualizado) desde «La puerta», **antes** de subir el código. Sin ellas, «Bajar el paquete y avisar» falla con `permission-denied`.
2. **Probar las reglas** con el simulador de la consola o con `pruebas-reglas.mjs`. Casos a agregar: aviso propio en proyecto propio (permite); con `uid` ajeno (niega); en proyecto ajeno (niega); `venceEn` a más de 48 h (niega); `desde` distinto de la hora del servidor (niega); pisar el aviso vivo de otra persona (niega) y uno vencido (permite); campo de más (niega); borrar el propio (permite) y el ajeno (niega); equipo todo (permite). **No pude correr las reglas**: están revisadas a mano y falta esa prueba.
3. **Confirmar que `firebase-init.js` exporta `deleteDoc`, `serverTimestamp` y `Timestamp`.** No vi ese archivo. Si falta alguno, la pantalla lo dice y deja bajar el paquete solo para mirar.
4. Subir `paquete.js`, `semaforo.js`, `intervenir.js`, `secciones.json`, `herramientas/secciones.mjs`, `pruebas/paquete.mjs` e `invitado.html`; sumar los módulos nuevos a la lista `SHELL` de `sw.js` y subir su `VERSION` **[a validar: no se vio `sw.js`]**.
5. Dar permiso de escritura en GitHub a quien vaya a subir cambios.
6. Que la ronda lea `ediciones/` y las muestre como una línea más de trabajo.
7. Anotar en `CLAUDE.md` y `README.md` qué es `secciones.json` y su banco.

---

## Parte 6 · Mapa del sitio, dependencias automáticas y archivo entero (tanda `paquete-3`, 14-nov-2026)

Se agregó lo que pidió Mauro: que **cada sitio tenga un mapa** de qué es cada archivo y dónde está, y que el chat lo tenga siempre para poder pedirle a la persona el archivo exacto que le falte.

- **El mapa vive en el repositorio** como `MAPA.md` (o dentro del `README.md`: `"mapaDoc"` en `secciones.json`). El paquete lo **incrusta entero**, con la dirección de descarga de GitHub, y le dice al chat que **no suponga ni invente**: que pida a la persona el archivo, de a uno y el más chico que alcance.
- `node herramientas/secciones.mjs mapa` crea o actualiza `MAPA.md`: conserva lo que una persona escribió, agrega los archivos nuevos con la descripción de su encabezado y recalcula la columna «Usa». Si el mapa está en un `README.md`, no lo regenera. `verificar` avisa archivos sin describir y filas huérfanas.
- **Dependencias automáticas:** el paquete incluye, solo para leer, lo que las partes editables importan de otros módulos del sitio, recortado a lo que usan y siguiendo los imports de ésos. `noIncluir` en `secciones.json` evita que viaje la conexión a Firebase.
- **Archivo entero:** un archivo marcado EDITAR sin `tramos` se devuelve completo. Sirve para HTML y CSS. El panel revisa los `<script>` del HTML, avisa si el archivo quedó mucho más corto y detecta si alguien lo tocó en el medio. Un fragmento nunca se toma como archivo entero.
- **Aviso de verificación:** al traer la respuesta, la pantalla dice que solo se revisó que el código parsee y nombra el comando a correr (`verificacion`).
- **`--raiz`** apunta la herramienta a otro sitio: `node herramientas/secciones.mjs armar <id> --raiz ../paseo`.
- **Error corregido:** la última pieza de un `<script>` arrastraba el cierre de la página y reemplazarla truncaba el archivo.
- **Probado con `paseo`** (12 archivos): siete modificaciones simuladas con el banco propio del sitio (24 casos) como juez. Ver `paseo/prueba-de-modificaciones.md`.
- **Pendiente:** probar con `rematetaller` (no se tuvieron sus archivos); completar las descripciones provisorias de `MAPA.md` corriendo `mapa` en el repositorio real.

---

## Dónde va este archivo

Subilo al repositorio `datos`, desde el mismo lugar desde donde bajaste el primer archivo, por ejemplo en `guias/panel-53-registro-y-procedimiento.md` **[a validar: elegí la carpeta que corresponda]**, para que las corridas automáticas que revisan el chat lo encuentren.

Vale para **cualquier invitado** que quiera intervenir: Florencia, Mariano o quien venga después. Las modificaciones se hacen en la **copia de pruebas**; este registro describe lo que se subió a `datos`.
