/* pruebas/paquete.mjs — banco de `paquete.js`, `semaforo.js` e `intervenir.js` (paquete-2). Sin npm ni red.
   Corre con:  node pruebas/paquete.mjs
   Prueba sobre todo lo que NO debe hacer: aplicar una pieza que el paquete no
   dejó editar, aplicar código que no parsea, o perder una pieza al reemplazar.
   Si están los archivos reales de la raíz, además comprueba contra ellos. */
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import * as K from "../paquete.js";
import * as S from "../semaforo.js";
import * as I from "../intervenir.js";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
let n = 0, mal = 0;
const ok = (c, msg) => { n++; if (!c) { mal++; console.log("✗ " + msg); } };
const igual = (a, b, msg) => ok(JSON.stringify(a) === JSON.stringify(b), msg + "  → " + JSON.stringify(a) + " ≠ " + JSON.stringify(b));

/* ── fixture: un archivo con las formas que tiene el panel ── */
const SRC = [
  "/* cabecera",
  "   Todo lo que hace falta. */",
  'import { auth, db } from "./firebase-init.js?v=init-6";',
  "",
  "export const P = {};",
  "P.VERSION = \"n-1\";",
  "",
  "/* Escapa lo que va a un innerHTML.",
  "   Con la comilla simple. */",
  "P.esc = (s) => String(s ?? \"\");",
  "",
  "const PROPIAS = {",
  "  a: 1",
  "};",
  "let _err = null;",
  "P.explicar = (e) => PROPIAS[e] || _err;",
  "P.otra = () => 1;",
  "",
  "// el que arranca",
  "async function arrancar() {",
  "  /* un comentario indentado",
  "con una línea en columna 0 adentro */",
  "  await leer();",
  "  const x = `",
  "  hola`;",
  "}",
  "function leer() {",
  "  return P.esc(P.explicar(1));",
  "}",
  "$(\"boton\").onclick = () => leer();",
  "function colgada() { return 2; }",
  "",
].join("\n");

/* ── piezas ── */
const D = K.declaraciones(SRC);
igual(D.map((d) => d.nombre), ["P", "P.VERSION", "P.esc", "PROPIAS", "_err", "P.explicar", "P.otra", "arrancar", "leer", "colgada"], "reconoce todas las formas de pieza");
const arr = D.find((d) => d.nombre === "arrancar");
ok(arr.desde === 19 && arr.linea === 20 && arr.hasta === 26, "arrancar lleva su comentario de arriba y su cuerpo entero, con un comentario indentado adentro: " + JSON.stringify(arr));
const esc = D.find((d) => d.nombre === "P.esc");
ok(esc.desde === 8 && esc.hasta === 10, "P.esc lleva el comentario pegado arriba");
const leer = D.find((d) => d.nombre === "leer");
ok(leer.hasta === 29, "una sentencia suelta en columna 0 corta la pieza anterior: " + leer.hasta);
const { piezas, faltan } = K.extraer(SRC, ["leer", "noExiste"], D);
ok(piezas.length === 1 && faltan[0] === "noExiste", "extraer dice qué falta, no se lo traga");

/* ── imports ── */
const imps = K.importsDe('import {\n  auth, db as base,\n  doc\n} from "./firebase-init.js?v=init-6";\nimport X from "./x.js";\nimport * as Y from "./y.js";\nimport("./z.js?v=1").catch(() => {});');
igual(imps.map((i) => i.desde), ["./firebase-init.js", "./x.js", "./y.js", "./z.js"], "imports: quita ?v= y reconoce estáticos y dinámicos");
igual(imps[0].nombres, ["auth", "base", "doc"], "imports: respeta el alias («db as base» es base) y los de varias líneas");
igual([imps[1].nombres, imps[2].nombres, imps[3].dinamico], [["X"], ["Y"], true], "imports: default, namespace y dinámico");

/* ── lo que usa un texto ── */
const t = 'P.esc(x); P.aviso("a"); await setDoc(doc(db, "personas", uid), {}); const q = query(collection(db, "pendientes")); $("miUid"); document.getElementById("app"); obj.P.no; xP.no';
igual(K.usosDeP(t), ["esc", "aviso"], "usosDeP no confunde obj.P ni xP");
igual(K.coleccionesDe(t), ["personas", "pendientes"], "coleccionesDe: doc(db, …) y query(collection(db, …))");
igual(K.idsDe(t), ["miUid", "app"], "idsDe: $() y getElementById()");
igual(K.usadosEn("a.leer(); leer(); xleer();", ["leer", "x"]), ["leer"], "usadosEn no toma un método ni un sufijo");
const rel = K.relaciones("leer", { arrancar: "await leer();", leer: "return P.esc()", colgada: "return 2", "P.esc": "x" });
igual(rel, { llama: [], llamadaPor: ["arrancar"] }, "relaciones: quién llama a quién (sin contar P.*)");

/* ── el núcleo, recortado ── */
const N = K.recortarNucleo(SRC, ["P.explicar(1)"], ["P"]);
igual(N.piezas.map((p) => p.nombre).sort(), ["PROPIAS", "P", "P.explicar", "_err"].sort(), "recortarNucleo: trae P.explicar y lo que ésa usa (PROPIAS, _err), nada más");
ok(!N.piezas.some((p) => p.nombre === "P.otra"), "recortarNucleo: no trae lo que no se usa");
igual(K.recortarNucleo(SRC, ["P.fantasma()"], []).noEncontradas, ["fantasma"], "recortarNucleo avisa si el código usa una P.* que no existe");

/* ── reglas ── */
const REGLAS = [
  "service cloud.firestore {",
  "  match /databases/{database}/documents {",
  "    function soyYo() { return request.auth.uid == 'X'; }",
  "    function equipo() { return soyYo(); }",
  "    function otra() { return false; }",
  "    // la ficha",
  "    match /personas/{uid} {",
  "      allow read: if equipo();",
  "      allow write: if soyYo();",
  "    }",
  "    match /personas/{uid} { allow read: if request.auth.uid == uid; }",
  "    match /lineas/{id} { allow read: if true; }",
  "    match /{document=**} { allow read, write: if false; }",
  "  }",
  "}",
].join("\n");
const R = K.bloquesDeReglas(REGLAS, ["personas", "zzz"]);
igual(R.encontradas, ["personas"], "reglas: encuentra la colección");
igual(R.faltan, ["zzz"], "reglas: dice cuál no tiene regla (queda denegada)");
ok((R.texto.match(/match \/personas/g) || []).length === 2, "reglas: trae los DOS bloques de la misma colección (se suman)");
igual(R.funciones.sort(), ["equipo", "soyYo"], "reglas: trae las funciones que los bloques llaman, y las que ésas llaman");
ok(!R.texto.includes("otra()") && !R.texto.includes("/lineas/"), "reglas: no trae lo que no se usa");

/* ── construir ── */
const CFG = { proyecto: "x", nucleo: "n.js", reglas: "r.txt", limiteTokens: 30000, reglasDelRepo: ["Regla uno."],
  intervenciones: [
    { id: "a", titulo: "Una", que: "Algo.", archivos: [{ ruta: "f.js", rol: "editar", tramos: ["arrancar", "leer"], para: "Para algo." }] },
    { id: "b", titulo: "Otra", que: "Algo.", archivos: [{ ruta: "f.js", rol: "editar", tramos: ["arrancar", "yaNoEsta"] }] },
  ] };
const leerFx = async (r) => ({ "f.js": SRC, "n.js": SRC, "r.txt": REGLAS })[r];
const A = await K.construir(CFG, "a", leerFx, { fecha: "2026-11-10" });
ok(A.md.includes("EDITAR") && A.md.includes("SOLO LEER") && A.md.includes("Regla uno."), "construir: trae roles y las reglas del repositorio");
ok(A.md.includes("## De qué depende cada pieza") && A.md.includes("**La llaman:**"), "construir: trae las dependencias de cada pieza");
ok(A.avisos.length === 0, "construir: sin avisos cuando el mapa está al día: " + A.avisos.join("|"));
ok(!A.md.includes("// cabecera") && !A.md.includes("Todo lo que hace falta"), "construir: la cabecera del núcleo no viaja (puede estar desactualizada)");
const B = await K.construir(CFG, "b", leerFx);
ok(B.avisos.some((a) => a.includes("yaNoEsta") && a.includes("desactualizado")) && B.md.includes("> ⚠"), "construir: un mapa desactualizado se AVISA en el paquete, no se esconde");
let tiro = false; try { await K.construir(CFG, "zzz", leerFx); } catch { tiro = true; }
ok(tiro, "construir: una intervención que no existe es un error");
const C = await K.construir({ ...CFG, limiteTokens: 10 }, "a", leerFx);
ok(C.avisos.some((a) => a.includes("conviene partir")), "construir: avisa si el paquete pesa de más");

/* ── un código que trae ``` adentro no rompe el bloque del paquete ── */
const CON_VALLA = "function a() {\n  return \"```js\\n```\";\n}\nfunction b() { return 1; }\n";
const cfgV = { proyecto: "x", secciones: [{ id: "v", titulo: "V", que: "x", archivos: [{ ruta: "v.js", rol: "editar", tramos: ["a"] }] }] };
const V = await K.construir(cfgV, "v", async () => CON_VALLA);
ok(/\n````+js\n\/\/ ── v\.js/.test(V.md), "valla: el bloque usa más ` que cualquiera que tenga el código adentro");
const volv = await K.aplicarSeccion(cfgV, "v", V.md.slice(V.md.indexOf("````")), async () => CON_VALLA, V.huellas);
ok(volv.rechazadas.length === 0 && volv.cambiados.length === 1 && volv.cambiados[0].texto === CON_VALLA, "valla: lo que se baja con un ``` adentro vuelve idéntico");

/* ── aplicar cambios ── */
const PERM = ["arrancar", "leer"];
const NUEVA_LEER = "function leer() {\n  return 99;\n}";
let r = K.aplicarCambios(SRC, "Acá va:\n```js\n// ── f.js: líneas 27–29 ──\n" + NUEVA_LEER + "\n```", PERM);
igual(r.reemplazadas, ["leer"], "aplicar: reemplaza la pieza por su nombre");
ok(r.texto.includes("return 99;") && r.texto.includes("async function arrancar()") && r.texto.includes("function colgada()"), "aplicar: el resto del archivo queda intacto");
ok(!r.texto.includes("// ── f.js"), "aplicar: descarta la marca del paquete");
r = K.aplicarCambios(SRC, "```js\nfunction colgada() { return 3; }\n```", PERM);
ok(r.texto === SRC && r.rechazadas[0].nombre === "colgada", "aplicar: una pieza que el paquete NO dejó editar se rechaza y el archivo no cambia");
r = K.aplicarCambios(SRC, "```js\nfunction leer() { return ( }\n```", PERM);
ok(r.texto === SRC && r.rechazadas[0].motivo.startsWith("no parsea"), "aplicar: código que no parsea se rechaza y el archivo no cambia");
r = K.aplicarCambios(SRC, "```js\nfunction nueva() { return 1; }\n```", ["nueva"]);
ok(r.texto === SRC && /no existe/.test(r.rechazadas[0].motivo), "aplicar: una pieza nueva no se agrega sola");
r = K.aplicarCambios(SRC, "```js\nfunction leer() { return 1; }\nfunction leer() { return 2; }\n```", PERM);
ok(r.reemplazadas.length === 1 && r.rechazadas.some((x) => x.motivo === "vino repetida"), "aplicar: una pieza repetida se aplica una sola vez");
r = K.aplicarCambios(SRC, "```js\nasync function arrancar() {\n  return 1;\n}\nfunction leer() {\n  return 2;\n}\n```", PERM);
ok(r.texto.includes("return 1;") && r.texto.includes("return 2;") && r.reemplazadas.length === 2, "aplicar: varias piezas a la vez, de cualquier largo, sin correrse las líneas");
ok(r.avisos.some((a) => a.includes("arrancar") && a.includes("comentario")), "aplicar: avisa si una pieza perdió el comentario de arriba");
ok(K.aplicarCambios(SRC, "Hola, no hay código.", PERM).avisos.length === 1, "aplicar: si no reconoce ninguna pieza lo dice");
// sin fences, con las marcas puestas
r = K.aplicarCambios(SRC, "// ── f.js: líneas 27–29 ──\nfunction leer() {\n  return 5;\n}", PERM);
igual(r.reemplazadas, ["leer"], "aplicar: también acepta código sin ```");

/* ── contra los archivos reales de la raíz, si están ── */
const reales = ["index.html", "invitado.html", "nucleo.js", "chat.js", "errores.js", "esquema.js"].filter((f) => existsSync(join(raiz, f)));
for (const f of reales) {
  const src = await readFile(join(raiz, f), "utf8"), L = src.split("\n"), ds = K.declaraciones(src);
  const fns = ds.filter((d) => /^(?:export\s+)?(?:async\s+)?function\b/.test(L[d.linea - 1]));
  const noParsean = fns.filter((d) => K.revisarSintaxis(L.slice(d.desde - 1, d.hasta).join("\n").replace(/^export\s+/m, "")));
  ok(noParsean.length === 0, `${f}: todas sus funciones se recortan enteras y parsean (fallan: ${noParsean.map((d) => d.nombre).join(", ")})`);
  // reemplazar cada función por sí misma deja el archivo EXACTAMENTE igual
  const nombres = fns.map((d) => d.nombre).filter((nm, i, a) => a.indexOf(nm) === i && ds.filter((d) => d.nombre === nm).length === 1);
  const cuerpo = nombres.map((nm) => { const d = ds.find((x) => x.nombre === nm); return L.slice(d.desde - 1, d.hasta).join("\n").replace(/^export\s+/m, ""); }).join("\n\n");
  const res = K.aplicarCambios(src.replace(/^export\s+/gm, "export "), "```js\n" + cuerpo + "\n```", nombres);
  ok(res.reemplazadas.length === nombres.length || res.rechazadas.every((x) => /no parsea/.test(x.motivo)), `${f}: reemplazar cada función por sí misma las reconoce todas`);
}

/* ── varios archivos: cada pieza a su archivo ── */
const F1 = "function uno() {\n  return 1;\n}\nfunction comun() {\n  return 'a';\n}\n";
const F2 = "function dos() {\n  return 2;\n}\nfunction comun() {\n  return 'b';\n}\n";
const orig = { "a.js": F1, "b.js": F2 };
const perm = { "a.js": ["uno", "comun"], "b.js": ["dos", "comun"] };
let m = K.aplicarEnArchivos(orig, "```js\n// ── a.js: líneas 1–3 ──\nfunction uno() {\n  return 11;\n}\n// ── b.js: líneas 4–6 ──\nfunction comun() {\n  return 'B!';\n}\n```", perm);
ok(m.archivos["a.js"].texto.includes("return 11;") && m.archivos["b.js"].texto.includes("'B!'") && m.archivos["b.js"].texto.includes("return 2;"), "varios archivos: cada pieza va a su archivo según la marca");
ok(m.archivos["a.js"].texto.includes("return 'a';"), "varios archivos: una pieza con el mismo nombre en otro archivo no se pisa");
m = K.aplicarEnArchivos(orig, "```js\nfunction comun() { return 0; }\n```", perm);
ok(!Object.keys(m.archivos).length && /más de un archivo/.test(m.rechazadas[0].motivo), "varios archivos: un nombre repetido sin marca se rechaza, no se adivina");
m = K.aplicarEnArchivos(orig, "```js\n// ── otro.js: líneas 1–3 ──\nfunction uno() { return 5; }\n```", perm);
ok(!Object.keys(m.archivos).length && /no es de esta sección/.test(m.rechazadas[0].motivo), "varios archivos: un archivo ajeno a la sección se rechaza");
m = K.aplicarEnArchivos(orig, "```js\nfunction dos() { return 9; }\n```", perm);
ok(m.archivos["b.js"] && !m.archivos["a.js"], "varios archivos: sin marca, un nombre único se resuelve solo");

/* ── detectar que alguien tocó una pieza entre que se bajó y que se trajo ── */
const cfgM = { secciones: [{ id: "s", titulo: "S", que: "x", archivos: [{ ruta: "a.js", rol: "editar", tramos: ["uno"] }] }] };
const hu = { "a.js#uno": K.huellaDe("function uno() {\n  return 1;\n}") };
let v = await K.aplicarSeccion(cfgM, "s", "```js\nfunction uno() {\n  return 7;\n}\n```", async () => F1, hu);
ok(v.cambiados.length === 1 && v.conflictos.length === 0, "choque: si nadie la tocó, no hay conflicto");
v = await K.aplicarSeccion(cfgM, "s", "```js\nfunction uno() {\n  return 7;\n}\n```", async () => F1.replace("return 1", "return 100"), hu);
ok(v.conflictos.length === 1 && v.conflictos[0].nombre === "uno", "choque: si alguien cambió la pieza en el medio, se avisa");
ok(K.huellaDe("a\r\nb  ") === K.huellaDe("a\nb"), "huella: no depende de los fines de línea ni de los espacios al final");

/* ── ¿cerrada? ── */
const SITIO = { "lib.js": "export function util() {}\nexport const X = 1;\nfunction interna() {}\n", "p1.html": '<script type="module">\nimport { util } from "./lib.js?v=1";\nfunction a() { util(); }\n</script>', "p2.html": '<script type="module">\nimport { X } from "./lib.js";\nfunction b() { return X; }\n</script>', "d/p3.js": 'import { util } from "../lib.js";' };
let imp = K.impactoFuera("lib.js", ["util"], SITIO["lib.js"], SITIO);
igual([imp.cerrada, imp.afuera.map((x) => x.archivo).sort()], [false, ["d/p3.js", "p1.html"]], "cierre: quién importa lo que se edita (resolviendo ../ y ?v=)");
imp = K.impactoFuera("lib.js", ["interna"], SITIO["lib.js"], SITIO);
ok(imp.cerrada, "cierre: lo que no se exporta no lo usa nadie afuera");
imp = K.impactoFuera("p1.html", null, SITIO["p1.html"], SITIO);
ok(imp.cerrada, "cierre: una página .html es cerrada por construcción");

/* ── cualquier sitio: otro espacio de nombres (CV2) ── */
const NUC2 = "const CV2 = {};\nCV2.esc = (s) => String(s);\nCV2.toast = (m) => CV2.esc(m);\nCV2.otra = () => 1;\nCV2.usuario = null;\n";
const PAG2 = "function mostrar() {\n  CV2.toast('hola');\n}\n";
const cfg2 = { proyecto: "otro", espacio: "CV2", nucleo: "n.js", secciones: [{ id: "x", titulo: "X", que: "x", archivos: [{ ruta: "pag.html", rol: "editar", tramos: ["mostrar"] }] }] };
const w = await K.construir(cfg2, "x", async (r) => ({ "n.js": NUC2, "pag.html": PAG2 })[r]);
ok(w.md.includes("CV2.toast") && w.md.includes("CV2.esc") && !w.md.includes("CV2.otra"), "otro sitio: con espacio CV2 trae lo que usa (y lo que ésas usan) y nada más");
ok(w.md.includes("`CV2.toast`"), "otro sitio: las dependencias se nombran con su espacio");

/* ── proponer secciones para un sitio sin mapa ── */
const bor = K.proponerSecciones({ "uno.html": '<script type="module">import { f } from "./mod.js";\nfunction x() {}</script>', "mod.js": 'import { g } from "./hondo.js";\nexport const f = 1;', "hondo.js": "export const g = 1;" }, { espacio: "CV2" });
igual(bor.secciones.map((s) => s.id), ["sitio-completo", "uno"], "proponer: cada página es una sección, y si el sitio entero entra en un chat, también «sitio completo»");
const uno = bor.secciones.find((s) => s.id === "uno");
igual(uno.archivos.map((a) => a.ruta + ":" + a.rol), ["uno.html:editar", "mod.js:leer", "hondo.js:leer"], "proponer: trae el cierre de imports como SOLO LEER");
ok(uno.revisar === true && bor.espacio === "CV2" && bor.mapaDoc === "MAPA.md", "proponer: sale marcado para revisar y apunta al MAPA.md");
const grande = K.proponerSecciones({ "g.html": "<script>" + "const x = 1;\n".repeat(9000) + "</script>" });
ok(!grande.secciones.some((s) => s.id === "sitio-completo"), "proponer: un sitio que no entra en un chat no ofrece «sitio completo»");

/* ── el MAPA.md del sitio ── */
const MAPA_FX = "# Mapa\n\n## Carpetas\n\n| Carpeta | Qué es |\n|---|---|\n| `guias/` | Guías en Markdown. |\n\n## Raíz\n\n| Archivo | Qué es | Usa |\n|---|---|---|\n| `a.js` | Hace A. | — |\n| `viejo.js` | Ya no existe. | — |\n\n- `x.css` — Estilos.\n";
igual(K.filasDelMapa(MAPA_FX).map((f) => f.ruta), ["guias/", "a.js", "viejo.js", "x.css"], "mapa: lee filas de tabla y de lista");
const cmp = K.compararMapa(K.filasDelMapa(MAPA_FX).map((f) => f.ruta), ["a.js", "b.js", "guias/uno.md", "guias/dos.md", "x.css"]);
igual(cmp, { sinDescribir: ["b.js"], fantasmas: ["viejo.js"] }, "mapa: dice qué falta describir y qué fila quedó huérfana; una carpeta cubre sus archivos");
const gen = K.construirMapaMd({ proyecto: "X", existente: MAPA_FX, archivos: [{ ruta: "a.js" }, { ruta: "b.js" }, { ruta: "guias/uno.md" }, { ruta: "p.html" }, { ruta: "foto.png" }], textos: { "a.js": "/* a.js — otro texto */", "b.js": "/* b.js — Hace B. */\nimport { x } from \"./a.js?v=1\";", "p.html": "<title>La página</title><script src=\"b.js\"></script>", "guias/uno.md": "# Uno" } });
ok(gen.includes("| `a.js` | Hace A. |"), "mapa: lo que una persona escribió NO se pisa");
ok(gen.includes("| `b.js` | Hace B. | `a.js` |"), "mapa: un archivo nuevo toma su descripción del encabezado y calcula de qué depende");
ok(gen.includes("| `p.html` | La página | `b.js` |"), "mapa: una página toma su título y lee <script src>");
ok(!gen.includes("guias/uno.md") && gen.includes("| `guias/` |"), "mapa: la fila de una carpeta se conserva y sus archivos no se listan uno por uno");
ok(!gen.includes("foto.png") && !gen.includes("viejo.js"), "mapa: una imagen no entra y una fila huérfana desaparece al regenerar");
ok(K.construirMapaMd({ existente: gen, archivos: [{ ruta: "a.js" }, { ruta: "b.js" }, { ruta: "guias/uno.md" }, { ruta: "p.html" }], textos: { "a.js": "", "b.js": "", "p.html": "", "guias/uno.md": "" } }).includes("Hace B."), "mapa: regenerar dos veces conserva lo ya completado");
const cfgMapa = { proyecto: "x", repo: "u/r", secciones: [{ id: "s", titulo: "S", que: "x", archivos: [{ ruta: "a.js", rol: "editar", tramos: ["uno"] }] }] };
const conMapa = await K.construir(cfgMapa, "s", async (r) => ({ "a.js": F1, "MAPA.md": "# Mapa\n\n## Raíz\n\n| Archivo | Qué es | Usa |\n|---|---|---|\n| `a.js` | Hace A. | — |\n| `fantasma.js` | No existe. | — |\n" })[r] ?? Promise.reject(new Error("no")), { listar: async () => [{ ruta: "a.js", bytes: 100 }, { ruta: "nuevo.js", bytes: 50 }] });
ok(conMapa.md.includes("## Mapa del sitio: qué es cada archivo y dónde está") && conMapa.md.includes("https://raw.githubusercontent.com/u/r/main/<archivo>"), "paquete: trae el mapa y la dirección de descarga");
ok(conMapa.md.includes("no lo supongas ni lo inventes") && conMapa.md.includes("**Ya viene en este paquete:** `a.js`"), "paquete: le dice al chat que pida el archivo en vez de inventar, y qué ya trae");
ok(conMapa.md.includes("NO describe estos archivos") && conMapa.md.includes("`nuevo.js`") && conMapa.md.includes("ya no existen") && conMapa.md.includes("`fantasma.js`"), "paquete: avisa los archivos sin describir y las filas huérfanas del mapa");
ok(conMapa.md.includes("##### Raíz") && !conMapa.md.includes("# Mapa\n"), "paquete: el mapa se incrusta con sus títulos bajados para no pisar los del paquete");
const sinMapa = await K.construir(cfgMapa, "s", async (r) => (r === "a.js" ? F1 : Promise.reject(new Error("no"))), { listar: async () => [{ ruta: "a.js", bytes: 100 }] });
ok(sinMapa.md.includes("todavía no tiene un `MAPA.md`") && sinMapa.md.includes("| `a.js` |"), "paquete: sin MAPA.md avisa y arma una lista automática");

/* ── archivo ENTERO: revisión de módulos y de HTML ── */
ok(K.revisarModulo('import { a } from "./a.js";\nimport "./b.js";\nexport const x = await a();\nexport default function f() {}') === null, "revisar: un módulo con import, export y await de nivel superior parsea");
ok(K.revisarModulo("const x = ;") !== null, "revisar: un error de sintaxis se dice");
ok(K.revisarArchivo("p.html", '<script type="module">const a = 1;</script><script src="x.js"></script><script type="application/json">{ no es js }</script>') === null, "revisar HTML: salta los scripts con src y los que no son JavaScript");
ok(/<script> no parsea/.test(K.revisarArchivo("p.html", '<script>const a = ;</script>')), "revisar HTML: un script roto se detecta");
ok(K.revisarArchivo("d.json", "{ no") !== null && K.revisarArchivo("d.json", '{"a":1}') === null, "revisar JSON");
const HTML0 = "<!DOCTYPE html>\n<html>\n<body>\n<script type=\"module\">\nfunction a() { return 1; }\n</script>\n</body>\n</html>\n";
const cfgE = { proyecto: "x", secciones: [{ id: "e", titulo: "E", que: "x", archivos: [{ ruta: "p.html", rol: "editar" }] }] };
const rE = await K.construir(cfgE, "e", async () => HTML0);
ok(rE.huellas["p.html#*"] === K.huellaDe(HTML0) && rE.huellas["p.html#a"], "entero: guarda la huella del archivo y de cada pieza");
let aE = await K.aplicarSeccion(cfgE, "e", "```html\n// ── p.html: líneas 1–9 ──\n" + HTML0.replace("<body>", "<body class=\"x\">") + "```", async () => HTML0, rE.huellas);
ok(aE.cambiados.length === 1 && aE.cambiados[0].completo && aE.cambiados[0].texto.includes('<body class="x">') && aE.cambiados[0].texto.endsWith("\n"), "entero: el archivo completo reemplaza al archivo y conserva el fin de línea");
aE = await K.aplicarSeccion(cfgE, "e", "```html\n// ── p.html: líneas 1–9 ──\n" + HTML0.replace("return 1", "return (") + "```", async () => HTML0, rE.huellas);
ok(!aE.cambiados.length && /no parsea/.test(aE.rechazadas[0].motivo), "entero: un script roto dentro del HTML se rechaza");
aE = await K.aplicarSeccion(cfgE, "e", "```js\n// ── p.html: líneas 1–9 ──\nfunction a() { return 2; }\n```", async () => HTML0, rE.huellas);
ok(aE.cambiados.length === 1 && !aE.cambiados[0].completo && aE.cambiados[0].texto.includes("return 2;") && aE.cambiados[0].texto.includes("</html>"), "entero: un fragmento NO se toma como archivo completo: reemplaza sólo la pieza");
aE = await K.aplicarSeccion(cfgE, "e", "```html\n// ── p.html: líneas 1–9 ──\n" + HTML0.replace("<body>", "<body class=\"x\">") + "```", async () => HTML0.replace("<body>", "<body id=\"otro\">"), rE.huellas);
ok(aE.conflictos.length === 1 && aE.conflictos[0].nombre === "(archivo entero)", "entero: si el archivo cambió entre que se bajó y que se trajo, hay conflicto");

/* ── dependencias recortadas: imports propios, transitivos, y lo que no debe viajar ── */
const FX = { "pag.html": '<script type="module">\nimport * as A from "./lib.js";\nimport { f2 } from "./otro.js";\nimport { db } from "./firebase-init.js";\nfunction usar() { return A.util() + f2() + db; }\n</script>',
  "lib.js": 'import { hondo } from "./hondo.js";\nexport const util = () => aux() + hondo();\nfunction aux() { return 1; }\nexport const noUsada = 5;',
  "hondo.js": "export const hondo = () => 2;\nexport const otra = 3;", "otro.js": "export const f2 = () => 4;", "firebase-init.js": "export const db = { apiKey: 'AIzaSyFAKEFAKEFAKEFAKEFAKEFAKEFAKEFAKE12' };" };
const cfgD = { proyecto: "x", noIncluir: ["firebase-init.js"], secciones: [{ id: "d", titulo: "D", que: "x", archivos: [{ ruta: "pag.html", rol: "editar", tramos: ["usar"] }] }] };
const D2 = await K.construir(cfgD, "d", async (r) => FX[r] ?? Promise.reject(new Error("no existe " + r)));
ok(D2.md.includes("`lib.js` · 2 de 3 piezas") && D2.md.includes("aux") && !D2.md.includes("noUsada"), "dependencias: trae lo que se usa de un módulo propio (con `* as A`) y lo que ésas usan, nada más");
ok(D2.md.includes("`hondo.js` · 1 de 2 piezas") && D2.md.includes("`otro.js` · 1 de 1 piezas"), "dependencias: sigue los imports de los módulos que importa (transitivo)");
ok(D2.md.includes("`firebase-init.js` · no incluido") && !D2.md.includes("AIzaSy"), "dependencias: lo que está en noIncluir se nombra pero su contenido no viaja");
ok(D2.md.includes("`./lib.js` → `A.util`"), "dependencias: de un `* as A` se dice qué se usa de verdad");
ok(D2.avisos.length === 0, "dependencias: sin avisos: " + D2.avisos.join("|"));

/* ── el semáforo ── */
const AHORA = 1_000_000_000_000, H = 3600 * 1000;
igual(S.idEdicion("datos", "Puerta Personas!"), "datos__puerta-personas", "semáforo: el id es proyecto__sección, en minúsculas y sin símbolos");
igual(S.estadoDe(null, AHORA, "u1").estado, "libre", "semáforo: sin aviso, libre");
igual(S.estadoDe({ uid: "u1", nombre: "A", venceEn: AHORA + H }, AHORA, "u1").estado, "mia", "semáforo: el mío");
igual(S.estadoDe({ uid: "u2", nombre: "B", venceEn: AHORA + H }, AHORA, "u1").estado, "ocupada", "semáforo: el de otra persona vivo");
const venc = S.estadoDe({ uid: "u2", nombre: "B", venceEn: AHORA - 1 }, AHORA, "u1");
ok(venc.estado === "libre" && venc.vencido, "semáforo: se rompe hacia el verde cuando vence");
ok(/🔴/.test(S.textoDe(S.estadoDe({ uid: "u2", nombre: "B", venceEn: AHORA + 5 * H }, AHORA, "u1"))) && /5 h/.test(S.textoDe(S.estadoDe({ uid: "u2", nombre: "B", venceEn: AHORA + 5 * H }, AHORA, "u1"))), "semáforo: el texto dice quién y cuánto falta");
ok(S.estadoDe({ uid: "u2", venceEn: { toMillis: () => AHORA + H } }, AHORA, "u1").estado === "ocupada", "semáforo: entiende un Timestamp de Firestore");

// una base de mentira que aplica la misma regla que `ediciones/` (v10)
function baseFalsa() {
  const docs = new Map(); let ahora = AHORA;
  const F = {
    db: {}, collection: (db, n) => ({ n }), where: (f, o, v) => ({ f, o, v }), query: (c, w) => ({ c, w }),
    doc: (db, n, id) => ({ n, id }),
    serverTimestamp: () => ({ __server: true }), Timestamp: { fromMillis: (ms) => ({ toMillis: () => ms }) },
    getDocs: async (q) => ({ forEach: (fn) => [...docs.values()].filter((d) => d.proyecto === q.w.v).forEach((d) => fn({ data: () => d })) }),
    setDoc: async (ref, data) => {
      const hay = docs.get(ref.id);
      const nuevo = { ...data, desde: { toMillis: () => ahora } };
      if (hay && hay.uid !== data.uid && hay.venceEn.toMillis() > ahora) { const e = new Error("no"); e.code = "permission-denied"; throw e; }
      if (data.venceEn.toMillis() > ahora + 48 * H) { const e = new Error("no"); e.code = "permission-denied"; throw e; }
      docs.set(ref.id, nuevo);
    },
    deleteDoc: async (ref) => { docs.delete(ref.id); },
  };
  return { F, docs, avanzar: (ms) => { ahora += ms; } };
}
let BS = baseFalsa();
let r1 = await S.tomar(BS.F, { proyecto: "datos", seccion: "s1", uid: "u1", nombre: "Ana", archivos: ["a.js"], piezas: { "a.js#uno": "ff" } }, AHORA);
ok(r1.ok && BS.docs.has("datos__s1") && BS.docs.get("datos__s1").piezas["a.js#uno"] === "ff", "semáforo: tomar deja el aviso con las huellas");
let r2 = await S.tomar(BS.F, { proyecto: "datos", seccion: "s1", uid: "u2", nombre: "Beto" }, AHORA);
ok(!r2.ok && r2.estado.estado === "ocupada" && r2.estado.quien === "Ana", "semáforo: otra persona no puede tomar una sección ocupada");
let r3 = await S.tomar(BS.F, { proyecto: "datos", seccion: "s1", uid: "u1", nombre: "Ana" }, AHORA + H);
ok(r3.ok, "semáforo: quien lo tiene puede renovarlo");
let r4 = await S.tomar(BS.F, { proyecto: "datos", seccion: "s2", uid: "u2", nombre: "Beto" }, AHORA);
ok(r4.ok, "semáforo: otra sección es independiente");
BS.avanzar(25 * H);
let r5 = await S.tomar(BS.F, { proyecto: "datos", seccion: "s1", uid: "u2", nombre: "Beto" }, AHORA + 25 * H);
ok(r5.ok && BS.docs.get("datos__s1").uid === "u2", "semáforo: cuando vence, otra persona la puede tomar");
await S.soltar(BS.F, "datos", "s1");
ok(!BS.docs.has("datos__s1"), "semáforo: soltar levanta el aviso");
// la carrera: miramos libre y, antes de escribir, la tomó otra persona
BS = baseFalsa();
const listarOrig = BS.F.getDocs; let primera = true;
BS.F.getDocs = async (q) => { const r = await listarOrig(q); if (primera) { primera = false; return { forEach: () => {} }; } return r; };
BS.docs.set("datos__s3", { proyecto: "datos", seccion: "s3", uid: "u9", nombre: "Carla", venceEn: { toMillis: () => AHORA + H }, desde: { toMillis: () => AHORA } });
const rc = await S.tomar(BS.F, { proyecto: "datos", seccion: "s3", uid: "u1", nombre: "Ana" }, AHORA);
ok(!rc.ok && rc.carrera && rc.estado.quien === "Carla", "semáforo: si alguien la toma justo en el medio, las reglas lo frenan y se le cuenta quién");
const dn = S.datosNuevos({ proyecto: "p", seccion: "s", uid: "u", nombre: "x".repeat(200), horas: 500, ahoraMs: AHORA }, BS.F);
ok(dn.nombre.length === 80 && dn.venceEn.toMillis() - AHORA <= 47 * H, "semáforo: el nombre se acota y la duración nunca pasa del tope de las reglas");

/* ── la pantalla (las partes puras) ── */
const ops = I.htmlOpciones([{ id: "s1", titulo: "Una" }, { id: "s2", titulo: "Dos" }], { s2: { uid: "u2", nombre: "Beto", venceEn: AHORA + 2 * H } }, AHORA, "u1", (s) => s);
ok(ops.includes("🟢 libre") && ops.includes("🔴 la está editando Beto"), "pantalla: cada sección muestra su semáforo");
const rv = I.resumenDeVuelta({ cambiados: [{ ruta: "a.js", piezas: ["uno"] }], rechazadas: [{ ruta: "b.js", nombre: "x", motivo: "no existe" }], avisos: [], conflictos: [{ ruta: "a.js", nombre: "uno" }] }, { liberado: false });
ok(rv.some((l) => l.includes("⛔")) && rv.some((l) => l.includes("sigue puesto")), "pantalla: un conflicto se dice fuerte y el aviso NO se levanta");
const rv2 = I.resumenDeVuelta({ cambiados: [{ ruta: "a.js", piezas: ["uno"] }], rechazadas: [], avisos: [], conflictos: [] }, { liberado: true });
ok(rv2.some((l) => l.includes("levantado")) && !rv2.some((l) => l.includes("⛔")), "pantalla: sin conflicto, el aviso se levanta");

/* ── el MAPA.md real de la raíz: se avisa la deriva, no se rompe el banco ── */
if (existsSync(join(raiz, "MAPA.md"))) {
  const md = await readFile(join(raiz, "MAPA.md"), "utf8");
  const listaReal = [];
  const rec = async (dir, base) => { for (const e of await (await import("node:fs/promises")).readdir(dir, { withFileTypes: true })) { if (/^(\.git$|node_modules$)/.test(e.name)) continue; const r = base ? base + "/" + e.name : e.name; if (e.isDirectory()) await rec(join(dir, e.name), r); else if (K.esArchivoDeSitio(r)) listaReal.push(r); } };
  await rec(raiz, "");
  const c = K.compararMapa(K.filasDelMapa(md).map((f) => f.ruta), listaReal);
  ok(K.filasDelMapa(md).length > 5, "MAPA.md: tiene filas");
  if (c.sinDescribir.length || c.fantasmas.length) console.log(`⚠ MAPA.md desactualizado (no rompe el banco): sin describir ${JSON.stringify(c.sinDescribir)} · filas huérfanas ${JSON.stringify(c.fantasmas)}. Corré: node herramientas/secciones.mjs mapa`);
}

/* ── los mapas reales de la raíz ── */
if (existsSync(join(raiz, "secciones.json"))) {
  const cfg = JSON.parse(await readFile(join(raiz, "secciones.json"), "utf8"));
  for (const iv of cfg.secciones) {
    const rr = await K.construir(cfg, iv.id, (ruta) => readFile(join(raiz, ruta), "utf8"));
    ok(rr.avisos.length === 0, `secciones.json · ${iv.id}: sin avisos (${rr.avisos.join(" | ")})`);
    ok(rr.tokens < (cfg.limiteTokens || 30000), `secciones.json · ${iv.id}: entra en el límite (${rr.tokens})`);
    ok(!/\b(?=[A-Za-z0-9]*\d)(?=[A-Za-z0-9]*[a-z])(?=[A-Za-z0-9]*[A-Z])[A-Za-z0-9]{28}\b/.test(rr.md), `secciones.json · ${iv.id}: el paquete no lleva nada que parezca un UID`);
    ok(!/AIza[0-9A-Za-z_-]{30,}/.test(rr.md), `secciones.json · ${iv.id}: el paquete no lleva una clave`);
    ok(rr.md.includes("## De qué depende cada pieza") && rr.md.includes("¿Está cerrada esta sección?"), `secciones.json · ${iv.id}: trae dependencias y el veredicto de cierre`);
    // la vuelta de punta a punta: devolver cada pieza editable tal cual la deja el archivo
    const iv2 = cfg.secciones.find((x) => x.id === iv.id);
    const piezas = [...rr.md.matchAll(/### EDITAR · `([^`]+)` · `([^`]+)`\n\n(`{3,})js\n([\s\S]*?)\n\3\n/g)].map((m) => m[4]);
    if (piezas.length) {
      const res = await K.aplicarSeccion(cfg, iv.id, "`````js\n" + piezas.join("\n\n") + "\n`````", (ruta) => readFile(join(raiz, ruta), "utf8"), rr.huellas);
      ok(res.conflictos.length === 0 && res.rechazadas.length === 0, `secciones.json · ${iv.id}: devolver sus piezas tal cual las acepta todas (${JSON.stringify(res.rechazadas)})`);
      for (const c of res.cambiados) ok(c.texto === c.original, `secciones.json · ${iv.id}: devolverlas sin cambios deja ${c.ruta} IDÉNTICO`);
    }
  }
}

/* ── paquete-4: los archivos viajan COMPLETOS (Mauro, 14-nov-2026) ── */
{
  const completo = await K.construir(CFG, "a", leerFx, { modo: "auto" });
  ok(completo.enteros.includes("f.js") && completo.porPiezas.length === 0, "paquete-4 · auto: un archivo chico va ENTERO aunque el mapa le ponga tramos");
  ok(completo.md.includes("P.otra = () => 1;") && completo.md.includes("P.esc = (s)"), "paquete-4 · auto: viaja todo el archivo, también lo que el mapa no pedía");
  ok(completo.md.includes("## Cómo se integra lo que devuelvas") && completo.md.includes("## Qué tiene que ir publicado con tu cambio") && completo.md.includes("registro de tanda"), "paquete-4: trae la guía de integración, lo que tiene que ir publicado y el registro");
  ok(completo.md.includes("COMPLETOS") && completo.md.includes("Sellos y documentación"), "paquete-4: pide los archivos completos y el sello y la documentación");
  const piezas = await K.construir(CFG, "a", leerFx, { modo: "piezas" });
  ok(piezas.porPiezas.includes("f.js") && !piezas.md.includes("P.otra = () => 1;"), "paquete-4 · piezas: como antes, sólo lo que el mapa pide");
  const porDefecto = await K.construir(CFG, "a", leerFx);
  ok(porDefecto.modo === "piezas" && porDefecto.porPiezas.includes("f.js"), "paquete-4: sin pedir modo, la biblioteca se comporta como paquete-3");
  const GRANDE = SRC + "\n// " + "x".repeat(K.ENTERO_MAX);
  const leerG = async (r) => ({ "f.js": GRANDE, "n.js": SRC, "r.txt": REGLAS })[r];
  const g1 = await K.construir(CFG, "a", leerG, { modo: "auto" });
  ok(g1.porPiezas.includes("f.js"), "paquete-4 · auto: un archivo de más de ENTERO_MAX va por piezas (no entra cómodo en una sesión gratuita)");
  const g2 = await K.construir(CFG, "a", leerG, { modo: "completo" });
  ok(g2.enteros.includes("f.js"), "paquete-4 · completo: lo pedido a propósito va entero pese lo que pese");
  const t = await K.tamanos(CFG, "a", leerG, "auto");
  ok(t.length === 1 && t[0].ruta === "f.js" && t[0].entero === false && t[0].tokens > 20000, "paquete-4: tamanos() dice cuánto pesa y cómo viajaría");
  // la vuelta: un archivo entero con un cambio se acepta, se reconoce como completo y no se pierde nada
  const arreglado = SRC.replace('P.otra = () => 1;', 'P.otra = () => 2;');
  const vuelta = await K.aplicarSeccion(CFG, "a", "```js\n// ── f.js: líneas 1–" + arreglado.split("\n").length + " ──\n" + arreglado + "\n```", leerFx, completo.huellas, "auto");
  ok(vuelta.cambiados.length === 1 && vuelta.cambiados[0].completo && vuelta.cambiados[0].texto.includes("P.otra = () => 2;") && vuelta.rechazadas.length === 0, "paquete-4 · vuelta: el archivo entero con su cambio se acepta y queda completo");
  ok(vuelta.cambiados[0].texto.includes("P.esc = (s)") && vuelta.cambiados[0].texto.includes("import { auth, db }"), "paquete-4 · vuelta: no se pierde nada del resto del archivo");
  const alterado = await K.aplicarSeccion(CFG, "a", "```js\n// ── f.js: líneas 1–9 ──\n" + arreglado + "\n```", async (r) => leerFx(r).then((x) => r === "f.js" ? x.replace("P.otra = () => 1;", "P.otra = () => 9;") : x), completo.huellas, "auto");
  ok(alterado.conflictos.length === 1, "paquete-4 · vuelta: si alguien tocó el archivo mientras tanto, se AVISA el choque");
}

console.log(mal ? `✗ ${mal} de ${n} fallan` : `✓ ${n} comprobaciones, todas bien`);
process.exit(mal ? 1 : 0);
