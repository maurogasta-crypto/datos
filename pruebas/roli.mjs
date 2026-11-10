// pruebas/roli.mjs — el banco de la página de Roli (roli.js + roli.html). Sin npm ni red:  node pruebas/roli.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const R = await import(path.join(raiz, "roli.js"));
let ok = 0, mal = 0;
const t = (n, f) => { try { f(); ok++; console.log("  ✓ " + n); } catch (e) { mal++; console.log("  ✗ " + n + "\n      " + e.message); } };

t("cada actividad usa sólo palabras que existen en su nivel", () => {
  for (const a of R.ACTIVIDADES) for (const p of a.pasos) for (const l of p.escribi || []) {
    const w = R.palabraDe(l), n = R.NIVEL_DE[w];
    assert.ok(n, `${a.id}: «${l}» no es una palabra de Roli`);
    assert.ok(n <= a.nivel, `${a.id} (nivel ${a.nivel}) usa «${w}», que llega en el nivel ${n}`);
  }
});
t("ids únicos, pasos con texto, desafío y cosas; niveles del 1 al 6 cubiertos", () => {
  const ids = R.ACTIVIDADES.map((a) => a.id); assert.equal(new Set(ids).size, ids.length);
  for (const a of R.ACTIVIDADES) { assert.ok(a.pasos.length >= 2 && a.desafio && a.cosas.length, a.id); for (const p of a.pasos) assert.ok(p.t); }
  for (const n of R.NIVELES) assert.ok(R.ACTIVIDADES.some((a) => a.nivel === n.n), "nivel " + n.n);
});
t("el cuello y los dos sensores tienen actividad, y llevan el aviso de que se están ajustando", () => {
  const usa = (w, arg) => R.ACTIVIDADES.some((a) => a.pasos.some((p) => (p.escribi || []).some((l) => l.startsWith(w + (arg ? " " + arg : "")))));
  assert.ok(usa("mirar") && usa("escanear") && usa("distancia") && usa("distancia", "atras") && usa("proteccion") && usa("explorar") && usa("girar"));
  assert.ok(R.ACTIVIDADES.filter((a) => a.nivel >= 5).every((a) => a.ojos));
});
t("las compras: precios con rango, prioridades y total que descuenta lo que llegó", () => {
  for (const c of R.COMPRAS) { assert.ok(c.usd[0] > 0 && c.usd[0] <= c.usd[1], c.id); assert.ok(c.para && [1, 2, 3, 4].includes(c.prioridad)); }
  const t0 = R.totalCompras(), t1 = R.totalCompras(R.COMPRAS, { cargador: "llego" });
  assert.ok(t1.min < t0.min && t1.max < t0.max);
  assert.deepEqual(R.totalCompras([], {}), { min: 0, max: 0 });
});
t("la advertencia del MPU-6050 sobre A4 y la del encoder sobre el pin 3 siguen escritas", () => {
  assert.match(R.COMPRAS.find((c) => c.id === "mpu").ojo, /A4/);
  assert.match(R.COMPRAS.find((c) => c.id === "encoder").ojo, /pin 3|el 3/);
});
t("esc no deja pasar etiquetas", () => assert.equal(R.esc('<b a="1">&'), "&lt;b a=&quot;1&quot;&gt;&amp;"));
t("roli.js parsea como módulo, la página lo importa y no toca Firebase ni la red", () => {
  execFileSync(process.execPath, ["--input-type=module", "--check"], { input: fs.readFileSync(path.join(raiz, "roli.js")) });
  const html = fs.readFileSync(path.join(raiz, "roli.html"), "utf8");
  const mod = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
  execFileSync(process.execPath, ["--input-type=module", "--check"], { input: mod });
  assert.ok(html.includes('from "./roli.js"') || html.includes("import * as R from \"./roli.js\""));
  assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, "") + fs.readFileSync(path.join(raiz, "roli.js"), "utf8"), /firebase|gstatic|fetch\(|apiKey/i);
});
console.log(`\n${ok} pasadas, ${mal} fallidas`); process.exit(mal ? 1 : 0);
