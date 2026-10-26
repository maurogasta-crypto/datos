// Las GRABACIONES de la Hilux: 10 s de sonido y de acelerómetro crudo
// (sitd-55, hilux:D7).
//
//   node herramientas/grabaciones.mjs listar
//   node herramientas/grabaciones.mjs bajar <id> --a <carpeta fuera de los repositorios> [--ia]
//
// La APK graba cuando una línea que se repite (la rueda, el cardán, el motor)
// se salió de lo normal en el viaje anterior, o cuando Mauro toca «Grabar
// 10 s». Lo pidió el 26-oct: «tener registro del audio sirve como respaldo
// para analizar el fallo… como prueba para descargar un mal funcionamiento
// del software».
//
// `bajar` deja un .wav, un .csv del acelerómetro y un resumen de los picos
// del sonido y de la vibración, cruzados con lo que la marcha y la velocidad
// dicen que tendría que sonar. Con `--ia`, además le pregunta a la IA del
// ecosistema (claude-proxy, Gemini flash-lite) qué se oye: es una SEGUNDA
// opinión, no el análisis — una IA genérica escuchando diagnostica poco.
//
// Nunca adentro de un repositorio, y NO va a la bodega: es el sonido de la
// cabina, y git no olvida. Se mira, se concluye, y la conclusión va a
// `analisis/` o al panel.
import fs from "node:fs";
import path from "node:path";

export const VERSION = "grabaciones-1";
export const PROXY = "https://serene-scone-76bd4e.netlify.app/.netlify/functions/claude-proxy";

/** Un .wav de PCM de 16 bits mono a partir de los bytes que guarda la APK. */
export function wavDe(pcm, hz) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(hz, 24); h.writeUInt32LE(hz * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

/** Las muestras del PCM, como números. */
export function muestrasDe(pcm) {
  const n = Math.floor(pcm.length / 2);
  return Array.from({ length: n }, (_, i) => pcm.readInt16LE(i * 2));
}

/** El acelerómetro: cuatro float32 por muestra (módulo, x, y, z). */
export function vibracionDe(buf) {
  const n = Math.floor(buf.length / 16);
  return Array.from({ length: n }, (_, i) => ({
    m: buf.readFloatLE(i * 16), x: buf.readFloatLE(i * 16 + 4),
    y: buf.readFloatLE(i * 16 + 8), z: buf.readFloatLE(i * 16 + 12),
  }));
}

export function csvDeVibracion(v, hz) {
  const f = (x) => (Number.isNaN(x) ? "" : x.toFixed(5));
  return "s,modulo,x,y,z\n" + v.map((s, i) => `${(i / hz).toFixed(4)},${f(s.m)},${f(s.x)},${f(s.y)},${f(s.z)}`).join("\n") + "\n";
}

/** Espectro de magnitudes (FFT radix-2, con Hann y relleno de ceros). */
export function espectro(x) {
  let n = 1; while (n < x.length) n *= 2;
  const re = new Float64Array(n), im = new Float64Array(n);
  const media = x.reduce((a, b) => a + b, 0) / x.length;
  for (let i = 0; i < x.length; i++) re[i] = (x[i] - media) * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (x.length - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let l = 2; l <= n; l <<= 1) {
    const a = (-2 * Math.PI) / l;
    for (let i = 0; i < n; i += l) for (let k = 0; k < l / 2; k++) {
      const c = Math.cos(a * k), s = Math.sin(a * k);
      const tr = re[i + k + l / 2] * c - im[i + k + l / 2] * s, ti = re[i + k + l / 2] * s + im[i + k + l / 2] * c;
      re[i + k + l / 2] = re[i + k] - tr; im[i + k + l / 2] = im[i + k] - ti; re[i + k] += tr; im[i + k] += ti;
    }
  }
  return Array.from({ length: n / 2 }, (_, k) => Math.hypot(re[k], im[k]));
}

/** Los [cuantos] picos más salientes entre [desde] y [hasta] Hz: [{hz, veces}]. */
export function picos(x, hz, { desde = 5, hasta = hz / 2, cuantos = 8 } = {}) {
  const e = espectro(x);
  const porCasillero = hz / (e.length * 2);
  const a = Math.max(1, Math.ceil(desde / porCasillero)), b = Math.min(e.length - 2, Math.floor(hasta / porCasillero));
  const tramo = e.slice(a, b + 1).sort((p, q) => p - q);
  const mediana = tramo[Math.floor(tramo.length / 2)] || 1;
  const c = [];
  for (let k = a; k <= b; k++) if (e[k] > e[k - 1] && e[k] >= e[k + 1]) c.push({ hz: +(k * porCasillero).toFixed(2), veces: +(e[k] / mediana).toFixed(1) });
  return c.sort((p, q) => q.veces - p.veces).slice(0, cuantos);
}

// Las relaciones de la camioneta (las mismas de la APK: rueda.dart y regimen.dart).
export const CAJA = [3.83, 2.062, 1.436, 1.0, 0.838];
export const DIFERENCIAL = 3.583;
export const VUELTA_M = 2.428;

/** Dónde tendría que sonar cada cosa a [kmh] en la [marcha]. */
export function esperadas(kmh, marcha) {
  if (!kmh) return {};
  const rueda = kmh / 3.6 / VUELTA_M, cardan = rueda * DIFERENCIAL;
  const out = { "rueda 1×": rueda, "rueda 2×": 2 * rueda, "rueda 3×": 3 * rueda, "cardán": cardan };
  if (marcha >= 1 && marcha <= 5) {
    const motor = cardan * CAJA[marcha - 1];
    out["motor 1× (RPM/60)"] = motor; out["encendido (RPM/30)"] = 2 * motor;
  }
  for (const k of Object.keys(out)) out[k] = +out[k].toFixed(2);
  return out;
}

export function pedidoIA(base64, g) {
  const quees = Object.entries(esperadas(g.kmh, g.marcha)).map(([k, v]) => `${k}: ${v} Hz`).join(", ");
  return { model: "gemini-2.5-flash-lite", max_tokens: 1200, messages: [{ role: "user", content: [
    { type: "document", source: { type: "base64", media_type: "audio/wav", data: base64 } },
    { type: "text", text:
      "Son 10 segundos grabados dentro de la cabina de una Toyota Hilux 3.0 diésel (1KD-FTV) andando, " +
      `a ${g.kmh ? g.kmh.toFixed(0) + " km/h" : "velocidad desconocida"}${g.marcha ? " en " + g.marcha + ".ª" : ""}. ` +
      `Frecuencias esperadas: ${quees}. Motivo de la grabación: ${g.motivo}. ` +
      "Describí SÓLO los sonidos mecánicos que se oyen (zumbidos, golpeteos, silbidos, chirridos, rumor de ruedas), " +
      "con su carácter y si son regulares. Si se oye una voz, no la transcribas: decí sólo que hay voz. No inventes un diagnóstico: " +
      "decí qué se oye y qué pieza podría producirlo, con tu grado de certeza." }] }] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
  const run = async () => {
    const F = await import("./firestore.mjs");
    const h = F.PROYECTOS.hilux;
    const s = await F.entrar(h);
    if (cmd === "listar") {
      const l = await F.listar(h, s, "grabaciones");
      if (!l.length) { console.log("\n  Ninguna grabación todavía.\n"); return; }
      console.log("");
      for (const g of l.sort((a, b) => a.t - b.t)) {
        const kb = Math.round(((g.audio || "").length * 3) / 4 / 1024);
        console.log(`  ${g.id}  ${new Date(g.t).toISOString().slice(0, 16)}  ${g.motivo}  ` +
          `${g.kmh ? g.kmh.toFixed(0) + " km/h" : ""}${g.marcha ? " " + g.marcha + ".ª" : ""}  ${g.sello || ""}  ${kb} KB`);
      }
      console.log(""); return;
    }
    if (cmd === "bajar") {
      const [id] = args.filter((x, i) => !x.startsWith("--") && !(i > 0 && args[i - 1].startsWith("--")));
      const a = opt("--a", "");
      if (!id || !a) throw new Error("uso: bajar <id> --a <carpeta fuera de los repositorios> [--ia]");
      if (/\/home\/user\/(datos2|bodega|casaverdecanas|CasaYourte|remate|tiempos|pizarra|gestos|sitd-hilux)(\/|$)/.test(path.resolve(a)))
        throw new Error("no adentro de un repositorio: usá el scratchpad");
      const g = await F.leerUno(h, s, "grabaciones", id);
      if (!g) { console.log("\n  No está.\n"); return; }
      fs.mkdirSync(a, { recursive: true });
      const salida = [];
      if (g.audio) {
        const pcm = Buffer.from(g.audio, "base64");
        const wav = wavDe(pcm, g.hzAudio || 8000);
        fs.writeFileSync(path.join(a, `${id}.wav`), wav);
        salida.push(`sonido: ${path.join(a, id + ".wav")} (${(pcm.length / 2 / (g.hzAudio || 8000)).toFixed(1)} s)`);
        salida.push("  picos del sonido 20–400 Hz: " + picos(muestrasDe(pcm), g.hzAudio || 8000, { desde: 20, hasta: 400 }).map((p) => `${p.hz} Hz ×${p.veces}`).join(" · "));
        if (args.includes("--ia")) {
          const r = await fetch(PROXY, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(pedidoIA(wav.toString("base64"), g)) });
          const j = await r.json().catch(() => ({}));
          salida.push("  la IA (segunda opinión): " + (r.ok ? (j.content || []).map((c) => c.text || "").join("").trim() : `no contestó (${r.status})`));
        }
      }
      if (g.vibracion && g.hzVib) {
        const v = vibracionDe(Buffer.from(g.vibracion, "base64"));
        fs.writeFileSync(path.join(a, `${id}-acelerometro.csv`), csvDeVibracion(v, g.hzVib));
        salida.push(`acelerómetro: ${v.length} muestras a ${g.hzVib.toFixed(1)} Hz`);
        salida.push("  picos de la vibración 2–100 Hz: " + picos(v.map((s) => s.m), g.hzVib, { desde: 2, hasta: Math.min(100, g.hzVib / 2) }).map((p) => `${p.hz} Hz ×${p.veces}`).join(" · "));
      }
      salida.push("esperadas: " + Object.entries(esperadas(g.kmh, g.marcha)).map(([k, v]) => `${k} ${v} Hz`).join(" · "));
      console.log(`\n  ${id} · ${g.motivo} · ${g.kmh ? g.kmh.toFixed(0) + " km/h" : ""}${g.marcha ? " " + g.marcha + ".ª" : ""}\n  ` + salida.join("\n  ") + "\n");
      return;
    }
    console.log("\n  node herramientas/grabaciones.mjs listar\n  node herramientas/grabaciones.mjs bajar <id> --a <carpeta> [--ia]\n");
  };
  run().catch((e) => { console.error(`\n  ✖ ${e.message}\n`); process.exit(1); });
}
