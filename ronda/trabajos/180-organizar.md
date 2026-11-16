# Organizar (planes y riesgo de lo contestado) — trabajo de la ronda

> Era el paso 6 bis de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a). Pedido de Mauro, 2-oct:
> «luego de la tanda, una organización de todos los pendientes y planes de intervención que, si no tienen
> implicaciones serias, se ejecuten automáticamente».

| | |
|---|---|
| **App** | panel |
| **Cuándo** | sólo la corrida de la mañana |
| **Qué lee** | la sección ORGANIZAR que imprime la ronda (lo que Mauro contestó o pidió y no tiene plan) |
| **Qué puede dejar** | en cada pendiente: `plan`, `riesgo` y `planEn` (lo bajo queda con quien:"claude" para `200-trabajar-pendientes.md`; lo alto, quien:"mauro" con «Aprobar el plan»); cierres de lo que la respuesta ya cerró |
| **Nivel** | Proponer |

## Criterio

La ronda imprime ORGANIZAR: lo que Mauro contestó o pidió y no tiene plan. Para CADA uno, antes de trabajar nada:
🤖 Un pedido con `origen: "gemini"` (la ronda lo marca «PROPUESTA DE GEMINI») lo trajo Mauro de una auditoría de Gemini (PROTOCOLO-GENERAL § 2.1 nonies): ANTES del plan, evaluarlo contra el CLAUDE.md del repo y el código de HOY (la foto de Gemini puede ser vieja). Si choca con algo, la `pregunta` dice con qué y por qué y no se ejecuta; si cambia una regla de un CLAUDE.md o de protocolos/, es riesgo alto.
· si la respuesta lo cierra (ya funciona, ya no aplica), cerralo: estado "hecho", renglón de historia.
· si no, escribí con  firestore.mjs panel fusionar pendientes <id>  los campos `plan` (qué vas a hacer, en qué repo, en pasos, en 3 a 6 renglones), `riesgo` ("bajo" o "alto") y `planEn` (la fecha de hoy), más un renglón de historia. La respuesta de Mauro no se toca.
· Un pedido de un INVITADO (`origen` «panel:invitado/…») sigue además el CUPO del § 4 bis de TRASPASO.md (2 resueltos por día y por sitio, 12 en total): pasado el cupo, se organiza pero se resuelve otro día.
· RIESGO BAJO es TODO esto a la vez: un solo repositorio; no toca reglas de Firestore, credenciales, `claves`, plata, datos de personas ni reservas; no borra nada (ni ramas, ni documentos, ni archivos de otro); se puede deshacer con un revert; y el banco del repo lo cubre o se puede verificar acá. Entonces `quien: "claude"` y entra a QUÉ TOCAR.
· Si falta UNA de esas condiciones, o la respuesta pide decidir algo que es de Mauro o de Florencia, es RIESGO ALTO: `quien: "mauro"` y el plan queda a la vista con «Aprobar el plan» en el panel (al tocarlo pasa a `aprobado: true, quien: "claude"`). Un repo al que esta sesión no puede empujar es alto: decilo en el plan.
Organizar no tiene tope: se planea todo lo que haya. Ejecutar sí lo tiene (`200-trabajar-pendientes.md`).
