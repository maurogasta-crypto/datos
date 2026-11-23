# Tiempos · Propuestas (lo que apareció en el chat) — trabajo de la ronda

> Era el paso 5 ter de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a). Desde app-4.

| | |
|---|---|
| **App** | tiempos |
| **Cuándo** | sólo la corrida de la mañana |
| **Qué lee** | lo que Mauro o Florencia hayan escrito en el chat de la ronda desde la última corrida, y `propuestas`/`movimientos` de Tiempos para no duplicar |
| **Qué puede dejar** | UNA propuesta por cosa (gasto, tarea o evento); aprobar es de Mauro o Florencia, desde la solapa Plata |
| **Nivel** | Proponer |

## Criterio

En lo que Mauro o Florencia hayan escrito en este chat desde la última ronda (WhatsApp ya no se lee) buscá lo que sea un GASTO o un INGRESO de la familia («pagué 85 en la farmacia», un comprobante reenviado), una TAREA de la casa, o una ACTIVIDAD de los chicos (básquet, psicóloga, cumpleaños). Por cada una, antes  node herramientas/firestore.mjs tiempos leer propuestas  y  tiempos leer movimientos  para no duplicar, y después creá UNA propuesta:
  node herramientas/firestore.mjs tiempos escribir propuestas <id> <archivo.json>
con {clase: "gasto"|"tarea"|"evento", estado: "pendiente", fuente: "chat", resumen (una línea, sin datos de más), datos, dudas: [campos que no sabés seguro], creadoEn}.
Gasto: datos = {monto, moneda BRL|UYU|USD, fecha AAAA-MM-DD, comercio, categoria (una de las CATEGORIAS de tiempos/nucleo.js), detalle, uid de quien pagó si se sabe}. Tarea: {titulo, tipo, detalle}. Evento: {titulo, fecha, hora, semanal, ninos (ids de familia/config), nota}.
Lo que no sepas con certeza va vacío y en `dudas`: nunca inventes un monto ni una fecha. El agente PROPONE: aprobar es de Mauro o Florencia, desde la solapa Plata.

**Boletas con foto** (desde plata-19, 23-nov-2026): un reporte `pedido` que empieza «Boleta con foto cargada en Plata (movimiento <id>…)» es un aviso de que alguien guardó un gasto con foto. Leé ese movimiento (`factura.renglones`); si mezcla categorías, aplicá `PROTOCOLO-PLATA.md` § 9 (una propuesta por categoría que sume el total) y dejá en el resumen que hay que descartar o ajustar el movimiento original. Si ya es de una sola categoría, no hagas nada.

