// pruebas/herramientas/charla.mjs — Banco de la lectura de la charla de las
// Pizarras (herramientas/charla.mjs, charla-1). Sin npm ni red.
//   node pruebas/herramientas/charla.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { destinoDe, renglonMensaje, filtrar, pedidoTranscripcion, transcribir, leerVisto, anotarVisto, PROXY, TOPE_TRANSCRIPCIONES } from "../../herramientas/charla.mjs";

let pasadas = 0, fallidas = 0;
const prueba = async (n, f) => { try { await f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const nombres = { yo: "Mauro", flor: "Florencia" };

await prueba("a quién va: todos, una persona entera o un teléfono", () => {
  assert.equal(destinoDe("", nombres), "todos");
  assert.equal(destinoDe("flor|*", nombres), "Florencia");
  assert.equal(destinoDe("yo|Redmi 13C", nombres), "Mauro · Redmi 13C");
});
await prueba("un audio se lee por su transcripción; sin ella lo dice", () => {
  const m = { id: "m1", de: "yo", nombre: "Mauro", dispositivo: "Redmi 15", texto: "🎙 Mensaje de voz (0:12)", creadoEn: "2026-10-24T18:00:00Z", para: "flor|*", audio: "a1", dur: 72 };
  assert.match(renglonMensaje(m, nombres, "hola, armemos la agenda"), /🎙 \(1:12\) «hola, armemos la agenda»/);
  assert.match(renglonMensaje(m, nombres), /\(sin transcribir\)/);
  assert.match(renglonMensaje(m, nombres), /Mauro · Redmi 15 → Florencia/);
});
await prueba("un archivo se muestra por su nombre, con cómo bajarlo para mirarlo", () => {
  const m = { id: "m2", de: "flor", nombre: "Florencia", dispositivo: "A15", texto: "📎 plano.pdf (1,2 MB)", creadoEn: "2026-10-24T18:00:00Z", para: "yo|*", archivo: "f1", nombreArchivo: "plano.pdf", partes: 2 };
  assert.match(renglonMensaje(m, nombres), /📎 plano\.pdf \(2 partes\) · para verlo: bajar f1/);
});
await prueba("filtra por días o desde lo ya revisado, los más viejos primero", () => {
  const ahora = Date.parse("2026-10-24T20:00:00Z");
  const l = [{ id: "b", creadoEn: "2026-10-24T19:00:00Z" }, { id: "a", creadoEn: "2026-10-24T10:00:00Z" }, { id: "v", creadoEn: "2026-10-10T10:00:00Z" }];
  assert.deepEqual(filtrar(l, { dias: 2, ahora }).map((m) => m.id), ["a", "b"]);
  assert.deepEqual(filtrar(l, { desde: "2026-10-24T12:00:00Z", ahora }).map((m) => m.id), ["b"]);
});
await prueba("el pedido a la IA lleva el audio en base64 con su tipo, y sólo pide la transcripción", async () => {
  const p = pedidoTranscripcion("QUJD", "audio/ogg");
  assert.equal(p.messages[0].content[0].source.media_type, "audio/ogg");
  assert.equal(p.messages[0].content[0].source.data, "QUJD");
  // § 13 de PROTOCOLO-DESARROLLO: el modelo del cupo gratis más amplio, y un tope por corrida.
  assert.equal(p.model, "gemini-2.5-flash-lite");
  assert.ok(TOPE_TRANSCRIPCIONES > 0 && TOPE_TRANSCRIPCIONES <= 50);
  let url = "";
  const t = await transcribir("QUJD", "audio/ogg", async (u) => { url = u; return { ok: true, json: async () => ({ content: [{ type: "text", text: " hola " }] }) }; });
  assert.equal(t, "hola"); assert.equal(url, PROXY);
  await assert.rejects(transcribir("x", "audio/ogg", async () => ({ ok: false, status: 500, json: async () => ({ error: "Gemini no" }) })), /Gemini no/);
});
await prueba("en la bodega queda SÓLO hasta cuándo se revisó, ni una palabra de lo dicho", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "charla-"));
  assert.equal(leerVisto(d), "");
  anotarVisto(d, "2026-10-24T20:00:00Z");
  assert.equal(leerVisto(d), "2026-10-24T20:00:00Z");
  assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(d, "charla", "visto.json"), "utf8"))), ["hasta"]);
});
await prueba("el código nunca escribe en la base ni guarda transcripciones", () => {
  const src = fs.readFileSync(new URL("../../herramientas/charla.mjs", import.meta.url), "utf8");
  assert.ok(!/F\.(escribir|fusionar|borrar|crearNuevo|fusionarRutas)\(/.test(src));
  assert.ok(!/writeFileSync\([^)]*tr\b/.test(src));
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
