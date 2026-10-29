// pruebas/ojos.mjs — el banco de ojos.js (general:C7, 29-oct-2026).
// El ojo 👁 es UNA copia para los cinco sitios: si se rompe acá, se rompe en
// todos a la vez. Corre en un DOM de verdad (jsdom, el de pruebas/panel).
//   node pruebas/ojos.mjs      (pruebas/panel necesita su npm install, una vez)
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aca, "..");
let pasadas = 0, fallidas = 0;
const prueba = async (n, f) => { try { await f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

const require = createRequire(path.join(aca, "panel", "package.json"));
let JSDOM;
try { ({ JSDOM } = require("jsdom")); } catch { console.log("  falta jsdom: cd pruebas/panel && npm install"); process.exit(1); }
const dom = new JSDOM(`<!doctype html><body><form><label>Mail <input type="email"></label><label>Clave <input id="c" type="password"></label></form></body>`);
Object.assign(globalThis, { document: dom.window.document, MutationObserver: dom.window.MutationObserver });
const ojos = await import(path.join(raiz, "ojos.js"));
const doc = dom.window.document;
const tic = () => new Promise((r) => setTimeout(r, 0));

await prueba("pone el ojo en la contraseña, y no en el mail", () => {
  const c = doc.getElementById("c");
  assert.equal(c.dataset.ojo, "1");
  const b = c.parentNode.querySelector("button.ojo-clave");
  assert.ok(b, "sin botón");
  assert.equal(b.type, "button", "un botón submit mandaría el formulario");
  assert.equal(b.textContent, "👁");
  assert.equal(doc.querySelectorAll("button.ojo-clave").length, 1);
});
await prueba("tocarlo muestra y vuelve a ocultar, con su etiqueta", () => {
  const c = doc.getElementById("c"), b = c.parentNode.querySelector("button");
  b.click(); assert.equal(c.type, "text"); assert.equal(b.textContent, "🙈"); assert.match(b.getAttribute("aria-label"), /Ocultar/);
  b.click(); assert.equal(c.type, "password"); assert.match(b.title, /Mostrar/);
});
await prueba("una contraseña que aparece después también lo recibe", async () => {
  const i = doc.createElement("input"); i.type = "password"; doc.body.append(i);
  await tic();
  assert.equal(i.dataset.ojo, "1");
  assert.equal(doc.querySelectorAll("button.ojo-clave").length, 2);
});
await prueba("pedirlo dos veces no pone dos ojos", async () => {
  ojos.ojosEnClaves(); await tic();
  assert.equal(doc.querySelectorAll("button.ojo-clave").length, 2);
  assert.equal(globalThis.__ojosEnClaves, true);
});
await prueba("tiene sello", () => { assert.match(ojos.VERSION, /^ojos-\d+$/); });

// Los sitios que estén al lado (/home/user/<repo>) no tienen su copia y lo piden diferido.
const SITIOS = [["casaverdecanas", "interno/nucleo.js"], ["CasaYourte", "nucleo.js"], ["remate", "interno/utils.js"], ["tiempos", "app.js"]];
await prueba("ningún sitio tiene su copia, y lo piden con import() y catch", () => {
  let vistos = 0;
  for (const [repo, arch] of SITIOS) {
    const f = path.join(raiz, "..", repo, arch);
    if (!fs.existsSync(f)) continue;
    vistos++;
    const s = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(s, /function ojosEnClaves/, `${repo}/${arch} todavía tiene su copia`);
    assert.match(s, /import\("https:\/\/maurogasta-crypto\.github\.io\/datos\/ojos\.js"\)\.catch\(/, `${repo}/${arch} no lo pide diferido`);
    assert.doesNotMatch(s, /^import[^(]*ojos\.js/m, `${repo}/${arch}: un import estático deja la página en blanco si no baja`);
  }
  const p = fs.readFileSync(path.join(raiz, "nucleo.js"), "utf8");
  assert.doesNotMatch(p, /function ojosEnClaves/); assert.match(p, /import\("\.\/ojos\.js"\)\.catch\(/);
  if (!vistos) console.log("      (ningún sitio al lado: sólo se revisó el panel)");
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
