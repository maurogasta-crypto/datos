# Trabajar pendientes (código) — trabajo de la ronda

> Era la PARTE 2 (pasos 7 a 10) de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a).

| | |
|---|---|
| **App** | el repo que toque (lo elige QUÉ TOCAR AHORA) |
| **Cuándo** | sólo la corrida de la mañana |
| **Qué lee** | QUÉ TOCAR AHORA del panel; el CLAUDE.md y los bancos del repo elegido |
| **Qué puede dejar** | hasta TRES pendientes de riesgo bajo resueltos (UNO si es de riesgo alto aprobado), cada uno con su verificación y su commit a `main` |
| **Nivel** | Ejecutar |

## Criterio

7. El pendiente lo elige la ronda en QUÉ TOCAR AHORA: tomá el primero, y si es de riesgo bajo, hasta tres en orden. Uno de riesgo alto aprobado va solo en la corrida. Cada uno con su verificación previa y su commit. Antes comprobá que TODAVÍA sea cierto (preguntale a la cosa, no al registro). Si no hay ninguno elegible, decilo y seguí con los trabajos que quedan: no inventes trabajo.
   Si es un PEDIDO de Mauro (`tipo: "pedido"`, cargado con el botón «Pedido» del panel): hacelo sólo si está claro y cabe en cómo funciona hoy el ecosistema. Si es ambiguo, toca varios sitios, choca con una regla de un CLAUDE.md o es más grande que una tanda, NO toques código: escribile un PLAN como `pregunta` del pendiente (qué entendiste, qué sitios toca, en qué pasos, qué choca y qué decide él) y seguí con los trabajos que quedan. Economizar recursos y planear antes de lanzar cambios sueltos es lo que pidió (panel:R8, 2-oct).
8. Tomá la línea y reservá el repo:  ronda.mjs reservar <repo> --chat "ronda diaria <fecha>". Si está tomada por otro chat, no la toques y decilo.
9. Obedecé el CLAUDE.md del repo que tocás. Archivos completos; el núcleo no se duplica; una colección nueva entra con su regla. Se empuja a main directo, sin rama; nunca --force.
10. Verificación previa obligatoria: que el JS parsee como módulo (node --input-type=module --check < archivo), los bancos del CLAUDE.md de ese repo en verde, los sellos y la VERSION de sw.js subidos, la documentación diciendo la verdad. Si algo no pasa, no empujes y escribilo en el pendiente.
