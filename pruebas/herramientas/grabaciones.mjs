// pruebas/herramientas/grabaciones.mjs — Banco de las grabaciones de la Hilux
// (herramientas/grabaciones.mjs, sitd-55). Sin npm ni red.
//   node pruebas/herramientas/grabaciones.mjs
import assert from "node:assert/strict";
import { wavDe, muestrasDe, vibracionDe, csvDeVibracion, picos, esperadas, pedidoIA, CAJA, DIFERENCIAL, VUELTA_M } from "../../herramientas/grabaciones.mjs";

let pasadas = 0, fallidas = 0;
const prueba = async (n, f) => { try { await f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

/** Un segundo de PCM de 16 bits con un tono a [f] Hz, como lo guarda la APK. */
function pcmCon(f, hz = 8000, seg = 1) {
  const b = Buffer.alloc(hz * seg * 2);
  for (let i = 0; i < hz * seg; i++) b.writeInt16LE(Math.round(8000 * Math.sin((2 * Math.PI * f * i) / hz) + 200 * (Math.random() - 0.5)), i * 2);
  return b;
}

await prueba("el .wav lleva su cabecera de 44 bytes, mono, 16 bits, a su frecuencia", () => {
  const pcm = pcmCon(55);
  const w = wavDe(pcm, 8000);
  assert.equal(w.toString("ascii", 0, 4), "RIFF");
  assert.equal(w.toString("ascii", 8, 12), "WAVE");
  assert.equal(w.readUInt16LE(22), 1);
  assert.equal(w.readUInt32LE(24), 8000);
  assert.equal(w.readUInt16LE(34), 16);
  assert.equal(w.readUInt32LE(40), pcm.length);
  assert.equal(w.length, 44 + pcm.length);
});

await prueba("los picos encuentran el encendido de un motor a 1.650 RPM (55 Hz)", () => {
  const p = picos(muestrasDe(pcmCon(55)), 8000, { desde: 20, hasta: 400 });
  assert.ok(Math.abs(p[0].hz - 55) < 1, `dio ${p[0].hz}`);
  assert.ok(p[0].veces > 10);
});

await prueba("el acelerómetro: cuatro float32 por muestra, sin ejes queda vacío en el .csv", () => {
  const b = Buffer.alloc(32);
  b.writeFloatLE(9.8, 0); b.writeFloatLE(0.1, 4); b.writeFloatLE(0.2, 8); b.writeFloatLE(9.7, 12);
  b.writeFloatLE(9.9, 16); b.writeFloatLE(NaN, 20); b.writeFloatLE(NaN, 24); b.writeFloatLE(NaN, 28);
  const v = vibracionDe(b);
  assert.equal(v.length, 2);
  const csv = csvDeVibracion(v, 200).trim().split("\n");
  assert.equal(csv[0], "s,modulo,x,y,z");
  assert.match(csv[1], /^0\.0000,9\.80000,0\.10000,0\.20000,9\.70000$/);
  assert.match(csv[2], /^0\.0050,9\.90000,,,$/);
});

await prueba("las esperadas son las de la APK: en 5.ª el motor da tres vueltas por vuelta de rueda", () => {
  const e = esperadas(80, 5);
  assert.ok(Math.abs(e["motor 1× (RPM/60)"] / e["rueda 3×"] - 1) < 0.005);
  // 80 km/h en 5.ª, con la vuelta medida: unas 1.650 RPM → encendido a ~55 Hz.
  assert.ok(Math.abs(e["encendido (RPM/30)"] - (80 / 3.6 / VUELTA_M) * DIFERENCIAL * CAJA[4] * 2) < 0.01);
  assert.equal(esperadas(80, null)["motor 1× (RPM/60)"], undefined);
  assert.deepEqual(esperadas(null, 5), {});
});

await prueba("a la IA: el .wav en base64, el modelo del cupo gratis, y que no transcriba voces", () => {
  const p = pedidoIA("UklGRg==", { kmh: 80, marcha: 5, motivo: "a mano" });
  assert.equal(p.model, "gemini-2.5-flash-lite");
  assert.equal(p.messages[0].content[0].source.media_type, "audio/wav");
  assert.match(p.messages[0].content[1].text, /no la transcribas/);
  assert.match(p.messages[0].content[1].text, /80 km\/h en 5\.ª/);
});

console.log(`\n  ${pasadas} pasaron · ${fallidas} fallaron\n`);
if (fallidas) process.exit(1);
