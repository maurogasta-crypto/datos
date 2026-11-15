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
| **Pizarra** (repo `pizarra`) | La cáscara de Timón en Android: lo muestra adentro y pone lo que la web no puede (widgets, avisos, alarmas, «Compartir», captura) | No tiene pantallas ni cuentas propias de lo que Timón ya hace |
| **Negocio** (Casa Verde, CasaYourte, remate, Paseo, BandoMaps, Hilux) | Una app independiente: su base, su gente, su libro, su código | No importa código de otro negocio ni sirve funciones para otros |
| **Servidor** (`timon-servidor`, código en `datos/servidor/`) | Las funciones que necesitan un secreto | — |
| **Piezas comunes** (`datos`) | Lo idéntico en todos, con número de contrato (`ojos.js`, `errores.js`, `servidor-1.js`…) | — |
| **Claude** | Un miembro más de los espacios: propone ítems, pregunta con opciones, contesta en el hilo; y la ronda | Ver § 4 |
| **Panel** (`datos`) | El taller: registro de las apps (`proyectos/`), desarrollo, reglas, la bóveda | No es donde Mauro contesta lo cotidiano |

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
- **Deja un parte del día** con estructura, que se ve en Timón.
- **Las decisiones de Mauro le llegan a «Hoy»**, tres por día, con opciones de
  un toque; la respuesta vuelve al pendiente del panel. **(15-nov)** Hasta que
  «Hoy» exista (etapa 5), llegan a «Lo primero» del panel, que ya existe: una
  pantalla no nace antes que su lugar.

## 5. Lo que queda congelado

Handy cerca (el enlace por wi-fi y Bluetooth), las llamadas y el lector de
Facebook por la pantalla: **apagados por defecto, sin borrar**, hasta que lo
central ande (Mauro, 10-nov). Los mensajes de voz por la charla siguen. No se
les suma nada mientras tanto. **(15-nov)** Al día de hoy esto está escrito y
no hecho: ninguna versión de la Pizarra los apaga por defecto. Se apagan en
**pizarra-83**, con el interruptor para prenderlos a la vista.

## 6. Las etapas

| | Etapa | Estado |
|---|---|---|
| 1 | Cerrar el servidor: la Pizarra a `timon-servidor`; Casa Verde queda sólo con lo suyo | **Ojo (visto el 15-nov): pizarra-82 NO está en `main`** — quedó en la rama `claude/brave-volta-ewxlur` (10-nov, `Servidor.kt`), así que el release `ultimo` sigue siendo pizarra-81 y los teléfonos apuntan al Netlify de Casa Verde. El camino **(15-nov)**: ① mezclar esa rama a `main` con la verificación (espera el «sí» de Mauro: cambia el servidor de avisos, llamadas y luces de todos los teléfonos); ② **pizarra-83**: el sello de la app en el parte de `salud/` y lo congelado del § 5 apagado por defecto; ③ actualizar los teléfonos; ④ el zip de Casa Verde se vacía recién cuando `salud/` muestre todos los aparatos en ≥ 82 durante una semana (la regla 8, aplicada al servidor: a un teléfono rezagado se le mueren avisos y llamadas en silencio). `timon-servidor` está desplegado y sus seis funciones contestan (comprobado el 15-nov); que `FCM_CUENTA` y las TURN estén cargadas allá sólo se ve con un aviso y una llamada reales |
| 2 | El reglamento: este archivo, § 14 de interfaz, y cada `CLAUDE.md` a reglas cortas con su historia aparte | **Hecha el 15-nov-2026**: `datos` y los otros diez repos con `CLAUDE.md` corto (de 485 KB a unos 95 KB en total) y el anterior completo en su `HISTORIA.md`. `roli` (3,8 KB) y `bodega` (2,4 KB) ya eran cortos y no se tocaron. Falta, si Mauro quiere, repasar cada uno con una sesión nueva para ver si alguna regla corta quedó coja |
| 3 | Prototipo de «Hoy» y de los widgets, para tocarlo antes de migrar nada | Prototipo de «Hoy» entregado como artefacto (14-nov); **espera la opinión de Mauro, que destraba la 4, la 5, la 6 y la 8**. **(15-nov)** Le falta mostrar el widget pintando de un `hoy/{uid}` de muestra (regla 3): esa forma es la decisión técnica que define la 5, y se toca acá, antes de migrar nada |
| 4 | Ítems y espacios en Timón, de a un tipo por vez | — **(15-nov)** Un solo tipo en paralelo a la vez, y cada tipo dice en su tanda el costo contra el cupo: el paralelo de la regla 8 duplica lecturas y escrituras por definición, y la base ya se quedó sin cupo una vez (27-oct) |
| 5 | La Pizarra como cáscara, con los widgets nuevos | — |
| 6 | Los hilos dentro de Timón: mensaje a ítem, archivos, Claude en el hilo | — |
| 7 | La ronda por trabajos y «Para decidir» (en paralelo desde la 2) | — **(15-nov)** En dos partes, porque la mitad dependía de la 4 sin que la tabla lo dijera: **7a**, los trabajos por archivo, no depende de nada y arranca ya; **7b**, «Para decidir», nace en «Lo primero» del panel (que ya existe) y se muda a «Hoy» en la 5 |
| 8 | Los negocios, de a uno: su espacio, sus flujos dibujados, sus pantallas simples | — |

*Cuando una etapa cambia de estado, cambia esta tabla en la misma tanda.*
