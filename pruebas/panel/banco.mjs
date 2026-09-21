/* Banco de pruebas: DOM real (jsdom) y Firestore de mentira. Corre el código
   tal cual está en index.html, sin tocarlo.

   ── LOS NÚMEROS DE BLOQUE TIENEN HUECOS, Y ES A PROPÓSITO ────────────────
   Faltan el 8, 9, 10, 14, 16, 18, 19, 25, 26, 28, 29 y 31. Todos probaban la
   solapa «Parte» —la entrada por archivo, la revisión, el aplicar por lotes y
   la exportación—, que `panel-16` retiró: desde que el agente escribe directo
   en Firestore, generar un JSON para que Mauro lo pegara era un rodeo hacia un
   lugar donde ya estaba parado.

   Se retiraron los bloques enteros, no se renumeraron los que quedan: los
   números están citados en el README del panel y en el registro de tandas, y
   correrlos rompería esas referencias para no ganar nada. Un hueco se explica;
   una cita que apunta a otro bloque, no.

   Los que sólo usaban el parte para CARGAR datos siguen vivos y ahora usan
   `sembrar()`. */
import { JSDOM } from "jsdom";
import fs from "node:fs";

/* La raíz del panel. El banco vive en `pruebas/panel/` DEL MISMO repositorio
   desde el 2026-09-13 (antes estaba en el repo privado, con la ruta escrita a
   mano), así que sale de dónde está este archivo y no de dónde se lo corre.
   `RAIZ` se sigue pudiendo forzar por variable de entorno para apuntarlo a
   otro clon. Termina en «/» porque abajo se concatena. */
const RAIZ = process.env.RAIZ || new URL("../../", import.meta.url).pathname;
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

/* ---- el SDK de mentira, que se puede hacer fallar ----
   Desde init-3 el panel baja el SDK con `import()` diferido, así que el banco
   tiene que poder simular las dos puntas: que baje y que no. `sdkFalla` es la
   perilla, y el bloque 30 la usa. */
let sdkFalla = false;
const cargarFirebase = async () => {
  if (sdkFalla) {
    const e = new Error("No se pudo cargar el SDK de Firebase desde gstatic.com. "
      + "Suele ser falta de señal o una red que bloquea ese dominio.");
    e.codigo = "sdk-no-baja";
    throw e;
  }
  return true;
};

/* ---- el núcleo real, sin su import de firebase ---- */
const sinImports = (src) => src.replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm, "");
const nucleoSrc = sinImports(fs.readFileSync(RAIZ + "nucleo.js", "utf8"))
  .replace(/^export\s+/gm, "").replace(/^\{[^}]*\};\s*$/gm, "");
const nucleo = new Function("auth", "db", "signInWithEmailAndPassword", "signOut",
  "sendPasswordResetEmail", "onAuthStateChanged", "cargarFirebase",
  nucleoSrc + "\n return { P, $ };");
const { P, $ } = nucleo({}, {}, ()=>{}, ()=>{}, ()=>{}, ()=>{}, cargarFirebase);

/* ---- el módulo de index.html ---- */
const modSrc = sinImports(/<script type="module">([\s\S]*?)<\/script>/.exec(html)[1]);
const correr = new Function("P","$","db","auth","doc","setDoc","deleteDoc","collection",
  "getDocs","serverTimestamp","writeBatch","firebaseConfig",
  modSrc + "\n return { pintarFichas, leerFichas, abrirFicha, FICHAS: () => FICHAS, leer, pintar, abrirPendiente, PENDIENTES: () => PENDIENTES, leerProtocolos, pintarProtocolos, abrirRegla, PROTOCOLOS: () => PROTOCOLOS, trabaA, frenadoPor, arrancar, pintarFichaTecnica, fichasDe, sacarNotaDePlantilla, MARCA_MIA, MARCA_AGENTE, SIN_AGENTE, pintarSitios, verSitio: (s) => { SITIO = s; }, huella, medirReglas, sinComentarios, paraPegar, estadoReglas, queEspera, esPropia, tieneReglas, reglasDelPendiente, botonesDeReglas, copiarReglasDe, marcarPublicadas, bajarReglasDe, armarPlantilla, estadoGuardable, PROYECTOS: () => PROYECTOS, tarjeta, LINEAS: () => LINEAS, lineasDe, choques, pintarLineas, abrirLinea, cerrarLinea, vivaL, diasTomada, ordenarLineas };");

/* La pantalla arranca sin sesión y muestra la puerta; para probar las fichas
   hace falta estar adentro, así que se fuerza el usuario. */
P.quienEntra = async () => ({ uid: "uid-de-prueba" });

/* `firebaseConfig` lo importa el panel de `firebase-init.js`, y lo usa para una
   sola cosa: saber cuál de los proyectos es SU PROPIA base, la única cuyas
   reglas son una plantilla con marcadores. Acá se le pasa el mismo projectId
   que usa la siembra de abajo. */
const api = correr(P, $, {}, {}, doc, setDoc, deleteDoc, collection,
  getDocs, serverTimestamp, writeBatch, { projectId: "datos-830f8" });

/* ---- sembrar la base ----
   HASTA `panel-15` LOS DATOS DE PRUEBA ENTRABAN POR LA SOLAPA «PARTE»: se
   pegaba un JSON, se tocaba Revisar y después Aplicar. Era cómodo —el panel
   hacía el trabajo— pero ataba media docena de bloques a una pantalla que no
   tenía nada que ver con lo que probaban.

   `panel-16` retiró esa solapa: el agente escribe directo en Firestore, así
   que generar un JSON para que Mauro lo pegara era un rodeo hacia un lugar
   donde ya estaba parado. Los bloques que probaban el parte se retiraron con
   él (están listados en la cabecera de este archivo). Los que sólo lo usaban
   para cargar datos usan esto, que escribe en el doble de Firestore como
   escribe el agente: de a un documento y MEZCLANDO, que es lo que hace
   `setDoc({merge:true})`.

   Es más honesto que lo de antes: cada bloque prueba lo que dice probar, y no
   de paso el camino de entrada. */
const sembrar = async (datos) => {
  let hayReglas = false;
  for (const col of ["lineas", "proyectos", "pendientes", "protocolos"]) {
    (datos[col] || []).forEach((d) => {
      const { id, ...resto } = d;
      const m = (BASE[col] ||= {});
      m[id] = { ...(m[id] || {}), ...clonar(resto) };
    });
    if (col === "protocolos" && (datos[col] || []).length) hayReglas = true;
  }
  await api.leer();
  if (hayReglas) await api.leerProtocolos();
  await esperar();
};

/* ---- utilidades de prueba ---- */
const AMBITOS_OK = ["general","casaverde","casayourte","remate","panel","datos","harmonia"];
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

/* ── EL VALOR SE TIENE QUE PODER LEER (panel-28) ──────────────────────────
   Mauro abrió una ficha y no podía leer lo que él mismo había escrito: eran
   dos `input` al 34 % y al 66 %, y en un teléfono el valor entra cortado.
   Lo que se comprueba es que el valor sea una caja que crece y no un `input`,
   y que al abrir una ficha ya venga alta — si `crecer` se llamara antes de
   que el elemento esté en la pantalla, `scrollHeight` daría 0 y volvería a
   quedar de un renglón. */
api.abrirFicha(null);
const cajaV = $("f-campos").querySelector(".v");
ok(cajaV.tagName === "TEXTAREA", "el valor es una caja que crece, no un input de un renglón");
ok($("f-campos").querySelector(".k").tagName === "INPUT", "la clave sigue siendo un input");
ok(cajaV.rows === 1, "una ficha nueva arranca con una caja de un renglón");

/* Una ficha con un valor de varios renglones: la caja tiene que venir más
   alta que una vacía. Es la comprobación que falla si alguien mueve el
   `crecer` de abrirFicha a antes de meter las filas en la pantalla. */
BASE.fichas["larga"] = { titulo: "Una larga", proyecto: "", notas: "",
  campos: [{ clave: "corto", valor: "sí" },
           { clave: "largo", valor: "uno\ndos\ntres\ncuatro\ncinco" }] };
await api.leerFichas(); await esperar();
api.abrirFicha(api.FICHAS().find((f) => f.titulo === "Una larga"));
const cajas = [...$("f-campos").querySelectorAll("textarea.v")];
ok(cajas[1].rows === 5 && cajas[0].rows === 1,
   "un valor de cinco renglones abre con cinco, y uno de una palabra con uno");
ok(cajas[1].value.includes("cinco"), "y el valor entero está ahí, no cortado");
delete BASE.fichas["larga"];
await api.leerFichas(); await esperar();

/* La guía de qué va y qué no en una ficha. Existe porque su ausencia costó
   nueve días con `fichas/` sellada: Mauro dijo que «no encontraba claridad
   sobre qué poner en una ficha», y no la había. */
ok($("f-editor").textContent.includes("punteros cortos"),
   "el editor dice qué va en una ficha");
ok($("f-editor").textContent.includes("bóveda"),
   "y que lo que abre algo no va acá");

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


/* El parte real de la tanda 1, que se sigue usando como semilla: son datos de
   verdad, con la forma que tienen de verdad, y eso vale más que un `{id:"x"}`
   inventado. Lo que se retiró fue el CAMINO de entrada, no los datos. */
const parte = JSON.parse(fs.readFileSync(new URL("./parte-1-inicial.json", import.meta.url), "utf8"));

console.log("\n13 · el circuito: yo pregunto, Mauro responde, la respuesta vuelve");
/* Es el motivo de existir del panel como canal. Si esto falla, una pregunta
   se pierde entre tandas — que es justo lo que se quiso evitar. */
/* El grupo 10 vacía la base a propósito. Se repone acá para no depender del
   orden: una prueba que sólo pasa si la anterior dejó todo como estaba es una
   prueba frágil. */
await sembrar(parte);
const unId = api.PENDIENTES()[0] ? api.PENDIENTES()[0].id : null;
ok(!!unId, "hay pendientes en la base para probar");

// (a) escribo una pregunta
await sembrar({ pendientes: [{ id: unId, pregunta: "¿Publico esto o lo dejo en borrador?" }] });
const conPreg = api.PENDIENTES().find((p) => p.id === unId);
ok(conPreg.pregunta.startsWith("¿Publico"), "quedó guardada la pregunta");

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

// (d) queda en la base entero, que es de donde yo lo leo
const guardado = BASE.pendientes[unId];
ok(guardado.respuesta === "Publicalo." && guardado.pregunta.startsWith("¿Publico"),
   "la pregunta y la respuesta quedan juntas en el documento");
ok(guardado.tocado === true, "y la marca `tocado` queda en la base, no sólo en pantalla");
ok((guardado.titulo || "").length > 0,
   "guardar una respuesta NO borró el resto del pendiente (merge de verdad)");

/* (e) EL APRETÓN DE MANOS, Y QUIÉN LO CIERRA AHORA.

   Hasta `panel-15` la marca `tocado` la apagaba el «aplicar» del parte, y ese
   mismo aplicar preservaba los campos que el JSON no mencionaba. Las dos cosas
   eran del panel, y las dos se fueron con la solapa.

   Hoy las dos son del agente, y salen de UNA sola propiedad de su herramienta:
   `escribir()` en `herramientas/firestore.mjs` REEMPLAZA el documento entero,
   no lo mezcla. De ahí sale que `tocado` se apague solo —no se vuelve a
   escribir— y de ahí sale, también, que la respuesta de Mauro se pierda si el
   agente no la leyó antes de escribir.

   O sea: la respuesta ya NO está protegida por un mecanismo, está protegida
   por la disciplina de leer antes de escribir. Vale la pena que esté dicho en
   voz alta, porque es un grado menos de garantía que antes y el README no
   puede decir lo contrario. */
const antesDeReescribir = { ...BASE.pendientes[unId] };
BASE.pendientes[unId] = { titulo: "Otro título", quien: "claude" };   // como escribe el agente
await api.leer(); await esperar();
ok(BASE.pendientes[unId].tocado === undefined,
   "cuando yo reescribo el pendiente, la marca «lo tocó Mauro» se apaga sola");
ok(api.PENDIENTES().find((p) => p.id === unId).respuesta === undefined,
   "y la respuesta se va con ella si no la leí antes: es disciplina, no mecanismo");

/* Y ahora como corresponde: leyendo primero. Es el camino que el agente tiene
   que seguir, y el que la documentación describe. */
BASE.pendientes[unId] = { ...antesDeReescribir, titulo: "Otro título", quien: "claude", tocado: false };
await api.leer(); await esperar();
const despues = api.PENDIENTES().find((p) => p.id === unId);
ok(despues.respuesta === "Publicalo.", "leyendo antes de escribir, la respuesta de Mauro sobrevive");
ok(despues.titulo === "Otro título", "(y lo que yo sí escribí, cambió)");

console.log("\n15 · las reglas: entran por parte, se editan acá y salen");
await api.leerProtocolos(); await esperar();
ok($("r-estado").textContent.includes("Todavía no hay ninguna"), "arranca sin reglas");

// (a) yo propongo reglas en un parte, una general y una de un sitio
await sembrar({ protocolos: [
  { id: "general:completos", titulo: "Archivos completos, nunca diffs", ambito: "general",
    regla: "Toda modificación se entrega como archivo completo.",
    porQue: "Se trabaja desde el teléfono, con la web de GitHub.", orden: 1 },
  { id: "remate:monedas", titulo: "Cada moneda es un sistema aparte", ambito: "remate",
    regla: "UYU y USD nunca se suman.", porQue: "Un total mezclado no significa nada.", orden: 1 },
  { id: "general:auditoria", titulo: "Auditoría de protocolos", ambito: "general",
    regla: "Revisar si una mejora de un sitio llegó a los otros.", orden: 99 }
]});
ok(Object.keys(BASE.protocolos || {}).length === 3, "se escribieron en «protocolos», no en otra colección");

// (b) el filtro por sitio
api.pintarProtocolos();
/* El nombre sale del catálogo de proyectos, no de una lista aparte: es
   «Rematetaller», como lo escribió el parte. Antes había una segunda copia que
   decía «remateTaller», y esta prueba la sostenía. */
const nomRemate = (api.PROYECTOS ? "" : "") || "Rematetaller";
ok($("r-reglas").innerHTML.includes(nomRemate), "agrupa por sitio con el nombre del catálogo");
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

/* (e) QUEDAN EN LA BASE, que es de donde las leo. Antes esto se comprobaba
   sobre el paquete de la exportación; sin parte, se comprueba un escalón más
   abajo, sobre los documentos. Es la misma garantía y con menos intermediario:
   lo que importa es que la edición de Mauro llegue al lugar del que yo leo. */
ok(Object.keys(BASE.protocolos).length === 3, "las tres quedaron escritas");
ok(BASE.protocolos["remate:monedas"].tocado === true,
   "y la que tocó Mauro queda señalada en su documento");
ok(BASE.protocolos["general:auditoria"].ultima,
   "la fecha de la auditoría queda con su regla");

console.log("\n17 · una colección nueva entra con su regla, en la misma tanda");
/* La regla de oro del ecosistema, y acá se puede comprobar sola: rige el
   cierre `if false`, así que una colección sin bloque propio queda inaccesible
   y la pantalla no anda.

   Desde `panel-15` se mira el archivo Y lo que el panel produce con él. No son
   dos copias —es la misma, una vez armada—, pero probar las dos puntas prueba
   la tubería entera: que la colección esté declarada no sirve de nada si el
   reemplazo de los UID se la come por el camino. */
const reglasTxt = fs.readFileSync(RAIZ + "reglas.txt", "utf8");
const reglasArmadas = api.sacarNotaDePlantilla(reglasTxt)
  .split(api.MARCA_MIA).join("UID-MAURO")
  .split(api.MARCA_AGENTE).join("UID-AGENTE");
["proyectos", "pendientes", "tandas", "fichas", "protocolos"].forEach((c) => {
  ok(new RegExp("match /" + c + "/\\{id\\}").test(reglasTxt), "reglas.txt declara " + c);
  ok(reglasArmadas.includes("match /" + c + "/{id}"),
     "y sigue declarada en lo que el panel te da para pegar: " + c);
});
ok(/match \/\{document=\*\*\} \{ allow read, write: if false; \}/.test(reglasTxt),
   "y el cierre sigue negando todo lo demás");


console.log("\n20 · la app instalable");
/* Un archivo que falta en `SHELL` no rompe nada visible: simplemente nunca se
   guarda, y el día sin señal aparece el hueco. Se comprueba acá, no allá. */
const swSrc = fs.readFileSync(RAIZ + "sw.js", "utf8");
/* Del array SHELL y de ningún otro lado: buscar en el archivo entero levanta
   también las rutas del comentario y las del fetch. Es la cuarta prueba de este
   ecosistema que se encuentra a sí misma en un comentario. */
const arraySHELL = /const SHELL = \[([\s\S]*?)\];/.exec(swSrc)[1];
const shell = [...arraySHELL.matchAll(/'([^']+)'/g)].map((m) => m[1]);
shell.filter((u) => u !== "./").forEach((u) =>
  ok(fs.existsSync(RAIZ + u.slice(2)), "existe el archivo de SHELL " + u));
ok(shell.includes("./"), "SHELL guarda también la raíz, que es el start_url");
ok(/const VERSION = '[^']+'/.test(swSrc), "sw.js tiene su VERSION");
ok(swSrc.includes("ignoreSearch"), "la búsqueda en caché ignora el ?v= (si no, tras cada sello el panel abriría pelado sin señal)");
ok(shell.every((u) => !u.includes("?")), "y por eso SHELL no repite los ?v= — no hay tercera copia del sello");

const man = JSON.parse(fs.readFileSync(RAIZ + "manifest.json", "utf8"));
["name", "short_name", "start_url", "scope", "display", "icons"].forEach((k) =>
  ok(man[k] !== undefined, "el manifest declara «" + k + "»"));
ok(man.display === "standalone", "se abre como app, sin barra del navegador");
ok(man.icons.some((i) => i.sizes === "192x192"), "tiene icono de 192");
ok(man.icons.some((i) => i.sizes === "512x512" && /maskable/.test(i.purpose || "")),
   "y uno de 512 recortable, que es el que pide Android");
man.icons.forEach((i) =>
  ok(fs.existsSync(RAIZ + i.src.slice(2)), "existe el icono " + i.src));

ok(html.includes('rel="manifest"'), "index.html enlaza el manifest");
ok(/name="theme-color"/.test(html), "y declara el color de la barra");
ok(html.includes('navigator.serviceWorker.register("./sw.js")'), "y registra el service worker");
ok(/addEventListener\("load"/.test(html), "al terminar de cargar, no antes: instalarse no puede retrasar que abra");

const fbSrc = fs.readFileSync(RAIZ + "firebase-init.js", "utf8");
ok(fbSrc.includes("persistentLocalCache"), "Firestore guarda los datos sin señal");
ok(/catch\s*\([^)]*\)\s*\{[\s\S]{0,200}getFirestore\(app\)/.test(fbSrc),
   "y si el navegador niega el almacenamiento, el panel abre igual");


console.log("\n21 · el selector de app: todo lo que se ve cuelga de él");
BASE.proyectos = {}; BASE.pendientes = {}; BASE.protocolos = {};
await api.leer(); await esperar();
await sembrar({ proyectos: [{ id: "uno", nombre: "App Uno", orden: 1 }, { id: "dos", nombre: "App Dos", orden: 2 }],
  pendientes: [
    { id: "u1", proyecto: "uno", titulo: "Base de datos", quien: "claude", prioridad: "alta" },
    { id: "u2", proyecto: "uno", titulo: "Pantalla que la usa", quien: "claude", esperaA: ["u1"] },
    { id: "u3", proyecto: "uno", titulo: "Publicar reglas", quien: "mauro", prioridad: "alta" },
    { id: "d1", proyecto: "dos", titulo: "Otra cosa", quien: "mauro", prioridad: "baja" }
  ]});
ok(api.PENDIENTES().length === 4, "cargados los cuatro");

$("cual-app").value = ""; $("cual-app").dispatchEvent(new window.Event("change")); await esperar();
ok($("c-total").textContent === "4", "con «todas», cuenta las cuatro");
$("cual-app").value = "uno"; $("cual-app").dispatchEvent(new window.Event("change")); await esperar();
ok($("c-total").textContent === "3", "elegida App Uno, cuenta sólo las suyas");
ok(!$("lista").innerHTML.includes("Otra cosa"), "y la de la otra app no aparece");
ok($("resumen").textContent.includes("App Uno"), "el resumen dice en qué app estás");

console.log("\n22 · lo tuyo y lo mío, separados y explícitos");
ok($("lista").innerHTML.includes("Te toca a vos"), "hay un bloque «Te toca a vos»");
ok($("lista").innerHTML.includes("Lo hago yo"), "y otro «Lo hago yo»");
const iTuyo = $("lista").innerHTML.indexOf("Te toca a vos");
const iMio  = $("lista").innerHTML.indexOf("Lo hago yo");
const iPub  = $("lista").innerHTML.indexOf("Publicar reglas");
ok(iTuyo < iPub && iPub < iMio, "lo que le toca a Mauro está en SU bloque, no en el mío");

console.log("\n23 · las trabas se detectan solas");
const u1 = api.PENDIENTES().find((p) => p.id === "u1");
const u2 = api.PENDIENTES().find((p) => p.id === "u2");
ok(api.trabaA(u1).length === 1, "u1 traba una cosa, y nadie tuvo que escribirlo en u1");
ok(api.frenadoPor(u2).length === 1, "u2 está frenada por u1");
ok(api.trabaA(u2).length === 0, "y u2 no traba a nadie");
ok(!$("aviso-trabas").classList.contains("hide"), "el aviso de arriba aparece");
ok($("aviso-trabas").textContent.includes("1 cosa está trabando"), "y dice cuántas · " + $("aviso-trabas").textContent.trim());
ok($("lista").innerHTML.includes("traba 1 cosa"), "la tarjeta que traba lo dice");
ok($("lista").innerHTML.includes("frenado"), "y la frenada se marca distinto");

/* Al cerrarse la que trababa, la traba desaparece sola: es derivada, no un dato
   que alguien tenga que acordarse de borrar. */
await sembrar({ pendientes: [{ id: "u1", estado: "hecho" }] });
const u1b = api.PENDIENTES().find((p) => p.id === "u1");
const u2b = api.PENDIENTES().find((p) => p.id === "u2");
ok(api.trabaA(u1b).length === 0, "hecha la que trababa, ya no traba");
ok(api.frenadoPor(u2b).length === 0, "y la otra deja de estar frenada");
api.pintar();
ok($("aviso-trabas").classList.contains("hide"), "el aviso se va solo");

console.log("\n24 · el orden es por urgencia, no por nombre");
await sembrar({ pendientes: [
    { id: "u1", estado: "abierto", prioridad: "baja", esperaA: [] },
    { id: "u2", prioridad: "alta", esperaA: [] }
  ]});
api.pintar();
const html2 = $("lista").innerHTML;
ok(html2.indexOf("Pantalla que la usa") < html2.indexOf("Base de datos"),
   "la de prioridad alta va primero aunque su clave sea posterior");
ok(html2.includes("primero") && html2.includes("cuando se pueda"), "y cada una muestra su urgencia");

console.log("\n27 · un proyecto nuevo trae su ámbito de reglas solo");
/* El bug que destapó la entrada de Harmonía: la lista de ámbitos estaba escrita
   a mano y era la segunda copia del catálogo de proyectos. Una regla de un
   proyecto que no estaba en esa lista se veía, pero al abrirla y guardarla el
   desplegable no tenía su opción y la guardaba como «general». Sin aviso. */
BASE.proyectos = {}; BASE.pendientes = {}; BASE.protocolos = {};
await api.leer(); await api.leerProtocolos(); await esperar();
await sembrar({ proyectos: [{ id: "harmonia", nombre: "Harmonía", orden: 6 }],
  protocolos: [{ id: "harmonia:x", titulo: "Una regla de Harmonía", ambito: "harmonia",
                 regla: "La que sea.", orden: 1 }] });

const opciones = [...$("r-de").options].map((o) => o.value);
ok(opciones.includes("harmonia"), "el desplegable ofrece el ámbito del proyecto nuevo · " + opciones.join(","));
ok([...$("r-ambito").options].map((o) => o.value).includes("harmonia"), "y el filtro también");

const reg2 = api.PROTOCOLOS().find((r) => r.id === "harmonia:x");
api.abrirRegla(reg2);
ok($("r-de").value === "harmonia", "al abrirla, queda seleccionado SU ámbito y no otro");
$("btnReglaGuardar").click(); await esperar(); await esperar(); await esperar();
const reg3 = api.PROTOCOLOS().find((r) => r.id === "harmonia:x");
ok(reg3.ambito === "harmonia", "y guardarla sin tocar nada NO se la lleva a «general»");
api.pintarProtocolos();
ok($("r-reglas").innerHTML.includes("Harmonía"), "y se agrupa con el nombre legible del proyecto");


console.log("\n30 · el SDK diferido: el panel abre aunque gstatic no conteste");
/* Es el hallazgo A2 de la primera auditoría. Hasta init-2 el SDK entraba por
   un `import` estático: si gstatic no contestaba, no evaluaba el módulo, no
   evaluaba el núcleo, no evaluaba nada — pantalla EN BLANCO, sin un mensaje.
   Lo que se prueba acá es que ahora abre y dice qué falta. */

sdkFalla = true;
await api.arrancar(); await esperar(); await esperar();
ok(!$("sin-sdk").classList.contains("hide"), "sin SDK, el panel muestra el cartel en vez de nada");
ok($("sin-sdk-que").textContent.includes("gstatic"), "y nombra el dominio que no contestó");
ok($("app").classList.contains("hide") && $("puerta").classList.contains("hide"),
   "no muestra ni la puerta ni el panel, que sin SDK no funcionarían");
ok($("sello").textContent.includes("panel-"), "y el sello sigue a la vista, que es lo primero que se mira");
ok(P.fallaFirebase && P.fallaFirebase.codigo === "sdk-no-baja",
   "el núcleo guarda la causa, no sólo un booleano");

/* Reintentar es el caso real: la señal vuelve y no hay que cerrar la app. */
sdkFalla = false;
await api.arrancar(); await esperar(); await esperar();
ok($("sin-sdk").classList.contains("hide"), "al volver la señal, «Reintentar» saca el cartel");
ok(!$("app").classList.contains("hide"), "y entra al panel");
ok(P.fallaFirebase === null, "y la falla anterior queda limpia");

/* El botón tiene que estar cableado de verdad, no sólo la función. */
sdkFalla = true;
await api.arrancar(); await esperar(); await esperar();
$("btnReintentar").click(); await esperar();
ok(!$("sin-sdk").classList.contains("hide"), "el botón existe y está enganchado");
sdkFalla = false;
await api.arrancar(); await esperar(); await esperar();

console.log("\n32 · la ficha técnica de cada app");
/* Pedida por Mauro el 2026-09-10. Dos zonas otra vez: lo NO sensible sale de
   `proyectos/<id>.tecnica`; el botón «ver» trae de `fichas/` lo que registró
   él. Lo que se prueba es que el puente entre las dos ande, y sobre todo que
   NO exista un camino que junte las fichas en un texto. */
BASE.proyectos = {}; BASE.pendientes = {}; BASE.protocolos = {}; BASE.fichas = {};

BASE.proyectos["harmonia"] = { nombre: "Harmonía", orden: 6, tecnica: [
  { clave: "Repositorio", valor: "toromboto/harmonia",
    nota: "Mauro es colaborador, no dueño", buscar: "github" },
  { clave: "Enlace público", valor: "sin averiguar — harmonia:H1", buscar: "vercel" },
  { clave: "Base de datos", valor: "ninguna", buscar: "firebase" }
] };
BASE.fichas["f1"] = { titulo: "GitHub de Harmonía", proyecto: "harmonia",
  campos: [{ clave: "dueño", valor: "toromboto" }, { clave: "rol de Mauro", valor: "colaborador" }],
  notas: "" };
BASE.fichas["f2"] = { titulo: "Cuenta de otra app", proyecto: "remate",
  campos: [{ clave: "github", valor: "no-corresponde" }], notas: "" };

await api.leer(); await api.leerFichas(); await esperar();
$("cual-app").value = "harmonia";
$("cual-app").dispatchEvent(new window.Event("change")); await esperar(); await esperar();

const ft = $("ficha-tecnica");
ok(!ft.classList.contains("hide"), "con una app elegida, la ficha técnica se muestra");
ok(ft.textContent.includes("toromboto/harmonia"), "y dice el repositorio");
ok(ft.textContent.includes("colaborador"), "y la aclaración de propietario/colaborador");

/* El botón dice cuántas fichas hay ANTES de tocarlo, y se apaga si no hay. */
const btsFT = [...ft.querySelectorAll("[data-ver]")];
ok(btsFT.length === 3, "hay un botón por renglón");
ok(btsFT[0].textContent.includes("1"), "el de GitHub avisa que hay 1 ficha");
ok(btsFT[2].disabled, "el de la base de datos, sin ficha, queda apagado");

btsFT[0].click(); await esperar();
ok($("ft-d-0").textContent.includes("toromboto"), "al tocarlo trae la ficha registrada");
ok(btsFT[0].textContent === "ocultar", "y el botón pasa a «ocultar»");
btsFT[0].click(); await esperar();
ok($("ft-d-0").classList.contains("hide"), "y se vuelve a cerrar");

/* Una ficha de OTRO proyecto no puede aparecer acá. */
btsFT[0].click(); await esperar();
ok(!$("ft-d-0").textContent.includes("no-corresponde"),
   "no se cuela una ficha de otro proyecto");

/* LA REGLA QUE NO SE NEGOCIA: ningún botón junta las fichas en un texto. */
const juntar = [...ft.querySelectorAll("button")].filter((b) =>
  /todo|exportar|copiar todo|bajar/i.test(b.textContent));
ok(juntar.length === 0, "no hay ningún botón que junte las fichas en un texto");
ok(api.fichasDe("harmonia", "").length === 0, "una búsqueda vacía no devuelve TODAS las fichas");

/* Sin app elegida no se muestra: es información de una app. */
$("cual-app").value = ""; $("cual-app").dispatchEvent(new window.Event("change")); await esperar();
ok(ft.classList.contains("hide"), "sin app elegida, la ficha técnica se esconde");

/* Un proyecto sin `tecnica` no rompe: lo dice y ofrece pedirla. */
BASE.proyectos["remate"] = { nombre: "Rematetaller", orden: 1 };
await api.leer(); await esperar();
$("cual-app").value = "remate"; $("cual-app").dispatchEvent(new window.Event("change")); await esperar();
ok(ft.textContent.includes("Todavía no cargué la ficha"), "un proyecto sin ficha técnica lo dice");

console.log("\n33 · las reglas v4: la bóveda es `claves`, y UNA sola copia del texto");
/* Decisión de Mauro del 2026-09-11: el agente escribe directo en la base, con
   UNA restricción — no toca información de autenticación. Eso lo aplican las
   reglas, no la buena voluntad de un archivo, así que acá se verifica que el
   texto que el panel te da para pegar diga exactamente eso.

   CAMBIÓ EN `panel-15`. Hasta `panel-14` el panel armaba las reglas con una
   función `textoDeReglas()` que tenía el archivo entero escrito de nuevo a
   mano, y este bloque comparaba esa copia contra `reglas.txt` — que es
   `general:un-dato-dos-lugares` aplicado a lo único que protege los datos.

   Ahora no hay dos lugares: el panel BAJA `reglas.txt` y le pone los UID
   adentro. Así que lo que se prueba cambia de forma. Ya no es «que las dos
   copias coincidan», es «que la única copia produzca reglas correctas» — y,
   sobre todo, que la segunda copia no vuelva a aparecer. */

const plantillaRepo = fs.readFileSync(RAIZ + "reglas.txt", "utf8");
const armarReglas = (uid, uidAgente) => api.sacarNotaDePlantilla(plantillaRepo)
  .split(api.MARCA_MIA).join(uid)
  .split(api.MARCA_AGENTE).join(uidAgente || api.SIN_AGENTE);

const conAgente = armarReglas("UID-MAURO", "UID-AGENTE");
const sinAgente = armarReglas("UID-MAURO", "");

ok(conAgente.includes("UID-AGENTE"), "con UID de agente, entra en el texto");
ok(/function equipo\(\)\s*\{\s*return soyYo\(\) \|\| esAgente\(\);\s*\}/.test(conAgente),
   "y aparece equipo(), que es lo que abre las cuatro colecciones del estado");
ok(!conAgente.includes(api.MARCA_MIA) && !conAgente.includes(api.MARCA_AGENTE),
   "no queda ningún marcador sin reemplazar");
ok(!conAgente.includes("--8<--"),
   "ni ninguna marca de plantilla, que en la consola no significa nada");

/* El párrafo que dice «esto es una plantilla, no se pega tal cual» es cierto
   en el repositorio y falso en la consola. El panel lo cambia. */
ok(!conAgente.includes("ESTE ARCHIVO ES LA PLANTILLA"),
   "el párrafo de plantilla no viaja a la consola");
ok(conAgente.includes("ESTE TEXTO LO ARMÓ EL PANEL"),
   "y en su lugar va el que corresponde");

/* Sin agente configurado ya NO desaparece `esAgente()` —el texto es uno solo—,
   pero queda comparando contra un valor que ningún usuario puede tener. Es más
   robusto que la versión vieja: antes había dos textos y sólo uno se probaba
   entero. */
ok(sinAgente.includes(api.SIN_AGENTE),
   "sin UID de agente, `esAgente()` compara contra un valor imposible");
ok(!/^[A-Za-z0-9]{28}$/.test(api.SIN_AGENTE),
   "y ese valor no tiene forma de UID de Firebase, así que no puede chocar con uno real");

/* LO QUE NO SE NEGOCIA, Y LO QUE SÍ CAMBIÓ.

   `claves` es la bóveda, y esa línea no se mueve nunca: es lo que ABRE algo.
   Si algún día alguien la pasa a `equipo()`, esto falla ruidosamente.

   `fichas` es otra historia, y vale contarla porque es el tipo de cambio que
   la próxima sesión va a querer «corregir» creyendo que fue un descuido:

     · 2026-09-11, v3: entró a la bóveda. La primera verificación del acceso
       del agente encontró adentro de una ficha un usuario y una contraseña
       reales, y el criterio pasó a ser «la colección donde una credencial
       PUEDE aparecer».
     · 2026-09-13, v4: volvió al equipo, por pedido de Mauro. El criterio de la
       v3 suena prudente y es inaplicable —con él cualquier colección termina
       sellada— y en nueve días dejó las fichas sin que nadie las mantuviera.
       La v4 sella por PROPÓSITO: si abre algo va en `claves`, si no va en
       `fichas`. Esa pregunta se contesta sin pensar.

   El sello sigue siendo por LUGAR. Lo que cambió es que el lugar ahora tiene
   un criterio que se puede aplicar. */
for (const c of ["proyectos", "pendientes", "tandas", "protocolos", "fichas"]) {
  ok(new RegExp("match /" + c + "/\\{id\\}\\s+\\{ allow read, write: if equipo\\(\\); \\}").test(conAgente),
     "`" + c + "` queda abierta al equipo");
}
for (const texto of [conAgente, sinAgente]) {
  ok(new RegExp("match /claves/\\{id\\}\\s+\\{ allow read, write: if soyYo\\(\\); \\}").test(texto),
     "«claves» es sólo de Mauro");
  ok(!new RegExp("match /claves[\\s\\S]{0,60}equipo\\(\\)").test(texto),
     "y la línea de «claves» no queda cerca de equipo()");
}
/* Y que el motivo del cambio viaje CON las reglas. Un permiso sin su porqué es
   lo que alguien deshace de buena fe seis meses después. */
ok(conAgente.includes("¿abre algo?"), "el criterio que decide dónde va cada dato, adentro del texto");
ok(conAgente.includes("panel:R4"),
   "y la advertencia de mover la contraseña ANTES de publicar");

/* El cierre explícito no se pierde: sin él, una colección nueva entraría sola. */
ok(conAgente.includes("match /{document=**} { allow read, write: if false; }"),
   "el cierre explícito sigue estando");

/* ── LA PRUEBA QUE REEMPLAZA A LA DE LAS DOS COPIAS ──────────────────────
   Antes acá se verificaba que `index.html` y `reglas.txt` dijeran lo mismo.
   Ahora se verifica lo contrario, que es más fuerte: que `index.html` NO
   tenga una segunda copia. Si alguien vuelve a escribir las reglas adentro
   del panel —por comodidad, o por no entender de dónde salen—, esto falla el
   mismo día y no seis meses después, cuando las dos ya divergieron. */
for (const linea of ["match /claves/{id}", "match /fichas/{id}",
                     "match /{document=**}", "service cloud.firestore"]) {
  ok(!html.includes(linea),
     "index.html NO trae una segunda copia de las reglas: no dice «" + linea + "»");
}

/* Y que el repositorio nunca publique un UID real. Es la razón entera de que
   `reglas.txt` sea una plantilla: el repo del panel es PÚBLICO. */
const comparaciones = [...plantillaRepo.matchAll(/request\.auth\.uid\s*==\s*'([^']*)'/g)]
  .map((m) => m[1]);
ok(comparaciones.length === 2, "reglas.txt compara exactamente dos uid");
ok(comparaciones.every((v) => v === api.MARCA_MIA || v === api.MARCA_AGENTE),
   "y los dos son marcadores, no UID reales — el repositorio del panel es público");

/* El panel tiene que poder bajar el archivo, así que va en el SHELL del service
   worker o la app instalada se queda sin reglas al abrir sin señal. */
const swTxt = fs.readFileSync(RAIZ + "sw.js", "utf8");
ok(/SHELL[\s\S]*?reglas\.txt[\s\S]*?\]/.test(swTxt),
   "`reglas.txt` está en el SHELL del service worker");



console.log("\n34 · los sitios, una pestaña por proyecto");
/* Pedida por Mauro el 2026-09-11: el estado de cada sitio estaba repartido en
   cuatro lugares que nunca se miran juntos. Lo que importa probar acá no es que
   el HTML quede lindo, sino tres cosas que rompen de verdad:

     · que un proyecto SIN los campos nuevos no tumbe la pantalla — van a existir
       desde el día que se da de alta hasta el día que alguien los carga;
     · que la previsualización NO baje el sitio hasta que se la pida;
     · que el marco no venga con `allow-same-origin`, que le daría a la página
       de adentro la sesión del panel. */
BASE.proyectos = {}; BASE.pendientes = {}; BASE.protocolos = {}; BASE.fichas = {};

BASE.proyectos["remate"] = {
  nombre: "Rematetaller", orden: 1,
  tecnica: [{ clave: "Repositorio", valor: "rematetaller/remate", buscar: "github" }],
  sitio: { url: "https://rematetaller.github.io/remate/", repo: "rematetaller/remate",
           readme: "https://github.com/rematetaller/remate/blob/main/CLAUDE.md",
           resumen: "Catálogo por invitación." },
  acceso: { base: "remate-acbc9", reglas: "firestore.rules v0.8",
            estado: "pendiente de publicar", selladas: ["llaves", "documentos"] }
};
BASE.proyectos["harmonia"] = {
  nombre: "Harmonía", orden: 6,
  sitio: { repo: "toromboto/harmonia", resumen: "Diccionario armónico.", sinPrevia: true },
  acceso: { base: "no tiene" }
};
/* El caso que va a pasar seguro: un proyecto recién dado de alta. */
BASE.proyectos["nuevo"] = { nombre: "Recién nacido", orden: 9 };
BASE.pendientes["p1"] = { proyecto: "remate", titulo: "Publicar las reglas",
                          estado: "abierto", quien: "mauro", prioridad: "alta" };
BASE.pendientes["p2"] = { proyecto: "remate", titulo: "Ya está", estado: "hecho", quien: "claude" };
BASE.pendientes["p3"] = { proyecto: "remate", titulo: "Una duda", estado: "abierto",
                          quien: "mauro", pregunta: "¿así?" };

await api.leer(); await esperar();

/* ── la vista de todos ── */
api.verSitio("*"); api.pintarSitios();
const tabs = [...$("s-tabs").querySelectorAll("button")];
ok(tabs.length === 4, "una pestaña por proyecto, más «Todos»");
ok(tabs[0].dataset.s === "*" && tabs[0].getAttribute("aria-pressed") === "true",
   "«Todos» arranca elegida");
ok($("s-cuerpo").textContent.includes("Rematetaller"), "la vista global nombra los proyectos");
ok($("s-cuerpo").textContent.includes("reglas sin publicar"),
   "y marca al que tiene las reglas sin publicar, que es lo que hay que ir a hacer");
ok($("s-cuerpo").querySelector('[data-ir="remate"]'), "cada fila lleva a su pestaña");

/* ── un sitio ── */
api.verSitio("remate"); api.pintarSitios();
const cuerpo = $("s-cuerpo");
ok(cuerpo.textContent.includes("Catálogo por invitación"), "el resumen del sitio");
ok(cuerpo.querySelector('a[href="https://rematetaller.github.io/remate/"]'), "el enlace público");
ok(cuerpo.querySelector('a[href="https://github.com/rematetaller/remate"]'), "el del repositorio");
ok([...cuerpo.querySelectorAll("a")].every((a) => a.rel.includes("noopener")),
   "y todos los enlaces salen con noopener: sin eso la pestaña nueva toca la que la abrió");
ok(cuerpo.textContent.includes("remate-acbc9"), "dice a qué base de Firebase pega");
ok(cuerpo.textContent.includes("llaves") && cuerpo.textContent.includes("documentos"),
   "y muestra QUÉ no lee el agente, que es la mitad del acuerdo");
ok(cuerpo.textContent.includes("rematetaller/remate"), "la ficha técnica sigue estando");

/* Los números salen del mismo PENDIENTES que el tablero: un solo origen. */
const nums = [...cuerpo.querySelectorAll(".sit-num b")].map((b) => b.textContent);
ok(nums[0] === "2", "cuenta 2 abiertos");
ok(nums[3] === "1", "y 1 hecho");
ok(cuerpo.textContent.includes("Publicar las reglas"), "lista los pendientes de ese proyecto");

/* ── la previsualización ── */
ok(!cuerpo.querySelector("iframe"), "el sitio NO se baja hasta que se lo pida");
const btnPrevia = cuerpo.querySelector("[data-previa]");
ok(btnPrevia, "hay un botón para mostrarlo");
btnPrevia.click(); await esperar();
const marco = cuerpo.querySelector("iframe");
ok(marco, "al tocarlo aparece el marco");
ok(!marco.getAttribute("sandbox").includes("allow-same-origin"),
   "y el marco NO le da a la página de adentro el mismo origen que el panel");

/* ── los que no tienen todo ── */
api.verSitio("harmonia"); api.pintarSitios();
ok(!$("s-cuerpo").querySelector("[data-previa]"),
   "un proyecto marcado `sinPrevia` no ofrece previsualización");
ok($("s-cuerpo").textContent.includes("no tiene"), "y dice que no tiene base");

api.verSitio("nuevo"); api.pintarSitios();
ok($("s-cuerpo").textContent.includes("Recién nacido"),
   "un proyecto sin `sitio` ni `acceso` se pinta igual, sin romper");
ok($("s-cuerpo").textContent.includes("Todavía no cargué"), "y dice qué le falta");
ok($("s-cuerpo").textContent.includes("Todavía no hay pendientes"),
   "y que no tiene pendientes, en vez de un cero sin explicación");

/* ── CÓMO SE EMPAQUETA Y SE FIRMA (`panel-27`) ─────────────────────────────
   La prueba que importa de esta tarjeta NO es que se vea: es que NO se vea el
   valor de un secreto. Se siembra un proyecto cuyo `empaquetado` trae, a
   propósito, una cadena que jamás puede salir en pantalla, y se comprueba que
   no esté en ningún lado del cuerpo. Si algún día alguien agrega un campo sin
   pensarlo, esta línea falla antes de que se publique. */
const NO_PUEDE_SALIR = "valor-de-una-clave-que-no-va-a-pantalla";
BASE.proyectos["app"] = {
  nombre: "Una app", orden: 11,
  sitio: { repo: "duenio/una-app", sinPrevia: true },
  empaquetado: {
    como: "Un APK en el release «ultimo»",
    donde: ".github/workflows/apk.yml",
    firma: "propia", desde: "2026-09-21", alias: "elalias",
    huella: "SHA256: AA:BB:CC",
    guarda: "gestor de contraseñas y Drive",
    boveda: "ficha de `claves/`",
    guia: "https://ejemplo.invalido/guia.md",
    secretos: [
      { nombre: "FIRMA_JKS", que: "el keystore en base64", valor: NO_PUEDE_SALIR },
      { nombre: "FIRMA_STORE_PASS", que: "la que abre el keystore", valor: NO_PUEDE_SALIR }
    ]
  }
};
await api.leer(); await esperar();
api.verSitio("app"); api.pintarSitios();
const emp = $("s-cuerpo");
ok(emp.textContent.includes("Cómo se empaqueta y se firma"),
   "un proyecto con `empaquetado` tiene la tarjeta");
ok(!emp.textContent.includes(NO_PUEDE_SALIR),
   "y el VALOR de un secreto no aparece en ningún lado de la pantalla");
ok(emp.textContent.includes("FIRMA_JKS") && emp.textContent.includes("FIRMA_STORE_PASS"),
   "los NOMBRES sí, que es lo que uno viene a buscar");
ok(emp.textContent.includes("El valor no está en esta pantalla"),
   "y la pantalla lo dice con todas las letras, para el que no leyó el protocolo");

/* El chip no dice el nombre técnico: dice la consecuencia. Un «depuración»
   solo no le sirve a nadie parado al lado de una camioneta. */
ok(emp.textContent.includes("clave propia"), "el chip dice con qué está firmada");
ok(emp.textContent.includes("ENCIMA de la anterior"),
   "y al lado la consecuencia, no el término técnico");
ok(emp.querySelector('a[href="https://duenio/una-app"]') === null,
   "el repositorio no se usa crudo como dirección");
ok(emp.querySelector('a[href="https://github.com/duenio/una-app/settings/secrets/actions"]'),
   "hay un botón que lleva DERECHO a donde se cargan los secretos");
ok(emp.querySelector('a[href="https://ejemplo.invalido/guia.md"]'), "y otro al paso a paso");
ok(emp.textContent.includes("Perderlo es lo caro"),
   "el riesgo que se nombra es la pérdida y no el robo, que es la parte que se olvida");

/* Con la clave de depuración el chip tiene que ponerse en rojo y decir lo que
   de verdad pasa: hay que desinstalar, y desinstalar borra los datos. */
BASE.proyectos["app"].empaquetado.firma = "depuracion";
await api.leer(); await esperar();
api.verSitio("app"); api.pintarSitios();
ok($("s-cuerpo").textContent.includes("BORRA los datos"),
   "con la clave de depuración, la tarjeta dice que actualizar borra los datos");
ok($("s-cuerpo").querySelector(".sit-chip.mal"), "y el chip queda en rojo");

/* Y el que no la declara no tiene una tarjeta vacía: un sitio estático no
   tiene nada que decir acá. */
api.verSitio("harmonia"); api.pintarSitios();
ok(!$("s-cuerpo").textContent.includes("Cómo se empaqueta y se firma"),
   "un proyecto sin `empaquetado` no muestra la tarjeta");
delete BASE.proyectos["app"];
await api.leer(); await esperar();

/* ── lo que se escapa ── */
BASE.proyectos["malo"] = { nombre: '<img src=x onerror=alert(1)>', orden: 10,
  sitio: { url: "https://ok.invalido/", resumen: "<b>ojo</b>" } };
await api.leer(); await esperar();
api.verSitio("malo"); api.pintarSitios();
ok(!$("s-cuerpo").querySelector("img"), "un nombre con HTML adentro se escapa, no se ejecuta");
ok($("s-cuerpo").textContent.includes("<b>ojo</b>"), "y el resumen se muestra como texto");

/* ── si el proyecto elegido desaparece ── */
delete BASE.proyectos["malo"];
await api.leer(); await esperar();
api.pintarSitios();
ok($("s-cuerpo").textContent.includes("Todo junto"),
   "si el proyecto elegido ya no está, vuelve a la vista global en vez de quedar en blanco");

console.log("\n35 · publicar las reglas: un solo mecanismo para todos los sitios");
/* Pedido de Mauro el 2026-09-14. Lo que hay que probar acá no es que los
   botones se dibujen, sino las cuatro cosas que se rompen de verdad:

     · que el PANEL deje de ser la excepción — su archivo es una plantilla, y
       si el botón copiara el crudo publicaría unas reglas sin ningún UID
       adentro, o sea una base a la que no entra nadie;
     · que una plantilla de OTRA base NO se copie a medias: los UID de Firebase
       son distintos en cada proyecto y el panel no puede completarlos;
     · que el estado salga de comparar huellas y no de una frase tecleada, que
       es lo que el 2026-09-14 hizo que el tablero y la ficha del sitio dijeran
       cosas distintas del mismo hecho;
     · que un proyecto NUEVO, con lo mínimo cargado, tenga todo esto sin que
       nadie toque una línea de código. */

/* El portapapeles y la red, de mentira. Los dos guardan lo que les pasa para
   poder preguntarles después. */
let copiado = null;
Object.defineProperty(globalThis, "navigator", {
  value: { clipboard: { writeText: async (t) => { copiado = t; } } }, configurable: true });
const REGLAS_DE_PRUEBA = "// reglas del sitio\nmatch /cosas/{id} { allow read: if true; }\n";
let pedidos = [];
globalThis.fetch = async (u) => {
  pedidos.push(String(u));
  if (String(u).includes("reglas.txt")) {
    return { ok: true, text: async () => fs.readFileSync(RAIZ + "reglas.txt", "utf8") };
  }
  if (String(u).includes("con-marcadores")) {
    return { ok: true, text: async () => "match /x/{id} { allow read: if request.auth.uid == '"
             + api.MARCA_MIA + "'; }" };
  }
  if (String(u).includes("no-esta")) return { ok: false, status: 404 };
  return { ok: true, text: async () => REGLAS_DE_PRUEBA };
};

/* ── la huella ── */
ok(api.huella("hola") === api.huella("hola"), "la misma huella para el mismo texto");
ok(api.huella("hola") !== api.huella("holA"),
   "y otra distinta si cambia UNA letra — es lo único que tiene que hacer");
ok(api.huella("hola") !== api.huella("hola "),
   "un espacio al final también cuenta: en la consola se pega el texto entero");
ok(api.medirReglas("a\nb\nc").lineas === 3, "mide los renglones, para poder decir qué cambió");

/* ── el estado, derivado ── */
ok(api.estadoReglas({ acceso: {} }).chip === "sin comprobar",
   "sin ninguna huella dice «sin comprobar», que NO es lo mismo que «al día»");
ok(api.estadoReglas({ acceso: { estado: "sin publicar" } }).mal,
   "mientras no haya huellas, respeta el `estado` viejo: un proyecto de antes no empieza a mentir");
ok(api.estadoReglas({ acceso: { repo: { huella: "x" }, publicado: { huella: "x" } } }).chip === "al día",
   "dos huellas iguales: al día");
const distinto = api.estadoReglas({
  acceso: { repo: { huella: "y", lineas: 205 }, publicado: { huella: "x", lineas: 188, fecha: "2026-09-13" } } });
ok(distinto.mal && distinto.chip === "falta publicar", "dos huellas distintas: falta publicar");
ok(api.queEspera(distinto).includes("188") && api.queEspera(distinto).includes("205"),
   "y dice QUÉ está esperando, con los dos largos — no un cartel rojo a secas");

/* ── la pantalla, con los cinco proyectos ── */
BASE.proyectos = {}; BASE.pendientes = {}; BASE.protocolos = {}; BASE.fichas = {};
BASE.proyectos["panel"] = {
  nombre: "Panel", orden: 1,
  acceso: { base: "datos-830f8", reglas: "reglas.txt v4",
            reglasUrl: "https://github.com/maurogasta-crypto/datos/blob/main/reglas.txt",
            estado: "publicada", selladas: ["claves"] }
};
BASE.proyectos["sitio"] = {
  nombre: "Un Sitio", orden: 2,
  acceso: { base: "sitio-123", reglas: "REGLAS.txt",
            reglasUrl: "https://github.com/quien/sitio/blob/main/REGLAS.txt",
            estado: "sin publicar" }
};
/* El que va a pasar seguro: dado de alta con lo mínimo y nada más. */
BASE.proyectos["nuevito"] = {
  nombre: "Recién dado de alta", orden: 3,
  acceso: { base: "nuevito-9", reglasUrl: "https://github.com/quien/nuevito/blob/main/firestore.rules" }
};
BASE.proyectos["sinreglas"] = { nombre: "Sin reglas todavía", orden: 4, acceso: { base: "x-1" } };
await api.leer(); await esperar();

const proy = (id) => api.PROYECTOS().find((x) => x.id === id);
ok(api.esPropia(proy("panel")), "reconoce cuál es su PROPIA base por el projectId, no por el nombre");
ok(!api.esPropia(proy("sitio")), "y que la de un sitio no lo es");
ok(api.tieneReglas(proy("nuevito")),
   "un proyecto nuevo con sólo `base` y `reglasUrl` ya tiene de dónde bajarlas");
ok(!api.tieneReglas(proy("sinreglas")), "y uno sin `reglasUrl` no ofrece botones que no podrían hacer nada");

for (const id of ["panel", "sitio", "nuevito"]) {
  api.verSitio(id); api.pintarSitios();
  const c = $("s-cuerpo");
  ok(!!c.querySelector('[data-reglas="' + id + '"]'), id + ": tiene el botón de copiar");
  ok(!!c.querySelector('[data-publicadas="' + id + '"]'), id + ": y el de «Ya las publiqué»");
  ok(!!c.querySelector('a[href*="console.firebase.google.com"]'), id + ": y el de abrir la consola");
}
api.verSitio("panel"); api.pintarSitios();
ok(!$("s-cuerpo").textContent.includes("Armarlas en"),
   "el panel dejó de ser la excepción: su ficha ya no manda a otra pantalla");

/* ── copiar: baja, copia entero y ANOTA ── */
api.verSitio("sitio"); api.pintarSitios();
copiado = null; pedidos = [];
await api.copiarReglasDe(proy("sitio"), $("s-cuerpo").querySelector('[data-reglas="sitio"]'));
await esperar();
ok(pedidos.some((u) => u.startsWith("https://raw.githubusercontent.com/")),
   "baja del crudo de GitHub, que es el único que manda CORS");
ok(copiado === api.paraPegar(REGLAS_DE_PRUEBA, "Un Sitio"),
   "copia el recorte, que es exactamente lo que hay que pegar en la consola");
ok(copiado.includes("match /cosas/{id} { allow read: if true; }"),
   "con la regla entera adentro: se sacan comentarios, no reglas");
ok(!copiado.includes("// reglas del sitio"), "y sin el comentario del archivo");
ok(BASE.proyectos["sitio"].acceso.huella === undefined
   && BASE.proyectos["sitio"].acceso.repo.huella === api.huella(REGLAS_DE_PRUEBA),
   "y anota la huella de lo que bajó, que es lo que después deja comparar");
ok(BASE.proyectos["sitio"].acceso.selladas === undefined
   && BASE.proyectos["sitio"].acceso.base === "sitio-123",
   "sin pisar el resto de `acceso`: se escribe mezclando, no reemplazando");

/* ── la propia: se arma con los dos UID y NO viaja ningún marcador ── */
/* Un uid con forma de uid, y NO uno que contenga el marcador adentro: con
   «UID-DEL-AGENTE-DE-PRUEBA» la comprobación de abajo encontraba el marcador
   dentro del valor sustituido y acusaba al panel de un error suyo. */
$("uidAgente").value = "Ag3nTe000111222333444555666";
copiado = null;
api.verSitio("panel"); api.pintarSitios();
await api.copiarReglasDe(proy("panel"), $("s-cuerpo").querySelector('[data-reglas="panel"]'));
await esperar();
ok(copiado && copiado.includes("uid-de-prueba"), "la plantilla del panel sale con TU uid adentro");
ok(copiado && copiado.includes("Ag3nTe000111222333444555666"), "y con el del agente");
ok(copiado && !copiado.includes(api.MARCA_MIA) && !copiado.includes(api.MARCA_AGENTE),
   "y no queda un solo marcador: pegar eso dejaría la base sin nadie adentro");
ok(!pedidos.some((u) => u.includes("raw.githubusercontent.com/maurogasta-crypto")),
   "la propia sale del archivo local, que el service worker ya tiene guardado");

/* ── una plantilla de OTRA base no se copia a medias ── */
BASE.proyectos["ajeno"] = { nombre: "Ajeno", orden: 5,
  acceso: { base: "ajeno-1", reglasUrl: "https://github.com/q/con-marcadores/blob/main/r.txt" } };
await api.leer(); await esperar();
let falló = "";
try { await api.bajarReglasDe(proy("ajeno")); } catch (e) { falló = e.message; }
ok(falló.includes("plantilla"),
   "una plantilla de otra base se rechaza: sus UID son otros y el panel no los puede inventar");

/* ── el pendiente, con los mismos botones ── */
BASE.pendientes["r1"] = { proyecto: "sitio", clave: "R1", estado: "abierto", quien: "mauro",
  prioridad: "alta", titulo: "Publicar REGLAS.txt en la consola" };
BASE.pendientes["r2"] = { proyecto: "sitio", clave: "R2", estado: "abierto", quien: "mauro",
  titulo: "Cambiar el color del botón" };
BASE.pendientes["r3"] = { proyecto: "sinreglas", clave: "R3", estado: "abierto", quien: "mauro",
  titulo: "Publicar las reglas" };
BASE.pendientes["r4"] = { proyecto: "sitio", clave: "R4", estado: "abierto", quien: "mauro",
  titulo: "Un título que no dice nada", accion: "publicar-reglas" };
await api.leer(); await esperar();
const pend = (id) => api.PENDIENTES().find((x) => x.id === id);
ok(!!api.reglasDelPendiente(pend("r1")), "reconoce por el título el pendiente que pide publicar reglas");
ok(!api.reglasDelPendiente(pend("r2")), "y no confunde uno que habla de otra cosa");
ok(!api.reglasDelPendiente(pend("r3")),
   "un proyecto sin reglas que bajar no recibe botones, por más que el título lo diga");
ok(!!api.reglasDelPendiente(pend("r4")),
   "y con `accion: \"publicar-reglas\"` alcanza, sin depender de cómo esté redactado el título");

/* El filtro arranca en «lo que falta»; para mirar también los cerrados se toca
   «Todo», como lo haría Mauro. */
const verFiltroDeTodo = () => {
  $("filtro").querySelector('[data-v="todo"]').dispatchEvent(
    new window.MouseEvent("click", { bubbles: true }));
};
$("cual-app").value = ""; api.pintar();
const tarj = $("lista").querySelector('[data-abrir="r1"]');
ok(!!tarj && !!tarj.querySelector('[data-reglas="sitio"]'),
   "la tarjeta del pendiente trae el botón de copiar, sin salir de la lista");
ok(!!tarj.querySelector('[data-publicadas="sitio"]'), "y el de «Ya las publiqué»");
ok(tarj.querySelector('[data-publicadas="sitio"]').dataset.pend === "r1",
   "que sabe de QUÉ pendiente salió — es lo que lo deja cerrar en el mismo toque");
ok(!$("lista").querySelector('[data-abrir="r2"]').querySelector("[data-reglas]"),
   "y el pendiente que no es de reglas no trae botones de más");

/* Un pendiente de publicar ya CERRADO y con las reglas al día no repite los
   botones: sería ruido. Pero uno cerrado con las reglas SIN publicar sí — que
   es el caso de `casayourte:T1`, cerrado a mano el 2026-09-14 mientras la ficha
   del sitio seguía diciendo «sin publicar». */
BASE.proyectos["quieto"] = { nombre: "Quieto", orden: 8,
  acceso: { base: "quieto-1", reglasUrl: "https://github.com/q/quieto/blob/main/r.txt",
            repo: { huella: "h" }, publicado: { huella: "h", fecha: "2026-09-13" } } };
BASE.pendientes["r5"] = { proyecto: "quieto", clave: "R5", estado: "hecho", quien: "mauro",
  titulo: "Publicar las reglas" };
BASE.proyectos["atrasado"] = { nombre: "Atrasado", orden: 9,
  acceso: { base: "atrasado-1", reglasUrl: "https://github.com/q/atrasado/blob/main/r.txt",
            repo: { huella: "nueva" }, publicado: { huella: "vieja", fecha: "2026-09-13" } } };
BASE.pendientes["r6"] = { proyecto: "atrasado", clave: "R6", estado: "hecho", quien: "mauro",
  titulo: "Publicar las reglas" };
await api.leer(); await esperar();
verFiltroDeTodo();
ok(!$("lista").querySelector('[data-abrir="r5"] [data-reglas]'),
   "un pendiente cerrado con las reglas al día no repite los botones");
ok(!!$("lista").querySelector('[data-abrir="r6"] [data-reglas]'),
   "pero uno cerrado con las reglas sin publicar sí: es el caso que se cerró a mano");

/* ── tocar un botón de adentro NO abre el editor ── */
$("t-editor").classList.add("hide"); $("t-lista").classList.remove("hide");
$("lista").querySelector('[data-abrir="r1"] [data-publicadas]').dispatchEvent(
  new window.MouseEvent("click", { bubbles: true }));
await esperar(); await esperar(); await esperar();
ok($("t-editor").classList.contains("hide"),
   "tocar un botón de la tarjeta no te saca de la lista, que era el punto entero");

/* ── y el toque dejó las dos cosas escritas, juntas ── */
ok(BASE.proyectos["sitio"].acceso.publicado
   && BASE.proyectos["sitio"].acceso.publicado.huella === api.huella(REGLAS_DE_PRUEBA),
   "«Ya las publiqué» registra la huella de lo que se publicó");
ok(BASE.proyectos["sitio"].acceso.estado === "publicada",
   "y deja el campo viejo en la misma verdad, para el que todavía lo lea");
ok(BASE.pendientes["r1"].estado === "hecho",
   "y el pendiente queda hecho en el MISMO acto: una sola línea de tiempo");
ok((BASE.pendientes["r1"].historia || []).some((x) => (x.texto || "").includes("huella")),
   "con un renglón de historia que dice qué se publicó, no sólo que se publicó");
ok(api.estadoReglas(proy("sitio")).chip === "al día",
   "y desde ahí el chip lo calcula solo, sin que nadie teclee una frase");
/* La frase guardada y lo que se ve tienen que salir del mismo cálculo. Si un
   día alguien escribe la regla dos veces, esto falla el mismo día. */
for (const caso of [{ repo: { huella: "a" }, publicado: { huella: "a" } },
                    { repo: { huella: "a" }, publicado: { huella: "b" } },
                    { estado: "sin publicar" }, {}]) {
  const g = api.estadoGuardable(caso), e = api.estadoReglas({ acceso: caso });
  ok(g === null ? !e.comprobado : (g === "sin publicar") === e.mal,
     "`acceso.estado` guardado dice lo mismo que el chip: " + JSON.stringify(caso));
}

/* ── si el archivo cambia, el panel lo nota sin que nadie avise ── */
const antesDelCambio = REGLAS_DE_PRUEBA;
globalThis.fetch = async () => ({ ok: true, text: async () => antesDelCambio + "\nmatch /nueva/{id} {}\n" });
api.verSitio("sitio"); api.pintarSitios();
await api.copiarReglasDe(proy("sitio"), $("s-cuerpo").querySelector('[data-reglas="sitio"]'));
await esperar();
ok(api.estadoReglas(proy("sitio")).chip === "falta publicar",
   "el archivo cambió y el chip se da cuenta solo: nadie tuvo que acordarse de nada");
ok($("s-cuerpo").textContent.includes("renglones"),
   "y la ficha dice cuántos renglones tiene ahora contra los que se publicaron");

/* ── «Lo primero» sale del mismo cálculo ── */
api.pintar();
ok($("te-toca").textContent.includes("las reglas sin publicar"),
   "y el tablero lo encabeza con eso, del mismo cálculo y no de otra frase");

const hoy = () => P.hoy();

console.log("\n36 · las líneas de trabajo: en qué estamos, y quién lo tiene");
/* Pedido de Mauro el 2026-09-14, el día que descubrió que había dos chats
   trabajando en paralelo sin saberlo. Lo que hay que probar no es que la
   tarjeta se dibuje, sino las cuatro cosas que, si fallan, devuelven el
   problema entero:

     · que lo GLOBAL no se esconda al elegir un sitio — una decisión de
       ecosistema tomada mirando un sitio es justo la que se pierde de vista;
     · que el choque entre dos chats se DERIVE y no haya que acordarse de
       escribirlo, porque un aviso que alguien tiene que crear no aparece el
       día que hace falta;
     · que dos líneas del MISMO dueño no se cuenten como choque, o el aviso se
       vuelve ruido y se deja de mirar;
     · que tomar una línea escriba en el acto, sin pasar por «Guardar»: una
       marca de presencia que espera otro botón no le avisa a nadie. */

BASE.proyectos = {}; BASE.pendientes = {}; BASE.protocolos = {}; BASE.fichas = {};
BASE.lineas = {};
await sembrar({
  proyectos: [{ id: "casayourte", nombre: "CasaYourte", orden: 1 },
              { id: "remate", nombre: "Rematetaller", orden: 2 },
              { id: "panel", nombre: "Panel", orden: 3 }],
  lineas: [
    { id: "L-cy", titulo: "El taller de CasaYourte", alcance: "sitio",
      proyectos: ["casayourte"], estado: "curso", prioridad: "alta",
      objetivo: "Que el diseñador pueda escribir sin tocar lo publicado.",
      porQue: "Hace falta un piloto.", abierta: "2026-09-14",
      tomada: { quien: "claude", chat: "chat del taller", sesion: "s-1", desde: hoy() } },
    { id: "L-eco", titulo: "Que dos chats no se pisen", alcance: "global",
      proyectos: ["panel", "casayourte"], estado: "abierta", prioridad: "alta",
      objetivo: "Que al abrir se vea quién tiene qué.", abierta: "2026-09-14" },
    { id: "L-vieja", titulo: "Algo que ya se cerró", alcance: "sitio",
      proyectos: ["remate"], estado: "cerrada", abierta: "2026-09-10", cerrada: "2026-09-12" }
  ],
  pendientes: [
    { id: "x1", proyecto: "casayourte", titulo: "Uno", estado: "abierto", quien: "mauro", linea: "L-cy" },
    { id: "x2", proyecto: "casayourte", titulo: "Dos", estado: "hecho", quien: "claude", linea: "L-cy" },
    { id: "x3", proyecto: "remate", titulo: "Suelto", estado: "abierto", quien: "mauro" }
  ]
});

/* ── los dos ámbitos ── */
ok(api.lineasDe("").length === 2, "una línea cerrada no aparece: la lista es de lo vivo");
const deCY = api.lineasDe("casayourte").map((l) => l.id).sort();
ok(deCY.join(",") === "L-cy,L-eco",
   "con un sitio elegido se ven las suyas Y las globales — lo global no se esconde nunca");
ok(api.lineasDe("remate").map((l) => l.id).join(",") === "L-eco",
   "y en otro sitio queda sólo lo global, no lo ajeno");

/* ── la caja de arriba ── */
$("cual-app").value = ""; api.pintar();
ok($("lineas").textContent.includes("En qué estamos"), "la caja encabeza el tablero");
ok($("lineas").textContent.includes("El taller de CasaYourte"), "y lista las líneas vivas");
ok(!$("lineas").textContent.includes("Algo que ya se cerró"), "y no las cerradas");
ok($("lineas").textContent.includes("Todo el ecosistema"),
   "separa lo global de lo de un sitio, que es lo que pidió Mauro");
ok($("lineas").textContent.includes("chat del taller"),
   "y dice QUIÉN la tiene, que es el campo por el que existe todo esto");
ok($("lineas").textContent.includes("1 sin terminar"),
   "los números de una línea salen del mismo PENDIENTES que el tablero");
ok(!!$("lineas").querySelector("[data-linea-nueva]"), "y se puede abrir una línea desde acá");

/* ── los choques, derivados ── */
ok(api.choques().length === 0, "con una sola línea tomada no hay choque");

BASE.lineas["L-eco"].tomada = { quien: "claude", chat: "otro chat", sesion: "s-2", desde: hoy() };
await api.leer(); await esperar();
const ch = api.choques();
ok(ch.length === 1 && ch[0].tipo === "cruce",
   "dos chats distintos tocando el mismo proyecto: eso SÍ es un choque");
ok(ch[0].que.includes("CasaYourte"), "y dice sobre qué sitio chocan");
ok(ch[0].porQue.includes("otro chat") && ch[0].porQue.includes("chat del taller"),
   "con los dos nombres, que es lo que deja resolverlo");

/* Mismo dueño: no es un choque, es una sesión haciendo dos cosas. */
BASE.lineas["L-eco"].tomada = { quien: "claude", chat: "chat del taller", sesion: "s-1", desde: hoy() };
await api.leer(); await esperar();
ok(api.choques().length === 0,
   "dos líneas del MISMO dueño no son un choque: si lo fueran, el aviso sería ruido");

/* La tomada y olvidada. */
BASE.lineas["L-eco"].tomada = { quien: "claude", chat: "un chat viejo", sesion: "s-9", desde: "2026-01-01" };
await api.leer(); await esperar();
const ch2 = api.choques();
ok(ch2.some((c) => c.tipo === "olvidada"),
   "una línea tomada hace días y sin soltar también avisa: bloquea al que la lee bien");

/* ── «Lo primero» los pone arriba de las reglas ── */
BASE.proyectos["remate"].acceso = { base: "r-1", estado: "sin publicar",
  reglasUrl: "https://github.com/q/r/blob/main/r.txt" };
await api.leer(); await esperar();
const tt = $("te-toca").textContent;
ok(tt.includes("tomada hace"), "«Lo primero» encabeza con el choque");
ok(tt.indexOf("tomada hace") < tt.indexOf("las reglas sin publicar"),
   "y va ARRIBA de las reglas: es lo único de la lista que pierde trabajo mientras se lee");
ok(!!$("te-toca").querySelector("[data-tt-linea]"), "y el botón lleva a la línea que lo causa");

/* ── la ficha del sitio muestra las suyas ── */
api.verSitio("casayourte"); api.pintarSitios();
ok($("s-cuerpo").textContent.includes("En qué estamos acá"),
   "cada sitio muestra sus líneas: es la visualización por sitio que se pidió");
ok($("s-cuerpo").textContent.includes("El taller de CasaYourte"), "con la suya");
ok(!!$("s-cuerpo").querySelector('[data-ir-linea="L-eco"]'),
   "y la global que lo toca, marcada como tal");
ok($("s-cuerpo").textContent.includes("ecosistema"), "para que se vea que no es sólo de este sitio");

/* ── el editor escribe ── */
api.abrirLinea(api.LINEAS().find((l) => l.id === "L-cy"));
ok(!$("t-linea").classList.contains("hide"), "se abre el editor de la línea");
ok($("l-porque").value === "Hace falta un piloto.", "con su porqué, que es lo que otro chat lee");
$("l-nota").value = "Claude: quedó decidido que el piloto no toca lo publicado.";
$("btnLineaGuardar").click(); await esperar(); await esperar(); await esperar();
ok((BASE.lineas["L-cy"].bitacora || []).length === 1,
   "la nota entra en la bitácora: ahí es donde dos chats que se contradijeron quedan juntos");
ok($("t-linea").classList.contains("hide"), "y al guardar se vuelve al tablero");

/* Tomar escribe en el acto, sin pasar por Guardar. */
api.abrirLinea(api.LINEAS().find((l) => l.id === "L-vieja"));
$("btnTomar").click(); await esperar(); await esperar(); await esperar();
ok(BASE.lineas["L-vieja"].tomada && BASE.lineas["L-vieja"].tomada.quien === "mauro",
   "«La tomo yo» escribe en el acto: una marca de presencia no puede esperar otro botón");
ok(BASE.lineas["L-vieja"].titulo === "Algo que ya se cerró",
   "y escribe MEZCLANDO: tomar una línea no puede borrarle el título ni el porqué");
$("btnSoltar").click(); await esperar(); await esperar(); await esperar();
ok(!BASE.lineas["L-vieja"].tomada, "y soltarla la deja libre");
api.cerrarLinea();

/* ── una línea sin título no se guarda ── */
api.abrirLinea(null);
ok($("l-cual").textContent === "Nueva línea", "se puede abrir una línea nueva");
$("l-titulo").value = "";
$("btnLineaGuardar").click(); await esperar();
ok(Object.keys(BASE.lineas).length === 3,
   "sin título no se guarda: el título es lo único que otro chat va a ver en la lista");
api.cerrarLinea();

console.log("\n37 · el recorte de comentarios: lo que se pega en la consola");

/* POR QUÉ ESTE GRUPO. El 2026-09-15 Casa Verde quedó denegando todo después de
   una publicación desde el teléfono, con un archivo de 40.725 caracteres. El
   recorte lo deja en un tercio. Pero un recorte que se equivoca UNA vez no
   rompe la pantalla: rompe la base, y se entera cuando ya nadie puede entrar.
   Por eso lo que sigue no prueba que ande — prueba que no arruine. */

const cv = "rules_version = '2';\n"
  + "// un comentario con ' una comilla suelta\n"
  + "service cloud.firestore {\n"
  + "  match /fotos/{id} {\n"
  + "    // la URL de abajo tiene // adentro de una cadena\n"
  + "    allow write: if request.resource.data.url\n"
  + "      .matches('https://res[.]cloudinary[.]com/dnwfu8ffn/.*');\n"
  + "\n"
  + "  }\n"
  + "}\n";
const r = api.sinComentarios(cv);

ok(r.includes(".matches('https://res[.]cloudinary[.]com/dnwfu8ffn/.*')"),
   "la URL de Cloudinary sobrevive ENTERA: es el renglón que un recorte ingenuo parte al medio");
ok(!r.includes("un comentario con"), "y los comentarios se van");
ok(!r.includes("la URL de abajo"), "también los que están sangrados adentro de un bloque");
ok(r.split("{").length === cv.split("{").length
   && r.split("}").length === cv.split("}").length,
   "las llaves quedan igual: no se perdió ni se cerró ningún bloque");
ok(!r.split("\n").slice(0, -1).some((l) => l.trim() === ""),
   "no quedan renglones vacíos");
ok(api.sinComentarios(r) === r, "pasarlo dos veces da lo mismo: no se come nada la segunda vez");

/* Una comilla adentro de un comentario NO abre una cadena. Si abriera, todo lo
   que viene después quedaría «adentro» y el recorte dejaría de sacar nada. */
ok(api.sinComentarios("// no ' cierra\nlet b = 2;\n").trim() === "let b = 2;",
   "una comilla suelta adentro de un comentario no desarma al que lee");
/* La barra invertida, en los dos sentidos, porque son lo mismo mirado de cerca
   y dan resultados opuestos:
     'a\'// b'   → la comilla está ESCAPADA, la cadena sigue, el // es contenido.
     'a\\'// b'  → la barra se escapa a sí misma, la cadena CIERRA, y el // que
                   viene después sí es un comentario.
   Un recortador que confunda estos dos se come media regla o deja un comentario
   adentro del texto publicado. */
ok(api.sinComentarios("let c = 'a\\'// b';\n").trim() === "let c = 'a\\'// b';",
   "la comilla escapada no cierra la cadena: el // de adentro es contenido");
ok(api.sinComentarios("let e = 'a\\\\'// b';\n").trim() === "let e = 'a\\\\'",
   "y la barra escapada sí la cierra: el // de después es un comentario de verdad");
ok(api.sinComentarios('let d = "p//q"; // x\n').trim() === 'let d = "p//q";',
   "y las comillas dobles valen igual que las simples");
ok(api.sinComentarios("") === "\n" && api.sinComentarios(null) === "\n",
   "vacío y nulo no explotan");

/* LOS DOS UID DE LA PLANTILLA DEL PANEL. Éste es el caso que podía dejar a
   Mauro afuera de su propia base: si los marcadores vivieran en un comentario,
   el recorte se los llevaría y las reglas publicadas no dejarían entrar a
   nadie. Viven adentro de cadenas —`uid == 'TU-UID-ACA'`— y esto lo fija, para
   que mover uno a un comentario rompa el banco y no la base. */
const plantilla = fs.readFileSync(RAIZ + "reglas.txt", "utf8");
ok(api.sinComentarios(plantilla).includes("'" + api.MARCA_MIA + "'"),
   "el UID de Mauro sobrevive al recorte: está en una cadena, no en un comentario");
ok(api.sinComentarios(plantilla).includes("'" + api.MARCA_AGENTE + "'"),
   "y el del agente también");

/* El encabezado: tres renglones, y los únicos comentarios que quedan. */
const conCabeza = api.paraPegar(cv, "Casa Verde");
ok(conCabeza.startsWith("// Casa Verde · reglas sin los comentarios"),
   "el encabezado dice de qué sitio es");
ok(conCabeza.includes("Huella del archivo completo: " + api.huella(cv)),
   "y lleva la huella del archivo COMPLETO, que es la que el panel compara");
ok(conCabeza.split("\n").filter((l) => l.trim().startsWith("//")).length === 3,
   "y son exactamente tres renglones de comentario, no más");
ok(conCabeza.includes(".matches('https://res[.]cloudinary[.]com/dnwfu8ffn/.*')"),
   "con las reglas enteras debajo");
ok(conCabeza.length < cv.length + 200, "y el encabezado pesa lo que pesa: tres renglones");

console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nTodo en orden.\n");
process.exit(fallos ? 1 : 0);
