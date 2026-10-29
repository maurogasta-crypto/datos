// pruebas/herramientas/charla.mjs — Banco de la lectura de la charla de las
// Pizarras (herramientas/charla.mjs, charla-1). Sin npm ni red.
//   node pruebas/herramientas/charla.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditarSalud, alDia, conNombresDeHoy, esParaAparato, destinoDe, renglonMensaje, filtrar, pedidoTranscripcion, transcribir, leerVisto, anotarVisto, PROXY, TOPE_TRANSCRIPCIONES,
         pareceDePrueba, paraLimpiar, piezasDe, anotarLimpieza } from "../../herramientas/charla.mjs";

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
await prueba("fuera de «limpiar» el código no escribe en la base, y nunca guarda transcripciones", () => {
  const src = fs.readFileSync(new URL("../../herramientas/charla.mjs", import.meta.url), "utf8");
  // charla-4: el gestor borra, y sólo adentro de su bloque (que pide --autorizado).
  const ini = src.indexOf('if (cmd === "limpiar" || cmd === "limpiar-llamadas") {');
  const fin = src.indexOf('if (cmd !== "leer" && cmd !== "nuevos") {');
  assert.ok(ini > 0 && fin > ini);
  assert.ok(!/F\.(escribir|fusionar|borrar|crearNuevo|fusionarRutas)\(/.test(src.slice(0, ini) + src.slice(fin)));
  assert.ok(!/F\.(escribir|crearNuevo|fusionarRutas)\(/.test(src.slice(ini, fin)), "limpiar sólo borra (y deja la marca)");
  assert.ok(!/writeFileSync\([^)]*tr\b/.test(src));
});

// charla-4: el gestor de la charla (reglas v23 de Tiempos).
const L = [
  { id: "a", creadoEn: "2026-10-24T10:00:00Z", nombre: "Mauro", dispositivo: "Redmi 15", texto: "Prueba de mensaje" },
  { id: "b", creadoEn: "2026-10-25T10:00:00Z", nombre: "Florencia", dispositivo: "A15 de Florencia", texto: "Mañana busco a los chicos a las 18" },
  { id: "c", creadoEn: "2026-10-26T10:00:00Z", nombre: "Mauro", dispositivo: "Redmi Note 9", texto: "🎙 Mensaje de voz (0:02)", audio: "au1", dur: 2 },
  { id: "d", creadoEn: "2026-10-27T10:00:00Z", nombre: "Mauro", dispositivo: "Redmi 15", texto: "📎 plano.pdf", archivo: "ar1", partes: 3 },
  { id: "e", creadoEn: "2026-10-28T10:00:00Z", nombre: "Florencia", dispositivo: "A15 de Florencia", texto: "Hola" },
];
await prueba("parece de prueba: «prueba», «hola», un audio de 3 s o menos; un mensaje de verdad, no", () => {
  assert.deepEqual(L.filter(pareceDePrueba).map((m) => m.id), ["a", "c", "e"]);
  assert.ok(!pareceDePrueba({ texto: "🎙 Mensaje de voz (0:12)", audio: "x", dur: 12 }));
  assert.ok(pareceDePrueba({ texto: "Prueba del enlace" }));
});
await prueba("los filtros de limpiar: fechas, aparato, persona, texto, audios, archivos, ids; del más viejo al más nuevo", () => {
  assert.deepEqual(paraLimpiar(L).map((m) => m.id), ["a", "b", "c", "d", "e"]);
  assert.deepEqual(paraLimpiar(L, { desde: "2026-10-26", hasta: "2026-10-28" }).map((m) => m.id), ["c", "d"]);
  assert.deepEqual(paraLimpiar(L, { dispositivo: "redmi 15" }).map((m) => m.id), ["a", "d"]);
  assert.deepEqual(paraLimpiar(L, { de: "flor" }).map((m) => m.id), ["b", "e"]);
  assert.deepEqual(paraLimpiar(L, { texto: "^hola$" }).map((m) => m.id), ["e"]);
  assert.deepEqual(paraLimpiar(L, { soloAudios: true }).map((m) => m.id), ["c"]);
  assert.deepEqual(paraLimpiar(L, { soloArchivos: true }).map((m) => m.id), ["d"]);
  assert.deepEqual(paraLimpiar(L, { ids: ["e", "b"] }).map((m) => m.id), ["b", "e"]);
  assert.deepEqual(paraLimpiar(L, { pruebas: true, de: "mauro" }).map((m) => m.id), ["a", "c"]);
});
await prueba("con un mensaje se van su audio y CADA parte de su archivo", () => {
  assert.deepEqual(piezasDe(L[2]), [["audios", "au1"]]);
  assert.deepEqual(piezasDe(L[3]), [["archivos", "ar1-0"], ["archivos", "ar1-1"], ["archivos", "ar1-2"]]);
  assert.deepEqual(piezasDe(L[0]), []);
});
await prueba("la limpieza queda anotada con ids y autorización, nunca el texto", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bodega-"));
  anotarLimpieza(dir, { que: "mensajes", autorizado: "Mauro, 28-oct: sí, borrá todo", ids: ["a", "c"], piezas: 1 }, new Date("2026-10-28T15:00:00Z"));
  const l = JSON.parse(fs.readFileSync(path.join(dir, "charla", "limpiezas.json"), "utf8"));
  assert.equal(l.length, 1); assert.deepEqual(l[0].ids, ["a", "c"]); assert.equal(l[0].cuantos, 2);
  assert.ok(!JSON.stringify(l).includes("Prueba de mensaje"));
  fs.rmSync(dir, { recursive: true });
});
await prueba("borrar pide --autorizado: sin eso, la herramienta no borra", () => {
  const src = fs.readFileSync(new URL("../../herramientas/charla.mjs", import.meta.url), "utf8");
  assert.match(src, /if \(borrarlo && !autorizado\.trim\(\)\)/);
  assert.match(src, /limpiadoEn: new Date\(\)\.toISOString\(\)/, "deja la marca que miran las Pizarras");
});

// charla-5: la salud de la charla (pizarra-78, reglas v24).
const AHORA = Date.parse("2026-10-28T18:00:00Z");
const M = [
  { id: "m1", de: "flor", nombre: "Florencia", dispositivo: "A15", creadoEn: "2026-10-28T12:00:00Z", texto: "hola" },
  { id: "m2", de: "flor", nombre: "Florencia", dispositivo: "A15", creadoEn: "2026-10-28T13:00:00Z", texto: "", audio: "au2", handy: true, para: "mauro|Redmi" },
  { id: "m3", de: "flor", nombre: "Florencia", dispositivo: "A15", creadoEn: "2026-10-28T14:00:00Z", archivo: "ar3", partes: 2, nombreArchivo: "plano.pdf" },
  { id: "m4", de: "flor", nombre: "Florencia", dispositivo: "A15", creadoEn: "2026-10-28T17:55:00Z", texto: "recién" },
  { id: "m5", de: "flor", nombre: "Florencia", dispositivo: "A15", creadoEn: "2026-10-28T15:00:00Z", texto: "a otra persona", para: "otra|X" },
  { id: "m6", de: "mauro", nombre: "Mauro", dispositivo: "Redmi", creadoEn: "2026-10-28T15:30:00Z", texto: "mío" },
];
const parte = { de: "mauro", dispositivo: "Redmi", sello: "pizarra-78", actualizado: "2026-10-28T17:58:00Z", charlaHasta: "2026-10-28T17:55:00Z",
  recibidos: ["m1", "m3"], eventos: ["enlace: se cortó con A15 (wifi, sin latido)", "mensajes: al día"],
  contadores: { "voz.rondasMandadas": 5, "voz.acuse.escucho": 3, "voz.trozosPerdidos": 2, "voz.rondasOidas": 4 } };
await prueba("salud: es para el aparato igual que esParaMi de la Pizarra", () => {
  assert.ok(esParaAparato({ para: "" }, "mauro", "Redmi"));
  assert.ok(esParaAparato({ para: "mauro|Redmi" }, "mauro", "Redmi"));
  assert.ok(esParaAparato({ para: "mauro|13C", de: "flor" }, "mauro", "Redmi"));
  assert.ok(!esParaAparato({ para: "mauro|13C", de: "mauro" }, "mauro", "Redmi"));
  assert.ok(!esParaAparato({ para: "flor|A15" }, "mauro", "Redmi"));
});
await prueba("salud: dice qué no llegó (y no lo recién mandado, lo de otro, ni lo propio), el audio que falta y el archivo partido", () => {
  const r = auditarSalud({ mensajes: M, audios: new Set(), archivos: new Set(["ar3-0"]), partes: [parte], ahora: AHORA });
  const de = (t) => r.problemas.filter((p) => p.tipo === t).map((p) => p.texto);
  assert.equal(de("no-llego").length, 1); assert.match(de("no-llego")[0], /\[m2\]/); assert.match(de("no-llego")[0], /handy/);
  assert.match(de("falta-audio")[0], /\[m2\]/);
  assert.match(de("archivo-incompleto")[0], /sin 1 de 2/);
  assert.ok(!r.problemas.some((p) => /\[m4\]|\[m5\]|\[m6\]/.test(p.texto)));
});
await prueba("salud: el handy cerca (trozos perdidos, rondas sin acuse), el parte viejo y la llamada colgada", () => {
  const viejo = { ...parte, actualizado: "2026-10-28T04:00:00Z" };
  // De noche un parte de 9 h es lo normal (las Pizarras no suben de 23 a 8): no se marca.
  assert.ok(!auditarSalud({ mensajes: [], partes: [{ ...parte, actualizado: "2026-10-28T09:00:00Z" }], ahora: AHORA }).problemas.some((p) => p.tipo === "parte-viejo"));
  const r = auditarSalud({ mensajes: M, audios: new Set(["au2"]), archivos: new Set(["ar3-0", "ar3-1"]), partes: [viejo], ahora: AHORA,
    llamadas: [{ estado: "llamando", creadoEn: "2026-10-28T17:00:00Z", nombre: "Florencia", dispositivo: "A15", para: "mauro|Redmi" },
               { estado: "cortada", creadoEn: "2026-10-28T17:00:00Z" }] });
  const t = r.problemas.map((p) => p.texto).join("\n");
  assert.match(t, /2 trozo\(s\) de voz cerca no llegaron/);
  assert.match(t, /2 de 5 ronda\(s\) que habló no tuvieron acuse/);
  assert.match(t, /hace 14 h/);
  assert.equal(r.problemas.filter((p) => p.tipo === "llamada-colgada").length, 1);
  assert.deepEqual(r.aparatos[0].eventos, ["enlace: se cortó con A15 (wifi, sin latido)"]);
});
await prueba("salud: los teléfonos que cambiaron de nombre (pizarra-80) se auditan con el nombre de hoy", () => {
  const ren = { "U1|Redmi 13C": "13C", "U1|A": "B", "U1|B": "C" };
  assert.equal(alDia("U1|Redmi 13C", ren), "U1|13C");
  assert.equal(alDia("U1|A", ren), "U1|C");
  assert.equal(alDia("U2|Redmi 13C", ren), "U2|Redmi 13C");
  assert.equal(alDia("U1|*", ren), "U1|*");
  const h = conNombresDeHoy({ mensajes: [{ id: "m", de: "U1", dispositivo: "Redmi Note 9", para: "U1|Redmi 13C" }],
    partes: [{ de: "U1", dispositivo: "Redmi 13C" }, { de: "U1", dispositivo: "13C" }] }, ren);
  assert.equal(h.mensajes[0].para, "U1|13C");
  assert.deepEqual(h.partes.map((p) => p.dispositivo), ["13C"]);
});
await prueba("salud: lee y no escribe", () => {
  const src = fs.readFileSync(new URL("../../herramientas/charla.mjs", import.meta.url), "utf8");
  const b = src.slice(src.indexOf('if (cmd === "salud")'), src.indexOf('if (cmd !== "leer"'));
  assert.doesNotMatch(b, /F\.(borrar|escribir|fusionar|crear)/);
  assert.match(b, /F\.listar\(t, ses, "audios", false, \["de"\]\)/, "los audios sin bajar sus bytes");
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
