// pruebas/esquema.mjs — el esquema de globos (esquema.js), sin navegador.
import assert from "node:assert/strict";
import { nodosDe, ubicar, svgEsquema, cajaDeAmpliar, renglones } from "../esquema.js";
let ok = 0, mal = 0;
const t = (n, f) => { try { f(); ok++; console.log("  ✓ " + n); } catch (e) { mal++; console.log("  ✗ " + n + "\n      " + e.message); } };
const es = { nodos: [
  { id: "inv", titulo: "Invitación", a: ["reg"] }, { id: "reg", titulo: "Registro", a: ["rol"], parte: "Las cuentas" },
  { id: "rol", titulo: "¿Qué rol tiene?", forma: "pregunta", a: ["alu", "doc"] },
  { id: "alu", titulo: "Alumno", sub: "practica en la app", a: ["base"] }, { id: "doc", titulo: "Docente", a: ["base"] },
  { id: "base", titulo: "La base", forma: "base" }, { id: "mal", titulo: "Flecha rota", a: ["nadie", "mal"] } ] };
t("los nodos limpian flechas a nadie y a sí mismo", () => assert.deepEqual(nodosDe(es).find((n) => n.id === "mal").a, []));
t("sin nodos, la línea se vuelve una cadena", () => {
  const n = nodosDe({ linea: ["A", "B", "C"], partes: [{ nombre: "B" }] });
  assert.deepEqual(n.map((x) => x.a), [["n1"], ["n2"], []]); assert.equal(n[1].parte, "B"); });
t("sin nada, no hay esquema", () => { assert.equal(nodosDe({}).length, 0); assert.equal(svgEsquema([]), ""); });
t("los niveles siguen las flechas", () => {
  const { pos } = ubicar(nodosDe(es));
  assert.ok(pos.get("inv").y < pos.get("reg").y && pos.get("reg").y < pos.get("rol").y);
  assert.equal(pos.get("alu").y, pos.get("doc").y); assert.ok(pos.get("base").y > pos.get("alu").y);
});
t("dos del mismo nivel no se pisan", () => { const { pos } = ubicar(nodosDe(es)); const a = pos.get("alu"), d = pos.get("doc");
  assert.ok(a.x + a.w <= d.x || d.x + d.w <= a.x); });
t("un ciclo no cuelga el cálculo", () => { const { pos } = ubicar(nodosDe({ nodos: [{ id: "a", titulo: "A", a: ["b"] }, { id: "b", titulo: "B", a: ["a"] }] })); assert.equal(pos.size, 2); });
t("el SVG trae un globo tocable por nodo y el texto escapado", () => {
  const s = svgEsquema(nodosDe({ nodos: [{ id: "x", titulo: "<b>hola</b>" }] }));
  assert.equal((s.match(/data-nodo=/g) || []).length, 1); assert.ok(!s.includes("<b>hola")); assert.ok(s.includes("&lt;b&gt;"));
});
t("las flechas son tantas como las conexiones válidas", () => assert.equal((svgEsquema(nodosDe(es)).match(/esq-flecha/g) || []).length, 6));
t("ampliar encuadra el globo y sus vecinos", () => {
  const n = nodosDe(es), c = cajaDeAmpliar(n, "rol"), { pos } = ubicar(n);
  for (const id of ["reg", "rol", "alu", "doc"]) { const p = pos.get(id); assert.ok(p.x >= c.x && p.y >= c.y && p.x + p.w <= c.x + c.w && p.y + p.h <= c.y + c.h, id); }
  assert.equal(cajaDeAmpliar(n, "nadie"), null);
});
t("los renglones no parten palabras y tienen techo", () => { const r = renglones("una frase bastante larga para un globo chico de verdad, muy larga", 12);
  assert.ok(r.length <= 4 && r.every((x) => x.length <= 12 || !x.includes(" "))); });
console.log(`\n${mal ? mal + " de " + (ok + mal) + " fallaron." : "Todo bien: " + ok + " casos."}`); process.exit(mal ? 1 : 0);
