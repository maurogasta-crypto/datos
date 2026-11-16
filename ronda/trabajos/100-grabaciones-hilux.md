# Las grabaciones de la Hilux — trabajo de la ronda

> Era el paso 5 bis ⅞ ¾ de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a). Sitd-55, hilux:D7,
> 26-oct, Mauro: «tener registro del audio sirve como respaldo para analizar el fallo… como prueba para descargar un
> mal funcionamiento del software».

| | |
|---|---|
| **App** | hilux |
| **Cuándo** | sólo la corrida de la mañana |
| **Qué lee** | `grabaciones.mjs listar` (las de las últimas 24 h); cada una se baja al scratchpad, NUNCA a un repositorio ni a la bodega |
| **Qué puede dejar** | un renglón de historia en hilux:D7 (o un pendiente nuevo), sin copiar lo que se oiga de personas |
| **Nivel** | Mirar |

## Criterio

a) node herramientas/grabaciones.mjs listar  → las de las últimas 24 h (10 s de sonido y acelerómetro: automática cuando una línea que se repite se salió, o «a mano»).
b) Por cada una nueva:  node herramientas/grabaciones.mjs bajar <id> --a <scratchpad>  (NUNCA adentro de un repositorio ni de la bodega: es el sonido de la cabina, y git no olvida). Mirá los picos del sonido y de la vibración contra las esperadas; si hace falta, con --ia (Gemini flash-lite, una segunda opinión: no transcribe voces). Una «a mano» puede ser una falla del SOFTWARE: cruzala con el reporte de ese viaje y su bitácora.
c) Lo que concluyas va como renglón de historia en hilux:D7 (o un pendiente nuevo si es otra cosa), sin copiar lo que se oiga de personas. Si hubo alguna, una línea en el resumen.
