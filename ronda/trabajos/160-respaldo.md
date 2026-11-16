# Respaldo de todas las bases — trabajo de la ronda

> Era el paso 6 de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a).

| | |
|---|---|
| **App** | bodega (respalda las bases de todos los sitios y las obras del panel) |
| **Cuándo** | sólo la corrida de la mañana (el commit «Respaldo diario» es además la marca de que la corrida completa del día ya pasó) |
| **Qué lee** | todas las bases (`telefono.mjs depositar`), las obras (`obras.mjs respaldar`), y el historial del agente en Casa Verde y Tiempos |
| **Qué puede dejar** | el commit «Respaldo diario <fecha>» en la bodega; un cambio del agente que nadie pidió, ARRIBA del resumen; un respaldo que falló se DICE, no se insiste |
| **Nivel** | Mirar |

## Criterio

RESPALDO DE TODAS LAS BASES:  node herramientas/telefono.mjs depositar --bodega /home/user/bodega
Y las OBRAS del panel (obra.html, desde el 15-oct):  node herramientas/obras.mjs respaldar --bodega /home/user/bodega  — la ficha y las fotos a obras/<id>/; lo que diga «a mano» (un documento de claude.ai) va en el resumen.
Después en /home/user/bodega: git add -A; si hay cambios, commit «Respaldo diario <fecha>» (con las líneas de atribución) y push. Y mirá  firestore.mjs casaverde historial 10  y  tiempos historial 10: si hay cambios del agente que nadie pidió en un chat ni en esta ronda, decilo arriba de todo.
Si el respaldo falla, NO insistas: decí el error exacto. Un respaldo que no se hizo y no se dice es peor que no tener respaldo.
