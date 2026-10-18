// Banco de herramientas/latido.mjs — sin red ni npm:  node pruebas/herramientas/latido.mjs
import assert from "node:assert/strict";
import { controlar } from "../../herramientas/latido.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const H = 36e5, AHORA = Date.parse("2026-10-18T20:00:00Z");
const iso = (ms) => new Date(ms).toISOString();
const bueno = { ultimo: iso(AHORA - 2 * H), desde: "pizarra-39", telefono: "Xiaomi 23100RN82L", escucha: { conectado: iso(AHORA - 9 * H), ultima: iso(AHORA - 3 * H), hoy: 40 } };

prueba("todo bien: ok, y dice por qué", () => {
  const r = controlar(bueno, AHORA);
  assert.equal(r.ok, true);
  assert.equal(r.lineas.length, 3);
});
prueba("sin latido, viejo, con falla u de otro teléfono: avisa", () => {
  assert.equal(controlar(null, AHORA).ok, false);
  assert.match(controlar({ ...bueno, ultimo: iso(AHORA - 9 * H) }, AHORA).lineas.join(), /hace 9 h/);
  assert.match(controlar({ ...bueno, falla: "Android no deja" }, AHORA).lineas.join(), /NO puede leer/);
  assert.match(controlar({ ...bueno, telefono: "Xiaomi 2404APC5FG" }, AHORA).lineas.join(), /no es el 13C/);
});
prueba("con permiso pero sin escuchar: es el caso que el permiso solo no ve", () => {
  const r = controlar({ ...bueno, escucha: { ...bueno.escucha, ultima: iso(AHORA - 20 * H) } }, AHORA);
  assert.equal(r.ok, false);
  assert.match(r.lineas.join(), /desconectado/);
  assert.match(controlar({ ...bueno, escucha: { conectado: "", ultima: "", hoy: 0 } }, AHORA).lineas.join(), /nunca vio/);
});
prueba("una Pizarra vieja, sin escucha ni teléfono, también se dice", () => {
  const r = controlar({ ultimo: iso(AHORA - H), desde: "pizarra-37" }, AHORA);
  assert.equal(r.ok, false);
  assert.equal(r.lineas.filter((x) => x.startsWith("⚠")).length, 2);
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
