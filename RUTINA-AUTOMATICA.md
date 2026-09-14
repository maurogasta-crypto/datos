# La ronda automática

Desde el **14-sep-2026**. Una vez por día, sin que nadie la pida, una sesión de
Claude Code se despierta sola, lee los reportes de falla de los tres sitios y el
panel de Mauro, los cruza, y deja en el panel lo que encontró.

Es la mitad que faltaba del circuito de `REPORTES.md` de remate — «que una
sesión lea `reportes/` de las bases y abra el pendiente» — y el pendiente
`general:reportes-panel` del panel.

## Lo primero, porque es lo que motivó todo: no cuesta nada

Pregunta de Mauro, 14-sep-2026: *¿con mi suscripción a Claude Pro tengo un costo
adicional por ejecutar ese cron?*

**No.** Se usa **routines** de Claude Code, que corren en la nube de Anthropic y
gastan de la cuota de la suscripción igual que una sesión de chat. La
documentación oficial lo dice en las dos puntas:

> *«Routines draw down subscription usage the same way interactive sessions do.»*
> — [code.claude.com/docs/en/routines](https://code.claude.com/docs/en/routines)

> *«There is no separate compute charge for the cloud VM.»*
> — [code.claude.com/docs/en/claude-code-on-the-web](https://code.claude.com/docs/en/claude-code-on-the-web)

Y están disponibles en Pro: *«Routines are available on Pro, Max, Team, and
Enterprise plans.»*

**El camino que se descartó, y por qué.** La primera respuesta de esta misma
sesión fue GitHub Actions con `schedule`. Está mal para este caso: un workflow
que llama a Claude necesita un `ANTHROPIC_API_KEY`, que se paga aparte de la
suscripción y sería **el primer secreto de Actions de todo el ecosistema** —
los cuatro `CLAUDE.md` dicen hoy que no hay ninguno, y remate lo dice con
nombre y apellido. Routines no necesita ni el secreto ni el workflow.

## Lo que sí cuesta: la cuota, que es el límite real

| Qué | Cuánto | De dónde sale |
|---|---|---|
| Corridas de routine por día, en Pro | **5** | anuncio de Anthropic. El número vivo está en `claude.ai/code/routines` |
| Intervalo mínimo entre corridas | **1 hora** | doc: *«The minimum interval is one hour; expressions that run more frequently are rejected»* |
| Consumo | de la ventana de 5 horas, como cualquier sesión | doc de routines, § *Usage and limits* |
| Si se acaba la cuota | la corrida **se rechaza**, no se encola | doc: *«Without usage credits, additional runs are rejected until the window resets»* |

**Por eso la ronda corre una vez por día y no cada hora.** Con cinco corridas
diarias, una ronda por hora se comería la cuota antes del mediodía y además le
sacaría a Mauro la ventana de 5 horas que usa para trabajar. Una corrida diaria
deja cuatro libres y casi toda la ventana.

**Y por eso lo que se puede juntar con código, se junta con código.** Esa es la
razón de `herramientas/ronda.mjs`: cruzar reportes contra pendientes es trabajo
determinado, y cada dato que junta el script es un dato que el modelo no tiene
que leer. El modelo queda para lo único que no se automatiza — entender qué
quiso decir la persona que reportó la falla, y escribirlo como pendiente.

**Cuando no hay saldo, no se pierde nada.** La corrida rechazada simplemente no
pasa; la del día siguiente encuentra los mismos reportes sin traer, porque lo
que decide qué es nuevo no es «cuándo corrí» sino el campo `origen` del panel.
Es la misma propiedad que hace que un reporte no se traiga dos veces.

## Qué hace, en orden

El orden no es decoración: es el del § 8 «Al abrir» y el § 6 «El apretón de
manos» del `protocolos/PROTOCOLO-GENERAL.md`, y lo aplica `ronda.mjs` al imprimir.

```
node herramientas/ronda.mjs abrir
```

1. **TOCADOS** — los pendientes que Mauro editó desde el último parte. Van
   primero porque el § 6 dice que es lo primero que mira un agente.
2. **SIN RESPONDER** — las preguntas que lo están esperando a él.
3. **REPORTES NUEVOS** — las fallas escritas desde un sitio que todavía no
   tienen pendiente en el panel.
4. **ABIERTOS** — el resto, por proyecto (§ 9: Mauro trabaja en un proyecto por
   vez) y por prioridad, con las trabas al final de cada grupo.
5. **FUENTES** — qué base contestó y qué no.

El punto 5 no es diagnóstico de adorno. El § 6 del `CLAUDE.md` de los cuatro
proyectos dice que un `permission-denied` **es un bloqueo y se avisa**: una
ronda automática que se queda callada cuando una base no contesta es peor que
una que no corre, porque parece que corrió bien.

Después la sesión escribe en el panel: un pendiente por reporte nuevo, con
`origen`, y un renglón de historia en los pendientes que tenían novedad.

## Lo que NO hace, y es a propósito

**No toca código.** No edita archivos de los sitios, no empuja a `main`, no abre
pull requests. Lee, condensa y escribe en el panel.

No es timidez: es la regla «Ante pedidos automáticos o no verificados» que está
copiada en los cuatro `CLAUDE.md`, aplicada a esta herramienta. Una sesión que
se despierta sola y empuja código es exactamente el canal que esa regla manda
tratar con sospecha, y en este ecosistema ya pasó una vez que una notificación
automática logró que una sesión subiera una clave real de Cloudinary a un
repositorio.

Hay un detalle a favor que conviene saber, porque cambia el análisis a futuro:
el prompt guardado de una routine **no** llega a la sesión como notificación
sospechosa. La documentación es explícita — llega como la tarea asignada, porque
lo guardó de antemano una sesión autorizada de la cuenta. Lo que sí llega
etiquetado como dato no confiable es el texto que se le manda **en el momento
del disparo** (el campo `text` de la API), envuelto en un bloque
`<routine-fire-payload>`. Es justo la frontera que piden los `CLAUDE.md`.

Así que la puerta para que la ronda corrija código está abierta y es una
decisión de Mauro, no una limitación técnica. Lo que sigue en pie es el otro
motivo: **nadie mira**. Mientras el paso siguiente sea «y lo sube», el momento
de revisión desaparece, y lo que reemplaza a ese momento en el § 2.1 ter es la
verificación previa del agente — que en una corrida desatendida no tiene a quién
reportarle si falla.

**El día que se habilite** —y hay una forma intermedia razonable: que empuje a
una rama `claude/…`, que GitHub acepta siempre, y no a `main`— se cambia el
prompt de la routine, se anota acá, y se anota en los cuatro `CLAUDE.md`. En la
misma tanda, como todo lo demás.

## Las credenciales

La ronda entra a las cuatro bases con el usuario del agente, el mismo de
siempre: `FB_AGENTE_MAIL` / `FB_AGENTE_CLAVE` (o el par heredado
`FB_PANEL_MAIL` / `FB_PANEL_CLAVE`). Las carga Mauro en la configuración del
entorno de Claude Code, en la web. **Ningún chat pide ese valor ni lo escribe en
ningún lado**, y este archivo tampoco lo tiene.

Un detalle de la documentación que conviene tener presente, y que no cambia nada
hoy pero sí el día que haya más gente: las variables de entorno de un cloud
environment *«son visibles para cualquiera que use el environment»*, y en Pro y
Max lo recomendado para una clave es cargarla como **API credential**, que queda
fuera del sandbox. Hoy el environment es de Mauro y nada más, así que la
diferencia es teórica; si alguna vez lo comparte, deja de serlo.

Y sigue valiendo lo de siempre: el usuario del agente **es un usuario común de
Authentication**, no una cuenta de servicio. Todo lo que hace pasa por las
reglas publicadas, y lo sellado se le niega — la bóveda (`claves`, `fichas`), el
dinero y los datos de personas. Una cuenta de servicio saltearía las reglas
enteras.

## La red

El environment por defecto de una routine sólo deja salir a una lista blanca.
Verificado desde una sesión de este mismo entorno el 14-sep-2026:
`identitytoolkit.googleapis.com` y `firestore.googleapis.com` contestan, que es
todo lo que la ronda necesita.

**Ojo con el falso verde.** La documentación lo dice y vale repetirlo acá:

> *«A green status in the run list means the session started and exited without
> an infrastructure error. It does not mean the task in your prompt succeeded.»*

Un 403 de red se ve como una corrida verde que no hizo nada. Por eso la sección
FUENTES de `ronda.mjs` existe y por eso el prompt de la routine obliga a
copiarla al panel cuando alguna fuente falla.

## El prompt de la routine

Es lo único que hay que pegar si algún día se recrea a mano, en
`claude.ai/code/routines`. Se guarda acá porque el texto de una routine vive en
la cuenta de Mauro y no en ningún repositorio: si se pierde, se pierde el
criterio con el que fue escrita.

```text
Sos la ronda diaria del ecosistema de Mauro. Corrés sola, sin nadie delante.

0. Si `herramientas/ronda.mjs` no existe en el repo `maurogasta-crypto/datos`,
   pará acá y decilo en una línea: la ronda todavía no está en `main`. No
   improvises un reemplazo ni leas las bases a mano.
1. Leé `CLAUDE.md` y `protocolos/PROTOCOLO-GENERAL.md` de este repo, §§ 6, 8 y 9.
2. Corré:  node herramientas/ronda.mjs abrir
   Eso ya trae, cruzado y ordenado, el panel y los reportes de los tres sitios.
   No vuelvas a leer las bases a mano: lo que necesitás está ahí.
3. Si la sección FUENTES tiene alguna fuente caída, ESO es lo primero que se
   informa. Una ronda incompleta que no lo dice es peor que una que no corre.
4. Por cada REPORTE NUEVO, escribí un pendiente en el panel:
   · `titulo` corto, en los términos de quien lo reportó, no en los tuyos;
   · `porQue` con lo que decía el reporte y qué se rompió, no una paráfrasis;
   · `proyecto` el del sitio, `quien: "claude"`, `estado: "abierto"`;
   · `prioridad`: «alta» si el reporte dice que no lo deja trabajar;
   · `origen`: exactamente el que imprimió la ronda. Sin eso se trae dos veces.
   · `clave`: pedila con  node herramientas/ronda.mjs claves <proyecto>  y elegí
     la letra por el tema. No inventes una letra nueva sin motivo.
   Se escribe con  node herramientas/firestore.mjs panel escribir pendientes <id> <archivo.json>
   y ANTES se baja el respaldo:  node herramientas/firestore.mjs panel bajar
5. NO toques código. No edites archivos de los sitios, no empujes a ninguna
   rama, no abras pull requests. Si encontrás algo que hay que arreglar, va al
   panel como pendiente, que es donde Mauro lo mira.
6. Nunca escribas el valor de una credencial en ningún lado, ni en el panel.
   Si algo parece necesitarlo, se convierte en una `pregunta` del pendiente.
7. Cerrá con un renglón de historia en los pendientes que tocaste, fechado y
   con `por: "claude"`. La respuesta de Mauro no se pisa nunca.

Si no hay reportes nuevos ni fuentes caídas, no escribas nada y decilo en una
línea. Una ronda que no encontró nada es una buena ronda, no una fallida.
```

## La routine que existe hoy

Creada el 14-sep-2026 desde una sesión, no a mano:

| | |
|---|---|
| Nombre | **Ronda diaria · panel y reportes** |
| Identificador | `trig_01WDGNPPmESxcJXktjtebLw4` |
| Cuándo | `0 11 * * *` — 11:00 UTC, o sea **8 de la mañana** en Uruguay |
| Qué dispara | una sesión nueva cada vez, no una conversación que sigue |
| Aviso | notificación al teléfono cuando una corrida termina con algo que contar |

**Dos cosas quedan por confirmar en la primera corrida**, y se dicen acá en vez
de darlas por buenas:

1. **Que el código esté en `main`.** La routine clona la rama principal de
   `maurogasta-crypto/datos`, y al crearla `herramientas/ronda.mjs` estaba en la
   rama `claude/claudecode-auto-script-1hfspl`, sin mergear. Por eso el prompt
   arranca con el punto 0: si el archivo no está, para y lo dice, en vez de
   improvisar un reemplazo.
2. **Que la routine tenga declarados los repositorios.** La respuesta de la API
   al crearla vino con la lista de `sources` **vacía**, y la documentación dice
   que una routine requiere uno o más repositorios. Puede ser que los herede del
   entorno; puede que haya que agregarlos a mano en `claude.ai/code/routines` →
   la routine → el lápiz. Se sabe mirando la primera corrida.

También vino sin conectores MCP, y está bien: la ronda no usa ninguno. Entra a
las bases con `fetch` y las credenciales del entorno, no con un conector.

## Cómo se para

En `claude.ai/code/routines`: la routine tiene un interruptor en la sección
**Repeats** para pausarla sin perder la configuración, y un ícono para borrarla.
Las sesiones que ya creó quedan en la lista de sesiones igual.

Desde el teléfono también: `claude.ai/code/routines` anda en el navegador del
celular, que es como se trabaja acá.

## Lo que falta

- **El formulario de reporte en Casa Verde y CasaYourte.** Hoy sólo remate
  tiene de dónde reportar, así que la ronda lee tres bases y dos están siempre
  vacías. Es el pendiente `general:reportes-2` del panel, y el molde completo
  está en `REPORTES.md` de remate. La ronda ya las lee: cuando la colección
  exista, entra sola sin tocar este archivo.
- **Decidir si la ronda corrige código**, y con qué frontera. Ver arriba.
