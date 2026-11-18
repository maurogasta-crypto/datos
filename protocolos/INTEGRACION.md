# INTEGRACIÓN — todo el ecosistema dentro de Timón

Escrito el 18-nov-2026 a pedido de Mauro:

> «Según la última reestructura la idea es que todo se concentre en Timón:
> entonces lo que se grabe en Casa Verde tendría que guardarse en el mismo
> lugar de Timón. Y cuando es Casa Verde que lee, lo saca de ahí. Así todo está
> registrado en un mismo lugar.»
>
> «Revisá la documentación de Timón y cómo se pretende organizar la
> información para que se pueda contener todo lo de Casa Verde en Timón sin
> perder nada. […] Tiene que incluir referencias exhaustivas de los
> repositorios: dónde va cada información, cómo se accede desde cada sitio y
> cómo se visualiza dentro de Timón.»

**Qué es este archivo.** `ARQUITECTURA.md` dice las reglas y las etapas. Este
archivo baja esas reglas a cada base, cada colección y cada pantalla. Es el
mapa que una sesión lee antes de mover un dato de lugar o de dibujar una
pantalla de Timón que muestre algo de un negocio.

Si los dos dicen cosas distintas, manda `ARQUITECTURA.md`, y se corrige uno de
los dos en la misma tanda.

Lo que este archivo PROPONE y Mauro todavía no decidió va marcado
**[a decidir]** y está listado en el § 9.

Se lee junto con:
- `PROTOCOLO-INTERFAZ` § 14: mirar, hacer, profundizar.
- `PROTOCOLO-DESARROLLO` § 13: los cupos gratuitos.
- `PROTOCOLO-SECRETOS`.
- `PROTOCOLO-PLATA`.

---

## 0. La idea, en una frase

**Timón es el único lugar desde donde se USA todo el ecosistema.**

Lo que una persona del equipo necesita para el día (qué hacer, qué comprar,
cuándo, con quién hablar) **se guarda en Timón**, y el sitio del negocio lo
lee de ahí.

Lo que es el **libro** de un negocio (sus reservas, su plata, sus horas
cobradas, sus clientes) **se guarda en la base del negocio**. Timón lo
muestra y actúa sobre él por su contrato, sin copiarlo.

Lo **público** (sitios, catálogos, álbumes) nunca pasa por Timón.

Así hay **un lugar por dato** y **una sola puerta para mirarlo todo**. «Sin
perder nada» quiere decir dos cosas:
- **Nada queda sin lugar:** cada colección de cada base tiene su fila en el § 4.
- **Nada se pierde al mudarlo:** el § 7 dice cómo se muda un dato.

## 1. Por qué no se muda TODO a la base de Timón

Mudar también el libro a `tiempos-71d42` parecería lo más simple: «todo en un
mismo lugar». No se hace, por cinco razones. Las primeras cuatro ya estaban
decididas en `ARQUITECTURA` § 3; la quinta es de este pedido:

1. **Un negocio se tiene que poder separar o entregar** (regla 7). Hoy eso es
   copiar una base. Con las reservas de Casa Verde mezcladas con la plata de la
   familia, entregar Casa Verde a otra persona sería una cirugía.
2. **El público lee el libro sin cuenta.** El sitio de Casa Verde lee
   `cabanas`, `disponibilidad` y `recuerdos`, y las funciones de Airbnb leen
   `reservas`. Abrir eso en la base de la familia expone la base de la familia.
3. **Las reglas finas son del negocio.** En Casa Verde, quien tiene el permiso
   `dinero` ve sólo sus gastos y `finanzas` ve el libro. Los datos de huéspedes
   y clientes caen bajo LGPD. Esas reglas viven y se prueban en su base.
4. **El cupo.** Cada base de Spark tiene sus 50 000 lecturas por día, y la de
   Timón ya se quedó sin cupo una vez (27-oct). Mudar el libro de Casa Verde
   sumaría a Timón las lecturas de Reservas, Dinero y del sitio público.
5. **Lo que Mauro pidió se cumple igual.** Lo que se GRABA a diario en Casa
   Verde (compras, tareas, agenda, conversaciones) es lo cotidiano, y eso sí
   va a Timón. Lo que Timón muestra del libro no se copia: se lee de su único
   lugar, así que tampoco hay dos registros.

**[a decidir · D1]** Si Mauro quiere que también el libro viva en la base de
Timón, se rehace este § 1 y la regla 3 de `ARQUITECTURA`. Hasta que lo diga,
rige la línea de arriba.

## 2. Las cinco clases de dato (la pregunta que decide dónde vive)

| Clase | La pregunta | Dónde se GUARDA | Cómo lo ve Timón |
|---|---|---|---|
| **C · Cotidiano** | ¿Lo mira alguien del equipo para saber qué hacer, comprar o contestar, y cuándo? | **Base de Timón** (`tiempos-71d42`), en el **espacio** del negocio (`items/`, `agendas/`, hilos) | Es suyo: lo pinta y lo escribe |
| **L · Libro** | ¿Se cobra, se declara, se le entrega a alguien o lo audita un balance? | **Base del negocio** | Lo **lee** por el conector del negocio con la sesión de la persona; **actúa** por el motor del negocio; nunca lo copia |
| **P · Público** | ¿Lo ve un huésped, cliente o comprador sin cuenta? | **Base del negocio** | No lo muestra; a lo sumo, un enlace |
| **S · Sellado** | ¿Abre algo (contraseña, llave, token, código)? | Donde está, sellado al agente | Nunca |
| **T · Taller** | ¿Es del desarrollo (fallas, pendientes, reglas, tandas)? | Panel (`datos-830f8`); los reportes, en `reportes/` de cada base | No (el panel es el taller, regla de § 1 de `ARQUITECTURA`) |

**Cuando una cosa tiene dos caras se parte, y cada parte va a su clase.** Por
ejemplo:
- «Comprar la placa OSB» es C. Lo que se pagó por la placa es L.
- «Limpiar c2 el jueves» es C. Las horas que se cobran por esa limpieza son L,
  y apuntan al ítem por su id.

**Un dato L puede aparecer en «Hoy» como una SEÑAL** («hoy llega una reserva
a c2», «hay un cambio de reserva para confirmar»). Una señal es un renglón
que Timón arma leyendo el libro, sin copiarlo. Tocarla abre la pantalla del
libro en el sitio del negocio, o actúa por su motor.

## 3. Las piezas que hacen falta (y cuáles ya existen)

| Pieza | Qué es | Estado |
|---|---|---|
| **Ítem** (`items/` de Timón) | La forma única de lo cotidiano: `tipo`, `titulo`, `espacio`, `dia`, `hora`, `importancia`, `hecho`, `creadoPor` (`nucleo.js`, `TIPOS_ITEM`; regla v25) | Existe, con sólo el tipo `tarea` (etapa 4, en paralelo hasta el 23-nov) |
| **Espacio** | Con quién se comparte. Hoy hay dos implícitos: `familia` y `p-<uid>` | `espacios/{id}` con miembros nace con el primer negocio, Casa Verde (etapa 8) |
| **`hoy/{uid}`** | Lo de hoy de una persona en todos sus espacios, ya armado, con la acción de cada renglón (regla 3) | Existe; lo pinta el widget «Hoy» (pizarra-84) |
| **Conector de un negocio** (`conector-N.js`) | El contrato por el que Timón LEE y ACTÚA sobre el libro de un negocio | Casa Verde tiene `conector-1.js` (ver § 5); los otros negocios no tienen |
| **`timon-1.js`** (nuevo) | El contrato inverso: por él un negocio lee y escribe SU espacio de Timón (sus ítems, su agenda, sus hilos) | **[a hacer en 8.1]** Vive en `maurogasta-crypto/tiempos`, se sirve en `…github.io/tiempos/timon-1.js` y tiene su `OFRECE` y su banco en los dos repos, igual que el `conector-1` |
| **Cuentas** | Firebase no comparte usuarios entre proyectos, así que una persona tiene una cuenta en Timón y otra en cada negocio. `miembros/{uid}` de Timón lleva `cuentas: { casaverde: "<uid de allá>" }`, que escribe el agente al invitar y con autorización | Hoy Timón guarda `miembros/{uid}.cvUid` al conectar Casa Verde. Se generaliza a `cuentas` en 8.1 |
| **Hilo** | La conversación de un ítem o de un espacio (etapa 6) | No existe todavía. `mensajes/` de Timón es la charla entre teléfonos |
| **`origen`** | En un ítem que se mudó de otra base: `{ base, coleccion, id }`. Es la vuelta al dato viejo mientras corre el paralelo | **[a hacer]** con el primer tipo que se mude |

## 4. Dónde va cada información: el mapa, base por base

Columnas de cada tabla:
- **Clase**: la del § 2.
- **Hoy en**: la colección actual.
- **Va a**: dónde vive al terminar. «queda» quiere decir que no se mueve.
- **Escriben y leen hoy**: las páginas y herramientas.
- **En Timón**: cómo se ve, hoy y cuando termine.

Las etapas son las de `ARQUITECTURA` § 6. Los números 8.x son los pasos del
§ 8 de este archivo.

### 4.1 Timón — `maurogasta-crypto/tiempos` · base `tiempos-71d42`

Es la casa de lo cotidiano: todo lo de esta base es C, salvo la plata de la
familia, que es su propio libro y queda **fuera de los espacios**
(`ARQUITECTURA` § 3).

| Colección | Qué guarda | Clase | Pantalla de Timón |
|---|---|---|---|
| `items/` | Ítems de los espacios: hoy `tarea`; con la etapa 8, también `compra`, `cita`, `pedido` y `pregunta` | C | «Hoy» (`hoy.js`) |
| `hoy/{uid}` | La materialización de lo de hoy (sellada al agente) | C | Widget «Hoy» de Android (`Hoy.kt`) |
| `tareas/` | Las tareas de siempre, que conviven con `items/` hasta el 23-nov | C | Tareas, Pizarra |
| `agendas/{uid}` (+ `copias`) | La agenda de cada uno, el orden personal y los lugares (sellada; el agente la lee de a uno) | C | Agenda |
| `dias/`, `turnos/`, `eventos/` | Lo cotidiano de cada día, los chicos por día y sus actividades | C | Cotidianas, Chicos |
| `familia/` | Mapas de la casa: `config`, `compras` (las listas), los nombres de los teléfonos | C | Compras, Chicos, ajustes |
| `compartidas/{token}` | Una lista de compras abierta sin cuenta por 48 h (la única que se lee sin sesión) | C | Compras («🔗 Compartir») |
| `deseos/` | Deseos y actividades que gustan | C | Tareas → Ahora |
| `alertas/` | Las alarmas («Avisarme») | C | Las programa Android |
| `bloques/`, `marcas/` | Acuerdos de tiempo y salidas | C | Balance, Chicos |
| `sesiones/` | Los relojes de la familia | C (son horas, no plata) | Ahora, Balance |
| `movimientos/`, `recurrentes/`, `extractos/` | La plata de la familia | L de la familia (fuera de los espacios) | Plata |
| `propuestas/`, `auditoria/` | Lo que propone el agente (plata incluida) y su rastro | C, y la plata se propone | Plata, Tareas («Claude propone») |
| `mensajes/`, `audios/`, `archivos/`, `llamadas/`, `enlace/`, `enlace_llave/` | La charla entre teléfonos (los tres del medio son efímeros; `enlace_llave` está sellada) | C | Android: mensajes, handy, llamadas (congeladas, § 5 de `ARQUITECTURA`) |
| `avisos/` | El buzón de Claude para la familia | C | Android (avisos), Timón |
| `salud/` | El parte de cada aparato | T | Panel y ronda |
| `reportes/` | Fallas y sugerencias del globo 💡 | T | Panel |
| `miembros/`, `solicitudes/` | Quién entra a Timón | S/C | Ajustes |
| `_historial/` | La copia previa de cada cambio del agente | T | `firestore.mjs tiempos historial` |
| `espacios/` (**nueva, 8.1**) | Los espacios de negocio, con miembros y permisos | C | El selector de espacio, en «Hoy» |

### 4.2 Casa Verde — `casaverdecanas-blip/casaverdecanas` · base `casaverde-20`

Es el primer negocio que entra (etapa 8). Éstas son todas las colecciones de
sus reglas (`interno/firestore.rules`), con `config/` documento por documento:

| Colección | Qué guarda | Clase | Hoy en → Va a | Escriben y leen hoy | En Timón hoy | En Timón al terminar |
|---|---|---|---|---|---|---|
| `actividades/` (las compras: `esCompra`) | Lo que hay que comprar: una cosa por línea de `detalle` o el título, `comprados[]` y `proveedor` | **C** | `casaverde-20` → **`items/` tipo `compra`, espacio `casaverde`** (8.2) | `actividades.html` (filtro 🛒) | **Compras → «🏡 Casa Verde»** (compras-7, 18-nov: lee `E.cvActs` y tilda con `Core.tildarCompra`) | Compras: una sola solapa con las listas de cada espacio. Casa Verde lee por `timon-1` |
| `config/compras` | Los lugares donde se compra | C | → el documento del espacio `casaverde` (8.2) | `actividades.html` | — | En la lista, «📍 lugar» |
| `actividades/` (tareas y proyectos sin reloj ni monto) | El árbol (`parentId`), `alcance`, `competencias`, fechas y prioridad | **C** | → `items/` tipo `tarea`, espacio `casaverde`, con `padre` (8.3) | `actividades.html`, `index.html` (Inicio), `agenda.html`; el agente | Tareas (lista de Casa Verde, `consultaActividades`) y Agenda (`cv:<id>`) | «Hoy» con el chip Casa Verde y la pantalla del espacio |
| `actividades/` (con reloj, `monto`, recurrencia, limpiezas `reservaId`/`fase`, control de salida `checkout-<reservaId>`) | Trabajo que se cobra y nace de las reservas | **C con cara L** | → `items/` del espacio (8.6) **[a decidir · D3]**; las horas y los honorarios quedan en el libro y apuntan al ítem | `actividades.html`, `reservas-core.js` (crea limpiezas), `actividades-core.js` (cierra ciclos y reparte honorarios) | Tareas: ▶/⏹/✔ por `Core.iniciar` / `finalizar` / `tildar` | Lo mismo, con el motor de Casa Verde leyendo y escribiendo el ítem por `timon-1` |
| `estado_usuario/{uid}` (`agenda`) | La agenda de cada uno en Casa Verde: mañana y tarde | C | → `agendas/{uid}` de Timón (8.4) | `agenda.html`; Timón la escribe directo, su única escritura directa | Agenda (las piezas `cv:`) | Agenda: una sola. Casa Verde la lee por `timon-1` |
| `comunicaciones/` (+ `mensajes/`) y `comunicaciones_lecturas/` | Las conversaciones del equipo por tema y quién leyó qué | C | → los hilos del espacio `casaverde` (8.5, junto con la etapa 6) | **Ninguna página las usa hoy** (sólo `diagnostico.html`): 5 temas, el último movido el 2-ago-2026 | — | Hilos del espacio. Un mensaje se vuelve ítem con un toque |
| `avisos/` | El buzón de Claude para alguien del equipo | C | → ítem tipo `aviso` del espacio, o renglón de «Hoy» **[a decidir · D6]** | `avisos.mjs` (crea), `avisos.html` (lee); Android | Android (avisos por sitio) | «Hoy» |
| `sesiones/` | Las horas: cronómetro, tilde y manual | **L** | queda | `actividades.html`, `gestion-sesiones.html`, `horas-stats.html`; Timón | Ahora (el reloj que cobra), Balance (las horas de Casa Verde), la ficha de la tarea | Igual. `actividadId` pasa a ser el id del ítem (8.6) |
| `honorarios/` | El reparto de cada ciclo cerrado | L | queda | `honorarios.html`; el motor; `ingresos.mjs` | Plata: propuestas de ingreso (el agente las arma, una persona aprueba) | Igual |
| `reservas/` | Las reservas (nombre, cabaña, fechas, montos) | L | queda | `reservas.html`, `reservas-core.js`, `revisar-reservas.html`, `llegada.html`, `comprobante.html`; las funciones del zip; `reservas.mjs` | Agenda: las llegadas y salidas (agenda-22) | **Señal** en «Hoy»: «llega / sale hoy», y la pantalla del espacio |
| `grupos/` | El acuerdo de varias cabañas (total y máximo a la vez) | L | queda | `reservas.html` | — | Dentro de la señal de la reserva |
| `pagos/` | Los cobros de una reserva | L | queda | `reservas.html`, `dinero.html`, `llegada.html`, `comprobante.html` | — | La pantalla del espacio, si hay permiso |
| `cambios_reserva/` | Lo que la ronda propone cambiar en una reserva | L | queda | La ronda crea; `reservas.html` confirma | — | **Señal** en «Hoy»: «N cambios para confirmar», que abre Reservas |
| `airbnb_estado/` | Si la ida hacia Airbnb llegó | L (un dato, no una alarma) | queda | La ronda | — | Sólo en la pantalla del espacio |
| `chequeos/` | El inventario de cada limpieza (`chequeo-<reservaId>`) | L | queda | `actividades.html` (vacía al 18-nov) | — | Enlace desde el ítem de la limpieza |
| `movimientos/` | El libro de plata del negocio | L | queda | `dinero.html`, `balance.html`, `fiscal.html`; `extractos.mjs`, `ingresos.mjs` | Plata → Proyectos (`pedirLibroCV`, sólo con permiso `finanzas`); propuestas de ingreso | Igual |
| `liquidaciones/` | Los cobros de Airbnb y su DARF | L | queda | `dinero.html`, `fiscal.html` | — | Señal «DARF pendiente», si se pide **[a decidir · D6]** |
| `cierres/` | Los balances cerrados, inmutables | L | queda | `balance.html` | — | — |
| `clientes/`, `huespedes/`, `recuerdos_contactos/` | Personas: datos de contacto (LGPD) | L | queda | `clientes.html`, `recuerdos.html`, el acceso de huéspedes | — | Nunca se copian; a lo sumo, el nombre en una señal |
| `pedidos_alquiler/`, `pedidos_busqueda/` | Pedidos de alquiler de Facebook y qué se busca | L (texto de terceros) | queda | `pedidos-alquiler.html`; Android del 13C; el agente | — | **Señal** «N pedidos que caen en fechas libres», que abre la página |
| `notificaciones/` | Las del 13C, efímeras (7 días) | L/T | queda | Android crea, el agente clasifica | — | — |
| `cabanas/`, `espacios_comunes/`, `disponibilidad/`, `config/sitio` | Lo que publica el sitio | P (y el inventario de `cabanas`, L) | queda | `cabanas.html`, `espacios.html`, `editar.html`, `traducir.html`, el sitio público | Agenda (el nombre de la cabaña) | Igual |
| `recuerdos/` | Fotos de huéspedes, moderadas | P | queda | `recuerdos.html`, el sitio público | — | **Señal** «N recuerdos por moderar» |
| `config/fiscal` | Datos fiscales | L | queda | `fiscal.html` | — | — |
| `claves_recuerdos/`, `config/integraciones`, `config/airbnb`, `avisos_contacto/` | Lo que abre algo | **S** | queda (sellado) | Sus páginas; `avisos_contacto` sólo con un `get` | — | Nunca |
| `usuarios/` | Las fichas: nombre, `activo` y `permisos` | S/L | queda; el espacio apunta a ella por `cuentas` | `usuarios.html`; Timón lee los nombres | Nombres en Tareas | Igual. Los permisos del negocio siguen mandando sobre su libro |
| `reportes/` | Las fallas | T | queda | El globo de `CV2.renderNav()`; el panel | — | — |
| `_historial/` | La copia previa de cada cambio del agente | T | queda | `firestore.mjs casaverde historial` | — | — |

Notas:
- **`actividades_usuario`** (vistos y destacados) aparece en la tabla A6 de
  `CASAVERDEDOCUMENTACION.md`, pero no está en las reglas vigentes. Si se
  sigue usando, es C personal y va a `agendas/{uid}` con 8.3.
- **Las páginas de lo cotidiano de Casa Verde** (`actividades.html`,
  `agenda.html` y la de comunicaciones) leen de Timón por `timon-1` mientras
  corre el paralelo. Al terminar, redirigen a la pantalla del espacio en
  Timón. **Las páginas del libro quedan en Casa Verde**: Reservas, Dinero,
  Balance, Fiscal, Honorarios, Cabañas, Recuerdos, Pedidos de Facebook y
  Comprobante.

### 4.3 CasaYourte — `casayourte/CasaYourte` · base `casayourte-mauro`

| Colección | Clase | Va a | En Timón al terminar |
|---|---|---|---|
| (sin colección hoy) las tareas del taller, las compras de materiales y las citas con proveedores | C | `items/` del espacio `casayourte` (nacen allá; no hay nada que mudar) | «Hoy» y Compras («placa OSB», «listones 2,64 en Luissi») |
| `consultas/` (+ adjuntos) | L (cliente, LGPD) | queda | **Señal** «consulta sin responder» → `consultas.html`. El borrador lo prepara Claude y lo manda una persona |
| `presupuestos/`, `proveedores/`, `presupuesto_pedidos/` | L (privados; UYU y USD no se suman) | queda | Señal «pedido a proveedor sin respuesta». Comprar lo pedido es un ítem C que apunta al pedido |
| `calculos/` | L, sellada al agente | queda | — |
| `sitio/` (`taller`, `publicado`), `albums/`, `entregas/` | P | queda | Enlace |
| `usuarios/`, `invitaciones/`, `avisos_contacto/` | S/L | queda | — |
| `avisos/` | C | Igual que en Casa Verde (D6) | «Hoy» |
| `reportes/`, `_historial/` | T | queda | — |

Hoy Timón no lee nada de CasaYourte. Falta su **`conector-1.js`**, con lo
mínimo: las consultas sin responder y los pedidos sin respuesta, como cuentas
sin texto. Se hace cuando le toque en la etapa 8.

### 4.4 remateTaller — `rematetaller/remate` · base `remate-acbc9`

| Colección | Clase | Va a | En Timón al terminar |
|---|---|---|---|
| (sin colección) las tareas del depósito y de las subastas | C | `items/` del espacio `remate` | «Hoy» |
| `productos/`, `categorias/`, `pedidos/`, `ventas/`, `compradores/`, `metodosPago/`, `config/` | L | queda | Señales («N pedidos por cobrar») y los ingresos a Plata por `ingresos.mjs` (ya existe) |
| `lucesRegistro/` | L | queda | Las luces se ACCIONAN desde Android (`LUCES_WIDGET`, por el servidor); el registro no se muestra |
| `llaves/`, `documentos/`, `avisos_contacto/` | S | queda | Nunca |
| `usuarios/` | S/L | queda | — |
| `avisos/` | C | Igual que en Casa Verde (D6) | «Hoy» |
| `reportes/`, `_historial/` | T | queda | — |

### 4.5 El Paseo — `maurogasta-crypto/paseo` · base `pruebas-db555`

| Colección | Clase | Va a | En Timón |
|---|---|---|---|
| `albumes/` | P | queda | Enlace |
| (sin colección) los alquileres, las visitas y los arreglos de los locales | C | `items/` del espacio `paseo` | «Hoy» |

Es el ejemplo de la regla 1 de `ARQUITECTURA`: los alquileres de General
Flores son el Paseo, no una sección de Timón. **Su libro** (inquilinos,
contratos, cobros) todavía no existe. Cuando exista, va a `pruebas-db555`
como L.

### 4.6 BandoMaps — `masotromauro-ai/tocatoca` · base `tocatoca-621a5`

`usuarios/`, `invitaciones/`, `config/`, `clases/`, `progreso/`, `historico/`,
`ingresos/` y `reportes/` son el libro de otro equipo (Mariano y sus
alumnos): **L, y queda**. Lo cotidiano de Mauro sobre BandoMaps (preparar una
clase, revisar lo que subió Mariano) va a su espacio personal. Un espacio
`bandomaps` con Mariano como miembro sólo existe si Mariano entra a Timón
**[a decidir · D5]**. Los `ingresos/` podrían proponerse a Plata como los de
Casa Verde y remate, si Mauro lo pide.

### 4.7 La Hilux — `maurogasta-crypto/sitd-hilux` · base `hilux-1b6f1` (+ el SQLite del teléfono)

`reportes/`, `recorridos/` (lleva coordenadas: nunca a Timón ni a un chat),
`grabaciones/`, `respaldos/` y `analisis/` son L y quedan.

Hoy el viaje sale a Android por `content://…pizarra.enlace`, sin
coordenadas.

**Cómo se ve en Timón:** los gastos de la camioneta (combustible y arreglos)
son plata de la familia, en la cuenta «la Hilux» de Plata. Los avisos de
mantenimiento son ítems C del espacio personal de Mauro. El odómetro y el
diagnóstico se miran en la app de la Hilux.

### 4.8 Roli — `maurogasta-crypto/roli` · base `roli-467a4`

`calibraciones/`, `partidas/`, `notas/` y los jugadores (nombres de chicos)
son L y quedan; nada de eso sale a Timón. Preparar una clase o comprar piezas
son ítems C del espacio de Mauro, o de un espacio `roli` si alguien más da
las clases (D5).

### 4.9 El panel — `maurogasta-crypto/datos` · base `datos-830f8`

Todo es T: `proyectos/`, `pendientes/`, `tandas/`, `lineas/`, `protocolos/`,
`fichas/`, `personas/`, `solicitudes/`, `invitaciones/` y `albumes/`. La
bóveda `claves/` es S y sólo de Mauro.

**Una sola cosa del panel llega a Timón:** «Para decidir». Son las preguntas
con `opciones` de los pendientes, que se mudan a «Hoy» en la etapa 5c. Para
eso, Timón lee esos pendientes con la sesión de Mauro, y el toque escribe la
`respuesta` en el panel, igual que la cola. Ningún dato se copia.

### 4.10 Lo que no es una base

- **Bodega** (`maurogasta-crypto/bodega`, privada): copias de las bases,
  mensajes de Airbnb y borradores. No entra a Timón. Un borrador para
  contestar puede aparecer como señal **[a decidir · D6]**.
- **Servidor** (`timon-servidor`, código en `datos/servidor/`): las funciones
  con secreto (IA, despertar, luces, hielo). Timón las llama por
  `servidor-1.js`.
- **Piezas comunes** (`datos`): `ojos.js`, `errores.js`, `callmebot.js` y
  `servidor-1.js`.

## 5. Cómo se accede desde cada sitio

### 5.1 Hoy (18-nov-2026), leído del código

| Quién | A qué | Por dónde | Qué hace |
|---|---|---|---|
| **Timón web** | Casa Verde | `conector-1.js`, bajado de `casaverdecanas.com.br/interno/` (`CONECTOR` en `firebase-init.js` de tiempos), con la **sesión de Casa Verde de la persona** | **Lee:** `actividades` (por `Core.consultaActividades`), `sesiones` (la propia en curso y las de una tarea), `usuarios` (nombres), `cabanas`, `reservas` (`checkOut ≥ hoy − 14`), `estado_usuario/{uid}` y `movimientos` (Plata → Proyectos, sólo con `finanzas`). **Actúa:** `Core.iniciar`, `finalizar`, `tildar`, `tildarCompra`; `CV2.subirImagen` (boletas). **Escribe directo** sólo `estado_usuario/{uid}.agenda`. El banco de tiempos falla si se usa algo que no está en `OFRECE` |
| Timón web | El servidor | `servidor-1.js` de `datos` | La IA (`claude-proxy`) y despertar |
| **Timón Android** | Timón | REST con el `refreshToken` de Timón | `hoy/{uid}`, tareas, agenda, mensajes, alertas |
| Timón Android | Casa Verde | REST con la sesión de Casa Verde del teléfono | Crea `notificaciones/` y `pedidos_alquiler/` (13C); lee `avisos/` |
| Timón Android | CasaYourte, remate | REST con su sesión (`SITIOS` de `Avisos.kt`) | Lee `avisos/`; en remate, las luces por el servidor |
| Timón Android | La Hilux | `content://…pizarra.enlace` (firma verificada) | Recibe el viaje sin coordenadas |
| **Casa Verde** | Timón | — | **Nada.** Es lo que falta para que «cuando es Casa Verde que lee, lo saque de ahí» |
| **El agente** (`firestore.mjs`) | Todas las bases | Usuario común en cada una; selladas por regla y por `selladas` | Lee, escribe con copia previa donde las reglas dejan, propone plata. `ingresos.mjs` lee Casa Verde y remate y propone en Timón |
| **El panel** | Cada base | Su sesión | Lee `reportes/`. Los proyectos son suyos |

### 5.2 Al terminar la etapa 8

| Quién | A qué | Por dónde | Qué cambia |
|---|---|---|---|
| Timón web | Cada negocio | Su `conector-N.js` | Sólo el libro y las señales. Lo C ya es de Timón |
| **Cada negocio** | **Timón** | **`timon-1.js`** con la sesión de Timón de la persona | Lee y escribe los ítems, la agenda y los hilos de SU espacio. Nada más: ni la familia ni lo personal (lo dicen las reglas por espacio) |
| Timón Android | Timón | Sólo `hoy/{uid}` y lo que ya lee | Los avisos de cada base pasan a ser renglones de «Hoy» (D6) |
| El agente | Timón | El mismo usuario, **miembro de los espacios** | Crea y completa ítems de los espacios con copia en `_historial/`; nunca plata |

**Una entrada, dos sesiones.** Quien usa un negocio desde su sitio necesita
sesión en Timón para leer su espacio. La puerta del sitio (`verificarAuth`)
entra a las dos bases con el mismo mail y la misma contraseña. La contraseña
no se guarda: cada base conserva su sesión. Si en Timón no hay cuenta, el
sitio sigue andando con lo suyo y dice «sin Timón no se ven las compras». Es
el mismo patrón que Timón ya usa con Casa Verde, al revés.

## 6. Cómo se visualiza dentro de Timón

Siguiendo `PROTOCOLO-INTERFAZ` § 14 (mirar, hacer, profundizar):

| Pantalla | Hoy | Al terminar |
|---|---|---|
| **«Hoy»** (`hoy.js`; widget `Hoy.kt`) | Ítems de `familia` y `p-<uid>` | **Mirar:** lo de hoy de TODOS mis espacios, con un chip por espacio (Mío, Familia, Casa Verde, CasaYourte…). **Hacer:** tildar. **Señales** del libro, leídas por su conector. «Para decidir» (5c) |
| **La pantalla de un espacio** (nueva, etapa 8: «sus pantallas simples») | — | **Mirar:** lo de hoy del espacio y dos o tres números del libro (ocupación, cobros del mes, si hay permiso). **Hacer:** los ítems (tareas, compras, limpiezas con su reloj). **Profundizar:** enlaces a las páginas del libro en el sitio del negocio. Sus flujos, dibujados (regla 5) |
| **Tareas** | Familia, más la lista de Casa Verde por el conector; «Ahora» con el reloj que cobra | Se vacía hacia «Hoy» y las pantallas de espacio, de a un tipo por vez (regla 8). El reloj queda en la ficha del ítem que se cobra |
| **Compras** | Listas de `familia/compras`, más la tarjeta **🏡 Casa Verde** (compras-7) | Una sola solapa: una tarjeta por espacio, modo súper y compartir en todas |
| **Agenda** | Familia, más las piezas de Casa Verde (`cv:`) y las llegadas y salidas | Una sola agenda con las piezas de todos los espacios. Las reservas, como señales |
| **Plata** | La familia, las propuestas de ingreso de Casa Verde y remate, y el libro de Casa Verde con `finanzas` | Igual: la plata del negocio no entra a la familia salvo como ingreso aprobado (`PROTOCOLO-PLATA`) |
| **Balance** | Horas de la familia y de Casa Verde | Igual |
| **Hilos** (etapa 6) | — | Por espacio. Las comunicaciones de Casa Verde se mudan acá (8.5) |
| **Android** | Widgets «Hoy», Mi agenda, Mensajes y novedades, Pizarra (tareas fijadas, se apaga en 5b) | «Hoy» pinta todos los espacios sin cambiar su forma: el renglón ya trae `espacio` |

**Lo que Timón NO muestra:**
- lo P (salvo un enlace);
- lo S;
- lo T;
- datos de personas de terceros más allá de un nombre en una señal;
- coordenadas de la Hilux;
- datos de los chicos de Roli.

## 7. Cómo se muda un dato sin perder nada

1. **De a un tipo por vez** (`ARQUITECTURA` regla 8 y etapa 4). Nunca dos
   paralelos a la vez.
2. **El ítem mudado lleva `origen: { base, coleccion, id }`.** Mientras dure
   el paralelo, el dato viejo no se borra: queda marcado
   `mudadoA: "<id del ítem>"`.
3. **Copia previa en `_historial/`** de la base de origen y de la de destino,
   como cualquier cambio del agente (sin copia no hay cambio).
4. **Banco de conteo:** antes y después de mudar, el mismo número de cosas,
   las mismas hechas y las mismas pendientes, por espacio. Un banco que lo
   compara contra el respaldo de ese día (`firestore.mjs <base> bajar`).
5. **Una semana en paralelo.** Lo nuevo se escribe en Timón. La página vieja
   del negocio muestra lo de Timón por `timon-1` y deja de escribir lo viejo.
6. **Apagar lo viejo, sólo con el OK de Mauro** y después de la semana.
   Borrar el dato viejo es otra autorización, y antes se respalda a la
   bodega.
7. **La documentación, en la misma tanda:** esta tabla del § 4, el README de
   cada repo, el `CLAUDE.md` si cambia una regla y la etapa en `ARQUITECTURA`
   § 6.
8. **El costo contra el cupo**, dicho en la tanda (`PROTOCOLO-DESARROLLO`
   § 13): lecturas y escrituras de más en `tiempos-71d42` para 10 personas.

## 8. El orden para Casa Verde (etapa 8, el primer negocio)

Arranca después del paralelo de `tarea` (23-nov), para que no corran dos
paralelos a la vez.

| Paso | Qué | Depende de | Qué toca |
|---|---|---|---|
| **8.0** | **Hecho el 18-nov:** las compras de Casa Verde se VEN y se TILDAN en Timón por el conector (Casa Verde core-3 y conector-1 con `itemsDeCompra`, `compradosDe` y `tildarCompra`; tiempos compras-7) | — | Sin mudar datos: puente mientras tanto |
| **8.1** | `espacios/casaverde` con miembros y permisos; cuentas de Timón para el equipo de Casa Verde (además de Mauro y Florencia, Esteban); `miembros/{uid}.cuentas`; `timon-1.js` con su banco; la puerta de Casa Verde entra a las dos bases | **D2** | tiempos (reglas: hay que publicarlas), casaverdecanas, datos (`firestore.mjs`: el agente miembro) |
| **8.2** | `compra` como tipo de ítem (en `TIPOS_ITEM` y en la regla, el mismo día); las compras y los lugares de Casa Verde se mudan; la vista 🛒 de `actividades.html` lee de Timón | 8.1 | tiempos, casaverdecanas |
| **8.3** | Las tareas sueltas de Casa Verde (sin monto, sin reloj, sin reserva) | 8.2 + una semana | tiempos, casaverdecanas |
| **8.4** | La agenda de Casa Verde (`estado_usuario.agenda` → `agendas/{uid}`) | 8.3 | tiempos, casaverdecanas, pizarra (`AgendaLogica.kt`) |
| **8.5** | Las comunicaciones → hilos del espacio | Etapa 6 | tiempos, casaverdecanas |
| **8.6** | Las actividades con reloj, monto, recurrencia y limpiezas: el motor de Casa Verde (`actividades-core.js`, `reservas-core.js`) pasa a escribir el ítem por `timon-1`; `sesiones` y `honorarios` apuntan al ítem | **D3**, 8.3 | casaverdecanas (motor y bancos `control-salida`), tiempos |
| **8.7** | Las páginas cotidianas de Casa Verde redirigen a la pantalla del espacio en Timón | 8.2 a 8.6, y el OK de Mauro | casaverdecanas |

Después vienen los otros negocios, de a uno **[a decidir · D4]**. Para cada
uno: su espacio, su `conector-1.js` con las señales, y sus flujos dibujados.

## 9. Lo que decide Mauro

| | Pregunta | Lo que propone este archivo |
|---|---|---|
| **D1** | ¿Lo del libro (reservas, plata, horas cobradas, clientes) también se guarda en la base de Timón, o queda en la del negocio y Timón lo lee? | Que quede y Timón lo lea (§ 1): igual hay un solo registro y una sola puerta |
| **D2** | ¿Cuentas de Timón para el equipo de cada negocio (en Casa Verde, Esteban)? | Sí, en 8.1. Sin eso, quien no es de la familia no puede ver lo de su espacio |
| **D3** | ¿Las actividades que se cobran y las limpiezas también se mudan (8.6), o quedan como libro? | Que se muden al final, cuando lo demás ande: son lo cotidiano de Esteban |
| **D4** | El orden de los negocios después de Casa Verde | CasaYourte (compras de materiales y proveedores, ahora), remate, Paseo |
| **D5** | ¿Espacio para BandoMaps con Mariano, y para Roli? | Sólo si esa persona entra a Timón |
| **D6** | ¿Qué señales del libro van a «Hoy»? (los buzones `avisos/`, DARF, borradores de la bodega…) | Empezar por llegadas y salidas, cambios de reserva por confirmar y pedidos de Facebook que caen en fechas libres; sumar de a una |

---

*Si cambia dónde vive una colección, o cómo la ve Timón, cambia su fila del
§ 4 en la misma tanda. Si nace una colección nueva en cualquier base, entra
acá con su clase.*
