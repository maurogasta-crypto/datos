# Estado actual del ecosistema

**Foto del 2026-10-12, al día el 20-oct**, con una auditoría de código hecha el 12 y la revisión de coherencia del 18 (§ 5).
`ESTADO-DE-LOS-TRES.md` es la comparación de septiembre entre los tres sitios;
este documento dice **en qué versión está cada pieza hoy** y qué se encontró
al revisarla. Cuando una pieza cambie de versión, se corrige su renglón en la
misma tanda. Si este archivo y el sello escrito dentro de un archivo no
coinciden, manda el archivo.

---

## 1. Las versiones

| Pieza | Repositorio | Versión | Último cambio |
|---|---|---|---|
| **Tiempos** (app web de la familia) | `maurogasta-crypto/tiempos` | `app-38` · `nucleo-43` · `agenda-19` · `sugerir-22` · `plata-15` · `proyecto-1` · `sw tiempos-64` · reglas **v15** | 19-oct: al guardar una pieza en otra semana, la agenda la sigue (agenda-19). 18-oct: reglas v15 (`mensajes/`). Antes: ver § 3 |
| **Pizarra** (app de Android del ecosistema) | `maurogasta-crypto/pizarra` | `pizarra-56` | 19 a 21-oct: todas las notificaciones del 13C a Casa Verde (pizarra-42/43) y el lector de Facebook por accesibilidad con la respuesta según la ocupación (pizarra-44 a 56: registra todo pedido al recorrer, cartel en vez de notificación). Ver § 6 |
| **Casa Verde** (sitio y panel interno) | `casaverdecanas-blip/casaverdecanas` | `nucleo-avisos-19` · `pedidos-alquiler-6` · `reservas-ical-13` · `sw cv2-shell-v129` | 21-oct: qué pedidos de Facebook caen en fechas libres (lista e Inicio) y «Copiar para buscar»; 20-oct: «🔎 Qué busco ahora» (`pedidos_busqueda/`), la respuesta al crear un pedido, `notificaciones/`, y en Cabañas la condición del máximo y el extra por persona — **hay que publicar `interno/firestore.rules`**. Ver § 6 |
| **CasaYourte** | `casayourte/casayourte` | `nucleo-28` · `idiomas-5` · `sw cy-shell-v63` | 19-oct: el teléfono (pestañas en rejilla, la última obra, la foto de portada) y los buscadores de Francia, Bélgica, Brasil, Argentina y Uruguay (idiomas-5, hreflang, Search Console) |
| **remateTaller** | `rematetaller/remate` | `utils v1.23` · reglas v1.2 en el repo | 11-oct (tanda 35): el ojo 👁 |
| **El panel** | `maurogasta-crypto/datos` | `panel-42` · `nucleo-9` · `sw panel-shell-v38` | 17-oct: las reglas del panel en un solo lugar (Sitio → Panel); obras (obra-8) |
| **Herramientas del agente** | `maurogasta-crypto/datos`, `herramientas/` | `avisos-5` · `novedades-4` · `reservas-8` · `facebook.mjs` · `notificaciones-3` · `latido-1` · `ronda` | 20-oct: `notificaciones.mjs` (la ronda clasifica las notificaciones del 13C; descartar una app pide `--hasta`), `facebook.mjs` acepta pedidos leídos en pantalla y muestra lo que se busca |
| **SITD-Hilux** (app de la camioneta) | `maurogasta-crypto/sitd-hilux` | `sitd-42` | 18-oct: el acelerómetro a lo más rápido (200 Hz), los picos del motor por la vibración y el giróscopo (sitd-42); borrar un viaje (sitd-41) |
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

---

## 5. El 18-oct: Casa Verde se alimenta sola, y lo que cambia se confirma

**El teléfono de captura es el Redmi 13C.** Su Pizarra lee las notificaciones
de Airbnb y las de Facebook que piden alquilar en Canasvieiras (las dos cosas:
alquilar/alugar/aluguel Y Canasvieiras/Canas). Lo de Airbnb va a la bodega; lo
de Facebook, directo a «Pedidos de alquiler» de Casa Verde, con la cuenta de
Casa Verde de ese teléfono. El Redmi 15 quedó desvinculado (sin acceso a
notificaciones, sin token, sin Termux leyendo). El Termux del 13C sólo hace el
respaldo de las 4:17.

**La ronda corre tres veces por día en temporada** (7:47, 13:47, 19:47 de
Montevideo; la de la mañana es la completa, las otras dos son extra). En cada
una, sin preguntar: prueba que el 13C escucha (`latido.mjs`), lee el mail de
Casa Verde de la casilla de Florencia (Airbnb, Facebook de alquiler —que trae el
enlace exacto de la publicación—, Parairnos y lo directo; sólo leer), completa
lo que FALTA en las reservas y prepara las respuestas de los pedidos de
Facebook y los borradores de los huéspedes. **Lo que CAMBIA un dato que ya
estaba** (fechas, cabaña, cancelación, cuántos son) lo propone en
`cambios_reserva/` y se confirma en Reservas. La plata no se propone.

**Contestar sigue siendo de una persona**, en la app de Airbnb o en Facebook:
una cuenta que comenta sola es la que Facebook bloquea. En el 13C el camino es
un toque: el aviso «✍️ Respuesta lista» → «Copiar y abrir» → Comentar → Pegar.

**Lo que hay que tener a la vista:** el plan Pro da 5 corridas de rutina por
día; tres rondas dejan dos para la «Consulta en vivo» (`RUTINA-AUTOMATICA.md`
§ 2). Gmail no entrega lo que cayó en spam: conviene un filtro «No enviar
nunca a spam» para airbnb.com, facebookmail.com y parairnos.com.

---

## 6. El 19 y 20-oct: Facebook por la pantalla, y la respuesta según la ocupación

**Por qué.** Las notificaciones push de Facebook no llegan al 13C, así que leer
notificaciones no alcanzaba para los grupos. La API de grupos de Meta cerró en
abril de 2024: lo único que queda sin riesgo para la cuenta es leer lo que la
app ya muestra. La guía de uso está en `guias/pedidos-de-facebook.md`.

**Cómo quedó (pizarra-56):**
- Un **servicio de accesibilidad** atado a las apps de Facebook, que **sólo
  lee**. Al recorrer **registra en silencio** cada pedido de alojamiento, con
  `desde`/`hasta`/`mes`/`personas`. Al tocar «Comentar», la publicación de arriba
  de ese toque va a «Pedidos de alquiler» con una respuesta rápida, que queda
  copiada para pegar desde el teclado.
- Casa Verde cruza esos pedidos con la ocupación (`CV2.huecoDelPedido`): «🟢 cae
  en fechas libres» en la lista, filtro «Llenan huecos» y un bloque en Inicio. En
  la lista, «Copiar para buscar» copia palabras para el buscador del grupo.
- Al abrir Facebook (tras media hora) se trae **una vez** la ocupación
  (`disponibilidad/`) y las cabañas. Al comentar sale **un aviso**: hay lugar
  (con fechas), o no hay y se copia **lo que sí hay** (otras fechas, una parte,
  o para cuántos). Desde pizarra-56 es un cartel que se va solo, no una notificación.
- Se ofrece con la **base** de cada espacio y el **máximo** sólo con su
  condición: 6/8, 5/7 y 4/5, «con extra por persona y en situaciones
  especiales», leídos de `cabanas/`.
- La respuesta **siempre** sugiere casaverdecanas.com.br (Mauro, 20-oct; el
  18-oct había pedido respuestas sin enlaces: manda lo último).
- **Qué busco ahora** (`pedidos_busqueda/actual`) decide tipo, personas,
  público y zona.

**Lo que se probó y lo que no.** 146 casos en el banco de la Pizarra (con la
ocupación real del 20-oct y los pedidos de esa mañana), las reglas nuevas en el
emulador de Firestore (22 casos), y el cruce con los huecos (7 casos). **No se
probó en el teléfono** la versión 56: el primer recorrido de Mauro con ella es la prueba real.

**En el camino, y quedó arreglado:** la cabaña 1 decía capacidad 1 (ahora
6–8); el editor de Cabañas borraba el extra por persona del Loft al guardar;
un enlace de verificación con letras llegaba entero a la base (pizarra-43); desde el
cuadro se respondía un comentario con el nombre de quien comentó (pizarra-53);
«Copiar y abrir» abría el inicio de Facebook (ahora «Copiar»); los avisos
flotantes al recorrer molestaban (sacados).

**Lo que queda de Mauro:** publicar `interno/firestore.rules` de Casa Verde;
instalar pizarra-56 en el 13C y encender el lector; cargar el extra por persona
de la cabaña 1 y del depto si corresponde.

