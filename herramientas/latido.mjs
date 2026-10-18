// ─────────────────────────────────────────────────────────────────────────────
// herramientas/latido.mjs — ¿El teléfono de captura está leyendo? Sello: latido-1
//
// 18-oct-2026, Mauro: «una herramienta de tester para la lectura de
// notificaciones que pueda correr en las corridas automáticas para verificar
// que todo está andando». La corre la ronda (TRASPASO § 4, paso 5 bis), tres
// veces por día, sobre el `latido.json` que deja la Pizarra en la bodega.
//
// Tener el permiso de leer notificaciones NO alcanza: un lector que Android
// desconectó se ve igual que un día sin mensajes. Desde pizarra-39 el latido
// trae `escucha` —cuándo se conectó el lector, la HORA de la última
// notificación de cualquier app y cuántas vio hoy, sin qué decían— y eso es
// lo que se controla acá:
//   · el latido llega (cada 6 h; más de 8 h es un problema);
//   · no trae `falla` (late pero no puede leer);
//   · viene del teléfono de captura, el Redmi 13C;
//   · el lector escuchó algo en las últimas 12 horas (un teléfono en uso
//     recibe notificaciones todo el día; de noche se tolera).
//
//   node herramientas/latido.mjs [--bodega <dir>]
//       Imprime «✔ …» o «⚠ …» renglón por renglón; sale con código 1 si hay
//       algo que avisar. No escribe nada.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

export const TELEFONO_DE_CAPTURA = "23100RN82L";   // Redmi 13C (marca y modelo, nada personal)
export const HORAS_LATIDO = 8;
export const HORAS_ESCUCHA = 12;

const horas = (ms) => Math.round(ms / 360e4 * 10) / 10;

/* El veredicto, sin tocar nada: { ok, lineas: [«✔ …» | «⚠ …»] }. */
export function controlar(l, ahora = Date.now()) {
  const lineas = [];
  const mal = (t) => lineas.push("⚠ " + t);
  const bien = (t) => lineas.push("✔ " + t);
  if (!l || !l.ultimo) { mal("no hay latido: la Pizarra del 13C nunca escribió en la bodega (¿token?)"); return { ok: false, lineas }; }
  const edad = ahora - Date.parse(l.ultimo);
  if (!(edad >= 0) && !(edad < 0)) mal(`el latido tiene una fecha que no se entiende («${l.ultimo}»)`);
  else if (edad > HORAS_LATIDO * 36e5) mal(`el último latido es de hace ${horas(edad)} h (llega cada 6): la Pizarra del 13C no está corriendo o no llega a GitHub`);
  else bien(`latido de hace ${horas(edad)} h (${l.desde || "versión ?"})`);
  if (l.falla) mal(`late pero NO puede leer: ${l.falla}`);
  if (!l.telefono) mal("el latido no dice de qué teléfono viene (Pizarra anterior a pizarra-38)");
  else if (!String(l.telefono).includes(TELEFONO_DE_CAPTURA)) mal(`el latido viene de «${l.telefono}», que no es el 13C: hay otro teléfono leyendo`);
  else bien(`viene del 13C (${l.telefono})`);
  const e = l.escucha;
  if (!e) mal("el latido no trae la escucha (Pizarra anterior a pizarra-39): no se puede saber si el lector está conectado");
  else if (!e.ultima) mal("el lector nunca vio una notificación: Android no lo conectó (apagar y prender el acceso a notificaciones de la Pizarra)");
  else {
    const sin = Date.parse(l.ultimo) - Date.parse(e.ultima);
    if (sin > HORAS_ESCUCHA * 36e5) mal(`el lector no vio ninguna notificación en las ${horas(sin)} h antes del latido: puede estar desconectado (apagar y prender el acceso a notificaciones)`);
    else bien(`el lector escucha: última notificación ${horas(sin)} h antes del latido, ${e.hoy ?? 0} hoy`);
  }
  return { ok: !lineas.some((x) => x.startsWith("⚠")), lineas };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const i = process.argv.indexOf("--bodega");
  const dir = i > 0 ? process.argv[i + 1] : path.join(path.dirname(new URL(import.meta.url).pathname), "..", "..", "bodega");
  let l = null;
  try { l = JSON.parse(fs.readFileSync(path.join(dir, "latido.json"), "utf8")); } catch {}
  const r = controlar(l);
  console.log("\n  Teléfono de captura:\n" + r.lineas.map((x) => "    " + x).join("\n") + "\n");
  process.exit(r.ok ? 0 : 1);
}
