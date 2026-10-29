// pruebas/callmebot.mjs — el banco de callmebot.js (general:C7, 29-oct-2026).
// La lectura de la respuesta de CallMeBot es UNA copia para Casa Verde,
// CasaYourte, remate y herramientas/avisos.mjs: si se equivoca acá, una cuenta
// en pausa se lee como «mandado» en los cuatro.   node pruebas/callmebot.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { leerRespuestaWa, taparNumeros, VERSION } from "../callmebot.js";

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aca, "..");
let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

// Respuestas inventadas con la forma de las de CallMeBot (ningún número real).
prueba("un 200 con la cuenta en pausa NO es un envío, y dice a qué número del BOT escribir", () => {
  const r = leerRespuestaWa('<p style="color:red">Your account is paused. Send resume to +34 600 00 00 00</p>');
  assert.equal(r.ok, false); assert.equal(r.motivo, "pausada");
  assert.match(r.detalle, /resume/); assert.match(r.detalle, /\+34 600 00 00 00/);
});
prueba("clave mala, sin alta, límite y rojo genérico, cada uno con su motivo", () => {
  assert.equal(leerRespuestaWa("APIKey is not valid").motivo, "clave");
  assert.equal(leerRespuestaWa("apikey missing").motivo, "clave");
  assert.equal(leerRespuestaWa("Phone not registered").motivo, "sin_alta");
  assert.equal(leerRespuestaWa("Too many requests").motivo, "limite");
  assert.equal(leerRespuestaWa('<b style="color:red">algo raro</b>').motivo, "rechazado");
});
prueba("lo que salió bien es ok, sin etiquetas, y con el número de la PERSONA tapado", () => {
  const r = leerRespuestaWa("<p>Message to: +55 48 9999-0000</p> Text to send: hola. Message queued.");
  assert.equal(r.ok, true); assert.equal(r.motivo, "");
  assert.doesNotMatch(r.detalle, /<|9999/); assert.match(r.detalle, /…000/);
});
prueba("vacío o basura no revienta y no se lee como error", () => {
  assert.equal(leerRespuestaWa("").ok, true); assert.equal(leerRespuestaWa(null).ok, true);
  assert.ok(leerRespuestaWa("x".repeat(5000)).detalle.length <= 240);
});
prueba("taparNumeros deja fechas y horas cortas, y tapa los largos", () => {
  assert.equal(taparNumeros("el 29/10 a las 10:20"), "el 29/10 a las 10:20");
  assert.equal(taparNumeros("al 099123456"), "al …456");
});
prueba("tiene sello", () => { assert.match(VERSION, /^callmebot-\d+$/); });

const SITIOS = [["casaverdecanas", "interno/nucleo.js"], ["CasaYourte", "nucleo.js"], ["remate", "interno/utils.js"]];
prueba("ningún sitio de al lado tiene su copia: la piden diferida, con catch y sin inventar un «salió bien»", () => {
  let vistos = 0;
  for (const [repo, arch] of SITIOS) {
    const f = path.join(raiz, "..", repo, arch);
    if (!fs.existsSync(f)) continue;
    vistos++;
    const s = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(s, /color:red/, `${repo}/${arch} todavía lee la respuesta por su cuenta`);
    assert.match(s, /await import\(['"]https:\/\/maurogasta-crypto\.github\.io\/datos\/callmebot\.js['"]\)/, `${repo}/${arch} no la pide`);
    assert.match(s, /motivo: ['"]sin_leer['"]/, `${repo}/${arch}: sin el archivo tiene que decir que no pudo leer`);
    assert.doesNotMatch(s, /=\s*(CV2\._leerRespuestaWa|CY\.leerRespuestaWa|leerRespuestaWa)\(/, `${repo}/${arch}: falta un await`);
  }
  const av = fs.readFileSync(path.join(raiz, "herramientas", "avisos.mjs"), "utf8");
  assert.match(av, /from "\.\.\/callmebot\.js"/); assert.doesNotMatch(av, /color:red/);
  if (!vistos) console.log("      (ningún sitio al lado: sólo se revisó la herramienta)");
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
