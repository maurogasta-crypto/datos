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

/* ── Jugar hoy (roli-js-3): dinámicas de equipo, no de competencia ── */
t("las rondas usan sólo palabras de su nivel, y lo que depende de los ojos va marcado y es sólo el bonus", () => {
  for (const d of R.DINAMICAS) for (const r of d.rondas) {
    for (const p of r.pasos) for (const l of p.escribi || []) {
      const w = R.palabraDe(l), n = R.NIVEL_DE[w];
      assert.ok(n, `${d.id}/${r.id}: «${l}» no es una palabra de Roli`);
      assert.ok(n <= r.nivel, `${d.id}/${r.id} (nivel ${r.nivel}) usa «${w}», que llega en el nivel ${n}`);
    }
    assert.ok(r.pasos.length >= 2 && r.que && r.logro && r.minutos, r.id);
    if (r.nivel >= 5) assert.ok(r.ojos, `${r.id}: usa los ojos y no lo avisa`);
  }
  assert.ok(R.DINAMICAS[0].rondas.every((r) => r.ojos || r.nivel <= 4));
  assert.ok(R.DINAMICAS[0].rondas.filter((r) => r.ojos).length === 1);
});
t("es colaborativa: ninguna ronda se hace solo, todas reparten roles que se necesitan, y no hay puntos por persona ni podio", () => {
  for (const d of R.DINAMICAS) {
    for (const r of d.rondas) { assert.ok(r.roles.length >= 2, `${r.id}: una ronda necesita al menos dos roles`); assert.equal(new Set(r.roles.map((x) => x.id)).size, r.roles.length); for (const ro of r.roles) assert.ok(ro.nombre && ro.hace && ro.ic, r.id); }
    assert.ok(d.rondas.some((r) => r.roles.some((x) => x.id === "operador")) && d.rondas.some((r) => r.roles.some((x) => x.id === "terreno")), "falta quien escribe o quien prepara el terreno");
    assert.ok(d.rondas.some((r) => r.roles.some((x) => x.id === "acelerador")) && d.rondas.some((r) => r.roles.some((x) => x.id === "direccion")), "falta la ronda donde dos personas controlan dos aspectos de Roli");
    assert.ok(d.metaEstrellas > 0 && d.metaEstrellas <= R.totalEstrellas({}, d.rondas).max);
  }
  const fuente = fs.readFileSync(path.join(raiz, "roli.js"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "") + fs.readFileSync(path.join(raiz, "roli.html"), "utf8").replace(/<!--[\s\S]*?-->/g, "");
  assert.doesNotMatch(fuente, /podio|ganador|ganá|gana quien|posiciones|puntosPorDistancia/i, "quedó algo de la competencia");
});
t("las estrellas: menos intentos, más estrellas; si no se logró, cero; nunca resta", () => {
  assert.equal(R.estrellasPorIntentos(1), 3); assert.equal(R.estrellasPorIntentos(2), 2); assert.equal(R.estrellasPorIntentos(3), 1); assert.equal(R.estrellasPorIntentos(9), 1);
  assert.equal(R.estrellasPorIntentos(1, false), 0); assert.equal(R.estrellasPorIntentos(""), 0); assert.equal(R.estrellasPorIntentos("x"), 0); assert.equal(R.estrellasPorIntentos(0), 0); assert.equal(R.estrellasPorIntentos(-2), 0);
});
t("el total del equipo: suma las rondas, el bonus suma pero no entra en el máximo", () => {
  const rs = R.DINAMICAS[0].rondas, est = { despierta: { intentos: 1, logrado: true }, guia: { intentos: 2, logrado: true }, solo: { intentos: 1, logrado: true } };
  const tt = R.totalEstrellas(est, rs);
  assert.equal(tt.total, 3 + 2 + 3); assert.equal(tt.max, 12);
  assert.deepEqual(R.totalEstrellas({}, rs), { total: 0, max: 12 });
});
t("el mensaje al equipo es siempre en plural y para adelante (nunca reproche)", () => {
  for (const [a, b, c] of [[0, 12, 8], [3, 12, 8], [8, 12, 8], [12, 12, 8]]) {
    const m = R.mensajeDeEquipo(a, b, c); assert.ok(m.length > 10); assert.doesNotMatch(m, /perdi|fall|mal\b|no lograron/i);
  }
  assert.match(R.mensajeDeEquipo(8, 12, 8), /Lo logramos/); assert.match(R.mensajeDeEquipo(12, 12, 8), /todas/);
});
t("los roles rotan de a uno por ronda y todos hacen de todo; con menos personas que roles, a alguien le tocan dos", () => {
  const roles = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const r0 = R.asignarRoles(["Ana", "Beto", "Cami"], roles, 0), r1 = R.asignarRoles(["Ana", "Beto", "Cami"], roles, 1), r3 = R.asignarRoles(["Ana", "Beto", "Cami"], roles, 3);
  assert.deepEqual(r0.map((x) => x.persona), ["Ana", "Beto", "Cami"]); assert.deepEqual(r1.map((x) => x.persona), ["Beto", "Cami", "Ana"]); assert.deepEqual(r3, r0);
  const quien = (rol) => new Set([0, 1, 2].map((i) => R.asignarRoles(["Ana", "Beto", "Cami"], roles, i).find((x) => x.rol === rol).persona));
  assert.ok(["a", "b", "c"].every((rol) => quien(rol).size === 3), "cada persona hace cada rol una vez");
  const dos = R.asignarRoles(["Ana", "Beto"], roles, 0); assert.equal(dos.length, 3); assert.ok(dos.every((x) => ["Ana", "Beto"].includes(x.persona)));
  assert.deepEqual(R.asignarRoles([], roles, 0), []); assert.deepEqual(R.asignarRoles(["", "  "], roles, 0), []); assert.equal(R.asignarRoles(["Ana"], roles, -1).length, 3);
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
  assert.equal(R.dinamicaDe("2026-11-14").id, "mision-equipo");
});
console.log(`\n${ok} pasadas, ${mal} fallidas`); process.exit(mal ? 1 : 0);
