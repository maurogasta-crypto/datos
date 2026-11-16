# Mapa del sitio — panel de datos

> Qué es cada archivo de este repositorio y dónde está. Lo leen las personas y los chats de IA: cuando a un chat le falta un archivo, mira este mapa y le pide a la persona que lo baje.
> La columna **Usa** se calcula sola (imports y enlaces). Lo demás se escribe a mano y no se pisa. Para actualizarlo: `node herramientas/secciones.mjs mapa`.
> Una descripción que empieza con ⚠ es provisoria: hay que confirmarla.

## Carpetas

| Carpeta | Qué es |
|---|---|
| `.claude/` | ⚠ provisoria: configuración de Claude Code para este repositorio. |
| `.github/workflows/` | ⚠ provisoria: flujos de GitHub (publicación del sitio). |
| `estudios/` | ⚠ provisoria: guías de estudio (por ejemplo, conectar dos teléfonos con el enlace). |
| `gestos/` | ⚠ provisoria: la incubadora de gestos. |
| `guias/` | ⚠ provisoria: guías y el estado actual de proyectos. |
| `plantillas/` | ⚠ provisoria: plantillas, entre ellas las reglas de trabajo. |
| `protocolos/` | ⚠ provisoria: protocolos y arquitectura (`ARQUITECTURA.md`). |
| `ronda/` | la ronda por trabajos: un archivo por trabajo en `trabajos/`, índice y formato en `LEEME.md` (plan «Timón», etapa 7a). |
| `servidor/` | ⚠ provisoria: funciones del servidor. |

## Raíz

| Archivo | Qué es | Usa |
|---|---|---|
| `CLAUDE.md` | Reglas de trabajo del panel: qué es, las dos zonas (`claves/` y `fichas/`), cómo se publica, la ronda y los invitados. | — |
| `HISTORIA.md` | panel de datos — HISTORIA y porqués de las reglas | `ojos.js` |
| `MAPA.md` | Este archivo: qué es cada archivo del repositorio y dónde está. Se actualiza con `node herramientas/secciones.mjs mapa`. | — |
| `README.md` | Cómo está armado el panel, cómo se instala y cómo se publican las reglas (la puerta). | — |
| `RUTINA-AUTOMATICA.md` | Rutinas de control | — |
| `TRASPASO.md` | Traspaso al chat nuevo — 30-sep-2026 | — |
| `album.html` | Álbum | — |
| `callmebot.js` | LEER LA RESPUESTA DE CALLMEBOT, para todo el ecosistema. | — |
| `chat.js` | Canal entre un invitado y su chat de IA: resumen, consultas y paquete por área. | — |
| `errores.js` | Tabla única de causas de error, en castellano, para todo el ecosistema. | — |
| `esquema.js` | Dibuja el esquema de globos de la página del invitado. | — |
| `estilos.css` | el sistema de diseño del panel. | — |
| `exportar.js` | LO QUE ARMA EL TEXTO PARA GEMINI. Sello: exportar-1 | — |
| `firebase-init.js` | EL ÚNICO CONTACTO CON EL SDK DE FIREBASE. | — |
| `gemini.html` | Panel · exportar para Gemini | `estilos.css`, `exportar.js`, `firebase-init.js`, `hoja.css`, `nucleo.js` |
| `glosario.js` | Palabras técnicas explicadas para quien no programa. | — |
| `hoja.css` | la estética «hoja» del panel. Sello: hoja-2 (8-nov-2026) | — |
| `index.html` | Panel principal de Mauro: pendientes, sitios, «La puerta». | `estilos.css`, `firebase-init.js`, `hoja.css`, `nucleo.js` |
| `intervenir.js` | La pantalla del invitado para bajar el paquete y traer la respuesta. | `firebase-init.js`, `paquete.js`, `semaforo.js` |
| `invitado.html` | La página de los invitados: pestañas por proyecto, pendientes, preguntas, chat propio. | `chat.js`, `esquema.js`, `estilos.css`, `firebase-init.js`, `glosario.js`, `hoja.css`, `intervenir.js`, `nucleo.js` |
| `manifest.json` | _(sin describir)_ | — |
| `nucleo.js` | Núcleo del panel: funciones compartidas `P.*` (puerta, avisos, fechas, errores). | `errores.js`, `firebase-init.js`, `ojos.js` |
| `obra.html` | Panel · proyectos | `estilos.css`, `firebase-init.js`, `hoja.css`, `nucleo.js` |
| `ojos.js` | EL OJO DE LAS CONTRASEÑAS, para todo el ecosistema. | — |
| `paquete.js` | Arma el paquete de una sección y reparte la respuesta del chat. Sirve para cualquier sitio. | — |
| `pizarra.html` | Instalar la Pizarra | — |
| `placa.html` | Panel · la placa de la Hilux | `estilos.css`, `firebase-init.js`, `hoja.css`, `nucleo.js`, `placa.js` |
| `placa.js` | _(sin describir)_ | — |
| `pruebas-reglas.mjs` | el banco de pruebas de «La puerta». | — |
| `reglas.txt` | Plantilla de las reglas de Firestore, con marcadores en lugar de UID. | — |
| `roli-ronda.html` | Roli · A jugar | — |
| `roli.html` | Panel · Roli, el robot | `estilos.css`, `hoja.css`, `roli.js` |
| `roli.js` | las actividades de Roli y lo que conviene comprarle. | — |
| `secciones.json` | El mapa de secciones de este panel. | — |
| `semaforo.js` | El aviso «estoy editando esta sección». | — |
| `servidor-1.js` | EL SERVIDOR DEL ECOSISTEMA, en un solo lugar. | — |
| `sw.js` | el service worker del panel. | — |

## `herramientas/`

| Archivo | Qué es | Usa |
|---|---|---|
| `herramientas/ACCESO-A-LAS-BASES.md` | Dar de alta al agente en una base — paso a paso | — |
| `herramientas/LEEME.md` | herramientas — lo que una sesión corre contra las bases | — |
| `herramientas/TELEFONO.md` | El teléfono como bodega | — |
| `herramientas/agenda.mjs` | Las clases de una actividad. Son las de `CLASES_ACTIVIDAD` de nucleo.js de | `herramientas/firestore.mjs` |
| `herramientas/analisis.mjs` | _(sin describir)_ | `herramientas/avisos.mjs`, `herramientas/firestore.mjs` |
| `herramientas/avisos.mjs` | _(sin describir)_ | `callmebot.js`, `herramientas/firestore.mjs`, `servidor-1.js` |
| `herramientas/bodega.json` | _(sin describir)_ | — |
| `herramientas/charla.mjs` | Cuántos audios se transcriben por corrida, como mucho: el resto queda «sin transcribir» y se lee en la próxima | `herramientas/firestore.mjs`, `servidor-1.js` |
| `herramientas/consultas.mjs` | _(sin describir)_ | `herramientas/firestore.mjs` |
| `herramientas/desplegar.mjs` | Los argumentos de `netlify deploy` (puro: lo prueba el banco). | `herramientas/telefono-bodega.mjs` |
| `herramientas/extractos.mjs` | Las líneas del archivo, con su id y la forma que piden las reglas v14. | `herramientas/analisis.mjs`, `herramientas/firestore.mjs` |
| `herramientas/facebook.mjs` | _(sin describir)_ | `herramientas/firestore.mjs` |
| `herramientas/firestore.mjs` | _(sin describir)_ | — |
| `herramientas/grabaciones.mjs` | Un .wav de PCM de 16 bits mono a partir de los bytes que guarda la APK. | `herramientas/firestore.mjs`, `servidor-1.js` |
| `herramientas/ingresos.mjs` | Un instante (ms, ISO o Timestamp ya leído) → «AAAA-MM-DD» en Uruguay (UTC−3). | `herramientas/firestore.mjs` |
| `herramientas/invitados.mjs` | los COLABORADORES de cada sitio, en el panel. | `herramientas/firestore.mjs` |
| `herramientas/latido.mjs` | El veredicto, sin tocar nada: { ok, lineas: [«✔ …» | — |
| `herramientas/notificaciones.mjs` | El nombre que se lee, para no adivinar un paquete. Lo que no está acá se | `herramientas/firestore.mjs` |
| `herramientas/novedades.mjs` | Las bases cuyos `reportes/` son pedidos y fallas de personas. Hilux no: ahí | `herramientas/avisos.mjs`, `herramientas/firestore.mjs` |
| `herramientas/obras.mjs` | Qué hay que bajar de una obra: las cosas con imagen nuestra y sin respaldo, | `herramientas/firestore.mjs` |
| `herramientas/reservas.mjs` | _(sin describir)_ | `herramientas/avisos.mjs` |
| `herramientas/ronda.mjs` | _(sin describir)_ | `herramientas/firestore.mjs` |
| `herramientas/secciones.mjs` | Comandos de terminal: armar, verificar, analizar y mapa. | `paquete.js` |
| `herramientas/telefono-bodega.mjs` | El token viaja por el entorno de ESA llamada a git y de ninguna otra. | — |
| `herramientas/telefono-capturas.mjs` | Las capturas de Airbnb que no se subieron. La primera vez, sólo las de la | `herramientas/telefono-bodega.mjs` |
| `herramientas/telefono-interfaz.mjs` | Arma el servidor. No lo pone a escuchar: eso lo hace quien llama, así el | `herramientas/telefono.mjs` |
| `herramientas/telefono-whatsapp.mjs` | _(sin describir)_ | `herramientas/telefono-bodega.mjs` |
| `herramientas/telefono.mjs` | Las extensiones que nunca se mueven. Se comparan en minúscula. `Thumbs.db` | `herramientas/firestore.mjs`, `herramientas/ronda.mjs`, `herramientas/telefono-bodega.mjs`, `herramientas/telefono-capturas.mjs`, `herramientas/telefono-interfaz.mjs`, `herramientas/telefono-whatsapp.mjs` |

## `pruebas/`

| Archivo | Qué es | Usa |
|---|---|---|
| `pruebas/LEEME.md` | Los bancos de pruebas | — |
| `pruebas/callmebot.mjs` | _(sin describir)_ | `callmebot.js` |
| `pruebas/chat.mjs` | _(sin describir)_ | `chat.js` |
| `pruebas/errores.mjs` | _(sin describir)_ | `errores.js` |
| `pruebas/esquema.mjs` | _(sin describir)_ | `esquema.js` |
| `pruebas/exportar.mjs` | _(sin describir)_ | `exportar.js` |
| `pruebas/ojos.mjs` | _(sin describir)_ | — |
| `pruebas/paquete.mjs` | Banco de pruebas de paquete.js, semaforo.js e intervenir.js. | `intervenir.js`, `paquete.js`, `semaforo.js` |
| `pruebas/placa.mjs` | _(sin describir)_ | — |
| `pruebas/reportes.mjs` | Banco del circuito «Reportar una falla», en los TRES sitios que lo tienen. | — |
| `pruebas/roli.mjs` | _(sin describir)_ | — |
| `pruebas/servidor.mjs` | _(sin describir)_ | `servidor-1.js` |
| `pruebas/trabajos.mjs` | el banco de la ronda por trabajos: formato de cada trabajo, índice↔carpeta, reparto extra/completa y cobertura de comandos. | — |

## `pruebas/casayourte/`

| Archivo | Qué es | Usa |
|---|---|---|
| `pruebas/casayourte/LEEME.md` | Pruebas de CasaYourte | — |
| `pruebas/casayourte/esc.mjs` | Comprueba que las funciones de escape de los cuatro proyectos hagan LO MISMO. | — |
| `pruebas/casayourte/permisos.mjs` | Corre las funciones REALES de CasaYourte, extraídas del archivo tal cual | — |

## `pruebas/herramientas/`

| Archivo | Qué es | Usa |
|---|---|---|
| `pruebas/herramientas/analisis.mjs` | _(sin describir)_ | `herramientas/analisis.mjs` |
| `pruebas/herramientas/avisos.mjs` | Datos inventados: ningún número ni clave de verdad. | `herramientas/avisos.mjs`, `herramientas/firestore.mjs`, `herramientas/reservas.mjs` |
| `pruebas/herramientas/charla.mjs` | _(sin describir)_ | `herramientas/charla.mjs` |
| `pruebas/herramientas/consultas.mjs` | _(sin describir)_ | `herramientas/consultas.mjs` |
| `pruebas/herramientas/desplegar.mjs` | _(sin describir)_ | `herramientas/desplegar.mjs` |
| `pruebas/herramientas/extractos.mjs` | _(sin describir)_ | `herramientas/analisis.mjs`, `herramientas/extractos.mjs` |
| `pruebas/herramientas/facebook.mjs` | _(sin describir)_ | `herramientas/facebook.mjs` |
| `pruebas/herramientas/firestore.mjs` | La nube de mentira | `herramientas/agenda.mjs`, `herramientas/firestore.mjs` |
| `pruebas/herramientas/grabaciones.mjs` | Un segundo de PCM de 16 bits con un tono a [f] Hz, como lo guarda la APK. | `herramientas/grabaciones.mjs` |
| `pruebas/herramientas/ingresos.mjs` | _(sin describir)_ | `herramientas/ingresos.mjs` |
| `pruebas/herramientas/invitados.mjs` | _(sin describir)_ | `herramientas/firestore.mjs`, `herramientas/invitados.mjs` |
| `pruebas/herramientas/latido.mjs` | _(sin describir)_ | `herramientas/latido.mjs` |
| `pruebas/herramientas/notificaciones.mjs` | _(sin describir)_ | `herramientas/notificaciones.mjs` |
| `pruebas/herramientas/novedades.mjs` | _(sin describir)_ | `herramientas/avisos.mjs`, `herramientas/novedades.mjs` |
| `pruebas/herramientas/obras.mjs` | _(sin describir)_ | `herramientas/obras.mjs` |
| `pruebas/herramientas/reservas.mjs` | _(sin describir)_ | `herramientas/reservas.mjs` |
| `pruebas/herramientas/ronda.mjs` | Cruzar reportes con pendientes | `herramientas/firestore.mjs`, `herramientas/ronda.mjs` |
| `pruebas/herramientas/telefono.mjs` | Una carpeta de mentira. `arbol` es { "ruta/archivo": contenido | `herramientas/telefono-bodega.mjs`, `herramientas/telefono-capturas.mjs`, `herramientas/telefono-interfaz.mjs`, `herramientas/telefono-whatsapp.mjs`, `herramientas/telefono.mjs` |

## `pruebas/panel/`

| Archivo | Qué es | Usa |
|---|---|---|
| `pruebas/panel/LEEME.md` | Banco de pruebas del panel | — |
| `pruebas/panel/banco.mjs` | Banco de pruebas: DOM real (jsdom) y Firestore de mentira. Corre el código | — |
| `pruebas/panel/package.json` | _(sin describir)_ | — |
| `pruebas/panel/parte-1-inicial.json` | _(sin describir)_ | — |
| `pruebas/panel/reglas-emulador-v9.mjs` | _(sin describir)_ | — |
| `pruebas/panel/reglas-emulador.mjs` | las reglas v6 y v7 contra el EMULADOR de Firestore. | — |

## `ronda/`

| Archivo | Qué es | Usa |
|---|---|---|
| `ronda/LEEME.md` | La ronda, por trabajos — LEEME | — |

## `ronda/trabajos/`

| Archivo | Qué es | Usa |
|---|---|---|
| `ronda/trabajos/010-abrir-el-panel.md` | Abrir el panel — trabajo de la ronda | — |
| `ronda/trabajos/020-reportes-y-pedidos.md` | Reportes y pedidos nuevos → pendientes del panel — trabajo de la ronda | — |
| `ronda/trabajos/030-pedidos-del-telefono.md` | Pedidos del teléfono — trabajo de la ronda | — |
| `ronda/trabajos/040-mensajes-airbnb.md` | Mensajes de Airbnb (y el probador del teléfono de captura) — trabajo de la ronda | — |
| `ronda/trabajos/050-pedidos-de-facebook.md` | Pedidos de alquiler de Facebook — trabajo de la ronda | — |
| `ronda/trabajos/060-mail.md` | El mail (Casa Verde, proveedores de CasaYourte, Mariano) — trabajo de la ronda | — |
| `ronda/trabajos/070-reservas-casaverde.md` | Reservas de Casa Verde — trabajo de la ronda | — |
| `ronda/trabajos/080-notificaciones-13c.md` | Todas las notificaciones del 13C — trabajo de la ronda | — |
| `ronda/trabajos/090-charla-pizarras.md` | La charla de las Pizarras — trabajo de la ronda | — |
| `ronda/trabajos/100-grabaciones-hilux.md` | Las grabaciones de la Hilux — trabajo de la ronda | — |
| `ronda/trabajos/110-consultas-casayourte.md` | Las consultas de CasaYourte — trabajo de la ronda | — |
| `ronda/trabajos/120-plan-bandomaps.md` | El plan de BandoMaps (la página de discusión) — trabajo de la ronda | — |
| `ronda/trabajos/130-bandomaps-commits.md` | Lo que Mariano sube a BandoMaps — trabajo de la ronda | — |
| `ronda/trabajos/140-tiempos-propuestas.md` | Tiempos · Propuestas (lo que apareció en el chat) — trabajo de la ronda | — |
| `ronda/trabajos/150-tiempos-auditoria.md` | Tiempos · Auditoría — trabajo de la ronda | — |
| `ronda/trabajos/160-respaldo.md` | Respaldo de todas las bases — trabajo de la ronda | — |
| `ronda/trabajos/170-ingresos-familia.md` | Ingresos de la familia — trabajo de la ronda | — |
| `ronda/trabajos/180-organizar.md` | Organizar (planes y riesgo de lo contestado) — trabajo de la ronda | — |
| `ronda/trabajos/190-coherencia-y-esquema.md` | Coherencia y esquema — trabajo de la ronda | — |
| `ronda/trabajos/200-trabajar-pendientes.md` | Trabajar pendientes (código) — trabajo de la ronda | — |
| `ronda/trabajos/210-avisos-whatsapp.md` | Avisos por WhatsApp al equipo — trabajo de la ronda | — |
| `ronda/trabajos/220-cierre.md` | El cierre (panel y resumen) — trabajo de la ronda | — |
