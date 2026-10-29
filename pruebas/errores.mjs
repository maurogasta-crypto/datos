// pruebas/errores.mjs — el banco de errores.js (general:C7, 29-oct-2026).
// La tabla de causas es UNA para los cinco sitios (PROTOCOLO-INTERFAZ § 7.2).
//   node pruebas/errores.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { explicar, CAUSAS, VERSION } from "../errores.js";

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aca, "..");
let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

prueba("un código conocido da la causa en castellano, con el código al final para buscarlo", () => {
  const t = explicar({ code: "permission-denied", message: "Missing or insufficient permissions." });
  assert.match(t, /reglas/); assert.match(t, / · permission-denied$/);
  assert.match(explicar({ code: "auth/invalid-credential" }), /mail o la contraseña/);
});
prueba("las causas PROPIAS de un sitio ganan sobre las comunes", () => {
  assert.equal(explicar({ code: "permission-denied" }, { "permission-denied": "Mirá «La puerta»." }), "Mirá «La puerta». · permission-denied");
  assert.match(explicar({ code: "unavailable" }, { "permission-denied": "x" }), /red/);
});
prueba("sin código: la base no creada y la red se reconocen por el mensaje", () => {
  assert.match(explicar({ message: "Cloud Firestore API has not been used in project" }), /no está creada/);
  assert.match(explicar(new TypeError("Failed to fetch")), /red/);
});
prueba("lo desconocido no se inventa: queda el código, el mensaje o el texto", () => {
  assert.equal(explicar({ code: "algo/raro" }), "algo/raro");
  assert.equal(explicar({ message: "pasó otra cosa" }), "pasó otra cosa");
  assert.equal(explicar("texto suelto"), "texto suelto");
  assert.equal(explicar(null), "Error desconocido");
});
prueba("ninguna causa nombra un sitio: lo propio va en cada sitio", () => {
  for (const [c, t] of Object.entries(CAUSAS)) assert.doesNotMatch(t, /casayourte|casaverde|remate|tiempos|datos-830f8/i, c);
});
prueba("tiene sello", () => { assert.match(VERSION, /^errores-\d+$/); });

const SITIOS = [["casaverdecanas", "interno/nucleo.js"], ["CasaYourte", "nucleo.js"], ["remate", "interno/utils.js"], ["tiempos", "estado.js"]];
prueba("los sitios de al lado lo piden diferido al cargar, con catch y con un respaldo; el panel también", () => {
  let vistos = 0;
  for (const [repo, arch] of SITIOS) {
    const f = path.join(raiz, "..", repo, arch);
    if (!fs.existsSync(f)) continue;
    vistos++;
    const s = fs.readFileSync(f, "utf8");
    assert.match(s, /import\(['"]https:\/\/maurogasta-crypto\.github\.io\/datos\/errores\.js['"]\)\.then\([^)]*\)[^\n]*\.catch\(/, `${repo}/${arch} no lo pide diferido con catch`);
    assert.match(s, /(if \(_errores\) return|_errores \?) _errores\.explicar\(/,`${repo}/${arch}: sin respaldo para cuando no bajó`);
    assert.doesNotMatch(s, /^import[^(\n]*errores\.js/m, `${repo}/${arch}: un import estático deja la página en blanco si no baja`);
  }
  const p = fs.readFileSync(path.join(raiz, "nucleo.js"), "utf8");
  assert.match(p, /import\("\.\/errores\.js"\)/); assert.doesNotMatch(p, /const CAUSAS/);
  if (!vistos) console.log("      (ningún sitio al lado: sólo se revisó el panel)");
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
