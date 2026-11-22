# ARQUITECTURA — una app, espacios, y cada negocio en su lugar

Aprobada por Mauro el 10-nov-2026 («Ok» a la versión 2 del plan, `general:C12`
del panel). Completa el plan «Timón» del 8-nov. Es el dibujo al que se llega
por etapas: **dice adónde va cada cosa nueva desde hoy**, no que lo que existe
ya esté así. El estado de cada etapa está al final.

**Ajustada el 15-nov-2026** a pedido de Mauro («dejá documentación y
fundamentos de la mejor decisión de diseño y arquitectura posible y
ajustaremos el desarrollo en función de eso»): una revisión contra los
repositorios encontró una etapa registrada como hecha sin estar empujada y
cinco huecos de diseño. Lo decidido ese día va marcado **(15-nov)**, con su
porqué al lado.

El objetivo, en sus palabras: «tener un orden cotidiano de gestión de
pendientes personales, del lugar donde estoy trabajando y de mi familia, todo
en un mismo lugar, simple de ver, coordinado con Florencia para la mayoría de
los proyectos y quizás alguien más».

## 1. Las piezas

| Pieza | Qué es | Qué NO hace |
|---|---|---|
| **Timón** (repo `tiempos`) | La ÚNICA aplicación de uso diario. Entra por «Hoy»: lo de hoy de todos los espacios de la persona | No lleva un negocio adentro |
| **Espacio** | Personal, Familia, y uno por proyecto. Tiene miembros; compartir es estar en el mismo espacio | — |
| **Ítem** | Una sola forma para tarea, cita, compra, pedido y pregunta: qué, cuándo, de quién, en qué espacio | — |
| **Hilo** | La conversación de un ítem o de un espacio. Un mensaje se vuelve ítem con un toque; los archivos van en el hilo | No es un chat aparte de las cosas |
| **Timón en Android** (repo `pizarra`; hasta el 17-nov se llamaba «Pizarra») | La cáscara de Timón en Android: lo muestra adentro y pone lo que la web no puede (widgets, avisos, alarmas, «Compartir», captura) | No tiene pantallas ni cuentas propias de lo que Timón ya hace |
| **Negocio** (Casa Verde, CasaYourte, remate, Paseo, BandoMaps, Hilux) | Una app independiente: su base, su gente, su libro, su código | No importa código de otro negocio ni sirve funciones para otros |
| **Servidor** (`timon-servidor`, código en `datos/servidor/`) | Las funciones que necesitan un secreto | — |
| **Piezas comunes** (`datos`) | Lo idéntico en todos, con número de contrato (`ojos.js`, `errores.js`, `servidor-1.js`…) | — |
| **Claude** | Un miembro más de los espacios: propone ítems, pregunta con opciones, contesta en el hilo; y la ronda | Ver § 4 |
| **Panel** (`datos`) | El taller: registro de las apps (`proyectos/`), desarrollo, reglas, la bóveda | No es donde Mauro contesta lo cotidiano |

**Un solo nombre: Timón (17-nov, Mauro: «quiero eliminar los nombres
diferentes: Timón, Pizarra y Tiempos deberían ser parte de una misma cosa»).**
Todo lo que una persona ve dice Timón: el ícono y los ajustes de Android, los
widgets (en el selector, «Timón» con «Hoy», «Mi agenda», «Mensajes y
novedades» y «Pizarra (tareas fijadas)»), los avisos, la web y la guía de
instalación. «Pizarra» queda sólo como el nombre de una solapa y de su widget
—las tareas fijadas—, que se apagan cuando «Hoy» las reemplace (regla 8).
Lo que NO cambia, aunque diga otra cosa, porque cambiarlo rompe algo que anda:

| Nombre interno | Dónde | Por qué se queda |
|---|---|---|
| `tiempos` | repo, dirección `…github.io/tiempos/`, `id` del manifest | otra dirección es otra app instalada en cada teléfono y otro lugar donde el aparato guarda sus datos; se muda sólo junto con un dominio propio |
| `tiempos-71d42` | base de Firebase | Firebase no deja renombrar un proyecto |
| `pizarra`, `com.maurogasta.pizarra`, `pizarra.apk` | repo, paquete de Android, archivo que se baja | otro paquete es otra app: desinstalar en cada teléfono y perder sesiones, el token de la bodega y el enlace con la Hilux (`…pizarra.enlace`) |
| `pizarra-N` | sello de la app (`versionName` = `SELLO`) | lo leen los partes de `salud/` y la ronda: cambiarle la forma corta la cuenta de qué teléfono tiene qué versión |
| `pizarra-<base>` | temas de los avisos instantáneos | lo usa el servidor para despertar |

Una sesión que «corrija» uno de éstos rompe la app instalada: no se toca.

Los repositorios que no estaban en la tabla, para que ninguna sesión los
acomode a su criterio **(15-nov)**: **roli** es un negocio más (app
independiente, base `roli-467a4`, su gente); **gestos** es la copia publicada
del instrumento de BandoMaps, no una pieza aparte (su fuente es `tocatoca`);
**harmonia** es el fork viejo, congelado hasta que Mariano decida el theremin;
**bodega** es el depósito privado del panel y de la ronda (datos, no una app).

## 2. Las reglas

1. **Lo que es de uso diario va a Timón; lo que es de un negocio, a su app.**
   Los alquileres de General Flores son el Paseo, no una sección de Timón.
2. **Un negocio se muestra en Timón por su contrato**, nunca importando sus
   archivos. El contrato (`conector-N.js`) tiene número y banco; un cambio
   incompatible es un número nuevo, al lado. Actuar sobre algo de un negocio
   (tildar una limpieza) pasa por el motor de ese negocio.
3. **Lo que se calcula, se calcula una vez.** Una cuenta que hoy está en
   JavaScript y en Kotlin («si cambia acá, cambia allá») se resuelve dejando
   una sola: la Pizarra muestra lo que Timón ya armó. **El cómo (15-nov):
   Timón MATERIALIZA lo de cada uno en `hoy/{uid}` de su base** — los
   próximos siete días, cada renglón listo para pintar: el texto, el ícono, a
   qué hora, la clave que abre Timón ahí, y **qué escribir si se lo toca**
   (tachar viaja adentro del renglón; la Pizarra no conoce la forma de una
   tarea). Lo escribe Timón cada vez que cambia algo que lo afecta y al
   abrirse; el widget sólo elige el día comparando fechas. El porqué: un
   widget de Android no puede correr el JavaScript de Timón, así que sin un
   documento armado cada widget repite la cuenta en Kotlin — lo que esta
   regla prohíbe. De paso: una lectura por refresco (el cupo), las reglas de
   la base validan lo que el renglón escribe, y `agendas/` sigue sellada (el
   documento lo escribe la sesión del dueño y lo lee sólo él). Lo que llega
   de afuera con Timón cerrado no se recalcula: el aviso instantáneo ya dice
   «qué cambió» y el widget muestra que hay novedad sin armarla; el renglón
   completo aparece al abrir Timón.
4. **Toda pantalla sigue `PROTOCOLO-INTERFAZ` § 14:** mirar, hacer,
   profundizar. Un widget hace una sola cosa.
5. **Cada app lleva dibujados sus flujos principales**, armados leyendo el
   código (§ 14). Son la ayuda del usuario y la forma de comparar el código
   con el objetivo.
6. **Si se arregla con código o reglas, es un pendiente del panel; si se
   arregla decidiendo algo del negocio, es un ítem del espacio de ese
   negocio.**
7. **Lo propio de una instalación vive en UN archivo de configuración** por
   app (nombre, base, cuenta de fotos, idiomas). Es lo que permite, más
   adelante, entregarle a otra persona su propia copia. El molde se hace con
   el segundo cliente real, no antes.
8. **Nada se apaga hasta que lo nuevo se usó una semana.** Florencia usa Timón
   todos los días: cada migración va de a un tipo por vez, con lo viejo y lo
   nuevo andando en paralelo.

## 3. Dónde viven los datos

**(18-nov) El mapa completo está en `INTEGRACION.md`**: cada colección de
cada base con su clase (cotidiano, libro, público, sellado, taller), adónde
va, cómo se accede desde cada sitio y cómo se ve en Timón. Mauro, ese día:
«lo que se grabe en Casa Verde tendría que guardarse en el mismo lugar de
Timón, y cuando es Casa Verde que lee, lo saca de ahí». Lo **cotidiano** de un
negocio (compras, tareas, agenda, conversaciones) se GUARDA en Timón, en el
espacio del negocio, y el negocio lo lee por `timon-1.js`. El **libro** queda
en la base del negocio y Timón lo lee por su conector, sin copiarlo (el
porqué, en § 1 de `INTEGRACION.md`; si el libro también se muda es la
decisión D1 de ese archivo).

- **Los espacios, sus ítems y sus hilos: en la base de Timón**
  (`tiempos-71d42`), con reglas por miembro del espacio. La plata de la
  familia queda FUERA de los espacios, como hoy.
- **Cada negocio, en su base.** No se unifican las bases: una base por negocio
  es lo que permite separarlo o entregarlo.
- **La bóveda (`claves/`) sigue en el panel y es sólo de Mauro.**
- Una base aparte para lo común se evalúa recién con un equipo grande o un
  cliente (se propuso y se retiró el mismo 10-nov: para dos personas y alguno
  más era de más).
- **Una persona de un negocio que entra a un espacio (15-nov)**: cuenta nueva
  en la base de Timón —Firebase no comparte usuarios entre proyectos, y un
  puente con cuenta de servicio está prohibido—, y su `miembros/{uid}` lleva
  el puntero a su cuenta del negocio (`cuentas: { casayourte: "<uid de
  allá>" }`), escrito por el agente al invitarla, con autorización. **La
  vuelta no se guarda: se deduce** — guardar el mismo hecho dos veces es lo
  que diverge. Se arma con la primera persona real, no antes (regla 7).

## 4. Claude y la ronda

Los niveles, que cada trabajo de la ronda declara:

| Nivel | Qué hace sola |
|---|---|
| Mirar | Lee, respalda, audita |
| Completar | Llena un dato vacío, con copia |
| Proponer | Deja listo y una persona confirma |
| Ejecutar | Riesgo bajo, un repositorio, reversible |
| **Nunca** | Escribir plata, mandarle un mensaje a alguien de afuera, tocar claves, automatizar toques en apps ajenas |

- **La ronda pasa de un texto único (`TRASPASO.md` § 4) a una lista de
  trabajos**, uno por archivo: de qué app es, cuándo corre, qué lee, con qué
  criterio, qué puede dejar y su nivel. Sumar una función es sumar un trabajo.
  **(16-nov) Hecho**: `ronda/trabajos/` de `datos` (22 trabajos, índice en
  `ronda/LEEME.md`, banco `pruebas/trabajos.mjs`); el § 4 conserva el arranque
  y el NUNCA.
- **Deja un parte del día** con estructura, que se ve en Timón.
- **Las decisiones de Mauro le llegan a «Hoy»**, tres por día, con opciones de
  un toque; la respuesta vuelve al pendiente del panel. **(15-nov)** Hasta que
  «Hoy» exista (etapa 5), llegan a «Lo primero» del panel, que ya existe: una
  pantalla no nace antes que su lugar. **(16-nov) Hecho** (panel-54): «Para
  decidir» en «Lo primero», de a tres, con `opciones` [{t, r}] en la
  `pregunta` del pendiente (la misma forma que las consultas de invitados); el
  toque escribe la `respuesta` igual que la cola.

## 5. Lo que queda congelado

Handy cerca (el enlace por wi-fi y Bluetooth), las llamadas y el lector de
Facebook por la pantalla: **apagados por defecto, sin borrar**, hasta que lo
central ande (Mauro, 10-nov). Los mensajes de voz por la charla siguen. No se
les suma nada mientras tanto. **(15-nov) Hecho en pizarra-83** (`Congelado.kt`):
las llamadas no suenan ni arrancan y el lector de Facebook no lee, hasta
prenderlos en la pantalla del enlace (el enlace cerca ya nacía apagado). Nada
se borró, y el interruptor de cada teléfono no se toca al actualizar.

## 6. Las etapas

| | Etapa | Estado |
|---|---|---|
| 1 | Cerrar el servidor: la Pizarra a `timon-servidor`; Casa Verde queda sólo con lo suyo | **①② hechos el 15-nov** (con el «termina la arquitectura» de Mauro): pizarra-82 —que había quedado 5 días perdida en la rama `claude/brave-volta-ewxlur`— está mezclada en `main`, y **pizarra-83** apaga por defecto lo congelado del § 5 (`Congelado.kt`) y unifica el sello (`SELLO` = `versionName`, con banco; el parte de `salud/` ya lo llevaba desde pizarra-78). Verificación completa en limpio (`test assembleRelease lintRelease`). **③ hecho el 16-nov**: los cuatro teléfonos (13C, 15, Note9 y el A15 de Florencia) reportan pizarra-83 en `salud/`, con partes de ese día. Falta: ④ vaciar el zip de Casa Verde recién cuando `salud/` muestre todos los aparatos en ≥ 82 durante una semana — la semana corre desde el 16-nov: lo más temprano, el 23-nov (regla 8: a un teléfono rezagado se le mueren avisos y llamadas en silencio). `timon-servidor` está desplegado y sus seis funciones contestan (15-nov); que `FCM_CUENTA` y las TURN estén cargadas allá sólo se ve con un aviso y una llamada reales desde un teléfono en ≥ 82 |
| 2 | El reglamento: este archivo, § 14 de interfaz, y cada `CLAUDE.md` a reglas cortas con su historia aparte | **Hecha el 15-nov-2026**: `datos` y los otros diez repos con `CLAUDE.md` corto (de 485 KB a unos 95 KB en total) y el anterior completo en su `HISTORIA.md`. `roli` (3,8 KB) y `bodega` (2,4 KB) ya eran cortos y no se tocaron. Falta, si Mauro quiere, repasar cada uno con una sesión nueva para ver si alguna regla corta quedó coja |
| 3 | Prototipo de «Hoy» y de los widgets, para tocarlo antes de migrar nada | **Hecha**: prototipo entregado (14-nov), completado el 15-nov (el widget pinta SÓLO `hoy/{uid}` materializado, regla 3) y **aprobado por Mauro el 16-nov** («sí, confirmo»): la forma de `hoy/{uid}` y el orden (la fecha pone la urgencia, la persona la importancia, lo que espera sube) quedan fijados; destrabó la 4, la 5, la 6 y la 8 |
| 4 | Ítems y espacios en Timón, de a un tipo por vez | **(15-nov)** Un solo tipo en paralelo a la vez, y cada tipo dice en su tanda el costo contra el cupo: el paralelo de la regla 8 duplica lecturas y escrituras por definición, y la base ya se quedó sin cupo una vez (27-oct). **En curso desde el 16-nov — primer tipo: `tarea`** (tiempos app-42): la solapa «Hoy» nueva (`hoy.js`, el prototipo aprobado), `items/` con la regla v25 **que Mauro tiene que publicar**, los espacios `familia` y `p-<uid>` implícitos (la regla decide por el id; `espacios/` con miembros nace con el primer negocio, regla 7), y `hoy/{uid}` materializado por la app del dueño (regla 3; sellado al agente, en `selladas` de firestore.mjs). Mauro publicó las reglas v25 ese mismo día: la semana del paralelo con Tareas corre hasta el 23-nov; costo contra el cupo en el README de tiempos (muy por debajo de Spark) |
| 5 | La Pizarra como cáscara, con los widgets nuevos | **En curso desde el 17-nov** (con el «avanzá con la etapa siguiente» de Mauro, junto con el nombre único). **5a hecha (pizarra-84 + tiempos app-43)**, verificada con `test assembleRelease lintRelease` (280 casos, 10 de `HoyTest`): el widget **«Hoy»** pinta SÓLO `hoy/{uid}` —una lectura—, en el orden de Timón y sin calcular nada (regla 3, con banco `HoyTest` que falla si el widget nombra un campo de un ítem u ordena); el ○ escribe `accion.campos` del renglón tal cual y saca el renglón de `hoy/` en el mismo commit, y destildar escribe `accion.deshacer` (nucleo-47 lo agrega al renglón); el texto abre Timón en ese ítem (`?solapa=inicio&abrir=it:<id>`). `hoy/` despierta a los teléfonos con el «qué» `tareas` (el servidor no cambió). Va **en paralelo** con el widget de las tareas fijadas (regla 8). Lo que tilda otra persona no rearma mi `hoy/` hasta que abro Timón (lo que la regla 3 acepta): el encabezado dice cuándo se armó. **(19-nov) Rediseño para la presentación** (tiempos app-44 / hoy-3 / nucleo-48, pizarra-85): cada ítem puede ser de un **proyecto** —una cuenta de Plata → Cuentas, no un catálogo nuevo; regla v26, que publica Mauro—; el renglón de `hoy/` lleva su nombre y el widget lo pinta; **barra de abajo** (Hoy, Tareas, Agenda, «Más») con los mismos ids de solapa; «Hoy» es la pantalla de arranque; sale el ⚙ flotante de Android. Se publica primero el sitio y después la app. **(22-nov) Timón simplificado** (tiempos app-47 / hoy-5 / nucleo-50, sin cambio en la app de Android): «Hoy» muestra también **las tareas de siempre** que se hacen (`tareasComoItems`, sin copiar nada: la vista previa del criterio unificado) y el widget lo mismo (`materializarHoy(todos())`): el renglón de una tarea lleva `accion.coleccion: "tareas"` y el tilde escribe ahí con la forma de «✔ Hecha» (`Hoy.kt` ya aceptaba cualquier colección segura); colores leves por proyecto (`colorDeProyecto`, fondo al 9–10 % o un punto, nunca un borde), un solo botón redondo y el ❓ dentro de «Más». Falta: **5b** apagar el widget y la solapa de las tareas fijadas cuando «Hoy» se haya usado una semana (lo más temprano, una semana después de instalar pizarra-84); **5c** «Para decidir» se muda del panel a «Hoy»; **5d** sacar de la app de Android lo que Timón ya hace (la pantalla de la IA, deseos y propuestas) |
| 6 | Los hilos dentro de Timón: mensaje a ítem, archivos, Claude en el hilo | — |
| 7 | La ronda por trabajos y «Para decidir» (en paralelo desde la 2) | **(15-nov)** En dos partes, porque la mitad dependía de la 4 sin que la tabla lo dijera. **7a hecha el 16-nov**: la ronda corre por trabajos — `ronda/trabajos/` de `datos`, un archivo por trabajo (app, cuándo, qué lee, criterio, qué puede dejar, nivel), índice en `ronda/LEEME.md`, banco `pruebas/trabajos.mjs` (325 casos); `TRASPASO.md` § 4 conserva el arranque y el NUNCA, que mandan sobre todos. **7b hecha el 16-nov** (panel-54): «Para decidir» nació en «Lo primero» del panel — las decisiones de a tres, con opciones de un toque (`opciones` [{t, r}] en la `pregunta`); el toque escribe la `respuesta` en el pendiente igual que la cola. Se muda a «Hoy» en la 5. **Etapa 7 completa** |
| 8 | Los negocios, de a uno: su espacio, sus flujos dibujados, sus pantallas simples | **Plan en `INTEGRACION.md` § 8** (18-nov), empezando por Casa Verde después del paralelo de `tarea` (23-nov). **8.0 hecho el 18-nov**: las compras de Casa Verde se ven y se tildan en Timón por el conector (Casa Verde core-3, tiempos compras-7), sin mudar datos. Lo que sigue (8.1: `espacios/casaverde`, cuentas del equipo y `timon-1.js`) espera las decisiones D1 a D3 de Mauro |

*Cuando una etapa cambia de estado, cambia esta tabla en la misma tanda.*
