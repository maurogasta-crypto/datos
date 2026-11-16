# Abrir el panel — trabajo de la ronda

> Eran los pasos 1, 2 y 3 de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a).

| | |
|---|---|
| **App** | panel |
| **Cuándo** | todas las corridas |
| **Qué lee** | `CLAUDE.md` y los protocolos de `datos`, y el panel entero (`ronda.mjs abrir`: líneas, pendientes, reportes de los sitios, semáforo) |
| **Qué puede dejar** | nada: deja el estado leído para los demás trabajos; una fuente caída va primera en el resumen |
| **Nivel** | Mirar |

## Criterio

1. Leé /home/user/datos2/CLAUDE.md y protocolos/PROTOCOLO-GENERAL.md §§ 2.1 ter, quinquies, sexies, septies, octies, 6, 8 y 9. Si esto y RUTINA-AUTOMATICA.md se contradicen, gana el archivo y lo decís.
2. UNA SOLA VEZ, desde /home/user/datos2:  node herramientas/ronda.mjs abrir --chat "ronda diaria <fecha>"
   No en loop: cada corrida hace login en seis bases y Firebase corta por cuota. Mirá EN QUÉ ESTAMOS, SEMÁFORO, QUÉ CAMBIÓ y QUÉ TOCAR AHORA.
3. Si alguna FUENTE está caída, es lo primero que informás.
