// pruebas/chat.mjs — el canal con el chat propio de un invitado (chat.js), sin navegador.
// Lo que importa: el resumen no lleva nada que el invitado no vea, las preguntas
// salen ordenadas y sólo las abiertas, y una respuesta vacía o enorme no se manda.
import assert from "node:assert/strict";
import fs from "node:fs";
import * as C from "../chat.js";
let ok = 0, mal = 0;
const t = (n, f) => { try { f(); ok++; console.log("  ✓ " + n); } catch (e) { mal++; console.log("  ✗ " + n + "\n      " + e.message); } };

const pr = { id: "harmonia", nombre: "BandoMaps", sitio: { repo: "masotromauro-ai/tocatoca" },
  esquema: { resumen: "Tiene base propia.", pasos: [{ titulo: "Formas recomendadas", quien: "claude" }] },
  estructura: { intro: "Una app para aprender el bandoneón.",
    mapa: { objetivo: "Que el alumno aprenda", quienes: [{ nombre: "Alumnos", que: "practican" }],
      areas: [{ id: "a", titulo: "Teclados", que: "los dos", estado: "anda", hijos: [{ id: "h", titulo: "Marcar", que: "pinta" }] }] },
    partes: [{ nombre: "La puerta", que: "entrar", explica: "Con mail.", detalle: ["Firebase"] }] } };
const pend = [
  { id: "harmonia:V2", proyecto: "harmonia", tipo: "consulta", quien: "invitado", estado: "abierto", titulo: "¿Dos manos?", creadoEn: "2026-11-09" },
  { id: "harmonia:V1", proyecto: "harmonia", tipo: "consulta", quien: "invitado", estado: "abierto", titulo: "¿Qué usos?", porQue: "marcato…", creadoEn: "2026-11-09", comentarios: [{ por: "u1", texto: "dos" }] },
  { id: "harmonia:V0", proyecto: "harmonia", tipo: "consulta", estado: "hecho", titulo: "vieja" },
  { id: "harmonia:H8", proyecto: "harmonia", tipo: "pedido", estado: "abierto", titulo: "El Código", plan: "mezclar" },
  { id: "otro:X1", proyecto: "otro", tipo: "consulta", estado: "abierto", titulo: "ajena" },
];

t("las consultas: sólo abiertas, del proyecto, en orden", () =>
  assert.deepEqual(C.consultasDe(pend, "harmonia").map((x) => x.id), ["harmonia:V1", "harmonia:V2"]));
t("contestada mira si comentó esa persona", () => {
  assert.equal(C.contestada(pend[1], "u1"), true); assert.equal(C.contestada(pend[0], "u1"), false); });
t("el resumen trae el mapa, las partes, los pasos, las preguntas y lo abierto", () => {
  const md = C.resumenMd(pr, pend, { commits: [{ fecha: "2026-11-09", texto: "Update App.jsx" }], fecha: "2026-11-09", quien: "Mariano" });
  for (const s of ["# BandoMaps", "Teclados", "Marcar", "La puerta", "Formas recomendadas", "¿Qué usos?", "El Código", "Update App.jsx", "masotromauro-ai/tocatoca", "Alumnos"])
    assert.ok(md.includes(s), s);
});
t("el resumen no trae lo de otro proyecto ni lo cerrado", () => {
  const md = C.resumenMd(pr, pend); assert.ok(!md.includes("ajena")); assert.ok(!md.includes("vieja")); });
t("un proyecto casi vacío también da un resumen", () => {
  const md = C.resumenMd({ id: "x" }, []); assert.ok(md.startsWith("# x")); assert.ok(md.includes("Cómo usarlo")); });
t("el nombre del archivo no lleva acentos ni espacios", () =>
  assert.equal(C.nombreArchivo({ nombre: "Casa Verde Cañas" }, "2026-11-09"), "casa-verde-canas-resumen-2026-11-09.md"));
t("una respuesta vacía o enorme no se manda; una buena trae su resumen", () => {
  assert.equal(C.prepararRespuesta("  \n ").ok, false);
  assert.equal(C.prepararRespuesta("x".repeat(C.MAX_RESPUESTA + 1)).ok, false);
  const r = C.prepararRespuesta("Hola\r\nmundo"); assert.equal(r.ok, true); assert.equal(r.texto, "Hola\nmundo"); assert.ok(r.resumen.length <= 280);
});
t("sólo se leen archivos de texto", () => {
  assert.equal(C.esArchivoDeTexto({ name: "a.md" }), true); assert.equal(C.esArchivoDeTexto({ name: "r.TXT" }), true);
  assert.equal(C.esArchivoDeTexto({ name: "foto.jpg", type: "image/jpeg" }), false); });
t("el orden manda sobre la fecha, y lo sin orden va al final", () => {
  const l = [{ id: "p:3", proyecto: "p", tipo: "consulta", estado: "abierto", orden: 3 }, { id: "p:x", proyecto: "p", tipo: "consulta", estado: "abierto", creadoEn: "2020-01-01" },
    { id: "p:1", proyecto: "p", tipo: "consulta", estado: "abierto", orden: 1, creadoEn: "2026-11-10" }];
  assert.deepEqual(C.consultasDe(l, "p").map((x) => x.id), ["p:1", "p:3", "p:x"]);
});
t("las consultas se agrupan en el orden de la primera de cada grupo", () => {
  const g = C.agrupar([{ id: 1, grupo: "A" }, { id: 2, grupo: "B" }, { id: 3, grupo: "A" }, { id: 4 }]);
  assert.deepEqual(g.map((x) => [x.grupo, x.items.map((y) => y.id)]), [["A", [1, 3]], ["B", [2]], ["", [4]]]);
});
t("las opciones se limpian y la elección es la última de esa persona", () => {
  const x = { opciones: [{ t: "Sí", r: true }, { t: "" }, null, { t: "No" }], comentarios: [] };
  assert.deepEqual(C.opcionesDe(x), [{ t: "Sí", r: true }, { t: "No", r: false }]);
  assert.equal(C.opcionesDe({}).length, 0);
  x.comentarios.push(C.comentarioDeEleccion("u1", "Mariano", "Sí", "2026-11-10"), { por: "u2", opcion: "No" }, C.comentarioDeEleccion("u1", "Mariano", "No", "2026-11-10"));
  assert.equal(C.eleccion(x, "u1"), "No"); assert.equal(C.eleccion(x, "u3"), null);
  assert.equal(C.comentarioDeEleccion("u1", "M", "Sí", "f").texto, "Elegí: Sí");
});
t("el resumen para el chat lista las opciones con la recomendada", () => {
  const md = C.resumenMd({ id: "p" }, [{ id: "p:1", proyecto: "p", tipo: "consulta", estado: "abierto", titulo: "¿Cómo?", opciones: [{ t: "Así", r: true }, { t: "Asá" }] }]);
  assert.ok(md.includes("- Así (recomendada)") && md.includes("- Asá"));
});
t("chat.js no habla con Firebase ni con la red", () => {
  const s = fs.readFileSync(new URL("../chat.js", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(s, /^import /m); assert.doesNotMatch(s, /fetch\(|firebase|claves/i);
});

console.log(`\n${ok} pasadas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
