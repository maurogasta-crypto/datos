# Estado actual del ecosistema

**Foto del 2026-10-12**, con una auditoría de código hecha el mismo día.
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
| **Pizarra** (app de Android del ecosistema) | `maurogasta-crypto/pizarra` | `pizarra-26` | 13-oct: las luces de remate (Entrada y Depósito) arriba del widget de la pizarra, que reaccionan en el acto y quedan tibias de 8 a 23. 12-oct: DOS widgets, la pizarra y «Mi agenda» (la semana de quien entró, con sus alarmas; tocar abre la pieza); en la pizarra el ☐ tacha y el texto abre la tarea; un solo lápiz |
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
- **remate no tiene `README.md`**, y `remate:D1` («remate no tiene README.md»)
  figura **hecho** en el panel. Su documentación vive en
  `interno/REMATETALLER-DOCUMENTACION.md`. Si se decidió que alcanza con eso,
  conviene decirlo en el pendiente; si no, falta escribirlo.
- **La línea `L-hilux` está tomada desde el 21-sep** por «chat de la app de la
  Hilux y el panel»: 21 días. Ese chat ya no trabaja ahí. Mientras siga
  tomada, por regla nadie más la toca. Hay que soltarla en el panel.
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
