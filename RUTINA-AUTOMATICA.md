# Rutinas de control

Desde el **14-sep-2026**. Una *rutina de control* es una sesión de Claude Code
que se despierta sola, mira el estado del ecosistema, hace una cosa acotada y
**deja el trabajo listo para que Mauro lo apruebe desde el teléfono**. No decide
por él: le baja el costo de decidir.

Hoy hay una, la **Ronda de control diaria**. Este documento describe el proceso
entero para que la siguiente se arme igual y no haya que volver a razonarlo.

---

## 1 · Lo primero, porque es lo que motivó todo: no cuesta nada aparte

Pregunta de Mauro, 14-sep-2026: *¿con mi suscripción a Claude Pro tengo un costo
adicional por ejecutar ese cron?*

**No.** Se usan **routines** de Claude Code, que corren en la nube de Anthropic y
gastan de la cuota de la suscripción igual que una sesión de chat. La
documentación oficial lo dice en las dos puntas:

> *«Routines draw down subscription usage the same way interactive sessions do.»*
> — [code.claude.com/docs/en/routines](https://code.claude.com/docs/en/routines)

> *«There is no separate compute charge for the cloud VM.»*
> — [code.claude.com/docs/en/claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)

Y están disponibles en Pro: *«Routines are available on Pro, Max, Team, and
Enterprise plans.»*

**El camino que se descartó, y por qué.** La primera respuesta de esa
conversación fue GitHub Actions con `schedule`. Está mal para este caso: un
workflow que llama a Claude necesita un `ANTHROPIC_API_KEY`, que se paga aparte
de la suscripción y sería **el primer secreto de Actions de todo el ecosistema**
— los cuatro `CLAUDE.md` dicen hoy que no hay ninguno, y remate lo dice con
nombre y apellido. Una routine no necesita ni el secreto ni el workflow.

### El modelo: el más potente que el plan incluye

Mauro pidió «el modelo más potente disponible». Se probó `claude-fable-5-1` y la
API lo **aceptó** — pero Mauro avisó que **Fable no está incluido en Pro: se paga
aparte**. Así que la routine corre con **`claude-opus-5`**, el más potente de los
incluidos.

Vale dejarlo escrito porque es una trampa cara: **que la API acepte un modelo no
quiere decir que el plan lo cubra.** El selector está en `claude.ai/code/routines`
→ la routine → el lápiz, y también se cambia desde un chat.

---

## 2 · Los límites reales, que son de cuota y no de plata

| Qué | Cuánto | De dónde sale |
|---|---|---|
| Corridas de routine por día, en Pro | **5** | anuncio de Anthropic. El número vivo está en `claude.ai/code/routines` |
| Intervalo mínimo | **1 hora** | doc: *«The minimum interval is one hour; expressions that run more frequently are rejected»* |
| Consumo | de la ventana de 5 horas, como cualquier sesión | doc de routines, § *Usage and limits* |
| Si se acaba la cuota | la corrida **se rechaza**, no se encola | doc: *«Without usage credits, additional runs are rejected until the window resets»* |

**Por eso la ronda corre una vez por día y no cada hora.** Con cinco corridas
diarias, una por hora se comería la cuota antes del mediodía y además le sacaría
a Mauro la ventana de 5 horas que usa para trabajar. Una corrida diaria deja
cuatro libres y casi toda la ventana.

**Y por eso lo que se puede juntar con código, se junta con código.** Ésa es la
razón de `herramientas/ronda.mjs`: cruzar reportes contra pendientes es trabajo
determinado, y cada dato que junta el script es un dato que el modelo no tiene
que leer. El modelo queda para lo que no se automatiza — entender qué quiso decir
la persona que reportó la falla, y resolver el pendiente.

**Cuando no hay saldo, no se pierde nada.** La corrida rechazada no pasa; la del
día siguiente encuentra los mismos reportes sin traer, porque lo que decide qué
es nuevo no es «cuándo corrí» sino el campo `origen` del panel. Es la misma
propiedad que evita traer un reporte dos veces.

### Un costo medido, para tener referencia

La corrida de prueba del 14-sep (que **falló**, ver § 6) gastó:

| | |
|---|---|
| Duración | 2 min 25 s |
| Contexto usado | 88.360 de 1.000.000 |
| Equivalente en dólares | US$ 0,39 — **no facturados**: salieron de la suscripción |
| Modelo servido | `claude-sonnet-5` (fue antes de fijar el modelo) |
| Estado de la cuota | `allowed`, sin overage |

Sirve como orden de magnitud: una ronda que sólo mira es barata. Una que además
resuelve un pendiente va a costar más, y por eso resuelve **uno solo**.

---

## 3 · La forma de una rutina de control: tres partes

Toda rutina de control de este ecosistema se escribe con esta estructura. No es
estética: cada parte existe porque la anterior sola no alcanzaba.

### Parte 1 · MIRAR — siempre, y antes que nada

```
node herramientas/ronda.mjs abrir
```

Seis secciones, en el orden del § 8 «Al abrir» y del § 6 «El apretón de manos»
de `protocolos/PROTOCOLO-GENERAL.md`:

1. **TOCADOS** — lo que Mauro editó desde el último parte.
2. **SIN RESPONDER** — las preguntas que lo están esperando a él.
3. **REPORTES NUEVOS** — fallas escritas desde un sitio, sin pendiente que las traiga.
4. **ABIERTOS** — el resto, por proyecto y prioridad, con las trabas al final.
5. **REGLAS SIN PUBLICAR** — las bases cuyo archivo de reglas no coincide con lo
   último que Mauro confirmó haber publicado.
6. **FUENTES** — qué base contestó y qué no.

**La 5 entró el 14-sep-2026**, y el motivo es el mismo que el del punto de abajo:
el panel encabeza su pantalla con eso desde `panel-15` y la ronda no lo miraba,
así que una corrida automática podía informar todo en orden mientras una base
seguía con las reglas viejas. Sale de `acceso.estado` de `proyectos/`, que desde
`panel-21` es la salida guardada del cálculo del panel — la ronda **no** la
vuelve a derivar, porque el mismo hecho calculado en dos lugares es exactamente
lo que esa tanda vino a cerrar.

**Y desde esa misma fecha los reportes se piden a todas las bases que conoce
`firestore.mjs` menos el panel**, en vez de a una lista escrita a mano. Era el
último lugar del circuito donde dar de alta un sitio nuevo pedía acordarse de
tocar un archivo.

El punto 5 no es diagnóstico de adorno, y es la regla más importante de todo el
documento:

> **Una ronda incompleta que no lo dice es peor que una que no corre, porque
> parece completa.**

La documentación de Anthropic dice lo mismo desde el otro lado:

> *«A green status in the run list means the session started and exited without
> an infrastructure error. It does not mean the task in your prompt succeeded.»*

Un 403 de red o un `permission-denied` de Firestore se ven, desde afuera, como
una corrida verde que no hizo nada.

**Y la ronda se corre UNA sola vez por corrida.** Cada `abrir` hace login en las
cuatro bases; polearlo agota la cuota de Firebase Authentication y la base
empieza a contestar `QUOTA_EXCEEDED: Exceeded quota for verifying passwords`.
Pasó el 14-sep, verificando esto mismo. No es un límite de Claude: es de Firebase,
y se levanta solo con el tiempo.

### Parte 2 · TRABAJAR — como máximo UN pendiente por corrida

Se elige uno: `quien: "claude"`, abierto, sin trabas sin resolver, la prioridad
más alta. **Uno y no más**, y el motivo es el de siempre en este ecosistema: se
trabaja desde el teléfono.

> Un diff que Mauro no puede leer desde el teléfono no se revisa: se aprueba a
> ciegas. Y una aprobación a ciegas es peor que un pendiente sin hacer, porque
> además borra la sensación de que falta hacerlo.

Si el pendiente más prioritario necesita una decisión suya, no se empieza: se le
deja la `pregunta` y se pasa al siguiente.

Antes de empujar corre **la verificación previa del § 2.1 ter, que no es
opcional** — es lo que reemplaza al momento de revisión que se perdió al empujar
sin rama: `node --check` en todo lo tocado (incluidos los módulos que viven
adentro de un `.html`), los bancos de pruebas que declare el `CLAUDE.md` de ese
repo, los sellos de versión subidos con sus `?v=`, y la documentación diciendo la
verdad después del cambio.

**Si algo no pasa, no se empuja.** Se escribe en el pendiente qué falló. Una rama
rota que nadie pidió cuesta más que un pendiente sin hacer.

### Parte 3 · AVISAR — siempre, aunque no haya tocado nada

El aviso va a **dos lugares**, porque uno solo se pierde:

| Dónde | Por qué |
|---|---|
| El panel, como `pregunta` del pendiente trabajado | ahí le aparece en «lo primero que tenés que mirar», y sobrevive a la notificación |
| La **última línea de la respuesta de la sesión**, sola | es lo que viaja en la notificación al teléfono |

El enlace es el de comparar, que muestra el diff y trae el botón de abrir el pull
request:

```
https://github.com/<owner>/<repo>/compare/main...claude/ronda-<AAAA-MM-DD>
```

Si no tocó código, la última línea es igual de obligatoria: «Ronda del `<fecha>`:
sin reportes nuevos y sin cambios», o «Ronda del `<fecha>`: `<fuente>` no
contestó». Un silencio y una ronda limpia no se pueden distinguir.

**Y no se marca «hecho» nada que dependa de que él apruebe la rama.** Queda
abierto con la pregunta hasta que él mergee. Eso es lo que hace que la lista del
panel siga siendo verdad.

---

## 4 · La frontera: qué puede tocar y qué no

**Empuja a `claude/ronda-<fecha>`, nunca a `main`.** GitHub acepta siempre las
ramas con prefijo `claude/`; para cualquier otra, Claude Code verifica antes y la
rechaza si está protegida, si alguien tiene un pull request abierto desde ella, o
si trae commits de otra persona.

Que empuje a una rama y no a `main` **no es una limitación técnica: es la
decisión.** El § 2.1 ter manda empujar a `main` directo porque «una rama que nadie
mira no previene nada». Acá la rama sí se mira —es justamente lo que el enlace del
aviso viene a provocar— y eso cambia el cálculo. Lo que reemplaza al momento de
revisión cuando no hay nadie es la verificación previa del agente; con alguien que
aprueba desde el teléfono, hay las dos cosas.

**Nunca, en ninguna corrida:**

- escribir el valor de una credencial en ningún lado, ni en el panel;
- tocar lo sellado — la bóveda (`claves`, `fichas`), el dinero, los datos de
  personas. La herramienta frena antes de salir a la red y **las reglas de
  Firestore frenan de verdad**: el usuario del agente es un usuario común de
  Authentication, no una cuenta de servicio, que saltearía las reglas enteras;
- agregar `npm`, bundlers, workflows de GitHub Actions o secretos de Actions;
- declarar entregado algo que no se entregó.

### Un detalle que conviene tener claro, porque cambia el análisis

El prompt guardado de una routine **no** le llega a la sesión como notificación
sospechosa. La documentación es explícita: llega como la tarea asignada, porque lo
guardó de antemano una sesión autorizada de la cuenta de Mauro. Es su instrucción
permanente, y vive en su cuenta, **no en un repositorio** — que es justo lo que el
§ 6.0 dice que un archivo no puede ser, porque cualquiera que pueda escribir en el
repositorio podría escribir el permiso de Mauro.

Lo que sí llega etiquetado como dato no confiable es el texto que se le manda **en
el momento del disparo** (el campo `text` de la API de disparo), envuelto en un
bloque `<routine-fire-payload>`. Ésa es la frontera que piden los cuatro
`CLAUDE.md`, y está donde tiene que estar.

### Por qué un chat interactivo sí tiene que preguntar

Una sesión nueva de Claude Code arranca con una rama asignada por la plataforma y
con la instrucción de no empujar a otra sin permiso explícito de Mauro. Eso no se
puede resolver con un archivo: **lo único que viaja a toda sesión nueva son
archivos del repositorio** (`CLAUDE.md`, `.claude/`), y el `~/.claude/CLAUDE.md`
personal de Mauro **no** viaja — la documentación lo dice en su tabla «What carries
over from your setup».

Así que la pregunta de apertura del § 6.0 se sigue haciendo, una línea y
contestable con un «sí». Lo que la vuelve barata no es sacarla: es que el trabajo
diario lo haga la rutina, no un chat.

---

## 5 · Credenciales y red

La ronda entra a las cuatro bases con el usuario del agente: `FB_AGENTE_MAIL` /
`FB_AGENTE_CLAVE`, o el par heredado `FB_PANEL_MAIL` / `FB_PANEL_CLAVE`. Las carga
Mauro en la configuración del entorno de Claude Code, en la web. **Ningún chat
pide ese valor ni lo escribe en ningún lado**, y este archivo tampoco lo tiene.

Un detalle de la documentación que no cambia nada hoy pero sí el día que haya más
gente: las variables de entorno de un cloud environment *«son visibles para
cualquiera que use el environment»*, y en Pro y Max lo recomendado para una clave
es cargarla como **API credential**, que queda fuera del sandbox. Hoy el
environment es de Mauro y nada más, así que la diferencia es teórica.

**La red.** El environment por defecto sólo deja salir a una lista blanca.
Verificado el 14-sep-2026 desde una sesión de este mismo entorno:
`identitytoolkit.googleapis.com` y `firestore.googleapis.com` contestan, que es
todo lo que la ronda necesita.

---

## 6 · La routine que existe hoy, y cómo se llegó a ella

| | |
|---|---|
| Nombre | **Ronda de control diaria (los cinco repos)** |
| Identificador | `trig_01SLpmh9QgpG9gfoqeeqtsHG` |
| Cuándo | `0 11 * * *` — 11:00 UTC, o sea **8 de la mañana** en Uruguay |
| Cómo dispara | **contra una sesión que ya existe** (`session_014k7ZKSv5XCMQDbtyjWbFRh`), no creando una nueva |
| Modelo | el de esa sesión: `claude-opus-5` |
| Aviso | notificación al teléfono cuando una corrida termina |

**Esta tabla se corrigió el 15-sep-2026 y decía otra cosa.** Nombraba a
`trig_012Bcu41exyW2rZz8rJ8tY8i`, atado a `session_012KWUM3TbLqjXh67fsBYGBD`:
esa routine ya no es la que corre. La de arriba se creó el 15-sep a las 02:55
UTC y es la que disparó ese día. Queda anotado el reemplazo y no borrado el
anterior, por el mismo motivo que este documento no borra los fracasos — si
mañana aparece una tercera, lo primero que hay que poder contestar es cuál de
todas está viva.

### La corrida del 15-sep: la desatendida sí funcionó

Verificado **en esa misma corrida**, no leído de otro lado:

- **La ronda corrió sola y pudo ejecutar.** Ningún «Code from External». Los
  cinco repositorios estaban en el disco de la sesión persistente, y eso es lo
  que destrabó el bloqueo del 14-sep. **Ojo con la explicación fácil:**
  `sources` de la routine **sigue vacío** —no es que `create_trigger` haya
  aprendido a declarar repositorios—. Lo que cambió es dónde cae el disparo:
  una sesión que ya los tenía adjuntos no necesita clonar nada.
- **Las cuatro fuentes contestaron**, sin un `permission-denied`.
- **El checkout estaba atrasado en los cinco repos** —uno o dos commits cada
  uno— y el `git pull --ff-only` del punto 0 no es precaución de adorno: la
  primera ronda de esa corrida se corrió con las herramientas viejas y trajo
  un pendiente como «hecho» que en `main` estaba **abierto**. Se repitió
  después del pull y la lista era otra. Es exactamente el fallo que el punto 0
  describe, visto una segunda vez.


**Esa cuarta fila es toda la diferencia, y es lo que este documento existe para
explicar.** La primera versión (`trig_01WDGNPPmESxcJXktjtebLw4`, borrada el
14-sep) creaba una sesión nueva en cada disparo, y esa sesión nacía **sin
repositorios**. Lo que sigue es cómo se descubrió y cómo se arregló.

### La prueba del 14-sep: el circuito funciona, la corrida desatendida no

Mauro reportó una falla de prueba desde `configuracion.html` de remate:

> *«Intento reportar una falla como prueba. Espero saber a partir de éste reporte
> si al momento de correr los controles que pretendemos Automatizar logramos
> hacer llegar este reporte hasta el panel y el chat lo puede levantar como tanda
> o tarea pendiente sin mi intervención.»*

**La respuesta es que sí: el circuito entero funciona.** El pendiente `remate:L7`
existe en el panel, con `origen: remate:reportes/w0AjNvtNqeUCVyh4EGKE`, y el
reporte ya no aparece en REPORTES NUEVOS — que es exactamente lo que tiene que
pasar cuando algo ya se trajo.

Pero el camino hasta ahí deja tres cosas escritas, y las tres importan más que el
resultado.

**1 · La corrida desatendida se traba, y por una razón precisa.** La routine se
creó desde una sesión por API, y `create_trigger` **no tiene forma de declarar
repositorios**: la respuesta vino con `sources: []` y ahí sigue. Sin repositorio
adjunto, la sesión de la routine tiene que clonar `datos` ella misma, y entonces
el clasificador del modo automático marca ese código como **«Code from
External»** y deniega ejecutarlo. La corrida programada de las 11:03 UTC reportó
exactamente eso, y tenía razón en parar: el punto 0 del prompt manda no improvisar
un reemplazo, y no lo improvisó.

**2 · Lo que destrabó la corrida fue Mauro, no la routine.** El pendiente se
escribió después de que él entrara a conversar con esa sesión. Una sesión con una
persona adelante puede pedirle que apruebe lo que el modo automático deniega; una
que corre a las 8 de la mañana con el teléfono apagado, no. **Así que lo que se
probó no es lo que se quería probar:** funcionó el circuito, no la autonomía.

**3 · Y la routine contó mal su propio estado.** Al escribir `remate:L7` dejó como
historia que era «la primera corrida con los repositorios cargados». Era falso:
`sources` estaba y está vacío. Nadie mintió —se estaba refiriendo a un pendiente
del panel que decía eso—, pero el efecto es el peligroso: **una corrida automática
afirmando en el panel que un problema estaba resuelto cuando no lo estaba.** Es la
misma familia que el «verde no quiere decir que salió bien» del § 3, y es el
motivo por el que este documento no borra los fracasos.

### Lo que se puede y no se puede hacer desde un chat

Verificado el 14-sep-2026 probando las herramientas, no leyendo documentación:

| | ¿Se puede desde una sesión? |
|---|---|
| Crear una routine | **Sí** — así nació ésta |
| Cambiarle nombre, horario, prompt, modelo, activarla o pausarla | **Sí** |
| Dispararla a mano | **Sí** |
| Borrarla | **Sí** |
| **Declararle repositorios** | **No.** No hay parámetro para eso |
| Crear una **sesión** con un repositorio adjunto | **Sí** — `source_url`, y el repo queda como fuente de verdad de la sesión, no como un clon |

Esa última fila es la salida: una routine puede dispararse **contra una sesión que
ya existe** en vez de crear una nueva cada vez. Si esa sesión se creó con `datos`
adjunto, el código deja de ser «externo» y el bloqueo no aparece.

### La prueba que cierra el caso

Verificado el 14-sep-2026, y verificado de la única manera que vale: haciéndolo.

Se creó una sesión con `datos` **adjunto como fuente** (no clonado), en modo
automático y **sin nadie delante**, y se le pidió una sola cosa: correr
`node herramientas/ronda.mjs abrir` y decir si el entorno la dejaba.

El resumen que devolvió la sesión, textual:

> *«Script executed successfully: 60 pending items, 5 open, 4 data sources
> responding»*

Sin bloqueo, sin aprobación humana, sin `git clone`. **El problema no era el modo
automático ni el protocolo: era que la sesión no tenía el repositorio.**

Sobre esa sesión se creó la routine actual, con disparo a sesión persistente, y
se borró la anterior.

### Lo que se paga por esta solución, que no es gratis

Una routine atada a una sesión persistente **conversa siempre en la misma
sesión**, en vez de arrancar limpia cada día. Eso trae dos cosas:

- **A favor:** los repositorios quedan adjuntos de verdad, el contexto del día
  anterior está a mano, y no hay que volver a explicarle nada.
- **En contra:** esa conversación crece. La compactación automática la sostiene,
  pero no para siempre. **Si la ronda empieza a portarse raro o a olvidarse de
  cosas, la respuesta es crear una sesión nueva con los repositorios adjuntos y
  reapuntar la routine**, no discutir con la vieja.

**Y hay un segundo costo, descubierto el 15-sep y más caro que el primero:
atada a una sesión persistente, la routine ya no deja editarle el prompt desde
un chat.** El intento devuelve, textual:

> *«editing the prompt of a routine whose fires deliver into a session that is
> not your own is not available via this tool»*

Nombre, horario y el interruptor de activada siguen siendo editables; el texto
de la instrucción, no. **Así que el prompt hay que dejarlo bien la primera vez**,
y cambiarlo después significa borrar la routine y crearla de nuevo contra la
misma sesión — se pierde su historial de corridas, no la sesión. Conviene
pensarlo antes de atar una routine a una sesión: en modo «sesión nueva cada vez»
el prompt se edita cuando se quiere, pero no hay forma de adjuntarle repositorios.
**Es una cosa o la otra.**

Y un límite más, que hoy no molesta: una sesión se
crea con **un** repositorio adjunto. Para que la Parte 2 toque el código de los
sitios hay que adjuntarle los otros cuatro desde adentro, con la herramienta de
agregar repositorio —no con `git clone`, que es exactamente lo que estaba
bloqueado—. Eso **todavía no se probó**, y hasta que se pruebe la Parte 2 sólo
está garantizada para `datos`.

---

### Estado al 2026-09-14, y dónde sigue

Comprobado ese día leyendo la configuración real de la routine y de la sesión,
no suponiéndolo. **La intervención sobre la rutina se cierra acá y sigue en otro
chat**, por decisión de Mauro; esto queda escrito para que ese chat no tenga que
volver a averiguarlo.

| Qué | Cómo está |
|---|---|
| La routine `trig_012Bcu41exyW2rZz8rJ8tY8i` | **activa** |
| Corridas hasta hoy | **ninguna** |
| Próxima | **2026-09-15, 11:04 UTC** — las 8:04 de la mañana en Uruguay |
| La sesión contra la que dispara | existe, inactiva, con `maurogasta-crypto/datos` **adjunto como fuente** y `claude-opus-5` |

**Que todavía no haya corrido no es una falla, y conviene no leerlo mal.** La
routine se creó el 2026-09-14 a las **11:12 UTC**, ocho minutos después de su
propio horario de las 11:00, así que su primera corrida de verdad es la del día
siguiente. La corrida que falló y que cuenta la sección de arriba era de la
routine **anterior**, ya borrada.

Dos cosas siguen sin probarse, y hasta que una corrida las pruebe se dicen como
lo que son:

- **La Parte 2 sobre un repo que no sea `datos`.** Adjuntar otro repositorio
  desde adentro de la sesión está descrito, no ejecutado. Hasta que ocurra una
  vez, la Parte 2 sólo está garantizada para `datos`.
- **Una corrida desatendida completa.** Lo que se probó el 14-sep fue que el
  entorno deja correr `ronda.mjs` sin nadie delante. Que el resto del prompt se
  ejecute entero sin una persona que apruebe algo, no.

**Lo que sí cambió ese día en la parte determinada**, y que la próxima corrida
va a traer sola: la ronda suma la sección **5 · REGLAS SIN PUBLICAR**, y pide los
reportes a todas las bases que conoce `firestore.mjs` en vez de a una lista
escrita a mano. Las dos están en `main` y con banco de pruebas.

**La rama del otro chat.** El trabajo de la rutina se venía haciendo en
`claude/claudecode-auto-script-1hfspl`. Su contenido sustancial —`ronda.mjs`,
su banco, este documento, el `LEEME` de la herramienta— **ya está en `main`**,
verificado archivo por archivo el 2026-09-14. Lo único que tiene de propio es el
residuo del viejo repositorio privado: `secretos/`, `partes/` y los *fixtures*
de la solapa «Parte» retirada. Antes de borrarla va el censo del § 2.1 quater
del `PROTOCOLO-GENERAL.md` — y ese censo ya se hizo, con este resultado:

| Qué tenía la rama | Dónde está hoy |
|---|---|
| `secretos/*.md` · titularidad de las consolas | `fichas/` del panel, una ficha por proyecto, las cinco |
| `secretos/rematetaller.md` · la clave de Cloudinary sin rotar | pendiente `general:cloudinary-filtrada`, con la historia de por qué se cerró sin rotar |
| `secretos/harmonia.md` · el patrón de la función con lista blanca | regla `general:puente-tercero`, vigente |
| `partes/*.json` · 177 pendientes declarados | los 177 están en `pendientes/`. Ninguno falta |
| `partes/*.json` · las once rondas viejas | `tandas/`, con sus fechas |
| `plantillas/gestos/gestos/*` | `gestos/` de este repositorio, idénticos |
| `pruebas/panel/parte-*.json` · *fixtures* | muertos: el banco de `main` sólo usa `parte-1-inicial.json` |
| Los protocolos en la raíz, `herramientas/`, `pruebas/` | `main`, y más nuevos que los de la rama |

**No quedó nada sin lugar.** Lo que falta es borrarla, que lo dice Mauro.

## 7 · Cómo se arma la próxima rutina de control

1. **Que el trabajo determinado lo haga un script**, no el modelo. Es barato,
   se prueba con `node` a secas, y el modelo queda para el juicio.
2. **Que el script no escriba.** Junta y ordena; quien decide es quien lee.
3. **Que declare sus fuentes**, y que una fuente caída sea lo primero que informa.
4. **Una cosa por corrida**, del tamaño que se revisa en un teléfono.
5. **Que empuje a `claude/…`**, nunca a `main`.
6. **Que el aviso vaya al panel y a la última línea**, los dos, con el enlace de
   comparar adentro.
7. **Un banco de pruebas sin red** para la parte determinada. Corre sola: si se
   equivoca en silencio, nadie lo ve hasta que el daño está hecho.
8. **Que el repositorio venga adjunto a la sesión, no clonado desde adentro.**
   Un clon hecho por la propia sesión se marca como código externo y el modo
   automático no lo deja ejecutar. Es el error que costó un día entero.
9. **Anotarla acá**, con su identificador, su horario, su modelo y contra qué
   sesión dispara.

Y la que vale más que las nueve:

> **Lo que se documenta sale de leer el código y la configuración reales**, nunca
> de lo que una conversación —ni siquiera ésta— afirme que dice el código.

---

## 8 · Cómo se para

En `claude.ai/code/routines`: la routine tiene un interruptor en la sección
**Repeats** para pausarla sin perder la configuración, y un ícono para borrarla.
Las sesiones que ya creó quedan en la lista igual. Desde el teléfono también: esa
dirección anda en el navegador del celular.

---

## 9 · Lo que falta

- **Probar la Parte 2 de punta a punta.** Que la ronda resuelva un pendiente y
  deje la rama con su enlace. Hoy está escrita y no ejercitada.
- **Probar que se pueden adjuntar los otros cuatro repositorios** desde adentro
  de la sesión persistente. Sin eso, la Parte 2 sólo alcanza a `datos`.
- **El formulario de reporte en Casa Verde y CasaYourte.** Hoy sólo remate tiene
  de dónde reportar, así que la ronda lee tres bases y dos están siempre vacías.
  Es `general:reportes-2`, y el molde completo está en `REPORTES.md` de remate.
  La ronda ya las lee: cuando la colección exista, entra sola.
- **Ver si la Parte 2 aguanta el presupuesto.** Resolver un pendiente por día con
  Opus puede comerse más ventana de la que conviene. Se mide con las primeras
  corridas reales, no antes.
- **Vigilar el crecimiento de la sesión persistente**, y recrearla cuando haga
  falta (§ 6).

---

## Apéndice · El prompt exacto, tal como está guardado

Se versiona acá porque el texto de una routine vive en la cuenta de Mauro y no en
ningún repositorio: si se pierde, se pierde el criterio con el que fue escrita.
Si algún día hay que recrearla a mano, esto es lo que se pega en
`claude.ai/code/routines`.

```text
Sos la ronda de control diaria del ecosistema de Mauro. Corrés sola, sin nadie
delante. El porqué de cada regla de acá está en `RUTINA-AUTOMATICA.md` del repo
`maurogasta-crypto/datos`: si ese archivo y esto se contradicen, gana el archivo
y lo decís en el aviso.

Los repositorios, para armar enlaces sin equivocarte:
  casaverdecanas-blip/casaverdecanas · maurogasta-crypto/datos
  casayourte/CasaYourte · rematetaller/remate · toromboto/harmonia

════════ PARTE 1 · MIRAR (siempre) ════════

0. Si `herramientas/ronda.mjs` no existe en `maurogasta-crypto/datos`, pará acá
   y decilo en una línea. No improvises un reemplazo ni leas las bases a mano.
1. Leé `CLAUDE.md` y `protocolos/PROTOCOLO-GENERAL.md` §§ 6, 8 y 9 de ese repo.
2. Corré UNA SOLA VEZ:   node herramientas/ronda.mjs abrir
   Trae el panel y los reportes de los tres sitios, cruzados y ordenados. No la
   corras en loop ni para «verificar»: cada corrida hace login en cuatro bases y
   Firebase corta por cuota («QUOTA_EXCEEDED»). Si te pasa, esperá y seguí; no
   reintentes en rápido.
3. Si la sección FUENTES tiene alguna caída, ESO es lo primero que informás. Una
   ronda incompleta que no lo dice es peor que una que no corre: parece completa.
4. Por cada REPORTE NUEVO, escribí un pendiente en el panel:
   · `titulo` corto, en los términos de quien lo reportó, no en los tuyos;
   · `porQue` con lo que decía el reporte y qué se rompió, no una paráfrasis;
   · `proyecto` el del sitio, `quien: "claude"`, `estado: "abierto"`;
   · `prioridad`: «alta» si el reporte dice que no lo deja trabajar;
   · `origen`: exactamente el que imprimió la ronda. Sin eso se trae dos veces;
   · `clave`: pedila con  node herramientas/ronda.mjs claves <proyecto>  y elegí
     la letra por el tema. No inventes una letra nueva sin motivo.
   Se escribe con
     node herramientas/firestore.mjs panel escribir pendientes <id> <archivo.json>
   y ANTES se baja el respaldo:
     node herramientas/firestore.mjs panel bajar

════════ PARTE 2 · TRABAJAR (como máximo UN pendiente por corrida) ════════

5. Elegí UNO SOLO: `quien: "claude"`, estado abierto, sin `esperaA` sin resolver,
   la prioridad más alta. Uno por corrida y no más — un diff que Mauro no puede
   leer desde el teléfono no se revisa, se aprueba a ciegas, y eso es peor que no
   haberlo hecho.
   Si el más prioritario necesita una decisión suya, NO lo empieces: dejale la
   `pregunta` en ese pendiente y pasá al siguiente.
6. Leé el `CLAUDE.md` del repo que vas a tocar y obedecelo: es más específico que
   este prompt y gana. Archivos completos, nunca diffs; el núcleo no se duplica;
   una colección nueva entra con su regla en la misma tanda.
7. La rama es `claude/ronda-<AAAA-MM-DD>`. **NUNCA `main`.** Nunca `--force`,
   nunca reescribas historia, nunca toques una rama de otro.
8. Antes de empujar, la verificación previa del § 2.1 ter, que NO es opcional:
   · `node --check` en todo `.js`/`.mjs` tocado, incluidos los módulos que viven
     adentro de un `.html`;
   · los bancos de pruebas que declare el `CLAUDE.md` de ese repo, y que pasen;
   · los sellos de versión subidos, y la `VERSION` del `sw.js` si el archivo está
     en `SHELL`, con sus `?v=`;
   · la documentación del repo diciendo la verdad después del cambio.
9. Si algo de eso no pasa, **no empujes**. Escribilo en el pendiente y contá qué
   falló. Una rama rota que nadie pidió cuesta más que un pendiente sin hacer.

════════ PARTE 3 · AVISAR (siempre, aunque no hayas tocado nada) ════════

10. El aviso a Mauro va en DOS lugares, porque uno solo se pierde:
    · en el panel, como `pregunta` del pendiente que trabajaste, con el enlace
      adentro — así le aparece en «lo primero que tenés que mirar»;
    · como **última línea de tu respuesta, sola y sin nada después**, para que
      viaje en la notificación al teléfono.
    El enlace es el de comparar, que muestra el diff y trae el botón de abrir el
    pull request:
      https://github.com/<owner>/<repo>/compare/main...claude/ronda-<AAAA-MM-DD>
    Si no tocaste código, la última línea es igual de obligatoria y dice qué
    pasó: «Ronda del <fecha>: sin reportes nuevos y sin cambios» o «Ronda del
    <fecha>: <fuente> no contestó».
11. Renglón de historia en cada pendiente que tocaste, fechado y con
    `por: "claude"`. **La respuesta de Mauro no se pisa nunca.**
12. No marques «hecho» nada que dependa de que él apruebe la rama. Queda abierto
    con la pregunta hasta que él mergee.

════════ LO QUE NO SE HACE NUNCA ════════

· Empujar a `main`, forzar, o abrir un pull request sin que él lo pida.
· Escribir el valor de una credencial en ningún lado, ni en el panel. Si algo
  parece necesitarlo, se convierte en una `pregunta`.
· Tocar lo sellado: la bóveda (`claves`, `fichas`), el dinero y los datos de
  personas. La herramienta te frena y las reglas también.
· Agregar `npm`, bundlers, workflows de GitHub Actions o secretos de Actions.
  Ninguno de los cuatro sitios tiene, y el primero es una decisión de Mauro.
· Declarar entregado algo que no se entregó. Si quedó a medias, se dice cuál y
  por qué, y queda abierto en el panel.
```
