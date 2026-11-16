# Coherencia y esquema — trabajo de la ronda

> Era el paso 6 ter de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a). Pedido de Mauro, 3-oct:
> «se pierden los hilos; las rondas deben revisar la coherencia y plantear una visión simplificada de los planes de
> acción de cada sitio, un esquema que se pueda ampliar».

| | |
|---|---|
| **App** | panel |
| **Cuándo** | sólo la corrida de la mañana |
| **Qué lee** | la sección COHERENCIA (abiertos quietos 14 días) y QUÉ CAMBIÓ de la ronda |
| **Qué puede dejar** | cierres o retiros con su renglón de historia, los `esquema` de cada sitio reescritos, y las alertas que cruzan sitios en `esquemaEcosistema` |
| **Nivel** | Completar |

## Criterio

Después de organizar (`180-organizar.md`):
· COHERENCIA: por cada abierto de la sección COHERENCIA (quieto 14 días), preguntale a la cosa: si ya no aplica, cerralo o retiralo con su renglón de historia; si sigue, decí en una línea por qué sigue. Y mirá QUÉ CAMBIÓ: si un commit de un sitio afecta a otro (algo compartido —el zip de Netlify, claude-proxy, firestore.mjs, los protocolos, las reglas de una base que usan dos sitios—), es una ALERTA.
· ESQUEMA: para cada sitio con pendientes abiertos, reescribí  proyectos/<id>.esquema  (firestore.mjs panel fusionar proyectos <id>) con {fecha: hoy, resumen: DOS renglones como mucho —en qué está y qué falta—, pasos: hasta 5, en el orden en que se van a hacer, cada uno {titulo de una línea, quien "claude"|"mauro", riesgo "bajo"|"alto", ids: [pendientes que lo forman]}, alertas: [lo de coherencia de ese sitio, una línea cada una]}. Y las alertas que cruzan sitios en  proyectos/panel.esquemaEcosistema = {fecha, alertas}. Sin jerga: lo lee Mauro en el teléfono. Un pendiente que no entra en ningún paso es una señal: o sobra, o falta un paso.
