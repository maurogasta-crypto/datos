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

/* ── Jugar hoy (roli-js-2) ── */
t("las rondas de la dinámica usan sólo palabras de su nivel, y lo que depende de los ojos va marcado", () => {
  for (const d of R.DINAMICAS) for (const r of d.rondas) {
    for (const p of r.pasos) for (const l of p.escribi || []) {
      const w = R.palabraDe(l), n = R.NIVEL_DE[w];
      assert.ok(n, `${d.id}/${r.id}: «${l}» no es una palabra de Roli`);
      assert.ok(n <= r.nivel, `${d.id}/${r.id} (nivel ${r.nivel}) usa «${w}», que llega en el nivel ${n}`);
    }
    if (r.nivel >= 5) assert.ok(r.ojos, `${r.id}: usa los ojos y no lo avisa`);
    assert.ok(r.pasos.length >= 2 && r.que && r.puntos && r.minutos, r.id);
    if (r.escala) assert.ok(R.ESCALA[r.escala], `${r.id}: escala inexistente`);
  }
});
t("lo que se juega hoy sin los ojos no los necesita (el bonus es lo único con ojos)", () => {
  const d = R.DINAMICAS[0];
  assert.ok(d.rondas.filter((r) => !r.ojos).length >= 4 && d.rondas.filter((r) => r.ojos).every((r) => r.id === "solo"));
  assert.ok(d.rondas.every((r) => r.ojos || r.nivel <= 4));
});
t("los puntos por distancia: la primera franja que alcanza, y lo vacío o roto no puntúa", () => {
  assert.equal(R.puntosPorDistancia(3, R.ESCALA.marca), 5);
  assert.equal(R.puntosPorDistancia(5, R.ESCALA.marca), 5);
  assert.equal(R.puntosPorDistancia(8, R.ESCALA.marca), 3);
  assert.equal(R.puntosPorDistancia(20, R.ESCALA.marca), 1);
  assert.equal(R.puntosPorDistancia(21, R.ESCALA.marca), 0);
  assert.equal(R.puntosPorDistancia("", R.ESCALA.marca), 0);
  assert.equal(R.puntosPorDistancia("abc", R.ESCALA.marca), 0);
  assert.equal(R.puntosPorDistancia(-4, R.ESCALA.marca), 0);
  assert.equal(R.puntosPorDistancia(20, R.ESCALA.cierre), 3);
  assert.equal(R.puntosPorDistancia(29, R.ESCALA.prediccion), 3);
  assert.equal(R.puntosPorDistancia(31, R.ESCALA.prediccion), 0);
});
t("la tabla: suma, ordena, comparte lugar en un empate y no cuenta puntos negativos", () => {
  const pos = R.posiciones(["A", "B", "C"], { A: { x: 3, y: 2 }, B: { x: 5 }, C: { x: 4, y: 1, z: "" } });
  assert.deepEqual(pos.map((f) => [f.jugador, f.total, f.lugar]), [["A", 5, 1], ["B", 5, 1], ["C", 5, 1]]);
  const p2 = R.posiciones(["A", "B"], { A: { x: -3, y: 2 }, B: { x: 1 } });
  assert.deepEqual(p2.map((f) => [f.jugador, f.total, f.lugar]), [["A", 2, 1], ["B", 1, 2]]);
  assert.deepEqual(R.posiciones(["A"], {}).map((f) => f.total), [0]);
});
t("las medidas para Mauro: dicen lo que hay, lo que falta, y no inventan", () => {
  const vacio = R.medidasParaMauro({}, "2026-11-14");
  assert.match(vacio, /sin medir/); assert.ok(!/ms por grado/.test(vacio));
  const t1 = R.medidasParaMauro({ velocidad: "150", segundosPorMetro: "2.2", giro90: "0.9", nota: "se desvía a la derecha" }, "2026-11-14");
  assert.match(t1, /velocidad 150, avanza 1 metro en 2\.2 s/); assert.match(t1, /≈ 10 ms por grado/); assert.match(t1, /lo confirma Mauro/); assert.match(t1, /se desvía/);
  assert.ok(!/NaN|undefined/.test(R.medidasParaMauro({ giro90: "x", segundosPorMetro: "-1" })));
});
t("la dinámica del día: la más reciente que no sea del futuro; si todas lo son, la primera", () => {
  const L = [{ id: "a", fecha: "2026-11-10" }, { id: "b", fecha: "2026-11-14" }, { id: "c", fecha: "2026-11-20" }];
  assert.equal(R.dinamicaDe("2026-11-14", L).id, "b"); assert.equal(R.dinamicaDe("2026-11-15", L).id, "b");
  assert.equal(R.dinamicaDe("2026-11-01", L).id, "a"); assert.equal(R.dinamicaDe("2026-12-01", L).id, "c");
  assert.equal(R.dinamicaDe("2026-11-14", []), null);
  assert.equal(R.dinamicaDe("2026-11-14").id, "gran-premio");
});
console.log(`\n${ok} pasadas, ${mal} fallidas`); process.exit(mal ? 1 : 0);
