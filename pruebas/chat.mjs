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
// ── las áreas y el paquete (chat-3) ──
const fuenteApp = `import x from "y";

// ─── cabecera
const A = 1;
function uno(){ return A; }

// el dos
const DOS = 2;
export default function Raiz(){ return uno()+DOS; }
`;
t("declaraciones: encuentra las de primer nivel y pega el comentario de arriba", () => {
  const d = C.declaraciones(fuenteApp);
  assert.deepEqual(d.map((x) => x.nombre), ["A", "uno", "DOS", "Raiz"]);
  assert.equal(d.find((x) => x.nombre === "DOS").desde, 7, "el comentario viaja con DOS");
  assert.equal(d[3].hasta, fuenteApp.split("\n").length);
});
t("verificar: cubre todo, en orden, y avisa lo que falta", () => {
  const d = C.declaraciones(fuenteApp);
  assert.deepEqual(C.verificar([{ id: "a", tramos: [["A", "uno"]] }, { id: "b", tramos: [["DOS", "Raiz"]] }], d), []);
  assert.ok(C.verificar([{ id: "a", tramos: [["A", "uno"]] }], d).some((e) => e.includes("DOS")));
  assert.ok(C.verificar([{ id: "a", tramos: [["uno", "uno"]] }], d).length > 0);
});
t("armarPaquete: trae el pedido en blanco, la ficha del área, la guía y SÓLO el código del área", () => {
  const d = C.declaraciones(fuenteApp), area = { id: "x", titulo: "Las dos", que: "Hace dos.", destino: "src/x.js", probar: "abrir", riesgo: "bajo", tramos: [["DOS", "Raiz"]] };
  const cod = C.extraer(fuenteApp, area, d);
  const md = C.armarPaquete({ proyecto: "BandoMaps", area, codigo: cod, guia: "GUÍA GENERAL", fecha: "2026-11-10" });
  for (const s of ["# Paquete de desarrollo — BandoMaps · Las dos", "## Tu pedido", "Hace dos.", "src/x.js", "GUÍA GENERAL", "const DOS = 2;", "function Raiz"]) assert.ok(md.includes(s), s);
  assert.ok(!md.includes("function uno"), "no trae lo de otra área");
  assert.ok(md.includes("````jsx"));
});
t("un área enorme avisa; una guía que no bajó también", () => {
  const area = { id: "g", titulo: "Grande", que: "q", destino: "d", probar: "p", riesgo: "alto" };
  const md = C.armarPaquete({ proyecto: "P", area, codigo: { texto: "x", lineas: 1100, tokens: 30000 }, guia: "" });
  assert.ok(md.includes("área grande") && md.includes("no se pudo bajar la guía"));
});
t("el nombre del paquete", () => assert.equal(C.nombrePaquete({ nombre: "BandoMaps" }, { id: "formas-recomendadas" }, "2026-11-10"), "bandomaps-paquete-formas-recomendadas-2026-11-10.md"));
t("el paquete trae las piezas que usa, con tope, y nombra las que no entran", () => {
  const area = { id: "x", titulo: "X", que: "q", destino: "d", probar: "p", riesgo: "bajo" }, cod = { texto: "const Z=1;", lineas: 1, tokens: 100 };
  const md = C.armarPaquete({ proyecto: "P", area, codigo: cod, guia: "g", usadas: [{ nombre: "pequena", area: "a", lineas: 3, texto: "function pequena(){}" }, { nombre: "enorme", area: "b", lineas: 999, texto: "function enorme(){}" }] });
  assert.ok(md.includes("function pequena(){}") && !md.includes("function enorme(){}"));
  assert.ok(md.includes("No se incluye el código de: enorme") && md.includes("sólo para leer"));
  assert.ok(!C.armarPaquete({ proyecto: "P", area, codigo: cod, guia: "g" }).includes("Piezas de otras áreas"));
});
t("el resumen trae el porqué ampliado de cada pregunta", () => {
  const md = C.resumenMd({ id: "p" }, [{ id: "p:1", proyecto: "p", tipo: "consulta", estado: "abierto", titulo: "¿Cómo?", amplia: "Porque sí." }]);
  assert.ok(md.includes("Por qué: Porque sí."));
});
t("las áreas de chat.js son una copia exacta de las de tocatoca (si está al lado)", () => {
  const otra = new URL("../../tocatoca/herramientas/areas.mjs", import.meta.url);
  if (!fs.existsSync(otra)) { console.log("      (no está tocatoca al lado)"); return; }
  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const origen = fs.readFileSync(otra, "utf8"), copia = fs.readFileSync(new URL("../chat.js", import.meta.url), "utf8");
  const a = origen.slice(origen.indexOf("const DECL")), b = copia.slice(copia.indexOf("const DECL"), copia.indexOf("/* ═══ FIN ÁREAS"));
  assert.equal(norm(b), norm(a));
});
t("chat.js no habla con Firebase ni con la red", () => {
  const s = fs.readFileSync(new URL("../chat.js", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(s, /^import /m); assert.doesNotMatch(s, /fetch\(|firebase|claves/i);
});

/* ═══ chat-6: el paquete como ZIP (16-nov-2026) ═══ */
const AREA = { id: "formas", titulo: "Formas recomendadas", que: "las formas", destino: "src/features/formas", probar: "node pruebas/teoria.mjs", riesgo: "bajo" };
const COD = { texto: "// ── formas: líneas 10–12 de src/App.jsx ──\nconst f = 1;", lineas: 3, tokens: 20 };

t("el crc32 es el de verdad (el valor publicado de «abc»)", () => {
  assert.equal(C.crc32(new TextEncoder().encode("abc")), 0x352441C2);
  assert.equal(C.crc32(new Uint8Array(0)), 0);
});
t("el LEEME del zip es el manual preciso: archivo completo, mismo nombre, no inventar lo que falta", () => {
  const arch = C.archivosDelPaquete({ proyecto: "BandoMaps", repo: "masotromauro-ai/tocatoca", area: AREA, codigo: COD, guia: "GUÍA", fecha: "2026-11-16",
    usadas: [{ nombre: "pequena", area: "a", lineas: 3, texto: "function pequena(){}" }, { nombre: "enorme", area: "b", lineas: 999, texto: "function enorme(){}" }] });
  assert.deepEqual(arch.map((x) => x.nombre), ["LEEME.md", "formas.jsx", "guia-general.md", "solo-leer/piezas-de-otras-areas.jsx"]);
  const leeme = arch[0].texto;
  for (const s of ["COMPLETO", "MISMO nombre", "no lo inventes", "Tu pedido", "masotromauro-ai/tocatoca", "`formas.jsx`", "src/App.jsx", "la hace el equipo", "`enorme`"])
    assert.ok(leeme.includes(s), s);
  assert.equal(arch[1].texto, COD.texto);
  assert.ok(arch[3].texto.includes("NO SE CAMBIAN") && arch[3].texto.includes("pequena") && !arch[3].texto.includes("function enorme"));
});
t("un área que ya vive en archivos de verdad viaja con sus rutas del repositorio", () => {
  const arch = C.archivosDelPaquete({ proyecto: "P", repo: "r/r", area: AREA, codigo: COD,
    reales: [{ ruta: "src/shared/teoria/color.js", texto: "export const NC = 1;" }] });
  assert.ok(arch.some((x) => x.nombre === "src/shared/teoria/color.js" && x.texto === "export const NC = 1;"));
  assert.ok(!arch.some((x) => x.nombre === "formas.jsx"), "con archivos reales no se inventa el .jsx del tramo");
  assert.ok(arch[0].texto.includes("se sustituye directo"));
});
t("el zip se desarma byte a byte: firmas, nombres, datos intactos y crc de verdad", () => {
  const arch = [{ nombre: "LEEME.md", texto: "# Hola" }, { nombre: "solo-leer/p.jsx", texto: "const í = 1;" }];
  const z = C.armarZip(arch, "2026-11-16");
  const dv = new DataView(z.buffer), dec = new TextDecoder();
  let o = 0;
  const leidos = [];
  while (dv.getUint32(o, true) === 0x04034b50) {
    const crc = dv.getUint32(o + 14, true), largo = dv.getUint32(o + 18, true), nLen = dv.getUint16(o + 26, true), eLen = dv.getUint16(o + 28, true);
    const nombre = dec.decode(z.slice(o + 30, o + 30 + nLen));
    const datos = z.slice(o + 30 + nLen + eLen, o + 30 + nLen + eLen + largo);
    assert.equal(C.crc32(datos), crc, "crc de " + nombre);
    leidos.push([nombre, dec.decode(datos)]);
    o += 30 + nLen + eLen + largo;
  }
  assert.deepEqual(leidos, arch.map((x) => [x.nombre, x.texto]));
  assert.equal(dv.getUint32(o, true), 0x02014b50, "arranca el directorio central");
  const eocd = z.length - 22;
  assert.equal(dv.getUint32(eocd, true), 0x06054b50, "el cierre está donde tiene que estar");
  assert.equal(dv.getUint16(eocd + 10, true), 2, "el cierre cuenta los archivos");
  assert.equal(C.nombreZip({ nombre: "BandoMaps" }, AREA, "2026-11-16"), "bandomaps-paquete-formas-2026-11-16.zip");
});
t("los archivos de código que devuelve el chat se pueden subir como respuesta", () => {
  assert.equal(C.esArchivoDeTexto({ name: "formas.jsx" }), true);
  assert.equal(C.esArchivoDeTexto({ name: "color.js" }), true);
  assert.equal(C.esArchivoDeTexto({ name: "app.apk" }), false);
});

console.log(`\n${ok} pasadas, ${mal} fallidas`);
process.exit(mal ? 1 : 0);
