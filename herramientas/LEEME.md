# herramientas — lo que una sesión corre contra las bases

> **Y una que corre en el teléfono:** `telefono.mjs` limpia Descargas y guarda
> respaldos de los repositorios, desde Termux. Tiene su propio documento:
> `TELEFONO.md`.

## `firestore.mjs`

Leer y escribir Firestore desde una sesión de Claude Code, sin dependencias:
la API REST de Firebase con el `fetch` que ya trae node.

```
node herramientas/firestore.mjs <proyecto> quien
node herramientas/firestore.mjs <proyecto> bajar [colecciones...]
node herramientas/firestore.mjs <proyecto> leer <coleccion> [id]
node herramientas/firestore.mjs <proyecto> escribir <coleccion> <id> <archivo.json>
node herramientas/firestore.mjs <proyecto> borrar <coleccion> <id>
```

### Las seis bases

| Proyecto | Firebase | Estado al 2026-09-20 |
|---|---|---|
| `panel` | `datos-830f8` | lee y escribe |
| `remate` | `remate-acbc9` | entra y lee |
| `casayourte` | `casayourte-mauro` | entra y lee |
| `casaverde` | `casaverde-20` | entra y lee |
| `hilux` | `hilux-1b6f1` | **NO entra**: el usuario del agente todavía no está dado de alta en esa base |
| `tiempos` | `tiempos-71d42` | **NO entra todavía**: falta dar de alta al usuario del agente (29-sep-2026). Lee lo común y las horas; escribe sólo `miembros/` al aprobar una solicitud |

Harmonía no está porque no tiene base: todo su estado vive en el
`localStorage` del teléfono.

**Una base que no deja entrar no voltea la ronda, desde el 2026-09-20.** Sale
como un renglón de FUENTES con su motivo y la corrida sigue con las demás. Hasta
ese día no era así, y costó caro: `hilux` entró a `PROYECTOS` el 19-sep —un
cambio correcto— sin que el usuario del agente existiera en esa base, y la ronda
diaria dejó de correr ENTERA, sin imprimir una línea del panel.

El motivo es de los que no se adivinan mirando el código por encima: `entrar`
termina en `ex()`, que hace `process.exit(1)`, y **eso no se atrapa con un
try/catch**. La ronda tenía uno escrito justamente para ese caso y no servía
para nada, porque el proceso moría antes del `catch`. Ahora hay tres puertas:

| | Qué hace si no puede entrar | Quién la usa |
|---|---|---|
| `entrarCrudo` | lanza un `Error` | las otras dos |
| `entrar` | corta el proceso con el mensaje de siempre | la línea de comandos, donde morir claro es lo correcto |
| `entrarSuave` | devuelve `{ ok: false, motivo }` | la ronda, en el panel y en cada base |

**Es un solo usuario para las cinco**, con el mismo mail y la misma
contraseña, y **con un solo par de variables alcanza**: sirve
`FB_AGENTE_MAIL`/`FB_AGENTE_CLAVE`, y también `FB_PANEL_MAIL`/`FB_PANEL_CLAVE`,
que es el par con el que nació esto. Se busca de lo más específico a lo más
general y se usa el primero que aparece.

Pero **el UID no se comparte**: Firebase le da uno distinto en cada proyecto,
así que el alta se hace una vez por base y las reglas de cada una llevan su
propio UID. El paso a paso está en `ACCESO-A-LAS-BASES.md`.

**Antes de escribir, se baja un respaldo. Siempre.** `bajar` deja
`respaldos/<fecha>-<proyecto>.json`. Es lo único que permite volver si un
agente se equivoca, y desde el 2026-09-11 los errores de un agente llegan a la
base de verdad.

### La bóveda

Lo que el agente no toca está en `selladas`, por proyecto. En el panel es
**`claves` y nada más** —`fichas` estuvo sellada del 2026-09-11 al 2026-09-13 y
volvió al equipo con las reglas v4, que sellan por PROPÓSITO y no por riesgo: si
abre algo va en `claves`, si no abre va en `fichas`—; en los sitios, las
credenciales, el dinero y los datos de personas. La herramienta tiene un guardia que corta antes de salir a la red,
pero **el guardia no es la cerradura**: la cerradura son las reglas de
Firestore, que le niegan eso al usuario del agente. Si este archivo tuviera un
error, la base contestaría que no igual.

Las dos capas existen a propósito. El guardia da un mensaje claro; las reglas
dan la garantía. Y por eso **un sello se agrega siempre a los dos lados**: a
`selladas` acá, y a la regla publicada en la consola, en la misma tanda.

Un sello puede ser una colección entera (`claves`) o un documento suelto
(`config/integraciones`), porque a veces lo sensible es un documento adentro de
una colección que sí sirve leer. Sellar un documento frena también el listado
de su colección: listarla lo devolvería igual.

### El sello es por lugar, no por contenido

Lo que esté guardado en una colección abierta, el agente lo lee. El 2026-09-11,
la primera corrida de verificación encontró en `fichas` una ficha con un usuario
y una contraseña reales. Las reglas hicieron exactamente lo que dicen que hacen
—`claves` negada, `fichas` permitida— y aun así el dato quedó a la vista.

De ahí salieron las dos cosas del mismo día: `fichas` pasó a estar sellada, y
quedó escrito que **la disciplina de guardar es parte de la cerradura**. Ninguna
regla puede adivinar que un campo llamado `valor` es una contraseña.

### El respaldo no entra al repositorio

`bajar` escribe la base **tal cual está**. Si un documento tiene adentro una
contraseña, el respaldo la tiene también. Por eso `respaldos/` está en el
`.gitignore` desde el 2026-09-11: el respaldo se hace siempre, y siempre se
queda afuera de git.

**Y desde el 2026-09-14 esto pesa más que antes, no menos.** Esta línea decía
«este repositorio es privado pero su historial es permanente», y para entonces
ya era falsa: la herramienta se mudó acá el 2026-09-12 y **este repositorio es
público**. Un respaldo que se cuele en un `git add -A` no queda en un historial
privado y permanente: queda publicado. El `.gitignore` es lo único que hay entre
una cosa y la otra.

### Por qué un usuario común y no una cuenta de servicio

Una cuenta de servicio (Admin SDK) **saltea todas las reglas**. Con ella, la
bóveda dejaría de estar sellada — no por una decisión, sino porque las reglas ya
no se aplicarían. El agente entra con un usuario común de Authentication
justamente para quedar adentro del mismo sistema de permisos que todo lo demás.

### El banco

`node pruebas/herramientas/firestore.mjs` — 34 casos, sin red ni dependencias.
Prueba lo que puede salir mal de verdad: que la traducción de tipos no pierda
datos, que un documento se pueda **achicar**, que las cuatro operaciones sobre
lo sellado se frenen —incluidas las subcolecciones y los documentos sueltos—,
que cada base selle lo suyo y no lo de la otra, y que ninguna colección de
`bajar` esté sellada, que dejaría el respaldo a mitad de camino.

## `ronda.mjs`

Junta en una pantalla lo que hay que mirar al abrir una tanda, y **no escribe
nada**.

```
node herramientas/ronda.mjs abrir [--json]
node herramientas/ronda.mjs claves <proyecto>
```

`abrir` lee los `pendientes` del panel y los `reportes/` de las tres bases de
sitio, los cruza y los ordena en cinco secciones: **tocados**, **sin
responder**, **reportes nuevos**, **abiertos** por proyecto y prioridad, y
**fuentes**. Ese orden sale del § 8 «Al abrir» y del § 6 «El apretón de manos»
del `protocolos/PROTOCOLO-GENERAL.md`, no de una preferencia.

Un reporte es «nuevo» mientras ningún pendiente del panel lleve su `origen`
(`remate:reportes/<id>`). Se mira de este lado a propósito: el agente **no
escribe** en las bases de los sitios, así que no puede marcar allá lo que ya
trajo. Lo fijó `REPORTES.md` de remate.

`claves` no inventa la letra de una clave nueva: devuelve las que ya existen en
ese proyecto con su número más alto. La letra es temática —en remate conviven
`A`, `D` y `L`— y adivinarla sería inventar un tema.

**Lee tolerante, al revés que `firestore.mjs`.** Aquélla corta el proceso ante
un 403, que es lo correcto cuando una persona pidió algo y la base dijo que no.
Acá no sirve: una ronda que se muere porque UNA base todavía no publicó sus
reglas deja de contar lo que sí pudo leer. El motivo sale en FUENTES, y que
salga no es opcional — un `permission-denied` callado parece una corrida que
anduvo bien.

### Quién lo corre

Una persona, al abrir una tanda; y desde el 14-sep-2026 también una **routine**
de Claude Code, una vez por día, sola. Eso está en `RUTINA-AUTOMATICA.md`: qué
hace, qué no hace y por qué, y por qué no cuesta nada aparte de la suscripción.

### El banco

`node pruebas/herramientas/ronda.mjs` — 25 casos, sin red ni dependencias.
Prueba lo que rompe el circuito sin que nadie lo vea: que un reporte ya traído
no vuelva (tampoco si su pendiente está cerrado), que dos bases con el mismo id
de reporte no se confundan, que una clave con nombre no genere un número
inventado, y que el orden de los abiertos ponga lo trabado después y lo que no
declaró prioridad al fondo y no al tope.

## `reservas.mjs`

Completar las reservas de Casa Verde con lo que dicen los mensajes de los
huéspedes —de Airbnb, capturados en el teléfono; WhatsApp dejó de leerse el 30-sep— (29-sep-2026, fase 0
de `L-agente-casaverde`).

```
node herramientas/reservas.mjs estado                          lo que le falta a cada reserva que viene
node herramientas/reservas.mjs vincular --bodega <dir> [--dias N]   cada chat, con la reserva a la que se refiere
node herramientas/reservas.mjs completar <reservaId> <archivo.json> [--seco]
node herramientas/reservas.mjs capturas --bodega <dir> [--leida <archivo>]   las capturas de Airbnb sin leer
node herramientas/reservas.mjs llegadas [--dias N] [--bodega <dir>] [--enviar --a <nombre>]   el aviso de cada llegada
```

El archivo dice de dónde salió y qué completar:
`{"fuente": "WhatsApp de Amparo", "cliente": {"nombre", "telefono", "email",
"pais", "idioma"}, "adultos": 5, "ninos": 1, "bebes": 1, "mascotas": "1 perrita",
"llegada": "19:30", "contacto": {"telefono", "canal", "idioma"}, "pedidos":
["cuna"], "nota": "…"}`.

**Lo que sabemos del huésped** (`reservas-4`, con `reservas-ical-7` de Casa
Verde): bebés, mascotas, la hora a la que dijo que llega (`llegadaEstimada` —
**no** `horaEntrada`, que es la de la casa y hasta `reservas-3` se pisaba),
`contacto {telefono, canal, idioma}` y `pedidos`, que se SUMAN pendientes y
los tilda una persona en la ficha. El teléfono de `contacto` va también a la
ficha del cliente si no lo tiene.

**El teléfono sale del chat, no de las capturas** (pedido de Mauro, mismo
día). Un chat de WhatsApp de alguien no agendado trae el número en el título;
un huésped de Airbnb a veces lo escribe. Si la reserva no tiene teléfono,
`vincular` lo imprime listo para `completar`. Si el chat tiene un **nombre**
(contacto agendado), el número no viaja en la notificación: se le recuerda a
Mauro que lo guarde en la reserva. Y si no hay ni chat, `estado` dice «pedíselo
al huésped» y la ronda deja el borrador que se lo pide.

**Los avisos de Airbnb se leen por fechas y alojamiento** (`reservas-2`): no
traen teléfono, traen el anuncio («Loft en Canasvieiras…») y el período. Si un
aviso dice que hay una reserva **confirmada** que Casa Verde no tiene, `vincular`
lo marca con ⚠ y dice cómo traerla: Reservas → «Airbnb» → «Sincronizar ahora».
Una consulta o una solicitud no son una reserva y no se marcan.

**Las reservas de Airbnb entran con el código solo** (`Airbnb · HM2DNEZXSP`) y
con 2 adultos de relleno: `estado` avisa que falta confirmar cuántos son, y al
darle cliente, el título suma el nombre **conservando el código**
(`Airbnb · HM2DNEZXSP Natalia`), también en su acuerdo. Del calendario sale
además `ultimos4`, los últimos 4 dígitos del teléfono, que confirman un
teléfono que llega por otro lado. Las **capturas de Airbnb** que sube el
teléfono se leen en la sesión (son imágenes) y se anotan con `--leida`.

**Las llegadas** (`reservas-5`): `llegadas [--dias 3] [--bodega <dir>]` junta
las reservas confirmadas que llegan en los próximos tres días y no se avisaron
(un acuerdo de varias cabañas es una llegada) y arma el aviso para quien
recibe: nombre, cuándo, cabañas, cuántos, qué falta saber, y el enlace a la
**ficha de llegada** de Casa Verde (`interno/llegada.html?r=…`), que pide la
sesión y trae la reserva, el huésped, su historia, la plata y la bienvenida
lista para mandar. **El aviso no lleva el teléfono ni la plata**: eso queda
detrás del login. Con `--bodega` lo deja como borrador y marca
`bienvenida.avisadaEn` en la reserva para no repetirlo; la ficha marca
`bienvenida.enviadaEn` cuando se manda la bienvenida.

**Completa, no decide.** Crea el cliente si no hay (con el país del prefijo del
teléfono) o llena lo vacío o dudoso de uno que exista —lo que escribió una
persona no se pisa—; cambia adultos, niños y la hora de entrada; agrega una
nota con sello. **Rechaza, diciendo por qué**, las fechas, la cabaña, el estado
y la plata: eso lo decide Mauro, y un mensaje es un dato de un tercero. Cada
cambio deja su copia en `_historial/` (se deshace con `firestore.mjs casaverde
deshacer`) y un renglón en el `historial` de la reserva, como los de la
pantalla. Ese renglón se agrega **crudo** (`leerCrudo` y `$crudo` de
`firestore.mjs`): los anteriores son fechas de Firestore, y reescribirlos como
texto rompería la pantalla. Banco: `node pruebas/herramientas/reservas.mjs`
(48 casos, sin red).

## `avisos.mjs`

Los avisos del agente por WhatsApp, por el CallMeBot de cada persona (desde el
30-sep-2026, línea `L-avisos`). **Los criterios —qué merece un aviso y qué no—
están en `protocolos/PROTOCOLO-AVISOS.md`**; esto es la mitad que se comprueba
con código.

```
node herramientas/avisos.mjs quienes [base...]         quién puede recibir, y si no, por qué
node herramientas/avisos.mjs enviar <base> --a <nombre> --tema <tema> --texto "…" [--sobre <proyecto>] [--seco]
node herramientas/avisos.mjs probar <base> --a <nombre>
node herramientas/avisos.mjs registro [--dias N]
```

Bases con gente: `casaverde`, `casayourte`, `remate` (`tiempos` va por
`casaverde`). Temas: `urgente`, `llegada`, `pedido`, `resumen`, `prueba`.

- **El contacto se trae de a uno** con `contactoAviso` de `firestore.mjs`, la
  única puerta a `avisos_contacto` —que sigue en `selladas`—. La regla de cada
  base le da al agente `get` y nada más. **No se imprime ni se guarda.**
- **Sólo a quien encendió «Avisos de Claude»** (`agente: true`, lo escribe la
  persona) y tiene ficha activa. Nunca a un huésped ni a un cliente.
- **El texto no lleva teléfonos, plata, mails ni enlaces de afuera**: la
  herramienta lo rechaza y dice qué sacar.
- **Tres por número y por día**, y un minuto entre dos al mismo número.
- **El registro va a la bodega** (`avisos/AAAA-MM.json`), con una huella del
  número y nunca el número. Sin `--bodega` no se manda: sin registro no hay tope.
- **Manda por la función `notify-whatsapp` de Casa Verde en Netlify**, y lee la
  respuesta de CallMeBot como `CV2._leerRespuestaWa`: un 200 no quiere decir
  que salió.

`reservas.mjs llegadas --enviar --a <nombre>` usa esto para el aviso de cada
llegada, y si no puede salir lo deja como borrador, como antes.

Banco: `node pruebas/herramientas/avisos.mjs` (37 casos, sin npm ni red), que
además compara las reglas de los tres sitios cuando sus repositorios están al
lado.

## `novedades.mjs`

Lo nuevo desde el último aviso, en **un** WhatsApp para Mauro (30-sep-2026,
pedido suyo): reserva nueva, check-in y check-out de hoy o mañana, tarea
nueva que creó otro, cuántos mensajes nuevos de Airbnb, pedidos y fallas
de los sitios, y el teléfono sin latido hace más de 26 h. Si no hay nada nuevo no
manda nada. Lo ya avisado vive en `avisos/visto.json` de la bodega; la primera
corrida sólo anota lo que existe. Los textos de terceros se limpian de plata,
teléfonos y mails antes de armar el mensaje.

```
node herramientas/novedades.mjs [--a Mauro] [--seco] [--bodega <dir>]
```

Banco: `node pruebas/herramientas/novedades.mjs` (16 casos, sin red).

## `ACCESO-A-LAS-BASES.md`

El paso a paso para dar de alta al agente en una base, hecho para seguirse
desde el teléfono: crear el usuario, sacar el UID de ese proyecto, pegar el
bloque de reglas y comprobar que lo sellado contesta 403.
