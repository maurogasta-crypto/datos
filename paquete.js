/* ═══════════════════════════════════════════════════════════
   paquete.js — EL PAQUETE DE INTERVENCIÓN: todo lo que un chat necesita para
   tocar UNA parte del panel, en un solo .md, y la vuelta: poner lo que
   devuelve en su lugar sin que nadie pegue a mano en un archivo de 200 KB.
   Sello: paquete-3 (12-nov-2026; paquete-2 el 10-nov). Incluye el MAPA.md de cada sitio.

   Mauro, 10-nov-2026: «el kit completo podría armarse ya en el md cuando se
   solicita la sección a modificar, como un paquete de descargar en un solo
   archivo, aclarando lo que corresponde a cada archivo y, en la codificación
   de esa misma sección, la dependencia que hay en cada parte para la edición
   en módulos». Y la regla de fondo: una guía clara, automática, SIN IA —todo
   sale de `intervenciones.json` y del código mismo.

   Qué hace, en orden:
     1. `construir(cfg, id, leer)` lee los archivos de la intervención, recorta
        las piezas (funciones) que se pueden EDITAR y arma el .md.
     2. Por cada pieza calcula sus dependencias leyendo el código: qué trae de
        cada módulo (imports), qué funciones del núcleo usa (`P.*`, con su
        definición), qué colecciones de Firestore toca (con SUS reglas), qué
        otras piezas del archivo llama y cuáles la llaman, y qué elementos de
        la página usa. Ése es el mapa para editar «en módulos».
     3. `aplicarCambios(original, respuesta, permitidos)` toma lo que contestó
        el chat y reemplaza, POR NOMBRE, sólo las piezas que el paquete dejó
        editar; revisa que parseen y devuelve el archivo completo.

   Es lógica pura, sin DOM ni Firebase: la usa el panel (con `fetch` a GitHub
   para leer) y la prueba `node pruebas/paquete.mjs` (con `fs`).

   Es GENÉRICO: no sabe nada de este panel. Cada sitio lleva en su repositorio
   un `secciones.json` (como `areas.json`, pero de varios archivos) que dice qué
   archivos y qué piezas forman cada sección; el nombre del espacio compartido
   (`P`, `CV2`…) es un dato del mapa, no del código.

   NO toca ni copia las funciones de áreas de `chat.js` (`declaraciones`,
   `extraer`, `usa`, `armarPaquete`): ésas son copia EXACTA de tocatoca y las
   compara `pruebas/chat.mjs`. Acá el reconocimiento de piezas es propio
   porque necesita `async function` y `P.nombre = …`, que aquélla no ve.
   ═══════════════════════════════════════════════════════════ */

export const VERSION = "paquete-4";

/* paquete-4 (14-nov-2026, Mauro: «tendría que llevar cuerpos completos que pueda comprender el otro chat como están
   realmente en el repositorio… y entregar los archivos que haya modificado»). Antes, lo marcado con `tramos` viajaba
   recortado en PIEZAS. Ahora un archivo viaja ENTERO, como está en el repositorio, salvo que sea tan grande que no
   entre cómodo en una sesión gratuita (más de ENTERO_MAX caracteres): ésos siguen por piezas.
     · modo "completo": todo lo EDITAR va entero, pese lo que pese.
     · modo "auto":     entero si pesa hasta ENTERO_MAX; por piezas si es más grande.
     · modo "piezas":   como en paquete-3 (es el de la biblioteca, para no cambiar lo que ya andaba; la pantalla pide "auto"). */
export const ENTERO_MAX = 70000;
export const MODOS = ["auto", "completo", "piezas"];
/** ¿Este archivo del mapa viaja entero? `a` es su entrada de secciones.json y `src` su texto. */
export function entregaEntera(a, src, modo = "piezas") {
  if (!(a.tramos && a.tramos.length)) return true;
  if (modo === "completo") return true;
  return modo === "auto" && String(src).length <= ENTERO_MAX;
}
/** Qué pesa cada archivo EDITAR y cómo viajaría. Sin armar el paquete: sirve para elegir el modo. */
export async function tamanos(cfg, id, leer, modo = "auto") {
  const iv = (cfg.secciones || cfg.intervenciones || []).find((x) => x.id === id);
  if (!iv) return [];
  const out = [];
  for (const a of (iv.archivos || []).filter((x) => (x.rol || "leer") === "editar")) {
    let src = ""; try { src = await leer(a.ruta); } catch (e) { continue; }
    out.push({ ruta: a.ruta, tokens: tokens(src), entero: entregaEntera(a, src, modo) });
  }
  return out;
}

/** La misma medida de «cuánto pesa» que usa chat.js. */
export const tokens = (t) => Math.round(String(t || "").length / 3.3);
const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unico = (a) => [...new Set(a)];
const linea = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

/* La marca que el paquete pone sobre cada pieza; al aplicar, se descarta. */
const MARCA = /^\/\/ ── .* ──\s*$/;

/* ═══ PIEZAS: las declaraciones de primer nivel de un archivo ═══════════
   Una pieza arranca en columna 0 con `function`, `async function`, `const`,
   `let`, `class` o `P.nombre =`, y termina antes de lo siguiente que arranque
   en columna 0 (otra pieza, una sentencia suelta o un comentario). Sirve igual
   para un .js que para un .html con el script adentro. */
const RES = [
  /^(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/,
  /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/,
  /^(?:export\s+)?class\s+([A-Za-z_$][\w$]*)/,
  /^((?:[A-Z][\w$]*|window)\.[A-Za-z_$][\w$]*)\s*=[^=]/,   // P.nombre = …, CV2.nombre = …, window.nombre = …
];
const nombreDe = (l) => { for (const re of RES) { const m = re.exec(l); if (m) return m[1]; } return null; };

/** Las piezas de un archivo: [{ nombre, desde, hasta, linea }] (líneas desde 1,
 *  `desde` incluye los comentarios pegados arriba; `linea` es la de la declaración). */
export function declaraciones(src) {
  const L = String(src).split("\n");
  const tipo = new Array(L.length).fill("cont");   // decl | suelto | coment | cont
  const nom = new Array(L.length).fill(null);
  let enBloque = false, bloqueEnCol0 = false;   // un comentario de bloque sólo corta una pieza si arranca en columna 0
  L.forEach((l, i) => {
    if (enBloque) { tipo[i] = bloqueEnCol0 ? "coment" : "cont"; if (l.includes("*/")) enBloque = false; return; }
    const ini = l.indexOf("/*");
    if (ini !== -1 && l.indexOf("*/", ini + 2) === -1 && /^\s*\/\*/.test(l)) {
      bloqueEnCol0 = /^\/\*/.test(l); tipo[i] = bloqueEnCol0 ? "coment" : "cont"; enBloque = true; return;
    }
    if (/^\/\*|^\/\//.test(l)) { tipo[i] = "coment"; return; }
    if (/^[A-Za-z_$]/.test(l)) {
      const n = nombreDe(l);
      if (n) { tipo[i] = "decl"; nom[i] = n; } else tipo[i] = "suelto";
    } else if (/^<\/?(?:script|style|head|body|html)\b/i.test(l)) tipo[i] = "suelto";   // el cierre de un <script> o de la página NO es parte de la última pieza
  });
  const out = [];
  for (let i = 0; i < L.length; i++) {
    if (tipo[i] !== "decl") continue;
    let h = i;
    for (let j = i + 1; j < L.length; j++) {
      if (tipo[j] === "decl" || tipo[j] === "suelto" || tipo[j] === "coment") break;
      h = j;
    }
    while (h > i && L[h].trim() === "") h--;
    let d = i;
    while (d > 0 && tipo[d - 1] === "coment") d--;
    out.push({ nombre: nom[i], desde: d + 1, hasta: h + 1, linea: i + 1 });
  }
  return out;
}

/** El texto de las piezas pedidas, por nombre. Devuelve { piezas, faltan }. */
export function extraer(src, nombres, decls = declaraciones(src)) {
  const L = String(src).split("\n"), piezas = [], faltan = [];
  for (const n of nombres) {
    const d = decls.find((x) => x.nombre === n);
    if (!d) { faltan.push(n); continue; }
    piezas.push({ ...d, texto: L.slice(d.desde - 1, d.hasta).join("\n") });
  }
  return { piezas, faltan };
}

/* ═══ DEPENDENCIAS, leídas del código ═══════════════════════════════════ */

/** Los imports de un archivo: [{ desde, nombres, importados, ns, dinamico }]. `desde` va sin `?v=`;
 *  `nombres` son los nombres locales; `importados` dice cuál es cada uno: { local, nombre } para
 *  `{ nombre as local }`, { local, ns: true } para `* as local`, { local, def: true } para el de por defecto. */
export function importsDe(src) {
  const out = [], s = String(src);
  const est = /(?:^|[\n;>}])\s*import\s*([^;'"]*?)\s*from\s*["']([^"']+)["']/g;
  let m;
  while ((m = est.exec(s))) {
    const nombres = [], importados = [];
    const inner = /\{([^}]*)\}/.exec(m[1]);
    if (inner) inner[1].split(",").forEach((p) => {
      const t = p.trim(); if (!t) return;
      const a = /^([\w$]+)\s+as\s+([\w$]+)$/.exec(t);
      if (a) { nombres.push(a[2]); importados.push({ local: a[2], nombre: a[1] }); } else { nombres.push(t); importados.push({ local: t, nombre: t }); }
    });
    const resto = m[1].replace(/\{[^}]*\}/, "").replace(/,/g, " ").trim();
    let ns = false;
    if (resto) {
      const esNs = /^\*\s*as\s+/.test(resto), local = resto.replace(/^\*\s*as\s+/, "");
      ns = esNs; nombres.push(local); importados.push(esNs ? { local, ns: true } : { local, def: true });
    }
    out.push({ desde: m[2].replace(/\?.*$/, ""), nombres, importados, dinamico: false, ns });
  }
  const din = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = din.exec(s))) out.push({ desde: m[1].replace(/\?.*$/, ""), nombres: [], importados: [], dinamico: true });
  return out;
}

/** Los nombres de la lista que aparecen como identificador en el texto. */
export const usadosEn = (texto, nombres) => nombres.filter((n) =>
  new RegExp("(?<![\\w$.])" + escRe(n) + "(?![\\w$])").test(texto));

/** Las `<espacio>.algo` que usa un texto (`P.esc`, `CV2.toast`…). */
export const usosDeEspacio = (texto, espacio = "P") =>
  unico([...String(texto).matchAll(new RegExp("(?<![\\w$.])" + escRe(espacio) + "\\.([A-Za-z_$][\\w$]*)", "g"))].map((m) => m[1]));
export const usosDeP = (texto) => usosDeEspacio(texto, "P");

/** Las colecciones de Firestore que toca un texto: `doc(db, "x", …)`, `collection(db, "x")`… */
export const coleccionesDe = (texto) =>
  unico([...String(texto).matchAll(/\b(?:collection|doc|getDoc|setDoc|updateDoc|deleteDoc|addDoc|getDocs|onSnapshot)\s*\(\s*(?:query\s*\(\s*)?(?:collection\s*\(\s*)?(?:[\w$]+\.)?db\s*,\s*["'`]([A-Za-z_][\w-]*)["'`]/g)].map((m) => m[1]));

/** Los elementos de la página que usa: `$("id")` y `getElementById("id")`. */
export const idsDe = (texto) =>
  unico([...String(texto).matchAll(/(?:\$|getElementById)\(\s*["']([\w-]+)["']\s*\)/g)].map((m) => m[1]));

/** Qué otras piezas del archivo llama una pieza, y cuáles la llaman a ella. */
export function relaciones(piezaNombre, textos) {
  // textos: { nombre: texto } de TODAS las piezas del archivo
  const otros = Object.keys(textos).filter((n) => n !== piezaNombre && !n.includes("."));
  const llama = usadosEn(textos[piezaNombre] || "", otros);
  const llamada = otros.filter((n) => usadosEn(textos[n], [piezaNombre]).length);
  return { llama, llamadaPor: llamada };
}

/* ═══ EL NÚCLEO, recortado a lo que se usa ═══════════════════════════════ */
/** De un archivo tipo nucleo.js, las piezas que hacen falta para `textos`:
 *  cada `P.algo` usada, más lo que ésas usan a su vez (cierre). */
export function recortarNucleo(srcNucleo, textos, importados = [], espacio = "P") {
  const decls = declaraciones(srcNucleo);
  const L = String(srcNucleo).split("\n");
  const texto = (d) => L.slice(d.desde - 1, d.hasta).join("\n");
  const pref = espacio + ".";
  const sueltos = new Set(decls.filter((d) => !d.nombre.startsWith(pref)).map((d) => d.nombre));
  const incluidas = new Set();
  const pend = [];
  const agregar = (n) => { if (!incluidas.has(n) && decls.some((d) => d.nombre === n)) { incluidas.add(n); pend.push(n); } };
  const mirar = (t) => {
    usosDeEspacio(t, espacio).forEach((p) => agregar(pref + p));
    usadosEn(t, [...sueltos]).forEach(agregar);
  };
  const todo = textos.join("\n");
  usosDeEspacio(todo, espacio).forEach((p) => agregar(pref + p));
  usadosEn(todo, importados.filter((n) => sueltos.has(n))).forEach(agregar);
  while (pend.length) {
    const n = pend.pop(), d = decls.find((x) => x.nombre === n);
    mirar(texto(d));
  }
  const piezas = decls.filter((d) => incluidas.has(d.nombre)).map((d) => ({ ...d, texto: texto(d) }));
  const noEncontradas = usosDeEspacio(todo, espacio).filter((p) => !decls.some((d) => d.nombre === pref + p));
  return { piezas, noEncontradas, total: decls.length };
}

/* ═══ LAS REGLAS de las colecciones que toca ═════════════════════════════ */
/** Los bloques `match /<col>/…` de reglas.txt de esas colecciones, más las
 *  funciones auxiliares que llaman (soyYo(), persona(), …). */
export function bloquesDeReglas(reglas, colecciones) {
  const L = String(reglas).split("\n");
  const cierre = (i) => {                     // índice de la línea donde cierra el bloque que abre en i
    let prof = 0, ya = false;
    for (let j = i; j < L.length; j++) {
      const sinCom = L[j].replace(/\/\/.*$/, "");
      for (const c of sinCom) { if (c === "{") { prof++; ya = true; } else if (c === "}") prof--; }
      if (ya && prof <= 0) return j;
    }
    return L.length - 1;
  };
  const comentarios = (i) => { let d = i; while (d > 0 && /^\s*\/\//.test(L[d - 1]) && i - d < 8) d--; return d; };
  const funciones = {};
  L.forEach((l, i) => { const m = /^\s*function\s+([\w$]+)\s*\(/.exec(l); if (m) funciones[m[1]] = { desde: i, hasta: cierre(i) }; });
  const bloques = [];
  L.forEach((l, i) => {
    const m = /^\s*match\s+\/([A-Za-z_][\w-]*)\/\{/.exec(l);
    if (m && colecciones.includes(m[1])) bloques.push({ col: m[1], desde: comentarios(i), hasta: cierre(i) });
  });
  const encontradas = unico(bloques.map((b) => b.col));
  const faltan = colecciones.filter((c) => !encontradas.includes(c));
  const trozo = (d, h) => L.slice(d, h + 1).join("\n");
  const textoBloques = bloques.map((b) => trozo(b.desde, b.hasta)).join("\n\n");
  const usadas = new Set();
  const buscar = (t) => Object.keys(funciones).forEach((f) => {
    if (!usadas.has(f) && new RegExp("(?<![\\w$])" + escRe(f) + "\\s*\\(").test(t) && !t.trimStart().startsWith("function " + f)) {
      usadas.add(f); buscar(trozo(funciones[f].desde, funciones[f].hasta));
    }
  });
  buscar(textoBloques);
  const textoFunciones = [...usadas].sort((a, b) => funciones[a].desde - funciones[b].desde)
    .map((f) => trozo(comentarios(funciones[f].desde), funciones[f].hasta)).join("\n\n");
  return { texto: [textoFunciones, textoBloques].filter(Boolean).join("\n\n"), encontradas, faltan, funciones: [...usadas] };
}

/* ═══ ARMAR EL PAQUETE ═══════════════════════════════════════════════════ */

/** Una huella corta del texto (FNV-1a, 32 bits): sirve para saber si una pieza cambió entre que se bajó y que se trajo. */
export function huellaDe(texto) {
  const s = String(texto == null ? "" : texto).replace(/\r\n?/g, "\n").replace(/\s+$/, "");
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

const PASOS = ({ destino, aplicarEnPanel, semaforo }) => [
  "Escribí abajo, en «Tu pedido», qué querés cambiar y qué ves mal.",
  "Dale este archivo ENTERO a tu chat de IA.",
  "Pedile que primero DIAGNOSTIQUE (qué dicen las reglas, qué hace la pantalla, qué dicen los datos) y recién después proponga el cambio. Si le falta un archivo, que mire el MAPA DEL SITIO de más abajo y te pida bajarlo de GitHub: que no lo suponga.",
  "Pedile que te devuelva los archivos marcados EDITAR COMPLETOS: tal como están en el repositorio, con tu cambio puesto, con TODAS sus líneas (también las que no tocó) y sin «…» ni «el resto igual». Cada uno va en su propia valla de código y precedido por la línea `// ── archivo: líneas … ──` que trae su bloque. Si un archivo viene marcado «por piezas» (los muy grandes), que devuelva sólo las piezas completas, con el mismo nombre y sus comentarios de arriba. Que devuelva SÓLO lo que cambió. Si el cambio toca algo marcado SOLO LEER, que te lo diga en vez de cambiarlo. Si el código lleva ``` adentro, que use una valla de cuatro o más.",
  aplicarEnPanel
    ? "Volvé al panel, a esta misma sección, y pegá su respuesta en «Traer la respuesta»: el panel recibe los archivos completos (o pone cada pieza en su lugar), revisa que no se rompa la sintaxis y te los deja listos."
    : "Reemplazá cada pieza en su archivo: el nombre y las líneas que figuran en cada pieza te dicen cuál es.",
  destino ? `Subí los archivos que cambiaron a ${destino} y esperá unos minutos a que se publique. Probalo con tu cuenta.`
          : "Subí los archivos que cambiaron al repositorio que te indicó Mauro y esperá unos minutos a que se publique. Probalo con tu cuenta.",
  "El panel deja el registro de lo que hiciste para que la próxima sesión lo retome. Si algo quedó a medias, escribilo en el pedido.",
].concat(semaforo ? [] : []);

/* ═══ EL MAPA DEL SITIO: lo que existe y no vino en el paquete ═══════════ */

/** ¿Es un archivo que le sirve a un chat (código, páginas, datos de configuración, textos)? */
export const esArchivoDeSitio = (ruta) =>
  /\.(html?|m?js|css|json|md|txt|ya?ml|rules)$/i.test(ruta) && !/(^|\/)(\.git|node_modules|img|imagenes)\//.test(ruta);

/** Una línea que diga qué es un archivo, leída de su propio encabezado (título, primer comentario, primer título de Markdown). */
export function descripcionDe(src, ruta = "") {
  const s = String(src || "");
  let d = "";
  if (/\.html?$/i.test(ruta)) { const m = /<title>\s*([^<]+?)\s*<\/title>/i.exec(s); if (m) d = m[1]; }
  else if (/\.md$/i.test(ruta)) { const m = /^#\s+(.+)$/m.exec(s); if (m) d = m[1]; }
  else if (/\.json$/i.test(ruta)) d = "";
  if (!d) {
    const m = /\/\*([\s\S]*?)\*\//.exec(s.slice(0, 3000));
    if (m) {
      const l = m[1].split("\n").map((x) => x.replace(/^[\s*═─=-]+|[\s═─=-]+$/g, "")).find((x) => x && !/^sello\b/i.test(x));
      if (l) d = l.replace(/^[\w./-]+\.(?:m?js|html?|css)\s*[—–-]+\s*/i, "");
    }
  }
  return linea(d).slice(0, 110);
}

/** Las filas que describe un MAPA.md: `| \`ruta\` | qué es | usa |` o `- \`ruta\` — qué es`. */
export function filasDelMapa(md) {
  const out = [];
  for (const l of String(md || "").split("\n")) {
    let m = /^\|\s*`([^`]+)`\s*\|\s*(.*?)\s*\|(?:\s*(.*?)\s*\|)?\s*$/.exec(l);
    if (m) { out.push({ ruta: m[1], que: m[2], usa: m[3] || "" }); continue; }
    m = /^[-*]\s+`([^`]+)`\s*[—–:-]+\s*(.*)$/.exec(l);
    if (m) out.push({ ruta: m[1], que: m[2], usa: "" });
  }
  return out;
}

/** Compara lo que describe el mapa con lo que hay: archivos sin describir y filas de archivos que ya no existen.
 *  Una fila que termina en `/` describe una carpeta entera. */
export function compararMapa(rutasMapa, rutasReales, ignorar = []) {
  const carpetas = rutasMapa.filter((r) => r.endsWith("/"));
  const cubierto = (r) => rutasMapa.includes(r) || carpetas.some((c) => r.startsWith(c));
  return {
    sinDescribir: rutasReales.filter((r) => !ignorar.includes(r) && !cubierto(r)),
    fantasmas: rutasMapa.filter((r) => !ignorar.includes(r) && (r.endsWith("/") ? !rutasReales.some((x) => x.startsWith(r)) : !rutasReales.includes(r))),
  };
}

/** De qué otros archivos del sitio depende uno (imports, `<script src>`, `<link href>`), leído del código. */
export function usaDe(ruta, src, rutasExistentes) {
  const existe = (r) => rutasExistentes.find((x) => sinPunto(x) === sinPunto(r));
  const dest = [];
  for (const im of importsDe(src)) { const d = resolverRuta(ruta, im.desde), e = d && existe(d); if (e) dest.push(e); }
  for (const m of String(src).matchAll(/(?:src|href)=["']([^"':?#]+\.(?:m?js|css))(?:\?[^"']*)?["']/g)) {
    const d = resolverRuta(ruta, /^\.{0,2}\//.test(m[1]) ? m[1] : "./" + m[1]), e = d && existe(d); if (e) dest.push(e);
  }
  return unico(dest).filter((x) => x !== ruta).sort();
}

/** Arma (o actualiza) el texto de un MAPA.md. Conserva lo que una persona ya escribió, agrega lo que falta
 *  (con la descripción de su encabezado si la tiene) y vuelve a calcular «usa». Una fila de carpeta (`dir/`)
 *  se conserva y hace que sus archivos no se listen uno por uno. */
export function construirMapaMd({ proyecto = "", existente = "", archivos = [], textos = {}, comando = "node herramientas/secciones.mjs mapa" }) {
  const previas = Object.fromEntries(filasDelMapa(existente).map((f) => [f.ruta, f]));
  const carpetas = Object.keys(previas).filter((r) => r.endsWith("/")).sort();
  const reales = archivos.map((a) => a.ruta).filter(esArchivoDeSitio).sort();
  const dentro = (r) => carpetas.some((c) => r.startsWith(c) && !previas[r]);
  const filas = reales.filter((r) => !dentro(r)).map((r) => {
    const q = previas[r] && previas[r].que && !/^_\(sin describir\)_$/.test(previas[r].que) ? previas[r].que : (descripcionDe(textos[r], r) || "_(sin describir)_");
    const u = usaDe(r, textos[r] || "", reales);
    return { ruta: r, que: q, usa: u.length ? u.slice(0, 8).map((x) => "`" + x + "`").join(", ") + (u.length > 8 ? " …" : "") : "—" };
  });
  const grupos = {};
  filas.forEach((f) => { const d = f.ruta.includes("/") ? f.ruta.replace(/\/[^/]*$/, "/") : ""; (grupos[d] ||= []).push(f); });
  const M = [];
  M.push(`# Mapa del sitio${proyecto ? " — " + linea(proyecto) : ""}`); M.push("");
  M.push("> Qué es cada archivo de este repositorio y dónde está. Lo leen las personas y los chats de IA: cuando a un chat le falta un archivo, mira este mapa y le pide a la persona que lo baje.");
  M.push(`> La columna **Usa** se calcula sola (imports y enlaces). Lo demás se escribe a mano y no se pisa. Para actualizarlo: \`${comando}\`.`);
  M.push("> Una descripción que empieza con ⚠ es provisoria: hay que confirmarla.");
  if (carpetas.length) {
    M.push(""); M.push("## Carpetas"); M.push(""); M.push("| Carpeta | Qué es |"); M.push("|---|---|");
    carpetas.forEach((c) => M.push(`| \`${c}\` | ${previas[c].que} |`));
  }
  const orden = Object.keys(grupos).sort((a, b) => (a === "" ? -1 : b === "" ? 1 : a.localeCompare(b)));
  for (const d of orden) {
    M.push(""); M.push(d === "" ? "## Raíz" : `## \`${d}\``); M.push("");
    M.push("| Archivo | Qué es | Usa |"); M.push("|---|---|---|");
    grupos[d].forEach((f) => M.push(`| \`${f.ruta}\` | ${f.que} | ${f.usa} |`));
  }
  M.push("");
  return M.join("\n");
}

/** Cuánto pesa un archivo, en las mismas «unidades de lectura» del resto, escrito para una persona. */
export const pesoLegible = (bytes) => { const t = Math.round(bytes / 3.3); return t < 1000 ? `${Math.max(1, t)}` : `${(t / 1000).toFixed(1)} mil`; };

/** La valla de un bloque de código: más larga que cualquier racha de ` que tenga adentro (si no, el código cierra el bloque). */
const valla = (texto) => "`".repeat(Math.max(3, ...[...String(texto).matchAll(/`+/g)].map((m) => m[0].length + 1)));

const lista = (a) => a.length ? a.map((x) => "`" + x + "`").join(", ") : "—";

/* ── rutas: para saber quién importa a quién ── */
const sinPunto = (r) => String(r).replace(/\.m?js$/, "");
function resolverRuta(desdeArchivo, importado) {
  if (!/^\.{1,2}\//.test(importado)) return null;                      // un módulo de un CDN o una dirección: no es de este sitio
  const partes = String(desdeArchivo).split("/").slice(0, -1);
  for (const seg of importado.split("/")) {
    if (seg === "." || seg === "") continue;
    if (seg === "..") partes.pop(); else partes.push(seg);
  }
  return partes.join("/");
}
/** Los nombres que exporta un archivo. */
export function exportadosDe(src) {
  const s = String(src), out = [];
  for (const m of s.matchAll(/(?:^|\n)\s*export\s+(?:default\s+)?(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g)) out.push(m[1]);
  for (const m of s.matchAll(/(?:^|\n)\s*export\s*\{([^}]*)\}/g)) m[1].split(",").forEach((p) => { const a = /\bas\s+([\w$]+)\s*$/.exec(p.trim()); const n = a ? a[1] : p.trim(); if (n) out.push(n); });
  return unico(out);
}
/** ¿Está CERRADA la sección? Qué otros archivos del sitio importan lo que se va a editar.
 *  `indice` es { ruta: texto } de los demás archivos. Lo que está dentro de una página .html
 *  (script en línea) no lo puede importar nadie: es cerrado por construcción. */
export function impactoFuera(ruta, nombresEditables, srcArchivo, indice) {
  const exportados = exportadosDe(srcArchivo).filter((n) => !nombresEditables || nombresEditables.includes(n));
  const afuera = [];
  if (!exportados.length) return { exportados: [], afuera, cerrada: true };
  for (const [r, src] of Object.entries(indice || {})) {
    if (r === ruta) continue;
    for (const im of importsDe(src)) {
      const dest = resolverRuta(r, im.desde);
      if (!dest || sinPunto(dest) !== sinPunto(ruta)) continue;
      const usa = im.nombres.filter((n) => exportados.includes(n));
      if (usa.length) afuera.push({ archivo: r, nombres: usa });
      else if (im.ns) afuera.push({ archivo: r, nombres: ["* (todo el módulo)"] });
    }
  }
  return { exportados, afuera, cerrada: afuera.length === 0 };
}

/** Lee la sección `id` de `cfg` con `leer(ruta)` (async: fs en Node, fetch en el panel) y arma el .md.
 *  Devuelve también lo que hace falta para el semáforo y para detectar choques al volver:
 *  `archivos` (los que se pueden editar) y `huellas` ({ "ruta#pieza": huella }). */
export async function construir(cfg, id, leer, { fecha = "", semaforo = null, repo = "", listar = null, modo = "piezas" } = {}) {
  const secciones = cfg.secciones || cfg.intervenciones || [];
  const iv = secciones.find((x) => x.id === id);
  if (!iv) throw new Error("No existe la sección «" + id + "» en el mapa del sitio");
  const esp = cfg.espacio || "P";
  const avisos = [], partes = [], texts = {}, fuentes = {};

  for (const a of iv.archivos || []) {
    let src;
    try { src = await leer(a.ruta); } catch (e) { avisos.push(`No se pudo leer ${a.ruta}: ${e && e.message ? e.message : e}`); continue; }
    fuentes[a.ruta] = src;
    const decls = declaraciones(src), L = src.split("\n");
    texts[a.ruta] = Object.fromEntries(decls.map((d) => [d.nombre, L.slice(d.desde - 1, d.hasta).join("\n")]));
    const entera = entregaEntera(a, src, modo);
    if (!entera) {
      const { piezas, faltan } = extraer(src, a.tramos, decls);
      faltan.forEach((n) => avisos.push(`El mapa pide «${n}» de ${a.ruta} y ese archivo ya no la tiene: el mapa está desactualizado.`));
      piezas.forEach((p) => partes.push({ ruta: a.ruta, rol: a.rol || "editar", para: a.para || "", ...p, imports: importsDe(src) }));
    } else {
      partes.push({ ruta: a.ruta, rol: a.rol || (a.tramos && a.tramos.length ? "editar" : "leer"), para: a.para || "", nombre: "(archivo entero)", desde: 1, hasta: L.length, texto: src, imports: importsDe(src), entero: true });
    }
  }

  // ── dependencias por pieza ──
  const deps = partes.map((p) => {
    const todas = texts[p.ruta] || {};
    const rel = p.entero ? { llama: [], llamadaPor: [] } : relaciones(p.nombre, todas);
    const locales = unico(p.imports.flatMap((i) => i.nombres));
    const usados = usadosEn(p.texto, locales);
    const porModulo = p.imports.filter((i) => !i.dinamico && i.nombres.some((n) => usados.includes(n)))
      .map((i) => ({
        modulo: i.desde,
        // de un `* as A` se dice qué se usa de verdad (`A.normalizar`), no sólo «A»
        nombres: i.nombres.filter((n) => usados.includes(n)).flatMap((n) => {
          const ns = (i.importados || []).some((x) => x.local === n && x.ns);
          if (!ns) return [n];
          const u = usosDeEspacio(p.texto, n); return u.length ? u.map((x) => n + "." + x) : [n];
        }),
      }));
    return { p, p_usa: usosDeEspacio(p.texto, esp), colecciones: coleccionesDe(p.texto), ids: idsDe(p.texto), porModulo, ...rel };
  });
  const editables = partes.filter((p) => p.rol === "editar");
  const todosTextos = partes.map((p) => p.texto);

  // ── el núcleo, recortado ──
  let nucleo = null;
  if (cfg.nucleo) {
    try {
      const srcN = await leer(cfg.nucleo);
      const imp = unico(partes.flatMap((p) => p.imports.filter((i) => sinPunto(i.desde.replace(/^\.\//, "")) === sinPunto(cfg.nucleo.split("/").pop())).flatMap((i) => i.nombres)));
      nucleo = recortarNucleo(srcN, todosTextos, imp, esp);
      nucleo.piezas = nucleo.piezas.filter((q) => !partes.some((p) => p.ruta === cfg.nucleo && p.nombre === q.nombre));
      nucleo.ruta = cfg.nucleo;
      nucleo.noEncontradas.forEach((n) => avisos.push(`El código usa ${esp}.${n} y ${cfg.nucleo} no la define.`));
    } catch (e) { avisos.push(`No se pudo leer ${cfg.nucleo}: ${e && e.message ? e.message : e}`); }
  }

  // ── dependencias RECORTADAS: lo que las partes importan de módulos propios del sitio, y lo que ésos importan ──
  const dependencias = [], noIncluidas = [];
  if (cfg.dependencias !== false) {
    const yaEn = new Set(partes.map((p) => p.ruta));
    const cache = {};
    const leerMod = async (dest) => {
      for (const c of [dest, dest + ".js"]) {
        if (cache[c] === undefined) { try { cache[c] = await leer(c); } catch (e) { cache[c] = null; } }
        if (cache[c] != null) return { ruta: c, src: cache[c] };
      }
      return null;
    };
    const pedidos = new Map(), omitidos = new Map();
    const pedir = async (deRuta, texto, imports) => {
      let nuevo = false;
      for (const im of imports) {
        if (im.dinamico) continue;
        const dest = resolverRuta(deRuta, im.desde); if (!dest) continue;
        const usados = new Set();
        for (const i of im.importados || []) {
          if (i.ns) usosDeEspacio(texto, i.local).forEach((n) => usados.add(n));
          else if (i.nombre && usadosEn(texto, [i.local]).length) usados.add(i.nombre);
        }
        if (!usados.size) continue;
        const omitir = (cfg.noIncluir || []).find((r) => sinPunto(r) === sinPunto(dest));
        if (omitir) { if (!omitidos.has(omitir)) omitidos.set(omitir, new Set()); usados.forEach((n) => omitidos.get(omitir).add(n)); continue; }
        const mod = await leerMod(dest);
        if (!mod) { avisos.push(`${deRuta} importa ${im.desde} y ese archivo no se pudo leer.`); continue; }
        if (mod.ruta === deRuta || yaEn.has(mod.ruta) || mod.ruta === cfg.nucleo) continue;
        if (!pedidos.has(mod.ruta)) pedidos.set(mod.ruta, new Set());
        const s = pedidos.get(mod.ruta), antes = s.size; usados.forEach((n) => s.add(n)); if (s.size > antes) nuevo = true;
      }
      return nuevo;
    };
    const piezasDe = (src, nombres) => {
      const decls = declaraciones(src), L = src.split("\n"), incl = new Set(), pend = [];
      const locales = decls.map((d) => d.nombre).filter((n) => !n.includes("."));
      const add = (n) => { if (!incl.has(n) && decls.some((d) => d.nombre === n)) { incl.add(n); pend.push(n); } };
      nombres.forEach(add);
      while (pend.length) { const nom = pend.pop(), d = decls.find((x) => x.nombre === nom); usadosEn(L.slice(d.desde - 1, d.hasta).join("\n"), locales).forEach(add); }
      return { piezas: decls.filter((d) => incl.has(d.nombre)).map((d) => ({ ...d, texto: L.slice(d.desde - 1, d.hasta).join("\n") })), total: decls.length, faltan: [...nombres].filter((n) => !decls.some((d) => d.nombre === n)) };
    };
    for (const p of partes) await pedir(p.ruta, p.texto, p.imports);
    const hechos = new Map();
    for (let vuelta = 0; vuelta < 6; vuelta++) {
      let cambio = false;
      for (const [ruta, nombres] of [...pedidos]) {
        if (hechos.get(ruta) === nombres.size) continue;
        hechos.set(ruta, nombres.size);
        const src = cache[ruta], r = piezasDe(src, nombres);
        for (const q of r.piezas) if (await pedir(ruta, q.texto, importsDe(src))) cambio = true;
      }
      if (!cambio) break;
    }
    for (const [ruta, nombres] of pedidos) { const r = piezasDe(cache[ruta], nombres); dependencias.push({ ruta, ...r }); r.faltan.forEach((n) => avisos.push(`El código usa «${n}» de ${ruta} y ese archivo no la define.`)); }
    for (const [ruta, nombres] of omitidos) noIncluidas.push({ ruta, nombres: [...nombres].sort() });
    dependencias.sort((a, b) => a.ruta.localeCompare(b.ruta));
  }

  // ── las reglas de lo que toca ──
  let reglas = null;
  const cols = unico([...(iv.colecciones || []), ...deps.flatMap((d) => d.colecciones)]);
  if (cfg.reglas && iv.reglas !== false && cols.length) {
    try { reglas = bloquesDeReglas(await leer(cfg.reglas), cols); reglas.ruta = cfg.reglas; reglas.cols = cols; }
    catch (e) { avisos.push(`No se pudo leer ${cfg.reglas}: ${e && e.message ? e.message : e}`); }
  }

  // ── ¿está cerrada? quién más usa lo que se va a editar ──
  const cierre = [];
  if ((cfg.indice || []).length) {
    const indice = {};
    for (const r of cfg.indice) { if (fuentes[r] != null) indice[r] = fuentes[r]; else { try { indice[r] = await leer(r); } catch (e) { /* un archivo del índice que no baja no impide armar el paquete */ } } }
    for (const a of (iv.archivos || []).filter((x) => (x.rol || "leer") === "editar" && fuentes[x.ruta] != null)) {
      const im = impactoFuera(a.ruta, a.tramos && a.tramos.length && !entregaEntera(a, fuentes[a.ruta], modo) ? a.tramos : null, fuentes[a.ruta], indice);
      if (!im.cerrada) cierre.push({ ruta: a.ruta, ...im });
    }
  }

  // ── el peso ──
  const pesoCodigo = partes.reduce((t, p) => t + tokens(p.texto), 0)
    + (nucleo ? nucleo.piezas.reduce((t, p) => t + tokens(p.texto), 0) : 0) + (reglas ? tokens(reglas.texto) : 0)
    + dependencias.reduce((s, d) => s + d.piezas.reduce((t, p) => t + tokens(p.texto), 0), 0);
  const limite = cfg.limiteTokens || 30000;
  if (pesoCodigo > limite) avisos.push(`El paquete pesa unas ${Math.round(pesoCodigo / 1000)} mil unidades de lectura (el límite cómodo es ${Math.round(limite / 1000)} mil): conviene partir la sección en dos.`);

  // ── lo que se necesita para el semáforo y para detectar choques ──
  const huellas = {};
  editables.forEach((p) => { if (!p.entero) huellas[p.ruta + "#" + p.nombre] = huellaDe(p.texto); });
  for (const a of (iv.archivos || []).filter((x) => (x.rol || "leer") === "editar" && fuentes[x.ruta] != null && entregaEntera(x, fuentes[x.ruta], modo))) {
    huellas[a.ruta + "#*"] = huellaDe(fuentes[a.ruta]);
    declaraciones(fuentes[a.ruta]).forEach((d) => { huellas[a.ruta + "#" + d.nombre] = huellaDe(fuentes[a.ruta].split("\n").slice(d.desde - 1, d.hasta).join("\n")); });
  }
  const archivosEditables = unico(editables.map((p) => p.ruta));

  // ── el mapa del sitio: la lista VIVA de archivos (si se puede) y sus notas ──
  let mapa = null;
  const repoMapa = repo || cfg.repo || "", rama = cfg.rama || "main";
  if (listar) {
    try {
      const todos = (await listar()).filter((x) => esArchivoDeSitio(x.ruta));
      if (todos.length) mapa = todos.sort((a, b) => a.ruta.localeCompare(b.ruta));
    } catch (e) { avisos.push("No se pudo traer la lista de archivos del sitio (" + (e && e.message ? e.message : e) + "): el paquete sale sin mapa."); }
  }
  if (!mapa && (cfg.indice || []).length) mapa = cfg.indice.map((r) => ({ ruta: r, bytes: (fuentes[r] || "").length })).sort((a, b) => a.ruta.localeCompare(b.ruta));

  // ── el .md ──
  const M = [];
  M.push(`# Paquete de intervención — ${linea(cfg.proyecto || "")} · ${linea(iv.titulo)}`);
  M.push("");
  M.push(`Armado desde el panel${fecha ? " el " + fecha : ""} (${VERSION}). Es para **modificaciones pequeñas**: lo que toca reglas, claves o la estructura de los datos lo hace Mauro.`);
  if (semaforo) {
    M.push(""); M.push(`> 🚦 **Esta sección quedó marcada «en edición» a tu nombre.** Mientras no traigas la respuesta al panel, cualquier otra persona que quiera tocarla ve el aviso. Se levanta sola cuando traés la respuesta, o a las ${semaforo.horas || 24} horas si te olvidás.`);
  }
  if (avisos.length) { M.push(""); avisos.forEach((a) => M.push(`> ⚠ ${a}`)); }
  M.push(""); M.push("## Tu pedido"); M.push("");
  M.push("_(escribí acá qué querés cambiar y qué ves mal, con tus palabras)_");
  M.push(""); M.push("## Qué es esta parte"); M.push("");
  M.push(linea(iv.que));
  M.push(""); M.push("## Cómo trabajar con este paquete"); M.push("");
  PASOS({ destino: cfg.destino, aplicarEnPanel: !!cfg.aplicarEnPanel, semaforo: !!semaforo }).forEach((t, i) => M.push(`${i + 1}. ${t}`));
  M.push(""); M.push("## Cómo se integra lo que devuelvas"); M.push("");
  M.push("- **Si trabajás desde el panel, sin pasar por GitHub** (como la mayoría del equipo): traé la respuesta de tu chat a esta misma sección del panel. El panel revisa que cada archivo parsee, te deja los archivos completos y guarda en el pedido TODA la respuesta y el registro. Después Claude (el de Mauro) lo integra en la ronda: lo compara con el repositorio de ese día, corre las comprobaciones y lo sube. **Tu cambio queda guardado completo: no hace falta que hagas nada más.**");
  M.push("- **Si tenés acceso de colaborador al repositorio:** subí vos los archivos completos por la web de GitHub (abrir el archivo → lápiz → pegar → «Commit changes», una cosa por subida) y después traé igual la respuesta al panel, para que quede el registro.");
  M.push("- En los dos casos nada llega a los usuarios finales sin las comprobaciones del repositorio.");
  M.push(""); M.push("## Qué tiene que ir publicado con tu cambio"); M.push("");
  M.push("Tu cambio está completo cuando entrega TODO esto, no sólo el código:"); M.push("");
  M.push("1. **Los archivos completos que cambiaron**, cada uno con su ruta del repositorio, y la lista de cuáles son al final de tu respuesta.");
  M.push("2. **El sello de versión** de cada archivo con lógica que tocaste, subido un número (`P.PANEL`, `VERSION`, `SELLO` o el que lleve en su cabecera).");
  M.push("3. **Si un archivo cambiado está en la lista `SHELL` de `sw.js`** (o en la que corresponda a este sitio): sube también la `VERSION` de ese `sw.js` y los `?v=` con que se pide el archivo. Si no, los teléfonos sirven una mezcla de viejo y nuevo.");
  M.push("4. **La documentación al día**: si tu cambio hace falsa una línea del README, del mapa o de la tabla de sellos, la corregís en el mismo cambio.");
  M.push("5. **Las pruebas del repositorio** que correspondan, corridas" + (cfg.verificacion ? " (" + linea(cfg.verificacion) + ")" : "") + "; si tu chat no puede correrlas, que diga cuáles faltan y por qué.");
  M.push("6. **El registro de tanda**, con la forma de abajo, al final de tu respuesta.");
  (cfg.publicar || []).forEach((t, i) => M.push(`${7 + i}. ${t}`));
  if ((cfg.reglasDelRepo || []).length) {
    M.push(""); M.push("## Reglas de este repositorio que tu chat no puede romper"); M.push("");
    cfg.reglasDelRepo.forEach((r) => M.push(`- ${r}`));
  }

  M.push(""); M.push("## Qué hay en este paquete"); M.push("");
  M.push("| Parte | Rol | Qué es |"); M.push("|---|---|---|");
  partes.forEach((p) => M.push(`| \`${p.ruta}\` · \`${p.nombre}\` (líneas ${p.desde}–${p.hasta}) | **${p.rol === "editar" ? "EDITAR" : "SOLO LEER"}** | ${linea(p.para)} |`));
  if (nucleo) M.push(`| \`${nucleo.ruta}\` · ${nucleo.piezas.length} de ${nucleo.total} piezas | **SOLO LEER** | El núcleo: las funciones compartidas \`${esp}.*\` que usa lo que vas a editar, más lo que ésas usan. Del resto no se incluye nada. |`);
  dependencias.forEach((d) => M.push(`| \`${d.ruta}\` · ${d.piezas.length} de ${d.total} piezas | **SOLO LEER** | Lo que importa lo que vas a editar, recortado a lo que usa (y a lo que ésas usan). |`));
  noIncluidas.forEach((d) => M.push(`| \`${d.ruta}\` · no incluido | — | Se usa ${d.nombres.map((n) => "`" + n + "`").join(", ")}. Su contenido no viaja a propósito (conexión y configuración). |`));
  if (reglas) M.push(`| \`${reglas.ruta}\` · reglas de ${lista(reglas.encontradas)} | **SOLO LEER** | Quién puede leer y escribir cada colección que toca el código. Las publica Mauro, completas, desde la consola. |`);

  M.push(""); M.push("## De qué depende cada pieza"); M.push("");
  M.push("Leído del código, sin IA. Sirve para saber qué se rompe si cambia una cosa.");
  for (const d of deps) {
    M.push(""); M.push(`### \`${d.p.ruta}\` · \`${d.p.nombre}\` — ${d.p.rol === "editar" ? "EDITAR" : "solo leer"}`);
    if (d.p.entero) M.push("- Archivo entero: se incluye completo.");
    M.push(`- **Trae de otros módulos:** ${d.porModulo.length ? d.porModulo.map((x) => `\`${x.modulo}\` → ${lista(x.nombres)}`).join(" · ") : "—"}`);
    M.push(`- **Funciones del núcleo que usa:** ${lista(d.p_usa.map((n) => esp + "." + n))}`);
    M.push(`- **Colecciones de Firestore que toca:** ${lista(d.colecciones)}`);
    if (!d.p.entero) {
      M.push(`- **Llama a (mismo archivo):** ${lista(d.llama)}`);
      M.push(`- **La llaman:** ${lista(d.llamadaPor)}`);
    }
    M.push(`- **Elementos de la página que usa:** ${lista(d.ids)}`);
  }
  const archivosConTramos = unico(partes.filter((p) => !p.entero).map((p) => p.ruta));
  for (const r of archivosConTramos) {
    const nombres = Object.keys(texts[r] || {}).filter((n) => !n.includes(".") && !partes.some((p) => p.ruta === r && p.nombre === n));
    if (nombres.length) {
      M.push(""); M.push(`**Otras piezas de \`${r}\` que NO se incluyen** (pedilas por su nombre si hacen falta): ${nombres.slice(0, 80).map((n) => "`" + n + "`").join(", ")}${nombres.length > 80 ? ` … y ${nombres.length - 80} más` : ""}.`);
    }
  }
  M.push(""); M.push("### ¿Está cerrada esta sección?"); M.push("");
  if (!(cfg.indice || []).length) M.push("El mapa de este sitio no trae el índice de archivos, así que no se pudo comprobar quién más usa lo que se va a editar.");
  else if (!cierre.length) M.push("**Sí.** Nada fuera de este paquete importa lo que vas a editar: un cambio acá no rompe otra parte del sitio.");
  else {
    M.push("**No del todo.** Otras partes del sitio usan lo que vas a editar. Si cambiás el nombre o los parámetros de algo de esta lista, las rompés:"); M.push("");
    cierre.forEach((c) => c.afuera.forEach((o) => M.push(`- \`${c.ruta}\` la usan \`${o.archivo}\` (${lista(o.nombres)})`)));
  }

  if (reglas) {
    M.push(""); M.push("## Las reglas de lo que toca (solo leer)"); M.push("");
    M.push("Las reglas se SUMAN: si una colección tiene dos bloques, vale lo que permita cualquiera de los dos. Lo que no está declarado está denegado.");
    if (reglas.faltan.length) M.push(`\n> ⚠ Sin regla propia en \`${reglas.ruta}\`: ${lista(reglas.faltan)} (quedan denegadas).`);
    const vr = valla(reglas.texto);
    M.push(""); M.push(vr); M.push(reglas.texto); M.push(vr);
  }

  // el MAPA.md del sitio (qué es cada archivo y dónde está), si lo tiene
  let mapaDoc = null;
  try { mapaDoc = await leer(cfg.mapaDoc || "MAPA.md"); } catch (e) { /* sin mapa: se arma una lista automática abajo */ }
  const enPaquete = (ruta) => {
    const ps = partes.filter((p) => p.ruta === ruta);
    if (ps.length) {
      const rol = ps.some((p) => p.rol === "editar") ? "**EDITAR**" : "SOLO LEER";
      return ps.some((p) => p.entero) ? `${rol} · entero` : `${rol} · ${ps.map((p) => "`" + p.nombre + "`").join(", ")}`;
    }
    if (nucleo && ruta === nucleo.ruta) return "SOLO LEER · recortado";
    if (dependencias.some((d) => d.ruta === ruta)) return "SOLO LEER · recortado";
    if (reglas && ruta === reglas.ruta) return "SOLO LEER · recortado";
    return "—";
  };
  if ((mapa && mapa.length) || mapaDoc) {
    M.push(""); M.push("## Mapa del sitio: qué es cada archivo y dónde está"); M.push("");
    M.push("Este paquete trae **la parte** que te toca. Del resto del sitio **tenés este mapa**. Si te falta un archivo para entender o resolver el pedido, **no lo supongas ni lo inventes**: buscalo en el mapa y pedile a la persona que lo descargue de GitHub y te lo pegue o te lo adjunte. Pedí de a uno, el más chico que alcance; si pesa mucho, pedí sólo la pieza por su nombre. Lo que baje la persona es para **leer**: sólo se aplican las piezas marcadas EDITAR de este paquete. Si el cambio necesita editar otro archivo, decíselo a la persona: eso lo hace Mauro.");
    M.push("");
    if (repoMapa) {
      M.push(`- Para verlo en GitHub (tiene un botón «Raw» o «Download raw file»): \`https://github.com/${repoMapa}/blob/${rama}/<archivo>\``);
      M.push(`- Descarga directa, texto crudo: \`https://raw.githubusercontent.com/${repoMapa}/${rama}/<archivo>\``);
    } else M.push("_(Este mapa no trae el repositorio: preguntale a la persona de dónde bajarlo.)_");
    M.push("");
    const hecho = [...new Set([...partes.map((p) => p.ruta), ...(nucleo ? [nucleo.ruta] : []), ...dependencias.map((d) => d.ruta), ...(reglas ? [reglas.ruta] : [])])];
    M.push(`**Ya viene en este paquete:** ${hecho.map((r) => "`" + r + "`").join(", ") || "—"}.`);
    if (mapaDoc) {
      if (tokens(mapaDoc) > 6000) avisos.push(`El mapa del sitio pesa unas ${Math.round(tokens(mapaDoc) / 1000)} mil unidades: conviene recortarlo.`);
      const reales = (mapa || []).map((x) => x.ruta).filter(esArchivoDeSitio);
      if (reales.length) {
        const cmp = compararMapa(filasDelMapa(mapaDoc).map((f) => f.ruta), reales, [cfg.mapaDoc || "MAPA.md"]);
        if (cmp.sinDescribir.length) { M.push(""); M.push(`> ⚠ El mapa NO describe estos archivos que existen (pedile a la persona que los abra si hacen falta): ${cmp.sinDescribir.slice(0, 30).map((x) => "`" + x + "`").join(", ")}${cmp.sinDescribir.length > 30 ? " …" : ""}.`); }
        if (cmp.fantasmas.length) { M.push(""); M.push(`> ⚠ El mapa nombra archivos que ya no existen: ${cmp.fantasmas.slice(0, 30).map((x) => "`" + x + "`").join(", ")}.`); }
      }
      M.push(""); M.push("### El mapa (" + (cfg.mapaDoc || "MAPA.md") + ")"); M.push("");
      M.push(mapaDoc.replace(/^# .*\n+/, "").replace(/^(#{1,4}) /gm, (m, h) => "#".repeat(h.length + 3) + " ").trim());
    } else {
      M.push(""); M.push("> ⚠ Este sitio todavía no tiene un `MAPA.md`: la lista de abajo es automática y no dice qué es cada archivo.");
      M.push(""); M.push("| Archivo | Qué es | Peso | En este paquete |"); M.push("|---|---|---|---|");
      const notas = cfg.mapaNotas || {};
      (mapa || []).slice(0, 150).forEach((x) => M.push(`| \`${x.ruta}\` | ${linea(notas[x.ruta] || "")} | ${pesoLegible(x.bytes || 0)} | ${enPaquete(x.ruta)} |`));
    }
  }

  M.push(""); M.push("## El código"); M.push("");
  const orden = [...partes.filter((p) => p.rol === "editar"), ...partes.filter((p) => p.rol !== "editar")];
  const bloque = (ruta, rol, nombre, desde, hasta, texto) => {
    M.push(`### ${rol === "editar" ? "EDITAR" : "SOLO LEER"} · \`${ruta}\` · \`${nombre}\``); M.push("");
    const v = valla(texto);
    M.push(v + "js"); M.push(`// ── ${ruta}: líneas ${desde}–${hasta} ──`); M.push(texto); M.push(v); M.push("");
  };
  orden.forEach((p) => bloque(p.ruta, p.rol, p.nombre, p.desde, p.hasta, p.texto));
  if (nucleo) nucleo.piezas.forEach((p) => bloque(nucleo.ruta, "leer", p.nombre, p.desde, p.hasta, p.texto));
  dependencias.forEach((d) => d.piezas.forEach((p) => bloque(d.ruta, "leer", p.nombre, p.desde, p.hasta, p.texto)));

  M.push("## Al terminar: cómo tiene que ser tu respuesta"); M.push("");
  M.push("Tres partes, en este orden:"); M.push("");
  M.push("1. **Qué cambiaste y por qué**, en tres renglones, sin jerga.");
  M.push("2. **Los archivos completos que cambiaron**, cada uno en su valla de código y precedido por su línea `// ── archivo: líneas … ──` (la del bloque de arriba), con todas sus líneas. Después, una lista de una línea por archivo: ruta y qué cambia.");
  M.push("3. **El registro de tanda**, con esta forma:"); M.push("");
  M.push("```");
  M.push("## <qué se cambió> · registro de tanda · <fecha>");
  M.push("**Pedido:** qué se quería y quién lo pidió.");
  M.push("**Lo que se subió:** archivos y qué cambia en cada uno.");
  M.push("**Lo que NO se subió:** y qué función queda a medias por eso.");
  M.push("**Sellos y documentación:** qué sellos subieron y qué documentos se corrigieron.");
  M.push("**Lo que se probó y se descartó:** y por qué.");
  M.push("**Sin cambios:** lo que no se tocó (reglas, datos…).");
  M.push("**Pendiente de verificar:** qué falta comprobar y cómo.");
  M.push("```"); M.push("");

  const md = M.join("\n");
  return {
    md, avisos, tokens: tokens(md), pesoCodigo, modo,
    enteros: editables.filter((p) => p.entero).map((p) => p.ruta), porPiezas: unico(editables.filter((p) => !p.entero).map((p) => p.ruta)),
    editables: editables.map((p) => ({ ruta: p.ruta, nombre: p.nombre })),
    archivos: archivosEditables, huellas, colecciones: cols, cierre,
  };
}

/* ═══ LA VUELTA: aplicar lo que devolvió el chat ═════════════════════════ */

/** Revisa que un código parsee, sin ejecutarlo. Devuelve null si está bien, o el motivo. */
export function revisarSintaxis(codigo) {
  try { new Function(codigo); return null; }
  catch (e) { return e && e.message ? e.message : String(e); }
}

/** Revisa que un módulo parsee (con `import`, `export` y `await` de nivel superior), sin ejecutarlo. null si está bien. */
export function revisarModulo(codigo) {
  const sin = String(codigo)
    .replace(/^\s*import\s[^;]*?from\s*["'][^"']+["']\s*;?/gm, "")
    .replace(/^\s*import\s*["'][^"']+["']\s*;?/gm, "")
    .replace(/^\s*export\s*\{[^}]*\}\s*(?:from\s*["'][^"']+["'])?\s*;?/gm, "")
    .replace(/^(\s*)export\s+(?:default\s+)?/gm, "$1");
  try { new Function("return (async () => {\n" + sin + "\n})"); return null; }
  catch (e) { return e && e.message ? e.message : String(e); }
}

/** Revisa un archivo entero según su tipo: los scripts de un .html, un .js, un .json. null si está bien o si no se sabe revisar. */
export function revisarArchivo(ruta, texto) {
  if (/\.html?$/i.test(ruta)) {
    for (const m of String(texto).matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
      if (/\bsrc\s*=/.test(m[1])) continue;
      const tipo = /\btype\s*=\s*["']([^"']+)["']/i.exec(m[1]);
      if (tipo && !/^(module|text\/javascript|application\/javascript)$/i.test(tipo[1])) continue;
      const err = revisarModulo(m[2]);
      if (err) return "un <script> no parsea: " + err;
    }
    return null;
  }
  if (/\.m?js$/i.test(ruta)) return revisarModulo(texto);
  if (/\.json$/i.test(ruta)) { try { JSON.parse(texto); return null; } catch (e) { return "no es un JSON válido: " + e.message; } }
  return null;
}

/** ¿La respuesta trae el archivo ENTERO (y no un fragmento)? */
function esArchivoCompleto(ruta, codigo, original) {
  const c = String(codigo).trim();
  if (/\.html?$/i.test(ruta)) return /<html[\s>]/i.test(c) && /<\/html>\s*$/i.test(c);
  const nombres = declaraciones(original).map((d) => d.nombre).filter((n) => !n.includes("."));
  if (!nombres.length) return c.length >= 0.6 * String(original).trim().length;
  const nuevos = new Set(declaraciones(codigo).map((d) => d.nombre));
  return nombres.filter((n) => nuevos.has(n)).length >= Math.ceil(nombres.length * 0.8) && c.length >= 0.5 * String(original).trim().length;
}

/** Saca de la respuesta de un chat el código: lo que está entre ``` si hay, y sin las marcas del paquete. */
export function codigoDeRespuesta(texto) {
  const t = String(texto || "").replace(/\r\n?/g, "\n");
  const bloques = [...t.matchAll(/(`{3,})[\w-]*\n([\s\S]*?)\n?\1(?!`)/g)].map((m) => m[2]);
  const base = bloques.length ? bloques.join("\n\n//\n\n") : t;   // el `//` corta una pieza del texto que venga en el bloque siguiente
  return base.split("\n").filter((l) => !MARCA.test(l)).join("\n");
}

/** Pone en `original` las piezas que trae `respuesta`, POR NOMBRE, y sólo las de `permitidos`.
 *  Devuelve { texto, reemplazadas, rechazadas, avisos }; no toca nada que no esté permitido. */
export function aplicarCambios(original, respuesta, permitidos) {
  const codigo = codigoDeRespuesta(respuesta);
  const nuevas = declaraciones(codigo), nuevasL = codigo.split("\n");
  const viejas = declaraciones(original);
  const L = String(original).split("\n");
  const reemplazadas = [], rechazadas = [], avisos = [];
  const cambios = [];
  for (const n of nuevas) {
    const cuerpo = nuevasL.slice(n.desde - 1, n.hasta).join("\n");
    if (!permitidos.includes(n.nombre)) { rechazadas.push({ nombre: n.nombre, motivo: "no es una pieza que este paquete deje editar" }); continue; }
    const v = viejas.find((x) => x.nombre === n.nombre);
    if (!v) { rechazadas.push({ nombre: n.nombre, motivo: "no existe en el archivo: una pieza nueva la agrega Mauro" }); continue; }
    if (cambios.some((c) => c.v.nombre === n.nombre)) { rechazadas.push({ nombre: n.nombre, motivo: "vino repetida" }); continue; }
    const err = revisarSintaxis(cuerpo.replace(/^export\s+(?:default\s+)?/m, ""));   // suelta, una pieza exportada no parsearía por el `export`
    if (err) { rechazadas.push({ nombre: n.nombre, motivo: "no parsea: " + err }); continue; }
    const comViejo = v.linea - v.desde, comNuevo = n.linea - n.desde;
    if (comViejo > 0 && comNuevo === 0) avisos.push(`«${n.nombre}» perdió el comentario que tenía arriba: conviene conservarlo.`);
    cambios.push({ v, cuerpo });
  }
  cambios.sort((a, b) => b.v.desde - a.v.desde);
  for (const c of cambios) {
    L.splice(c.v.desde - 1, c.v.hasta - c.v.desde + 1, ...c.cuerpo.split("\n"));
    reemplazadas.push(c.v.nombre);
  }
  const texto = L.join("\n");
  if (!reemplazadas.length && !rechazadas.length) avisos.push("No se reconoció ninguna pieza en la respuesta: tiene que traer las funciones completas, con su nombre.");
  return { texto, reemplazadas: reemplazadas.reverse(), rechazadas, avisos };
}

/* ═══ LA VUELTA, VARIOS ARCHIVOS: cada pieza a su archivo ═══════════════════ */

const MARCA_RUTA = /^\/\/ ── (.+?): líneas \d+[–-]\d+ ──\s*$/;

/** La respuesta de un chat partida en tramos por la marca `// ── archivo: líneas … ──`.
 *  Lo que viene antes de la primera marca (o sin marcas) queda con `ruta: null`. */
export function segmentosDeRespuesta(texto) {
  const t = String(texto || "").replace(/\r\n?/g, "\n");
  const bloques = [...t.matchAll(/(`{3,})[\w-]*\n([\s\S]*?)\n?\1(?!`)/g)].map((m) => m[2]);
  const base = bloques.length ? bloques.join("\n\n//\n\n") : t;   // el `//` corta una pieza del texto que venga en el bloque siguiente
  const out = [{ ruta: null, lineas: [] }];
  for (const l of base.split("\n")) {
    const m = MARCA_RUTA.exec(l);
    if (m) { out.push({ ruta: m[1], lineas: [] }); continue; }
    out[out.length - 1].lineas.push(l);
  }
  return out.map((s) => ({ ruta: s.ruta, codigo: s.lineas.join("\n") })).filter((s) => s.codigo.trim());
}

/** Reparte lo que devolvió el chat entre los archivos y reemplaza por nombre, sólo lo permitido.
 *  `originales`: { ruta: texto }.  `permitidos`: { ruta: [nombres] }.
 *  Devuelve { archivos: { ruta: { texto, reemplazadas } }, rechazadas, avisos }. */
export function aplicarEnArchivos(originales, respuesta, permitidos, enteros = {}) {
  const rechazadas = [], avisos = [], porRuta = {}, completos = {};
  const rutas = Object.keys(permitidos);
  for (const seg of segmentosDeRespuesta(respuesta)) {
    if (seg.ruta && enteros[seg.ruta] && permitidos[seg.ruta] && esArchivoCompleto(seg.ruta, seg.codigo, originales[seg.ruta])) { completos[seg.ruta] = seg.codigo; continue; }
    for (const d of declaraciones(seg.codigo)) {
      let ruta = seg.ruta;
      if (ruta && !rutas.includes(ruta)) { rechazadas.push({ ruta, nombre: d.nombre, motivo: "ese archivo no es de esta sección" }); continue; }
      if (!ruta) {
        const cand = rutas.filter((r) => permitidos[r].includes(d.nombre));
        if (cand.length === 1) ruta = cand[0];
        else { rechazadas.push({ ruta: null, nombre: d.nombre, motivo: cand.length ? "puede ser de más de un archivo: dejá la línea `// ── archivo: líneas … ──` arriba de la pieza" : "no es una pieza que esta sección deje editar" }); continue; }
      }
      (porRuta[ruta] ||= []).push(seg.codigo.split("\n").slice(d.desde - 1, d.hasta).join("\n"));
    }
  }
  const archivos = {};
  for (const [ruta, codigo] of Object.entries(completos)) {
    const orig = String(originales[ruta]), nuevo = codigo.replace(/\s+$/, "") + (orig.endsWith("\n") ? "\n" : "");
    const err = revisarArchivo(ruta, nuevo);
    if (err) { rechazadas.push({ ruta, nombre: "(archivo entero)", motivo: "no parsea: " + err }); continue; }
    if (nuevo.length < 0.7 * orig.length) avisos.push(`${ruta}: el archivo quedó mucho más corto (${orig.length} → ${nuevo.length} caracteres): revisá que no falte nada.`);
    archivos[ruta] = { texto: nuevo, reemplazadas: ["(archivo entero)"], completo: true };
  }
  for (const [ruta, cuerpos] of Object.entries(porRuta)) {
    if (completos[ruta] && archivos[ruta]) continue;
    const r = aplicarCambios(originales[ruta], cuerpos.join("\n\n"), permitidos[ruta]);
    r.rechazadas.forEach((x) => rechazadas.push({ ruta, ...x }));
    r.avisos.forEach((a) => avisos.push(`${ruta}: ${a}`));
    if (r.reemplazadas.length) archivos[ruta] = { texto: r.texto, reemplazadas: r.reemplazadas };
  }
  if (!Object.keys(archivos).length && !rechazadas.length) avisos.push("No se reconoció ninguna pieza en la respuesta: tiene que traer las funciones completas, con su nombre.");
  return { archivos, rechazadas, avisos };
}

/** Todo el camino de vuelta de una sección: lee los archivos como están AHORA, detecta si alguien
 *  tocó una pieza desde que se bajó el paquete (`huellasPrevias`) y reparte lo que devolvió el chat. */
export async function aplicarSeccion(cfg, id, respuesta, leer, huellasPrevias = {}, modo = "piezas") {
  const iv = (cfg.secciones || cfg.intervenciones || []).find((x) => x.id === id);
  if (!iv) throw new Error("No existe la sección «" + id + "» en el mapa del sitio");
  const originales = {}, permitidos = {}, enteros = {}, conflictos = [];
  for (const a of (iv.archivos || []).filter((x) => (x.rol || "leer") === "editar")) {
    originales[a.ruta] = await leer(a.ruta);
    const ds = declaraciones(originales[a.ruta]);
    permitidos[a.ruta] = a.tramos && a.tramos.length ? a.tramos : ds.map((d) => d.nombre);
    enteros[a.ruta] = entregaEntera(a, originales[a.ruta], modo);
    // un archivo entregado entero se puede tocar entero: se permiten todas sus piezas
    if (enteros[a.ruta]) permitidos[a.ruta] = ds.map((d) => d.nombre);
  }
  const r = aplicarEnArchivos(originales, respuesta, permitidos, enteros);
  for (const [ruta, a] of Object.entries(r.archivos)) {
    if (a.completo) { const antes = huellasPrevias[ruta + "#*"]; if (antes && huellaDe(originales[ruta]) !== antes) conflictos.push({ ruta, nombre: "(archivo entero)" }); continue; }
    const L = originales[ruta].split("\n"), ds = declaraciones(originales[ruta]);
    for (const nombre of a.reemplazadas) {
      const antes = huellasPrevias[ruta + "#" + nombre], d = ds.find((x) => x.nombre === nombre);
      if (antes && d && huellaDe(L.slice(d.desde - 1, d.hasta).join("\n")) !== antes) conflictos.push({ ruta, nombre });
    }
  }
  const cambiados = Object.entries(r.archivos).map(([ruta, a]) => ({ ruta, texto: a.texto, original: originales[ruta], piezas: a.reemplazadas, completo: !!a.completo }));
  return { cambiados, rechazadas: r.rechazadas, avisos: r.avisos, conflictos };
}

/* ═══ PROPONER SECCIONES para un sitio que todavía no tiene mapa ════════════ */
/** A partir de { ruta: texto } de un sitio, propone un borrador de `secciones.json`:
 *  cada página .html es una sección; lo que importa de módulos propios va como SOLO LEER.
 *  Es un punto de partida: lo revisa una persona (o una sesión) antes de publicarlo. */
export function proponerSecciones(textos, { espacio = "P", nucleo = null, proyecto = "" } = {}) {
  const rutas = Object.keys(textos);
  if (!nucleo) nucleo = rutas.find((r) => r.split("/").pop() === "nucleo.js") || null;   // el núcleo compartido, si el sitio tiene uno con ese nombre
  const existe = (r) => rutas.find((x) => sinPunto(x) === sinPunto(r));
  const cierre = (ruta, visto = new Set()) => {
    for (const im of importsDe(textos[ruta])) {
      const dest = resolverRuta(ruta, im.desde), real = dest && existe(dest);
      if (real && !visto.has(real)) { visto.add(real); cierre(real, visto); }
    }
    return visto;
  };
  const secciones = rutas.filter((r) => /\.html?$/i.test(r)).map((r) => {
    const mods = [...cierre(r)].filter((m) => m !== nucleo);
    const peso = tokens(textos[r]);
    return {
      id: r.replace(/\.html?$/i, "").split("/").pop().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      titulo: "REVISAR · " + r,
      que: "REVISAR: qué hace esta página, en una frase.",
      revisar: true,
      pesoTokens: peso,
      aviso: peso > 12000 ? "La página es grande: elegí las piezas (`tramos`) que se pueden editar en vez de mandarla entera." : undefined,
      archivos: [
        { ruta: r, rol: "editar", para: "REVISAR" },
        ...mods.map((m) => ({ ruta: m, rol: "leer", para: "REVISAR: módulo que importa la página." })),
      ],
    };
  });
  // si todo el sitio entra en un chat, una sección «sitio completo» (útil para sitios chicos)
  const codigo = rutas.filter((r) => /\.(html?|m?js|css)$/i.test(r));
  const total = codigo.reduce((s, r) => s + tokens(textos[r]), 0);
  if (codigo.length && total <= 20000) {
    secciones.unshift({
      id: "sitio-completo", titulo: "REVISAR · el sitio completo", que: "REVISAR: el sitio entero entra en un chat; sirve para cambios que cruzan varias páginas.",
      revisar: true, pesoTokens: total,
      archivos: codigo.map((r) => ({ ruta: r, rol: "editar", para: "REVISAR" })),
    });
  }
  return { version: 1, proyecto, espacio, nucleo, mapaDoc: "MAPA.md", indice: rutas, limiteTokens: 30000, reglasDelRepo: [], secciones };
}
