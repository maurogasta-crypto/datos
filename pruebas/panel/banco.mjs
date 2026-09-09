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
/* {merge:true} tiene que MEZCLAR, como el Firestore de verdad. Con la versión
   que reemplazaba el documento entero, el banco decía que guardar una respuesta
   borraba el título del pendiente — un error que no existe en producción. Un
   doble falso que miente distinto que el real no prueba nada. */
const clonar = (o) => JSON.parse(JSON.stringify(o));
const escribir = (ref, datos, opts) => {
  const m = (BASE[ref.__c] ||= {});
  m[ref.__id] = (opts && opts.merge)
    ? { ...(m[ref.__id] || {}), ...clonar(datos) }
    : clonar(datos);
};
const setDoc = async (ref, datos, opts) => escribir(ref, datos, opts);
const deleteDoc = async (ref) => { delete (BASE[ref.__c] || {})[ref.__id]; };
const serverTimestamp = () => "2026-09-09";
const writeBatch = () => {
  const cola = [];
  return {
    set: (ref, datos, opts) => cola.push([ref, datos, opts]),
    commit: async () => cola.forEach(([ref, datos, opts]) => escribir(ref, datos, opts))
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
  modSrc + "\n return { pintarFichas, leerFichas, abrirFicha, FICHAS: () => FICHAS, estadoActual, leer, pintar, abrirPendiente, PENDIENTES: () => PENDIENTES, leerProtocolos, pintarProtocolos, abrirRegla, PROTOCOLOS: () => PROTOCOLOS };");

/* La pantalla arranca sin sesión y muestra la puerta; para probar las fichas
   hace falta estar adentro, así que se fuerza el usuario. */
P.quienEntra = async () => ({ uid: "uid-de-prueba" });

const api = correr(P, $, {}, {}, doc, setDoc, deleteDoc, collection,
  getDocs, serverTimestamp, writeBatch);

/* ---- utilidades de prueba ---- */
const AMBITOS_OK = ["general","casaverde","casayourte","remate","panel","datos"];
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
ok(JSON.stringify(Object.keys(vuelta).sort()) ===
   '["generado","panel","pendientes","protocolos","proyectos","reglasTocadas","sinResponder","tocados"]',
   "el estado tiene esas ocho claves y ninguna más");
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


console.log("\n13 · el circuito: yo pregunto, Mauro responde, la respuesta vuelve");
/* Es el motivo de existir del panel como canal. Si esto falla, una pregunta
   se pierde entre tandas — que es justo lo que se quiso evitar. */
/* El grupo 10 vacía la base a propósito. Se repone acá para no depender del
   orden: una prueba que sólo pasa si la anterior dejó todo como estaba es una
   prueba frágil. */
$("entrada").value = JSON.stringify(parte);
$("btnRevisar").click(); await esperar();
$("btnAplicar").click(); await esperar(); sí();
await esperar(); await esperar(); await esperar();
const unId = api.PENDIENTES()[0] ? api.PENDIENTES()[0].id : null;
ok(!!unId, "hay pendientes en la base para probar");

// (a) mando un parte con una pregunta
$("entrada").value = JSON.stringify({
  panel: "pendientes",
  pendientes: [{ id: unId, pregunta: "¿Publico esto o lo dejo en borrador?" }]
});
$("btnRevisar").click(); await esperar();
ok($("btnAplicar").disabled === false, "la pregunta aparece como cambio");
$("btnAplicar").click(); await esperar(); sí();
await esperar(); await esperar(); await esperar();
const conPreg = api.PENDIENTES().find((p) => p.id === unId);
ok(conPreg.pregunta.startsWith("¿Publico"), "quedó guardada la pregunta");
ok(BASE.pendientes[unId].tocado === false, "aplicar un parte apaga la marca «lo tocó Mauro»");

// (b) el tablero la señala
api.pintar();
ok($("c-pregunta").textContent === "1", "el contador dice que hay 1 sin responder");
ok($("lista").innerHTML.includes("sin responder"), "y la tarjeta lo dice");
ok($("lista").innerHTML.includes("sinresponder"), "y se marca distinto");

// (c) Mauro la abre y contesta
api.abrirPendiente(conPreg);
ok(!$("t-editor").classList.contains("hide"), "se abre el pendiente");
ok(!$("t-caja-pregunta").classList.contains("hide"), "con la caja de la pregunta");
$("t-respuesta").value = "Publicalo.";
$("t-estado").querySelector('[data-v="hecho"]').click();
$("t-nota").value = "Lo miré en el teléfono.";
$("btnPendGuardar").click(); await esperar(); await esperar(); await esperar();
const resp = api.PENDIENTES().find((p) => p.id === unId);
ok(resp.respuesta === "Publicalo.", "guardó la respuesta");
ok(resp.estado === "hecho", "y el estado que marcó");
ok(resp.tocado === true, "y queda marcado como tocado por Mauro");
ok(resp.historia.filter((h) => h.por === "mauro").length === 2,
   "la historia sumó sus dos líneas (el cambio y la nota)");
ok(resp.historia.length > 2, "sin pisar la historia previa");

// (d) sale en la exportación, señalado
$("btnVerEstado").click(); await esperar();
const paq = JSON.parse($("salida").value);
ok(paq.tocados.includes(unId), "la exportación lo lista en «tocados»");
const salido = paq.pendientes.find((p) => p.id === unId);
ok(salido.respuesta === "Publicalo." && salido.pregunta.startsWith("¿Publico"),
   "y lleva la pregunta y la respuesta adentro");
ok(salido.titulo === "Otro título" || salido.titulo.length > 0,
   "y guardar una respuesta NO borró el resto del pendiente (merge de verdad)");

// (e) un parte mío que NO repita la respuesta no la borra
$("entrada").value = JSON.stringify({
  panel: "pendientes",
  pendientes: [{ id: unId, titulo: "Otro título", quien: "claude" }]
});
$("btnRevisar").click(); await esperar();
$("btnAplicar").click(); await esperar(); sí();
await esperar(); await esperar(); await esperar();
const despues = api.PENDIENTES().find((p) => p.id === unId);
ok(despues.respuesta === "Publicalo.", "la respuesta de Mauro sobrevive a un parte que no la menciona");
ok(despues.titulo === "Otro título", "(y el parte sí cambió lo que traía)");

console.log("\n14 · la vuelta sigue sin perder nada, ahora con preguntas");
$("btnVerEstado").click(); await esperar();
$("entrada").value = $("salida").value;
$("btnRevisar").click(); await esperar();
ok($("estadoPegar").textContent === "No hay nada nuevo.",
   "exportar e importar siguen siendo la misma cosa");


console.log("\n15 · las reglas: entran por parte, se editan acá y salen");
await api.leerProtocolos(); await esperar();
ok($("r-estado").textContent.includes("Todavía no hay ninguna"), "arranca sin reglas");

// (a) yo propongo reglas en un parte, una general y una de un sitio
$("entrada").value = JSON.stringify({ panel: "pendientes", protocolos: [
  { id: "general:completos", titulo: "Archivos completos, nunca diffs", ambito: "general",
    regla: "Toda modificación se entrega como archivo completo.",
    porQue: "Se trabaja desde el teléfono, con la web de GitHub.", orden: 1 },
  { id: "remate:monedas", titulo: "Cada moneda es un sistema aparte", ambito: "remate",
    regla: "UYU y USD nunca se suman.", porQue: "Un total mezclado no significa nada.", orden: 1 },
  { id: "general:auditoria", titulo: "Auditoría de protocolos", ambito: "general",
    regla: "Revisar si una mejora de un sitio llegó a los otros.", orden: 99 }
]});
$("btnRevisar").click(); await esperar();
ok($("btnAplicar").textContent.includes("3"), "las tres aparecen como cambio");
ok($("revision").innerHTML.includes("regla ·"), "y la revisión dice que son reglas");
$("btnAplicar").click(); await esperar(); sí(); await esperar(); await esperar(); await esperar();
ok(Object.keys(BASE.protocolos || {}).length === 3, "se escribieron en «protocolos», no en otra colección");

// (b) el filtro por sitio
api.pintarProtocolos();
ok($("r-reglas").innerHTML.includes("remateTaller"), "agrupa por sitio con su nombre legible");
$("r-ambito").value = "remate"; api.pintarProtocolos();
ok($("r-estado").textContent === "1 de 3", "el filtro por sitio deja una sola");
$("r-ambito").value = ""; api.pintarProtocolos();

// (c) Mauro edita una
const reg = api.PROTOCOLOS().find((r) => r.id === "remate:monedas");
api.abrirRegla(reg);
ok($("r-titulo").value === "Cada moneda es un sistema aparte", "abre con lo que había");
ok($("r-de").value === "remate", "y con su sitio marcado");
$("r-porque").value = "Ya pasó una vez: un total mezclado no significa nada.";
$("r-vigencia").querySelector('[data-v="propuesta"]').click();
$("btnReglaGuardar").click(); await esperar(); await esperar(); await esperar();
const edit = api.PROTOCOLOS().find((r) => r.id === "remate:monedas");
ok(edit.porQue.startsWith("Ya pasó"), "guardó el porqué");
ok(edit.vigencia === "propuesta", "y la vigencia");
ok(edit.tocado === true, "y queda marcada como tocada por Mauro");
ok(edit.regla === "UYU y USD nunca se suman.", "sin borrar lo que no tocó");

// (d) la auditoría
ok(!$("caja-auditoria").classList.contains("hide"), "la caja de auditoría aparece");
ok($("r-auditoria").textContent.includes("Todavía no"), "y dice que no se hizo ninguna");
$("btnAuditoria").click(); await esperar(); sí(); await esperar(); await esperar(); await esperar();
ok($("r-auditoria").textContent.includes("La última fue"), "anotarla la registra");

// (e) salen en el paquete
$("btnVerEstado").click(); await esperar(); await esperar();
const paq2 = JSON.parse($("salida").value);
ok(paq2.protocolos.length === 3, "las tres salen en la exportación");
ok(paq2.reglasTocadas.includes("remate:monedas"), "y se señala la que tocó Mauro");
ok(paq2.protocolos.find((r) => r.id === "general:auditoria").ultima,
   "la fecha de la auditoría viaja con su regla");

console.log("\n16 · la vuelta sigue sin perder nada, ahora con reglas");
$("entrada").value = $("salida").value;
$("btnRevisar").click(); await esperar();
ok($("estadoPegar").textContent === "No hay nada nuevo.",
   "exportar e importar siguen siendo la misma cosa");

console.log("\n17 · una colección nueva entra con su regla, en la misma tanda");
/* La regla de oro del ecosistema, y acá se puede comprobar sola: rige el
   cierre `if false`, así que una colección sin bloque propio queda inaccesible
   y la pantalla no anda. Se mira el archivo Y el texto que arma el panel: la
   copia del repo se desactualiza en silencio, el que se pega es el otro. */
const reglasTxt = fs.readFileSync(RAIZ + "reglas.txt", "utf8");
["proyectos", "pendientes", "tandas", "fichas", "protocolos"].forEach((c) => {
  ok(new RegExp("match /" + c + "/\\{id\\}").test(reglasTxt), "reglas.txt declara " + c);
  ok(html.includes("match /" + c + "/{id}"), "y el texto que arma el panel también declara " + c);
});
ok(/match \/\{document=\*\*\} \{ allow read, write: if false; \}/.test(reglasTxt),
   "y el cierre sigue negando todo lo demás");


console.log("\n18 · el parte de reglas real entra limpio");
/* No alcanza con que el JSON sea válido: tiene que pasar por la revisión del
   panel sin descartes y quedar en la base tal cual. */
BASE.protocolos = {};
await api.leerProtocolos(); await esperar();
const semilla = JSON.parse(fs.readFileSync("parte-protocolos.json", "utf8"));
$("entrada").value = JSON.stringify(semilla);
$("btnRevisar").click(); await esperar();
ok(!$("revision").innerHTML.includes("se descartaron"), "la revisión no descarta ninguna");
ok($("btnAplicar").textContent.includes(String(semilla.protocolos.length)),
   "propone escribir las " + semilla.protocolos.length);
$("btnAplicar").click(); await esperar(); sí(); await esperar(); await esperar(); await esperar();
ok(api.PROTOCOLOS().length === semilla.protocolos.length, "quedaron todas en la base");

const ambitos = new Set(api.PROTOCOLOS().map((r) => r.ambito));
ok([...ambitos].every((a) => AMBITOS_OK.includes(a)),
   "todos los ámbitos existen en el desplegable · " + [...ambitos].join(", "));
ok(api.PROTOCOLOS().some((r) => r.id === "general:auditoria" ),
   "viene la regla de la auditoría, que es la que enciende su caja");
api.pintarProtocolos();
ok(!$("caja-auditoria").classList.contains("hide"), "y la caja aparece");

$("btnVerEstado").click(); await esperar(); await esperar();
$("entrada").value = $("salida").value;
$("btnRevisar").click(); await esperar();
ok($("estadoPegar").textContent === "No hay nada nuevo.", "y la vuelta sigue sin pérdida");

console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nTodo en orden.\n");
process.exit(fallos ? 1 : 0);
