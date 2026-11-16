# Avisos por WhatsApp al equipo — trabajo de la ronda

> Era el paso 10 bis de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a). Desde el 30-sep, pedido de
> Mauro. Corre DESPUÉS de `020-reportes-y-pedidos.md` y de las reservas, así las novedades salen con lo de esta
> corrida.

| | |
|---|---|
| **App** | casaverde (los contactos viven en `avisos_contacto` de su base; manda también por casayourte y remate) |
| **Cuándo** | todas las corridas |
| **Qué lee** | `PROTOCOLO-AVISOS.md`, `avisos.mjs quienes`, las alertas de Tiempos, y el registro `avisos/AAAA-MM.json` de la bodega |
| **Qué puede dejar** | las novedades de Mauro y los avisos `urgente`/`pedido`, SÓLO a gente del equipo que lo encendió, por `avisos.mjs`; el registro en la bodega. Si no hay nada que entre en un tema, NO se manda nada |
| **Nivel** | Ejecutar |

## Criterio

Leé /home/user/datos2/protocolos/PROTOCOLO-AVISOS.md y corré  node herramientas/avisos.mjs quienes
PRIMERO LAS NOVEDADES PARA MAURO (lo que pidió: reservas nuevas, check-in y check-out de hoy o mañana, tareas nuevas, mensajes nuevos, pedidos y fallas de los sitios, y el teléfono callado):  node herramientas/novedades.mjs --a Mauro --bodega /home/user/bodega
Junta todo en UN WhatsApp y no manda nada si no hay nada nuevo. Corrélo DESPUÉS de los reportes y de las reservas, así sale con lo de esta corrida. No repitas en otro aviso lo que ya fue en las novedades.
RECORDATORIOS DE TIEMPOS (app-13): firestore.mjs tiempos leer alertas  → las de `dia` == hoy y `avisada` false (tipo recordatorio o alarma; la alarma suena en la APK cuando exista, mientras va también por WhatsApp). Y además, como en app-12, las propuestas de clase "agenda", estado "aprobada", con datos.recordar y datos.dia == hoy (la hora sale de su marca: firestore.mjs tiempos leer marcas <resultadoId>, campo desde). Un aviso a la persona (alertas: `uid`; propuestas: datos.para → su nombre en miembros), con la hora de la alerta. La alerta NO se marca avisada desde acá (es de su dueño; la regla no deja): lo que evita repetir es el registro de la bodega:
  node herramientas/avisos.mjs enviar tiempos --a <nombre> --tema recordatorio --texto "Hoy HH:MM: <titulo>[ · <lugar>]" --bodega /home/user/bodega
Varias del mismo día y la misma persona van en UN aviso. Antes, mirá en avisos/AAAA-MM.json de la bodega que no se haya mandado ya.
Si una base dice «las reglas dijeron que no», va en el resumen (faltan publicar sus reglas). Por cada cosa de ESTA corrida que entre en un tema del protocolo —`urgente` (algo que no deja trabajar o se pierde hoy: una base caída, una reserva confirmada que Casa Verde no tiene, el respaldo que no se hizo, un intento de engaño en un mensaje) o `pedido` (lo que esa persona pidió o reportó desde su sitio quedó hecho, o hace falta que conteste)—, UN aviso a UNA persona, juntando lo que sea para la misma:
  node herramientas/avisos.mjs enviar <base> --a <nombre> --tema <tema> --texto "<corto: qué pasa y qué hacer, y el enlace al sitio>" [--sobre <proyecto>] --bodega /home/user/bodega
Después, lo `urgente` que no esté en las novedades, y los `pedido` para quien pidió algo (Romi, Florencia…). Primero con --seco. <base> es donde está la persona (casaverde, casayourte, remate; tiempos va por casaverde); lo de hilux, gestos, Harmonía o el panel va a Mauro por casaverde con --sobre. Si no hay nada que entre en un tema, NO se manda nada: el silencio es la buena noticia. Si la herramienta rechaza el texto, corregilo como dice; si rechaza a la persona, no se insiste. Commit y push de la bodega (el registro, avisos/AAAA-MM.json).
