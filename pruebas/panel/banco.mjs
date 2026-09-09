/* Banco de pruebas: DOM real (jsdom) y Firestore de mentira. Corre el código
   tal cual está en index.html, sin tocarlo. */
import { JSDOM } from "jsdom";
import fs from "node:fs";

const RAIZ = "/home/user/panel/";
const html = fs.readFileSync(RAIZ + "index.html", "utf8");

/* ---- Firestore de mentira ---- */
const BASE = {};                       // { coleccion: { id: datos } }
let n = 0;
const collection = (db, c) => ({ __c: c });
/* Una referencia de verdad expone .id — el panel lo usa para el id nuevo. */
const ref = (c, id) => ({ __c: c, __id: id, id });
const doc = (a, c, id) => a && a.__c ? ref(a.__c, "auto" + (++n)) : ref(c, id);
const getDocs = async (ref) => {
  const m = BASE[ref.__c] || {};
  return { forEach: (cb) => Object.keys(m).forEach((k) => cb({ id: k, data: () => m[k] })) };
};
const setDoc = async (ref, datos) => { (BASE[ref.__c] ||= {})[ref.__id] = JSON.parse(JSON.stringify(datos)); };
const deleteDoc = async (ref) => { delete (BASE[ref.__c] || {})[ref.__id]; };
const serverTimestamp = () => "2026-09-09";
const writeBatch = () => {
  const cola = [];
  return {
    set: (ref, datos) => cola.push([ref, datos]),
    commit: async () => cola.forEach(([ref, datos]) => {
      const m = (BASE[ref.__c] ||= {});
      m[ref.__id] = { ...(m[ref.__id] || {}), ...JSON.parse(JSON.stringify(datos)) };
    })
  };
};

/* ---- DOM ---- */
const dom = new JSDOM(html, { runScripts: "outside-only" });
const { window } = dom;
global.window = window; global.document = window.document;
Object.defineProperty(globalThis, "navigator", { value: { clipboard: { writeText: async () => {} } }, configurable: true });
window.scrollTo = () => {};
window.HTMLElement.prototype.scrollIntoView = () => {};
window.URL.createObjectURL = () => "blob:prueba";
window.URL.revokeObjectURL = () => {};
global.URL = window.URL; global.Blob = window.Blob;

/* ---- el núcleo real, sin su import de firebase ---- */
const sinImports = (src) => src.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm, "");
const nucleoSrc = sinImports(fs.readFileSync(RAIZ + "nucleo.js", "utf8"))
  .replace(/^export\s+/gm, "").replace(/^\{[^}]*\};\s*$/gm, "");
const nucleo = new Function("auth", "db", "signInWithEmailAndPassword", "signOut",
  "sendPasswordResetEmail", "onAuthStateChanged", nucleoSrc + "\n return { P, $ };");
const { P, $ } = nucleo({}, {}, ()=>{}, ()=>{}, ()=>{}, ()=>{});

/* ---- el módulo de index.html ---- */
const modSrc = sinImports(/<script type="module">([\s\S]*?)<\/script>/.exec(html)[1]);
const correr = new Function("P","$","db","auth","doc","setDoc","deleteDoc","collection",
  "getDocs","serverTimestamp","writeBatch",
  modSrc + "\n return { pintarFichas, leerFichas, abrirFicha, FICHAS: () => FICHAS, estadoActual, leer, PENDIENTES: () => PENDIENTES };");

/* La pantalla arranca sin sesión y muestra la puerta; para probar las fichas
   hace falta estar adentro, así que se fuerza el usuario. */
P.quienEntra = async () => ({ uid: "uid-de-prueba" });

const api = correr(P, $, {}, {}, doc, setDoc, deleteDoc, collection,
  getDocs, serverTimestamp, writeBatch);

/* ---- utilidades de prueba ---- */
let fallos = 0;
const ok = (c, q) => { console.log((c ? "  ok   " : "  FALLA") + "  " + q); if (!c) fallos++; };
const esperar = () => new Promise((r) => setTimeout(r, 0));
const sí = () => { const b = document.querySelector(".capa [data-si]"); if (b) b.click(); };

await esperar(); await esperar();

console.log("\n1 · la base vacía");
await api.leerFichas();
ok($("f-estado").textContent.includes("Todavía no hay ninguna"), "invita a crear la primera");

console.log("\n2 · crear una ficha");
api.abrirFicha(null);
ok(!$("f-editor").classList.contains("hide"), "se abre el editor");
ok($("btnFichaBorrar").classList.contains("hide"), "una ficha nueva no ofrece borrar");
$("f-titulo").value = "Cuenta de Cloudinary de Casa Verde";
$("f-notas").value = "La consola la abre Mauro.";
const filas = $("f-campos").querySelectorAll(".par");
filas[0].querySelector(".k").value = "titular";
filas[0].querySelector(".v").value = "Mauro";
$("btnCampo").click();
const f2 = $("f-campos").querySelectorAll(".par")[1];
f2.querySelector(".k").value = "mail"; f2.querySelector(".v").value = "el de siempre";
$("btnFichaGuardar").click(); await esperar(); await esperar(); await esperar();
ok(Object.keys(BASE.fichas || {}).length === 1, "se escribió una sola ficha");
ok(api.FICHAS()[0].campos.length === 2, "guardó los dos datos");
ok($("f-editor").classList.contains("hide"), "vuelve a la lista sola");

console.log("\n3 · una ficha con acentos, y la búsqueda");
api.abrirFicha(null);
$("f-titulo").value = "Teléfono de la escribanía";
$("f-campos").querySelector(".k").value = "número";
$("f-campos").querySelector(".v").value = "099 000 000";
$("btnFichaGuardar").click(); await esperar(); await esperar(); await esperar();
ok(api.FICHAS().length === 2, "hay dos fichas");
$("f-buscar").value = "telefono"; api.pintarFichas();
ok($("f-estado").textContent === "1 de 2", "busca «telefono» y encuentra «Teléfono»");
$("f-buscar").value = "CLOUDINARY"; api.pintarFichas();
ok($("f-estado").textContent === "1 de 2", "no le importan las mayúsculas");
$("f-buscar").value = "Mauro"; api.pintarFichas();
ok($("f-estado").textContent === "1 de 2", "busca también adentro de los datos");
$("f-buscar").value = "nada de nada"; api.pintarFichas();
ok($("f-fichas").innerHTML.includes("Nada con esa búsqueda"), "lo dice cuando no hay");
$("f-buscar").value = ""; api.pintarFichas();

console.log("\n4 · editar: sacar un dato tiene que sacarlo de la base");
const cloud = api.FICHAS().find((f) => f.titulo.includes("Cloudinary"));
api.abrirFicha(cloud);
ok($("f-campos").querySelectorAll(".par").length === 2, "trae los dos datos al editor");
ok(!$("btnFichaBorrar").classList.contains("hide"), "una ficha que existe sí ofrece borrar");
$("f-campos").querySelectorAll(".par")[1].querySelector(".quitar").click();
$("btnFichaGuardar").click(); await esperar(); await esperar(); await esperar();
const guardada = BASE.fichas[cloud.id];
ok(guardada.campos.length === 1, "en la base quedó UN dato, no dos");
ok(guardada.creadoEn === cloud.creadoEn, "no se pisó la fecha de creación");

console.log("\n5 · sin título no se guarda");
const antes = JSON.stringify(BASE.fichas);
api.abrirFicha(null);
$("f-titulo").value = "   ";
$("btnFichaGuardar").click(); await esperar(); await esperar();
ok(JSON.stringify(BASE.fichas) === antes, "no escribió nada");
ok($("aviso").className.includes("malo"), "y avisa por qué");

console.log("\n6 · borrar, con pregunta de por medio");
api.abrirFicha(api.FICHAS()[0]);
const cuantas = api.FICHAS().length;
$("btnFichaBorrar").click(); await esperar();
ok(!!document.querySelector(".capa"), "pregunta antes");
sí(); await esperar(); await esperar(); await esperar();
ok(api.FICHAS().length === cuantas - 1, "borró una");

console.log("\n7 · nada saca más de una ficha por vez");
/* Se mira el DOM, no el texto del archivo: lo que importa es que no exista un
   control que junte varias fichas en un solo texto. Cada «Copiar» carga UN
   valor, y la cuenta de botones lo demuestra. */
api.abrirFicha(null);
$("f-titulo").value = "Otra";
$("f-campos").querySelector(".k").value = "a"; $("f-campos").querySelector(".v").value = "1";
$("btnCampo").click();
const p2 = $("f-campos").querySelectorAll(".par")[1];
p2.querySelector(".k").value = "b"; p2.querySelector(".v").value = "2";
$("btnFichaGuardar").click(); await esperar(); await esperar(); await esperar();

const copias = [...$("f-fichas").querySelectorAll("[data-copiar]")];
const datos = api.FICHAS().reduce((n, f) => n + (f.campos || []).filter((c) => c.clave || c.valor).length, 0);
ok(copias.length === datos, "hay un «Copiar» por dato, ni uno de más (" + copias.length + ")");
ok(copias.every((b) => api.FICHAS().some((f) => (f.campos || []).some((c) => c.valor === b.dataset.copiar))),
   "cada uno carga el valor de un solo dato");
const botones = [...document.querySelectorAll("#v-fichas button")]
  .map((b) => b.textContent.trim()).filter((t) => t);
ok(!botones.some((t) => /todo|export|descarg/i.test(t)),
   "ningún botón de la pantalla ofrece llevarse el conjunto");


console.log("\n8 · el archivo entra solo");
const parte = JSON.parse(fs.readFileSync("parte-1-inicial.json", "utf8"));
const archivo = { name: "parte-1-inicial.json", text: async () => JSON.stringify(parte) };
Object.defineProperty($("archivo"), "files", { value: [archivo], configurable: true });
$("archivo").dispatchEvent(new window.Event("change"));
await esperar(); await esperar();
ok($("entrada").value.length > 100, "el textarea quedó cargado con el archivo");
ok($("btnAplicar").disabled === false, "y ya revisó solo: hay algo para aplicar");
const cuantos = $("btnAplicar").textContent.match(/\d+/);
ok(cuantos && Number(cuantos[0]) === 14, "14 cosas para escribir (5 proyectos + 9 pendientes)");

$("btnAplicar").click(); await esperar();
sí(); await esperar(); await esperar(); await esperar(); await esperar();
ok(Object.keys(BASE.proyectos || {}).length === 5, "escribió los 5 proyectos");
ok(Object.keys(BASE.pendientes || {}).length === 9, "escribió los 9 pendientes");

console.log("\n9 · lo que sale se puede volver a meter");
$("btnVerEstado").click(); await esperar();
const salida = $("salida").value;
ok(salida.length > 100 && !$("caja-salida").classList.contains("hide"), "muestra el estado");
const vuelta = JSON.parse(salida);
ok(vuelta.proyectos.length === 5 && vuelta.pendientes.length === 9, "salieron los 14");
ok(vuelta.pendientes.every((p) => Array.isArray(p.historia)), "con su historia cada uno");
/* Mirar la estructura, no el texto: el parte tiene un pendiente que se llama
   «las fichas», y buscar esa palabra encuentra el título, no un dato. */
ok(JSON.stringify(Object.keys(vuelta).sort()) === '["generado","panel","pendientes","proyectos"]',
   "el estado tiene esas cuatro claves y ninguna más");
const idsFicha = Object.keys(BASE.fichas || {});
ok(idsFicha.length > 0 && !idsFicha.some((id) => salida.includes(id)),
   "hay fichas en la base y ninguna asomó en la salida");

$("entrada").value = salida;
$("btnRevisar").click(); await esperar();
ok($("estadoPegar").textContent === "No hay nada nuevo.",
   "meterlo de nuevo no cambia nada: la vuelta no pierde ni inventa");

console.log("\n10 · sacar con la base vacía avisa en vez de bajar un archivo hueco");
const guardo = api.PENDIENTES().length;
BASE.proyectos = {}; BASE.pendientes = {};
await api.leer(); await esperar();
$("btnBajarEstado").click(); await esperar();
ok($("aviso").className.includes("malo"), "avisa que no hay nada que sacar");
ok(guardo === 9, "(y antes sí había nueve)");


console.log("\n11 · los números de la dirección son los sellos de verdad");
/* Éste es el que va a fallar solo cuando alguien suba un sello y se olvide de
   la dirección — que es exactamente lo que pasó con estilos.css?v=1 mientras
   estilos.css ya iba por estilos-2, y por eso el teléfono servía el CSS viejo.
   «Un dato en dos lugares diverge en silencio.» */
const nuc = fs.readFileSync(RAIZ + "nucleo.js", "utf8");
const est = fs.readFileSync(RAIZ + "estilos.css", "utf8");
const ini = fs.readFileSync(RAIZ + "firebase-init.js", "utf8");
const lee = (txt, re) => (re.exec(txt) || [])[1];

const fbEnIndex  = lee(html, /from\s+"\.\/(firebase-init\.js[^"]*)"/);
const fbEnNucleo = lee(nuc,  /from\s+"\.\/(firebase-init\.js[^"]*)"/);
ok(fbEnIndex === fbEnNucleo,
   "index.html y nucleo.js piden firebase-init por la MISMA dirección "
   + "(dos direcciones = dos módulos = dos initializeApp) · " + fbEnIndex + " vs " + fbEnNucleo);

const pares = [
  ["nucleo.js",       lee(html, /nucleo\.js\?v=([^"]+)"/),      lee(nuc, /P\.VERSION = "([^"]+)"/)],
  ["estilos.css",     lee(html, /estilos\.css\?v=([^"]+)"/),    lee(est, /Sello:\s*(\S+)/)],
  ["firebase-init.js",lee(html, /firebase-init\.js\?v=([^"]+)"/), lee(ini, /Sello:\s*(\S+)/)]
];
pares.forEach(([q, enDireccion, enArchivo]) =>
  ok(enDireccion === enArchivo,
     q + ": la dirección dice «" + enDireccion + "» y el archivo «" + enArchivo + "»"));

console.log("\n12 · la tabla del README no miente");
/* Se lee la tabla por renglones, no con una expresión regular: el README tiene
   varias tablas y una regex suelta engancha la primera que se le parece. */
const rdTodo = fs.readFileSync(RAIZ + "README.md", "utf8");
/* Sólo desde el título de los sellos: más arriba hay otra tabla que empieza
   igual —la de qué hace cada archivo— y era la que enganchaba. */
const rd = rdTodo.slice(rdTodo.indexOf("## Los sellos de versión"));
const enTabla = (arch) => {
  const r = rd.split("\n").find((l) => l.startsWith("| `" + arch + "` |"));
  if (!r) return "(no está en la tabla)";
  const celdas = r.split("|").map((c) => c.trim());
  return (celdas[3] || "").replace(/`/g, "");
};
[["nucleo.js", lee(nuc, /P\.VERSION = "([^"]+)"/)],
 ["index.html", lee(html, /P\.PANEL = "([^"]+)"/)],
 ["estilos.css", lee(est, /Sello:\s*(\S+)/)],
 ["firebase-init.js", lee(ini, /Sello:\s*(\S+)/)]
].forEach(([arch, real]) =>
  ok(enTabla(arch) === real, arch + ": README dice «" + enTabla(arch) + "», el archivo «" + real + "»"));

console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nTodo en orden.\n");
process.exit(fallos ? 1 : 0);
