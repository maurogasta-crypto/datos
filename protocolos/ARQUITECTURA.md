# ARQUITECTURA — una app, espacios, y cada negocio en su lugar

Aprobada por Mauro el 10-nov-2026 («Ok» a la versión 2 del plan, `general:C12`
del panel). Completa el plan «Timón» del 8-nov. Es el dibujo al que se llega
por etapas: **dice adónde va cada cosa nueva desde hoy**, no que lo que existe
ya esté así. El estado de cada etapa está al final.

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

## 2. Las reglas

1. **Lo que es de uso diario va a Timón; lo que es de un negocio, a su app.**
   Los alquileres de General Flores son el Paseo, no una sección de Timón.
2. **Un negocio se muestra en Timón por su contrato**, nunca importando sus
   archivos. El contrato (`conector-N.js`) tiene número y banco; un cambio
   incompatible es un número nuevo, al lado. Actuar sobre algo de un negocio
   (tildar una limpieza) pasa por el motor de ese negocio.
3. **Lo que se calcula, se calcula una vez.** Una cuenta que hoy está en
   JavaScript y en Kotlin («si cambia acá, cambia allá») se resuelve dejando
   una sola: la Pizarra muestra lo que Timón ya armó.
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
  un toque; la respuesta vuelve al pendiente del panel.

## 5. Lo que queda congelado

Handy cerca (el enlace por wi-fi y Bluetooth), las llamadas y el lector de
Facebook por la pantalla: **apagados por defecto, sin borrar**, hasta que lo
central ande (Mauro, 10-nov). Los mensajes de voz por la charla siguen. No se
les suma nada mientras tanto.

## 6. Las etapas

| | Etapa | Estado |
|---|---|---|
| 1 | Cerrar el servidor: la Pizarra a `timon-servidor`; Casa Verde queda sólo con lo suyo | Pizarra: pizarra-82 (10-nov). Falta sacar las funciones del zip de Casa Verde cuando los teléfonos tengan pizarra-82 |
| 2 | El reglamento: este archivo, § 14 de interfaz, y cada `CLAUDE.md` a reglas cortas con su historia aparte | Este archivo y el § 14, hechos. Los `CLAUDE.md`, de a un repo |
| 3 | Prototipo de «Hoy» y de los widgets, para tocarlo antes de migrar nada | — |
| 4 | Ítems y espacios en Timón, de a un tipo por vez | — |
| 5 | La Pizarra como cáscara, con los widgets nuevos | — |
| 6 | Los hilos dentro de Timón: mensaje a ítem, archivos, Claude en el hilo | — |
| 7 | La ronda por trabajos y «Para decidir» (en paralelo desde la 2) | — |
| 8 | Los negocios, de a uno: su espacio, sus flujos dibujados, sus pantallas simples | — |

*Cuando una etapa cambia de estado, cambia esta tabla en la misma tanda.*
