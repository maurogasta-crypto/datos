# Estado actual del ecosistema

**Foto del 2026-10-12, al día el 13-oct**, con una auditoría de código hecha el 12.
`ESTADO-DE-LOS-TRES.md` es la comparación de septiembre entre los tres sitios;
este documento dice **en qué versión está cada pieza hoy** y qué se encontró
al revisarla. Cuando una pieza cambie de versión, se corrige su renglón en la
misma tanda. Si este archivo y el sello escrito dentro de un archivo no
coinciden, manda el archivo.

---

## 1. Las versiones

| Pieza | Repositorio | Versión | Último cambio |
|---|---|---|---|
| **Tiempos** (app web de la familia) | `maurogasta-crypto/tiempos` | `app-34` · `agenda-17` · `nucleo-37` · `sw tiempos-57` · reglas **v14** | 12-oct: `?solapa=agenda` para el widget; el reloj sólo en lo que se cobra; los chicos se cuentan por el calendario; cada uno ordena sus tareas (app-30); la agenda de piezas (agenda-13) |
| **Pizarra** (app de Android del ecosistema) | `maurogasta-crypto/pizarra` | `pizarra-28` | 13-oct: las luces de remate (Entrada y Depósito) arriba del widget de la pizarra, que reaccionan en el acto y quedan tibias de 8 a 23 — **andando en el teléfono**. 12-oct: DOS widgets, la pizarra y «Mi agenda» (la semana de quien entró, con sus alarmas; tocar abre la pieza); en la pizarra el ☐ tacha y el texto abre la tarea; un solo lápiz |
| **Casa Verde** (sitio y panel interno) | `casaverdecanas-blip/casaverdecanas` | `nucleo-avisos-17` · `sw cv2-shell-v116` | 11-oct: el ojo 👁 en las contraseñas |
| **CasaYourte** | `casayourte/casayourte` | `nucleo-28` · `sw cy-shell-v61` | 11-oct: el ojo 👁 |
| **remateTaller** | `rematetaller/remate` | `utils v1.23` · reglas v1.2 en el repo | 11-oct (tanda 35): el ojo 👁 |
| **El panel** | `maurogasta-crypto/datos` | `nucleo-7` · `sw panel-shell-v28` · reglas v6 | 11-oct: el ojo 👁 |
| **Herramientas del agente** | `maurogasta-crypto/datos`, `herramientas/` | `avisos-5` · `novedades-4` · `ronda` (claves arreglado) | 12-oct: el título del aviso dice de qué sitio se habla; las novedades no mandan lo ya resuelto |
| **SITD-Hilux** (app de la camioneta) | `maurogasta-crypto/sitd-hilux` | `sitd-36` | 11-oct: la cuenta de satélites llega al reporte |
| **gestos** | `maurogasta-crypto/gestos` | — | 14-sep, sin cambios desde entonces |

---

## 2. La auditoría del 12-oct

**Qué se corrió, en los seis repositorios con código web:**

- que todo el JavaScript parsee **como módulo**, también el que vive adentro
  de los `.html`: 90 archivos y 72 scripts embebidos, **ninguno falla**;
- que cada `import { … } from "./x.js"` pida algo que `x.js` exporte: **ninguno
  roto**;
- todos los bancos de pruebas:

  | Sitio | Bancos | Resultado |
  |---|---|---|
  | Tiempos | `pruebas.mjs` | 240 / 240 |
  | CasaYourte | secciones, reportes, andamio, puertas, modelos | 16 · 64 · 89 · 86 · 116, todo bien |
  | remate | luces, identificar, venta directa | 28 · 13 · 26, todo bien |
  | Casa Verde | `netlify/pruebas/avisar-claude.mjs` | 15 / 15 |
  | panel y herramientas | reglas, firestore, ronda, reservas, teléfono, avisos, novedades, ingresos, análisis, extractos, y el banco del panel con jsdom | todo bien |
  | Pizarra | `gradlew test assembleRelease lintRelease` | verde |

- que lo que guarda cada `sw.js` para andar sin señal exista y se pida con
  el mismo `?v=` que usan las páginas;
- que la tabla de sellos del `README.md` diga lo mismo que el archivo;
- que lo que está escrito en dos lugares a propósito siga igual en los dos:
  el ojo 👁 (`ojosEnClaves`, idéntico en los cinco sitios), las claves web
  de la Pizarra (las mismas que cada sitio), las categorías y «Claude propone»
  (iguales en Tiempos y en la Pizarra), y la agenda de Claude
  (`herramientas/agenda.mjs` conserva la nota de una actividad al moverla);
- y Tiempos se recorrió entero en un navegador: las siete pestañas y cada una
  de sus vistas, **sin un solo error**.

### Lo que se encontró y se arregló en el día

| Qué | Dónde | Arreglo |
|---|---|---|
| La ronda iba a repetir una clave: decía «V hasta V10 → V11» con V11 y V12 ya usados, porque su clave estaba escrita `tiempos:V11` | `herramientas/ronda.mjs`, `letrasEnUso` | lee la clave del campo y, si no da, del id, sin el prefijo; banco 116 |
| `tiempos:V13` y `tiempos:V14` se citaban en el `CLAUDE.md` de Tiempos y **nunca se habían creado** en el panel | panel | creados como hechos, con sus commits |
| `tiempos:A29`, `A30`, `V11` y `V12` sin el campo `clave` o con el prefijo | panel | corregidos |
| El `README.md` de Tiempos seguía describiendo el reloj «Estoy con…» | `tiempos/README.md` | corregido |
| Las novedades mandaban pedidos ya resueltos (un reporte queda «nuevo» en su base aunque esté hecho) | `herramientas/novedades.mjs` | se cruzan con el panel |
| El aviso de WhatsApp se titulaba con la base por la que sale («Casa Verde») aunque hablara de Tiempos | `herramientas/avisos.mjs` | el título dice de qué se habla |
| app-31 borró por error el código de plegar grupos (`flecha`), y **ninguna prueba lo vio**: lo encontró el recorrido en el navegador antes de subir | `tiempos/app.js` | restituido antes del commit |

### Lo que queda, y es de Mauro

- **CasaYourte: falta `assets/lamina-muro.jpg`.** La pide `calculo.html`, que
  muestra una imagen rota, y está en la lista del `sw.js`. Nunca estuvo en el
  repositorio. No rompe la instalación, porque el `sw.js` guarda los archivos
  de a uno, pero la lámina del corte del muro no se ve. Hay que subir la imagen.
- ~~remate sin `README.md`~~ — **resuelto el 13-oct**: Mauro decidió que
  queda así (`remate:D1` sigue hecho); la documentación de remate es
  `interno/REMATETALLER-DOCUMENTACION.md` y su `CLAUDE.md`.
- ~~La línea `L-hilux` tomada desde el 21-sep~~ — **soltada el 13-oct** a
  pedido de Mauro; queda abierta y libre.
- **Lo de la Hilux no se verifica desde la ronda**: pide el SDK de Flutter,
  que no está en el PATH de la sesión. `hilux:S3`, `S4`, `D5` y `E1` esperan
  una sesión con Flutter.

---

## 3. Lo que cambió en Tiempos esta semana, en una línea cada uno

- **app-28**: el ojo 👁 en las contraseñas.
- **app-29**: las sugerencias de Florencia del 11-oct: el reloj arriba sólo si
  corre, Tareas con el cuadro arriba y todo por categoría, Fijos con totales y
  pago con foto o texto.
- **agenda-12 y agenda-13**: en la agenda todo es una pieza que se ve, se
  arrastra y se edita igual; lo acordado de los chicos no se cierra al tildar.
- **app-30 / nucleo-35**: cada uno ordena proyectos y tareas arrastrando, con
  grupos propios; el orden es privado (`agendas/{uid}`).
- **app-31 / nucleo-36**: el reloj sólo en lo que se cobra (Casa Verde, o una
  tarea con «⏱ Lleva reloj»); el tiempo con los chicos sale del calendario,
  en días; las próximas actividades, una fecha por día.
- **agenda-14 / nucleo-37**: «⏰ Avisarme» en el editor de cualquier pieza de
  la agenda (alarma o recordatorio, a la hora o un rato antes).
- **agenda-15**: el aviso sigue a la pieza al editarla y al arrastrarla, y la
  de los chicos que cambia de día lo lleva a su clave nueva.
- **app-32 / app-33 / agenda-16 / agenda-17**: Tiempos se puede abrir desde
  afuera en la Agenda con una pieza abierta (`?solapa=agenda&dia=&abrir=`), en
  la semana de la pieza y no la del aviso.
- **app-34**: y en Tareas con una tarea abierta (`?solapa=tareas&abrir=f:<id>`),
  desplegando lo que la tapa.

---

## 4. Lo que cambió en la Pizarra (12 y 13-oct), en una línea cada uno

- **pizarra-19**: un solo lápiz en el widget (había dos que hacían lo mismo).
- **pizarra-20 a 22**: el segundo widget, **«Mi agenda»**: la semana de quien
  entró —actividades, tareas agendadas, lo de los chicos y sus alarmas— y tocar
  un renglón abre esa pieza en Tiempos; una alarma, la suya.
- **pizarra-23**: en la pizarra el ☐ tacha y el texto abre la tarea en Tiempos.
- **pizarra-24**: arriba del widget de la pizarra, **Entrada** y **Depósito**,
  las luces de remate, con una segunda sesión de remate en ⚙ y el mismo puente
  y registro que `luces.html`.
- **pizarra-25**: el toque de las luces en el acto (una orden, sesión guardada,
  conexión reusada). **Traía un error**: pintaba el botón antes de decidir la
  orden y mandaba lo que la luz ya tenía.
- **pizarra-26**: tibia de 8 a 23 (cada 10 min, la sesión al día y el puente
  despierto, sin tocar Tuya).
- **pizarra-27**: el arreglo del error de la 25. **Verificado por Mauro en el
  teléfono el 13-oct: las dos luces prenden y apagan desde el widget.**
- **pizarra-28**: la sección de luces dice lo que pasa debajo de sus botones
  (a Flor el error de «Entrar a remate» le salía fuera de la vista) y suma
  «Olvidé la contraseña de remate».

Las tandas del panel que lo cuentan: `2026-10-12-tiempos-orden-y-auditoria` y
`2026-10-13-pizarra-widgets-y-luces`.
