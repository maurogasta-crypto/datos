# herramientas — lo que una sesión corre contra las bases

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

### Las cuatro bases

| Proyecto | Firebase | Estado al 2026-09-11 |
|---|---|---|
| `panel` | `datos-830f8` | lee y escribe. Falta sacarle `fichas` en las reglas |
| `remate` | `remate-acbc9` | entra; falta pegar `firestore.rules` v0.8 en la consola |
| `casayourte` | `casayourte-mauro` | entra; falta pegar `REGLAS.txt` en la consola |
| `casaverde` | `casaverde-20` | entra; falta pegar `interno/firestore.rules` en la consola |

Harmonía no está porque no tiene base: todo su estado vive en el
`localStorage` del teléfono.

**Es un solo usuario para las cuatro**, con el mismo mail y la misma
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

Lo que el agente no toca está en `selladas`, por proyecto. En el panel son
`claves` y `fichas`; en los sitios, las credenciales, el dinero y los datos de
personas. La herramienta tiene un guardia que corta antes de salir a la red,
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
contraseña, el respaldo la tiene también, y este repositorio es privado pero su
historial es permanente. Por eso `respaldos/` está en el `.gitignore` desde el
2026-09-11: el respaldo se hace siempre, y siempre se queda afuera de git.

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

## `ACCESO-A-LAS-BASES.md`

El paso a paso para dar de alta al agente en una base, hecho para seguirse
desde el teléfono: crear el usuario, sacar el UID de ese proyecto, pegar el
bloque de reglas y comprobar que lo sellado contesta 403.
