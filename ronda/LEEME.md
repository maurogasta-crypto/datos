# La ronda, por trabajos — LEEME

> Desde el 16-nov-2026 (plan «Timón», etapa 7a; `ARQUITECTURA.md` § 4) **los pasos de la ronda viven acá, un trabajo
> por archivo**, en `ronda/trabajos/`. Antes eran un texto único en `TRASPASO.md` § 4; ese § 4 conserva **el arranque**
> (repositorios, corrida extra o completa) y **las prohibiciones (NUNCA)**, que mandan sobre todos los trabajos.
> El texto operativo de cada trabajo se trasladó **tal cual**: cada regla costó un error o la pidió Mauro con fecha.

## Cómo se corre

1. El arranque es `TRASPASO.md` § 4: poner los repos al día y saber si la corrida es **completa** (la primera del día)
   o **extra** (en temporada, la segunda y la tercera).
2. Se corren los trabajos de `trabajos/` **en el orden de su número**. En una corrida extra, **sólo los que dicen
   «todas las corridas»**; los de «sólo la corrida de la mañana» se saltan.
3. **Cambiar un paso es cambiar su archivo y empujarlo** (no se toca el disparador). **Sumar una función a la ronda es
   sumar un trabajo**: su archivo con el formato de abajo y su fila en el índice, en la misma tanda.
4. El banco `pruebas/trabajos.mjs` comprueba el formato, el índice y que ninguna herramienta de la ronda haya quedado
   sin trabajo que la corra. Corre antes de empujar cualquier cambio de esta carpeta.

## El formato de un trabajo

Cada archivo declara, en una tabla al principio: **App** (de qué app o base es), **Cuándo** («todas las corridas» o
«sólo la corrida de la mañana»), **Qué lee**, **Qué puede dejar** (lo que escribe o produce), y **Nivel** — uno de los
de `protocolos/ARQUITECTURA.md` § 4: **Mirar** (lee, respalda, audita), **Completar** (llena un dato vacío, con copia),
**Proponer** (deja listo y una persona confirma), **Ejecutar** (riesgo bajo, reversible). Lo de nivel **Nunca** no es un
trabajo: está en el NUNCA de `TRASPASO.md` § 4. Después de la tabla, `## Criterio`: el texto operativo completo.

## El índice (el orden ES el orden de ejecución)

| # | Trabajo | App | Cuándo | Nivel |
|---|---|---|---|---|
| 010 | `010-abrir-el-panel.md` | panel | todas las corridas | Mirar |
| 020 | `020-reportes-y-pedidos.md` | panel | todas las corridas | Completar |
| 030 | `030-pedidos-del-telefono.md` | bodega | todas las corridas | Proponer |
| 040 | `040-mensajes-airbnb.md` | casaverde | todas las corridas | Proponer |
| 050 | `050-pedidos-de-facebook.md` | casaverde | todas las corridas | Proponer |
| 060 | `060-mail.md` | casaverde | todas las corridas | Completar |
| 070 | `070-reservas-casaverde.md` | casaverde | todas las corridas | Completar |
| 080 | `080-notificaciones-13c.md` | casaverde | todas las corridas | Ejecutar |
| 090 | `090-charla-pizarras.md` | tiempos | todas las corridas | Mirar |
| 100 | `100-grabaciones-hilux.md` | hilux | sólo la corrida de la mañana | Mirar |
| 110 | `110-consultas-casayourte.md` | casayourte | todas las corridas | Proponer |
| 120 | `120-plan-bandomaps.md` | harmonia | sólo la corrida de la mañana | Ejecutar |
| 130 | `130-bandomaps-commits.md` | tocatoca | sólo la corrida de la mañana | Mirar |
| 140 | `140-tiempos-propuestas.md` | tiempos | sólo la corrida de la mañana | Proponer |
| 150 | `150-tiempos-auditoria.md` | tiempos | sólo la corrida de la mañana | Mirar |
| 160 | `160-respaldo.md` | bodega | sólo la corrida de la mañana | Mirar |
| 170 | `170-ingresos-familia.md` | tiempos | sólo la corrida de la mañana | Proponer |
| 180 | `180-organizar.md` | panel | sólo la corrida de la mañana | Proponer |
| 190 | `190-coherencia-y-esquema.md` | panel | sólo la corrida de la mañana | Completar |
| 200 | `200-trabajar-pendientes.md` | el repo que toque | sólo la corrida de la mañana | Ejecutar |
| 210 | `210-avisos-whatsapp.md` | casaverde | todas las corridas | Ejecutar |
| 220 | `220-cierre.md` | panel | todas las corridas | Completar |

Notas de orden que no cambian: `060-mail` va **antes** que `070-reservas-casaverde` (así las reservas y los avisos de
llegada salen con lo del mail); `080-notificaciones-13c` va **después** de 050, 060 y 070 (así lo que ya entró por su
camino se reconoce); `210-avisos-whatsapp` corre **después** de 020 y de las reservas, así las novedades salen con lo
de esta corrida.
