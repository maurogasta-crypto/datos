// ─────────────────────────────────────────────────────────────────────────────
// telefono.mjs — El teléfono como bodega: limpiar Descargas y guardar respaldos.
//
//   node herramientas/telefono.mjs descargas [--aplicar] [--carpeta <ruta>]
//   node herramientas/telefono.mjs deshacer  [<lote>]    [--carpeta <ruta>]
//   node herramientas/telefono.mjs vaciar    [--dias 30] [--aplicar] [--carpeta <ruta>]
//   node herramientas/telefono.mjs respaldar [--destino <ruta>]
//
// Corre en TERMUX, en el teléfono de Mauro. Sin dependencias: node y git.
//
// ── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
// Pedido de Mauro, 2026-09-29: «se me repiten directorios y archivos basura»,
// y que el teléfono guarde los respaldos del ecosistema y sirva de
// almacenamiento. Línea `L-telefono` del panel.
//
// ── POR QUÉ EN EL TELÉFONO Y NO EN LA NUBE ───────────────────────────────────
// Una sesión de Claude Code corre en un contenedor de la nube y NO PUEDE
// entrar al teléfono: no hay una dirección a la que llamar. El que tiene que
// moverse es el teléfono — va a buscar las copias y ordena su propia carpeta.
// Y en Android 11 en adelante ninguna app puede pedir la raíz de Descargas con
// el selector del sistema; Termux, con `termux-setup-storage`, sí la ve.
//
// ── LAS TRES REGLAS QUE NO SE DESHACEN ───────────────────────────────────────
// 1. **Sin --aplicar no se toca nada.** Cada comando muestra primero lo que
//    haría. Es lo que deja probarlo en un teléfono real sin miedo.
// 2. **Botar es MOVER a `_Papelera/<lote>/`, no borrar.** Cada lote lleva su
//    `lote.json` con de dónde salió cada cosa, y `deshacer` la devuelve.
//    Borrar de verdad es `vaciar`, que sólo toca lotes de más de N días.
// 3. **Lo que abre algo o guarda historia no se mueve nunca**, aunque esté
//    repetido: claves de firma (`.jks`), llaves, bases (`.db`, que en este
//    ecosistema son los respaldos de la Hilux, con el recorrido). Se AVISAN.
//    Un `.jks` perdido es no poder volver a firmar una actualización.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import * as Bodega from "./telefono-bodega.mjs";

const PAPELERA = "_Papelera";

/* Las extensiones que nunca se mueven. Se comparan en minúscula. `Thumbs.db`
   no es una base: es basura de Windows, y se reconoce por nombre antes. */
const PROTEGIDAS = new Set([
  ".jks", ".keystore", ".p12", ".pfx", ".pem", ".key", ".kdbx", ".asc", ".gpg",
  ".db", ".db-wal", ".db-shm", ".sqlite", ".sqlite3",
]);

/* Basura por nombre: descargas a medias y restos de otros sistemas. */
const EXT_A_MEDIAS = new Set([".crdownload", ".part", ".partial", ".download", ".tmp"]);
const NOMBRES_BASURA = new Set([".ds_store", "thumbs.db", "desktop.ini"]);

/* Una descarga a medias puede estar bajando AHORA. Sólo es basura si no se
   tocó en un día. */
const UN_DIA_MS = 24 * 3600 * 1000;

const extDe = (nombre) => path.extname(nombre).toLowerCase();
const esProtegido = (nombre) =>
  !NOMBRES_BASURA.has(nombre.toLowerCase()) && PROTEGIDAS.has(extDe(nombre));

/* Por qué un archivo es basura, o null. `ahora` entra por parámetro para que
   el banco no dependa del reloj. */
function motivoBasura(nombre, bytes, mtimeMs, ahora = Date.now()) {
  const n = nombre.toLowerCase();
  if (esProtegido(nombre)) return null;
  if (NOMBRES_BASURA.has(n)) return "resto de otro sistema";
  if (n.startsWith("~$")) return "archivo temporal de Office";
  if (EXT_A_MEDIAS.has(extDe(n)) && ahora - mtimeMs > UN_DIA_MS) return "descarga a medias";
  if (bytes === 0) return "vacío (0 bytes)";
  return null;
}

/* ¿Tiene el nombre la marca de una copia? «foto (1).jpg», «Copia de foto»,
   «foto - copia», «foto copy». Es lo que decide cuál de dos iguales se queda. */
const MARCA_COPIA = /(\s\(\d+\)|\s-\s(copia|copy)(\s\(\d+\))?|\scopy(\s\d+)?)$|^(copia de|copy of)\s/i;
const tieneMarcaDeCopia = (nombre) => {
  const base = nombre.slice(0, nombre.length - path.extname(nombre).length) || nombre;
  return MARCA_COPIA.test(base) || MARCA_COPIA.test(nombre);
};

/* De un grupo de iguales, cuál QUEDA. Orden, y es determinista a propósito
   —dos corridas sobre la misma carpeta tienen que elegir lo mismo—:
   sin marca de copia, más viejo, menos profundo, ruta más corta, alfabético. */
function elegirQueQueda(items) {
  const clave = (x) => [tieneMarcaDeCopia(path.basename(x.ruta)) ? 1 : 0,
    Math.floor(x.mtimeMs), x.ruta.split("/").length, x.ruta.length];
  return items.slice().sort((a, b) => {
    const ka = clave(a), kb = clave(b);
    for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] - kb[i];
    return a.ruta < b.ruta ? -1 : a.ruta > b.ruta ? 1 : 0;
  })[0];
}

function huella(archivo) {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(archivo, "r");
  try {
    const buf = Buffer.allocUnsafe(1 << 20);
    let n;
    while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n));
  } finally { fs.closeSync(fd); }
  return h.digest("hex");
}

/* Recorre la carpeta. Rutas RELATIVAS a la raíz, con «/». Se saltean la
   papelera, las carpetas y los archivos ocultos (`.thumbnails`, `.trashed-…`:
   son del sistema) y los enlaces simbólicos, que podrían sacar el recorrido de Descargas. */
function recorrer(raiz) {
  const archivos = [], carpetas = [], ocultos = [];
  const visitar = (rel) => {
    const abs = path.join(raiz, rel);
    let entradas;
    try { entradas = fs.readdirSync(abs, { withFileTypes: true }); }
    catch { return; }
    for (const e of entradas) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (!rel && e.name === PAPELERA) continue;
      if (e.isSymbolicLink()) continue;
      if (e.isDirectory()) {
        if (e.name.startsWith(".")) continue;
        carpetas.push(r);
        visitar(r);
      } else if (e.isFile()) {
        // Un archivo oculto es del sistema, no de Mauro, y no se mira. El caso
        // que lo enseñó (29-sep-2026): la papelera de Android no borra, RENOMBRA
        // a `.trashed-<fecha>-nombre` y borra a los 30 días. «Ordenar» los
        // movía a Imágenes/ y Videos/, sacándolos de donde el sistema los
        // busca. La única excepción son los restos conocidos (`.DS_Store`),
        // que son basura y se proponen como tal.
        if (e.name.startsWith(".") && !NOMBRES_BASURA.has(e.name.toLowerCase())) { ocultos.push(r); continue; }
        const st = fs.statSync(path.join(raiz, r));
        archivos.push({ ruta: r, bytes: st.size, mtimeMs: st.mtimeMs });
      }
    }
  };
  visitar("");
  return { archivos, carpetas, ocultos };
}

const dentroDe = (ruta, carpeta) => ruta.startsWith(carpeta + "/");

/* ── Las reglas: qué se propone, y cuáles andan solas ─────────────────────────
   Pedido de Mauro, 2026-09-29: sugerencias «que se puedan activar, modificar
   o desactivar desde la interfaz». Cada regla tiene tres estados:

     propone     aparece en el resumen y se aplica si la tildás
     automatica  la rutina diaria la aplica sola (y queda en un lote, así que
                 se deshace igual que lo demás)
     apagada     no se propone

   Todas empiezan en «propone». Nada anda solo hasta que alguien lo diga.

   Las que botan mandan a la papelera. «ordenar» es la única que no bota: pone
   cada archivo suelto de la raíz de Descargas en una carpeta según su tipo,
   y el nombre de esa carpeta se cambia desde la interfaz. */
const REGLAS = [
  { id: "carpetas-repetidas", titulo: "Carpetas repetidas", accion: "papelera",
    detalle: "Una carpeta con exactamente lo mismo que otra. Queda la que no tiene marca de copia." },
  { id: "repetidos", titulo: "Archivos repetidos", accion: "papelera",
    detalle: "Mismo contenido byte por byte, aunque tengan otro nombre." },
  { id: "basura", titulo: "Basura y carpetas vacías", accion: "papelera",
    detalle: "Descargas a medias de más de un día, archivos de 0 bytes, restos de Windows y Mac, y las carpetas que quedan vacías." },
  { id: "apk-viejas", titulo: "Instaladores viejos", accion: "papelera",
    detalle: "Archivos .apk sueltos en Descargas con más días que los indicados. Las apps al día están en Respaldos/Instalar." },
  { id: "ordenar", titulo: "Ordenar lo suelto por tipo", accion: "mover",
    detalle: "Cada archivo suelto en la raíz de Descargas va a una carpeta según su tipo. Una carpeta en blanco deja ese tipo donde está." },
];

const TIPOS = {
  documentos: { nombre: "Documentos", ext: [".pdf", ".doc", ".docx", ".odt", ".txt", ".rtf", ".xls", ".xlsx", ".ods", ".csv", ".ppt", ".pptx", ".odp", ".md", ".json", ".html", ".htm", ".epub"] },
  imagenes: { nombre: "Imágenes", ext: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".bmp", ".svg", ".avif"] },
  videos: { nombre: "Videos", ext: [".mp4", ".mov", ".mkv", ".webm", ".avi", ".3gp", ".m4v"] },
  audio: { nombre: "Audio", ext: [".mp3", ".m4a", ".ogg", ".opus", ".wav", ".flac", ".aac", ".amr"] },
  comprimidos: { nombre: "Comprimidos", ext: [".zip", ".rar", ".7z", ".tar", ".gz", ".tgz", ".bundle"] },
  instaladores: { nombre: "Instaladores", ext: [".apk", ".apks", ".xapk"] },
};
const tipoDe = (nombre) => {
  const e = extDe(nombre);
  for (const [id, t] of Object.entries(TIPOS)) if (t.ext.includes(e)) return id;
  return "otros";
};

const AJUSTES_BASE = () => ({
  reglas: Object.fromEntries(REGLAS.map((r) => [r.id, { estado: "propone" }])),
  diasApk: 30,
  destinos: Object.fromEntries(Object.entries(TIPOS).map(([id, t]) => [id, t.nombre])),
  ignorar: [],
});

/* Un nombre de carpeta que viene de la interfaz no puede sacar nada de
   Descargas ni meterse en la papelera: sin barras, sin «..», sin empezar con
   punto o guion bajo. Si no cumple, ese tipo queda sin ordenar. */
const destinoValido = (d) => typeof d === "string" && d.trim().length > 0 && d.length <= 60 &&
  !/[\/\\\0]/.test(d) && !/^[._]/.test(d.trim()) && d.trim() !== "..";

/* Todo lo que llega de afuera —el archivo, la interfaz— pasa por acá. Lo que
   no se entiende vuelve al valor de base: una regla con un estado inventado
   no puede quedar en «automática» por accidente. */
function normalizarAjustes(a) {
  const base = AJUSTES_BASE();
  const x = a && typeof a === "object" ? a : {};
  for (const r of REGLAS) {
    const e = x.reglas && x.reglas[r.id] && x.reglas[r.id].estado;
    if (["propone", "automatica", "apagada"].includes(e)) base.reglas[r.id].estado = e;
  }
  // Las del chat: sólo su estado, y «automatica» sólo si se eligió acá.
  if (x.reglas && typeof x.reglas === "object") for (const [id, v] of Object.entries(x.reglas)) {
    if (!ID_CHAT.test(id) || !v) continue;
    if (["propone", "automatica", "apagada"].includes(v.estado)) base.reglas[id] = { estado: v.estado };
  }
  const d = Number(x.diasApk);
  if (Number.isFinite(d) && d >= 1 && d <= 3650) base.diasApk = Math.round(d);
  for (const id of Object.keys(TIPOS)) {
    if (!x.destinos || !(id in x.destinos)) continue;
    const v = x.destinos[id];
    base.destinos[id] = v === "" || v === null ? "" : destinoValido(v) ? v.trim() : base.destinos[id];
  }
  if (Array.isArray(x.ignorar))
    base.ignorar = [...new Set(x.ignorar.filter((r) => typeof r === "string" && r.length < 1000))];
  return base;
}

const AJUSTES = path.join(os.homedir(), "storage", "shared", "Respaldos", "bodega-ajustes.json");
function leerAjustes(archivo = AJUSTES) {
  try { return normalizarAjustes(JSON.parse(fs.readFileSync(archivo, "utf8"))); }
  catch { return normalizarAjustes(null); }
}
function guardarAjustes(ajustes, archivo = AJUSTES) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true });
  const n = normalizarAjustes(ajustes);
  fs.writeFileSync(archivo, JSON.stringify(n, null, 2));
  return n;
}

/* ── Las reglas que escribe el chat ──────────────────────────────────────────
   Cuando Mauro pide algo desde la pantalla («mové las facturas de Antel a
   una carpeta»), el chat lo traduce a una regla y la deja en `reglas.json`
   del depósito. El teléfono la baja y la muestra junto a las de siempre.

   **Una regla del chat es un DATO, no una orden**, y se valida acá, del lado
   del teléfono, como si la hubiera escrito cualquiera:
   - sólo dos acciones: a la papelera, o mover a una carpeta de Descargas;
   - el patrón es un comodín sobre el NOMBRE (`*antel*.pdf`), no una
     expresión regular, así que no puede colgar al teléfono;
   - la carpeta de destino pasa por `destinoValido`, igual que las de la
     pantalla;
   - lo protegido no se toca nunca, venga la regla de donde venga;
   - y **nace en «propone»**: que ande sola lo decide Mauro en la pantalla. */
const ID_CHAT = /^chat-[a-z0-9-]{1,40}$/;

function globARegex(glob) {
  const re = String(glob).split("").map((c) =>
    c === "*" ? "[^/]*" : c === "?" ? "[^/]" : c.replace(/[.+^${}()|[\]\\]/g, "\\$&")).join("");
  return new RegExp(`^${re}$`, "i");
}

const carpetaValida = (c) => typeof c === "string" && c.length <= 200 &&
  c.split("/").every((p) => destinoValido(p) && p === p.trim());

function normalizarReglaChat(r) {
  if (!r || typeof r !== "object" || !ID_CHAT.test(r.id)) return null;
  if (typeof r.nombre !== "string" || !r.nombre.trim() || r.nombre.length > 100 || /[\/\\]/.test(r.nombre)) return null;
  if (!["papelera", "mover"].includes(r.accion)) return null;
  if (r.accion === "mover" && !carpetaValida(r.destino)) return null;
  if (r.dentroDe != null && r.dentroDe !== "" && !carpetaValida(r.dentroDe)) return null;
  const dias = Number(r.masDeDias);
  return { id: r.id, deChat: true, accion: r.accion,
    titulo: String(r.titulo || r.id).slice(0, 80),
    detalle: String(r.detalle || "").slice(0, 300),
    pedido: typeof r.pedido === "string" ? r.pedido.slice(0, 40) : "",
    nombre: r.nombre.trim(), dentroDe: r.dentroDe == null ? null : r.dentroDe,
    masDeDias: Number.isFinite(dias) && dias > 0 ? dias : 0,
    destino: r.accion === "mover" ? r.destino : null };
}

const reglasChatValidas = (lista) => {
  const vistas = new Set();
  return (Array.isArray(lista) ? lista : []).map(normalizarReglaChat)
    .filter((r) => r && !vistas.has(r.id) && vistas.add(r.id)).slice(0, 50);
};

/* El resumen del análisis: qué hay, por tipo, y lo más pesado. Mira nombres,
   tamaños y fechas —NO abre los archivos—, y así lo dice la interfaz. */
function analizar(archivos) {
  const porTipo = {};
  for (const a of archivos) {
    const t = tipoDe(a.ruta);
    porTipo[t] = porTipo[t] || { archivos: 0, bytes: 0 };
    porTipo[t].archivos++; porTipo[t].bytes += a.bytes;
  }
  const pesados = archivos.slice().sort((a, b) => b.bytes - a.bytes).slice(0, 8)
    .map((a) => ({ ruta: a.ruta, bytes: a.bytes, fecha: new Date(a.mtimeMs).toISOString().slice(0, 10) }));
  return { porTipo, pesados, bytes: archivos.reduce((s, a) => s + a.bytes, 0) };
}

/* El plan: qué se mueve y por qué. No toca nada — sólo lee y calcula huellas.

   Las huellas se calculan SÓLO para archivos cuyo tamaño se repite: dos
   archivos de tamaño distinto no pueden ser iguales. En un teléfono eso es la
   diferencia entre leer unos megas y leer la carpeta entera.

   Una carpeta repetida se reconoce por su FIRMA: la lista ordenada de sus
   archivos con su ruta interna y su huella. El nombre de la carpeta no entra
   —«Fotos (1)» es copia de «Fotos»— pero los de adentro sí. Un archivo de
   tamaño único lleva una firma que no se puede repetir, así que la carpeta
   que lo tiene no empareja con nadie, que es lo correcto. */
function planificar(raiz, ahora = Date.now(), ajustes = null, reglasChat = []) {
  const aj = normalizarAjustes(ajustes);
  const activa = (id) => !aj.reglas[id] || aj.reglas[id].estado !== "apagada";
  const ignorada = (r) => aj.ignorar.some((i) => r === i || dentroDe(r, i));
  const { archivos, carpetas, ocultos } = recorrer(raiz);
  // Una carpeta con algo oculto adentro no está vacía ni se mueve entera:
  // se llevaría lo del sistema.
  const conOculto = (c) => ocultos.some((o) => dentroDe(o, c));
  const porTam = new Map();
  for (const a of archivos) if (a.bytes > 0) {
    if (!porTam.has(a.bytes)) porTam.set(a.bytes, []);
    porTam.get(a.bytes).push(a);
  }
  for (const grupo of porTam.values()) if (grupo.length > 1)
    for (const a of grupo) a.sha = huella(path.join(raiz, a.ruta));

  const firmaDe = (a) => a.sha ? `${a.bytes}:${a.sha}` : `único:${a.ruta}`;

  // Firma de cada carpeta NO vacía, con las rutas relativas a ella.
  const firmas = new Map();
  for (const c of carpetas) {
    const de = archivos.filter((a) => dentroDe(a.ruta, c));
    if (!de.length) continue;
    const lista = de.map((a) => `${a.ruta.slice(c.length + 1)}\t${firmaDe(a)}`).sort();
    const protegida = de.some((a) => esProtegido(a.ruta)) || conOculto(c);
    firmas.set(c, { firma: crypto.createHash("sha256").update(lista.join("\n")).digest("hex"),
                    protegida, bytes: de.reduce((s, a) => s + a.bytes, 0), n: de.length });
  }

  const mover = [];      // { ruta, tipo: 'carpeta'|'archivo', motivo, igualA?, bytes }
  const avisos = [];     // protegidos repetidos: se dicen, no se tocan
  const movidas = new Set();
  const yaSale = (r) => [...movidas].some((m) => r === m || dentroDe(r, m));

  // 1 · Carpetas repetidas, de la más alta a la más honda: si se mueve la de
  //     arriba, lo de adentro ya se fue con ella.
  const porFirma = new Map();
  for (const [c, f] of firmas) {
    if (!porFirma.has(f.firma)) porFirma.set(f.firma, []);
    porFirma.get(f.firma).push(c);
  }
  const grupos = [...porFirma.values()].filter((g) => g.length > 1)
    .sort((a, b) => a[0].split("/").length - b[0].split("/").length);
  for (const g of grupos) {
    const vivos = g.filter((c) => !yaSale(c));
    // Una carpeta adentro de otra del mismo grupo no es una copia: es la
    // misma cosa anidada, y moverla dejaría a la de afuera distinta.
    const libres = vivos.filter((c) => !vivos.some((o) => o !== c && dentroDe(c, o)));
    if (libres.length < 2) continue;
    const items = libres.map((c) => ({ ruta: c,
      mtimeMs: fs.statSync(path.join(raiz, c)).mtimeMs }));
    const queda = elegirQueQueda(items).ruta;
    for (const c of libres) {
      if (c === queda) continue;
      if (firmas.get(c).protegida) {
        avisos.push({ ruta: c, motivo: "carpeta repetida, pero tiene algo protegido adentro", igualA: queda });
        continue;
      }
      if (!activa("carpetas-repetidas") || ignorada(c)) continue;
      mover.push({ ruta: c, tipo: "carpeta", regla: "carpetas-repetidas", motivo: "carpeta repetida",
                   igualA: queda, bytes: firmas.get(c).bytes });
      movidas.add(c);
    }
  }

  // 2 · Archivos repetidos, entre los que siguen en su lugar.
  const porSha = new Map();
  for (const a of archivos) if (a.sha && !yaSale(a.ruta)) {
    if (!porSha.has(a.sha)) porSha.set(a.sha, []);
    porSha.get(a.sha).push(a);
  }
  for (const g of porSha.values()) if (g.length > 1) {
    const queda = elegirQueQueda(g).ruta;
    for (const a of g) {
      if (a.ruta === queda) continue;
      if (esProtegido(a.ruta)) {
        avisos.push({ ruta: a.ruta, motivo: "repetido, pero protegido", igualA: queda });
        continue;
      }
      if (!activa("repetidos") || ignorada(a.ruta)) continue;
      mover.push({ ruta: a.ruta, tipo: "archivo", regla: "repetidos", motivo: "repetido", igualA: queda, bytes: a.bytes });
      movidas.add(a.ruta);
    }
  }

  // 3 · Basura, entre lo que queda.
  for (const a of archivos) {
    if (!activa("basura") || yaSale(a.ruta) || ignorada(a.ruta)) continue;
    const m = motivoBasura(path.basename(a.ruta), a.bytes, a.mtimeMs, ahora);
    if (m) { mover.push({ ruta: a.ruta, tipo: "archivo", regla: "basura", motivo: m, bytes: a.bytes }); movidas.add(a.ruta); }
  }

  // 3 bis · Instaladores viejos: un .apk suelto que ya se instaló hace rato.
  for (const a of archivos) {
    if (!activa("apk-viejas") || yaSale(a.ruta) || ignorada(a.ruta)) continue;
    if (extDe(a.ruta) !== ".apk" || ahora - a.mtimeMs <= aj.diasApk * UN_DIA_MS) continue;
    mover.push({ ruta: a.ruta, tipo: "archivo", regla: "apk-viejas",
                 motivo: `instalador de hace más de ${aj.diasApk} días`, bytes: a.bytes });
    movidas.add(a.ruta);
  }

  // 3 ter · Las reglas que escribió el chat a pedido de Mauro.
  for (const r of reglasChatValidas(reglasChat)) {
    if (!activa(r.id)) continue;
    const re = globARegex(r.nombre);
    for (const a of archivos) {
      if (yaSale(a.ruta) || ignorada(a.ruta) || esProtegido(a.ruta)) continue;
      const dir = a.ruta.includes("/") ? a.ruta.slice(0, a.ruta.lastIndexOf("/")) : "";
      const base = path.basename(a.ruta);
      if (r.dentroDe != null && dir !== r.dentroDe) continue;
      if (!re.test(base)) continue;
      if (r.masDeDias && ahora - a.mtimeMs <= r.masDeDias * UN_DIA_MS) continue;
      if (r.accion === "mover") {
        const hacia = `${r.destino}/${base}`;
        if (hacia === a.ruta) continue;
        if (fs.existsSync(path.join(raiz, hacia))) {
          avisos.push({ ruta: a.ruta, motivo: `no se mueve: ya hay uno con ese nombre en ${r.destino}/`, igualA: hacia });
          continue;
        }
        mover.push({ ruta: a.ruta, tipo: "archivo", regla: r.id, motivo: `${r.titulo} → ${r.destino}/`, hacia, bytes: a.bytes });
      } else {
        mover.push({ ruta: a.ruta, tipo: "archivo", regla: r.id, motivo: r.titulo, bytes: a.bytes });
      }
      movidas.add(a.ruta);
    }
  }

  // 4 · Carpetas que quedan vacías después de todo lo anterior. De la más
  //     honda a la más alta, así una carpeta con sólo carpetas vacías adentro
  //     también se va.
  const quedaAlgo = (c) => conOculto(c) || archivos.some((a) => dentroDe(a.ruta, c) && !yaSale(a.ruta));
  for (const c of carpetas.slice().sort((a, b) => b.split("/").length - a.split("/").length)) {
    if (!activa("basura") || yaSale(c) || quedaAlgo(c) || ignorada(c)) continue;
    const sub = carpetas.filter((o) => dentroDe(o, c));
    if (sub.every((o) => yaSale(o))) {
      // Lo que ya estaba en el plan adentro de ésta VIAJA CON ELLA: se mueve
      // la carpeta entera y cada cosa conserva su motivo en el registro.
      // Moverlas por separado dejaría la carpeta ya creada en la papelera y
      // el último movimiento chocaría contra ella.
      for (const m of mover) if (dentroDe(m.ruta, c)) m.viajaCon = c;
      mover.push({ ruta: c, tipo: "carpeta", regla: "basura", motivo: "carpeta vacía", bytes: 0 });
      movidas.add(c);
    }
  }

  // 5 · Ordenar: lo que quedó SUELTO en la raíz, a la carpeta de su tipo.
  //     Sólo la raíz: una carpeta que alguien armó ya está ordenada a su
  //     manera, y no se la desarma. Lo protegido tampoco se mueve acá.
  if (activa("ordenar")) for (const a of archivos) {
    if (a.ruta.includes("/") || yaSale(a.ruta) || ignorada(a.ruta) || esProtegido(a.ruta)) continue;
    const t = tipoDe(a.ruta);
    const dest = aj.destinos[t];
    if (!dest) continue;
    const hacia = `${dest}/${a.ruta}`;
    if (fs.existsSync(path.join(raiz, hacia))) {
      avisos.push({ ruta: a.ruta, motivo: `no se ordena: ya hay uno con ese nombre en ${dest}/`, igualA: hacia });
      continue;
    }
    mover.push({ ruta: a.ruta, tipo: "archivo", regla: "ordenar", motivo: `a ${dest}/`, hacia, bytes: a.bytes });
    movidas.add(a.ruta);
  }

  return { mover, avisos, archivos: archivos.length, carpetas: carpetas.length,
           resumen: analizar(archivos) };
}

/* Mover sin perder nada. `rename` no cruza sistemas de archivos: si falla con
   EXDEV se copia y recién después se borra el original. */
function moverSeguro(desde, hacia) {
  fs.mkdirSync(path.dirname(hacia), { recursive: true });
  if (fs.existsSync(hacia)) throw new Error(`ya existe: ${hacia}`);
  try { fs.renameSync(desde, hacia); }
  catch (e) {
    if (e.code !== "EXDEV") throw e;
    fs.cpSync(desde, hacia, { recursive: true, preserveTimestamps: true });
    fs.rmSync(desde, { recursive: true, force: true });
  }
}

const nombreDeLote = (d = new Date()) =>
  d.toISOString().replace(/\.\d+Z$/, "").replace(/[-:]/g, "").replace("T", "-");

/* Aplica un plan: lo que se bota a `_Papelera/<lote>/contenido/<ruta>`, y lo
   que se ordena a su carpeta. `seleccion` son las rutas tildadas; sin ella,
   todo el plan.

   Lo que está adentro de una carpeta que también se va VIAJA CON ELLA, y se
   anota así. Tildar una carpeta es tildar lo de adentro: una «carpeta vacía»
   del plan sólo existe porque TODO lo suyo ya estaba propuesto, así que
   llevársela entera no se lleva nada que no se haya propuesto.

   El `lote.json` se escribe DESPUÉS de cada movimiento, no al final: si el
   proceso muere a la mitad, lo que ya se movió igual se puede deshacer. */
function aplicar(raiz, plan, lote = nombreDeLote(), seleccion = null) {
  const tildada = (m) => !seleccion || seleccion.has(m.ruta);
  const elegidos = plan.mover.filter((m) => tildada(m) ||
    plan.mover.some((c) => c.tipo === "carpeta" && !c.hacia && tildada(c) && dentroDe(m.ruta, c.ruta)));
  const carpetas = elegidos.filter((m) => m.tipo === "carpeta" && !m.hacia);
  const padre = (m) => carpetas.find((c) => c !== m && dentroDe(m.ruta, c.ruta));

  const dir = path.join(raiz, PAPELERA, lote);
  const registro = { lote, carpeta: raiz, creado: new Date().toISOString(), movidos: [] };
  fs.mkdirSync(dir, { recursive: true });
  const guardar = () => fs.writeFileSync(path.join(dir, "lote.json"), JSON.stringify(registro, null, 2));
  guardar();
  const fallas = [];
  const sueltos = elegidos.filter((m) => !padre(m));
  for (const m of sueltos) {
    const destino = m.hacia || `${PAPELERA}/${lote}/contenido/${m.ruta}`;
    try {
      moverSeguro(path.join(raiz, m.ruta), path.join(raiz, destino));
      const hijos = elegidos.filter((o) => padre(o) === m)
        .map((o) => ({ ...o, viajaCon: m.ruta }));
      registro.movidos.push(...hijos, { ...m, viajaCon: undefined, destino });
      guardar();
    } catch (e) { fallas.push({ ruta: m.ruta, error: e.message }); }
  }
  if (!registro.movidos.length) fs.rmSync(dir, { recursive: true, force: true });
  return { lote, movidos: registro.movidos.filter((m) => !m.viajaCon).length, fallas };
}

function lotes(raiz) {
  const p = path.join(raiz, PAPELERA);
  if (!fs.existsSync(p)) return [];
  return fs.readdirSync(p).filter((n) => fs.existsSync(path.join(p, n, "lote.json"))).sort();
}

/* Devuelve un lote a su lugar. Si en el medio apareció algo con el mismo
   nombre, NO se pisa: lo devuelto queda al lado, con « (restaurado)». */
function deshacer(raiz, lote) {
  const dir = path.join(raiz, PAPELERA, lote);
  const reg = JSON.parse(fs.readFileSync(path.join(dir, "lote.json"), "utf8"));
  const hechos = [], fallas = [];
  // Al revés del orden en que se movieron: una carpeta vacía que se fue
  // después que su contenido vuelve antes.
  for (const m of reg.movidos.slice().reverse()) {
    if (m.viajaCon) continue;          // vuelve adentro de su carpeta
    const desde = m.destino ? path.join(raiz, m.destino) : path.join(dir, "contenido", m.ruta);
    let hacia = path.join(raiz, m.ruta);
    if (fs.existsSync(hacia)) {
      const ext = m.tipo === "archivo" ? path.extname(hacia) : "";
      hacia = hacia.slice(0, hacia.length - ext.length) + " (restaurado)" + ext;
    }
    try { moverSeguro(desde, hacia); hechos.push(path.relative(raiz, hacia)); }
    catch (e) { fallas.push({ ruta: m.ruta, error: e.message }); }
  }
  if (!fallas.length) fs.rmSync(dir, { recursive: true, force: true });
  return { hechos, fallas };
}

/* Los lotes que ya se pueden borrar de verdad: más viejos que `dias`. La
   fecha es la del nombre del lote, no la del archivo: un archivo movido
   conserva su fecha vieja y parecería listo para borrar el mismo día. */
function vencidos(raiz, dias, ahora = Date.now()) {
  return lotes(raiz).filter((l) => {
    const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})/.exec(l);
    if (!m) return false;
    const t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
    return ahora - t > dias * UN_DIA_MS;
  });
}

/* ── Qué hay que tener: el manifiesto ────────────────────────────────────────
   La lista de proyectos NO está escrita acá. Sale de `herramientas/bodega.json`,
   que se genera desde `proyectos/` del panel con `manifiesto` —en una sesión,
   que es la que tiene credencial— y viaja al teléfono con el `git pull` de
   `datos`. Así un proyecto dado de alta en el panel aparece solo en el
   teléfono, y el teléfono no guarda ninguna credencial del panel.

   Del documento de cada proyecto se copian SÓLO cuatro campos de `sitio`, y
   ninguno es sensible: el repositorio, la dirección del sitio, la descarga del
   APK y el resumen. Todos ya son públicos en los `CLAUDE.md`. `acceso`, `app`
   y `empaquetado` no viajan: este archivo se publica. */
const MANIFIESTO = path.join(path.dirname(new URL(import.meta.url).pathname), "bodega.json");

function manifiestoDesde(proyectos) {
  const vistos = new Set();
  const lista = [];
  for (const p of (proyectos || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1))) {
    const s = (p && p.sitio) || {};
    const repo = typeof s.repo === "string" && /^[\w.-]+\/[\w.-]+$/.test(s.repo) ? s.repo : null;
    const url = typeof s.url === "string" && /^https:\/\//.test(s.url) ? s.url : null;
    const apk = typeof s.descarga === "string" && /^https:\/\/.+\.apk$/i.test(s.descarga) ? s.descarga : null;
    if (!repo && !url && !apk) continue;
    lista.push({ id: p.id, nombre: p.nombre || p.id, repo,
      // Dos proyectos pueden compartir repositorio (panel y datos): se
      // respalda una vez.
      respaldar: !!repo && !vistos.has(repo.toLowerCase()),
      url: apk && url && url.includes("/releases/") ? null : url, apk,
      resumen: typeof s.resumen === "string" ? s.resumen.slice(0, 200) : "" });
    if (repo) vistos.add(repo.toLowerCase());
  }
  return { generado: new Date().toISOString().slice(0, 10), proyectos: lista };
}

function leerManifiesto(archivo = MANIFIESTO) {
  return JSON.parse(fs.readFileSync(archivo, "utf8"));
}

/* ── Respaldos ───────────────────────────────────────────────────────────────
   Los repositorios PÚBLICOS del ecosistema: se clonan sin credencial, así que
   el teléfono no guarda ninguna. Un repositorio privado entraría con una
   credencial en el teléfono, y eso se decide aparte.

   Dónde queda cada cosa, y por qué dos lugares:
   - El espejo (`git clone --mirror`) vive en la carpeta PRIVADA de Termux.
     En la memoria compartida git no anda: el sistema de archivos de Android
     no deja cambiar permisos y git los cambia en cada escritura.
   - En la memoria compartida —la que se ve desde el administrador de
     archivos y se sube a Drive— van DOS archivos por repositorio: un
     `.bundle`, que es el repositorio entero con TODAS sus ramas en un solo
     archivo (`git clone datos.bundle` lo devuelve), y un `.zip` de `main`
     para poder abrir los archivos sin git.

   Que el espejo traiga todas las ramas no es un detalle: `datos:R6` está
   frenado porque Mauro no sabe si alguna rama guarda algo. Con esto, una
   rama que se borre en GitHub sigue estando en el teléfono. */
const git = (args, cwd) => execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();

/* `--prune` en el espejo borraría del teléfono la rama que se borró en
   GitHub, que es justo lo que este respaldo existe para conservar. Se trae
   sin podar. */
function respaldarRepo(repo, espejos, destino) {
  const nombre = repo.split("/")[1];
  const espejo = path.join(espejos, repo.replace("/", "__") + ".git");
  if (fs.existsSync(espejo)) git(["remote", "update"], espejo);
  else git(["clone", "--mirror", "--quiet", `https://github.com/${repo}.git`, espejo]);
  fs.mkdirSync(destino, { recursive: true });
  const bundle = path.join(destino, `${nombre}.bundle`);
  const zip = path.join(destino, `${nombre}-main.zip`);
  // A un temporal y después se renombra: un respaldo a medias nunca pisa al
  // bueno de ayer.
  git(["bundle", "create", "--quiet", bundle + ".nuevo", "--all"], espejo);
  fs.renameSync(bundle + ".nuevo", bundle);
  git(["archive", "--format=zip", "-o", zip + ".nuevo", "HEAD"], espejo);
  fs.renameSync(zip + ".nuevo", zip);
  return { repo, ultimo: git(["log", "-1", "--format=%h %cs %s", "HEAD"], espejo),
           ramas: git(["for-each-ref", "--format=x", "refs/heads"], espejo).split("\n").filter(Boolean).length,
           bytes: fs.statSync(bundle).size };
}

/* ── Lo último para instalar ─────────────────────────────────────────────────
   Cada APK del ecosistema, en su última versión, en `Respaldos/Instalar/`,
   con un nombre fijo por proyecto: `hilux.apk`, y nunca «sitd-hilux (3).apk».

   **Qué proyectos tienen APK lo dice el panel**, con `sitio.descarga` —el
   mismo campo que dibuja el botón «Descargar» en la ficha del sitio—. Una
   app nueva con su descarga en el panel aparece sola en el teléfono.

   **Si hay versión nueva se pregunta con un HEAD a la descarga misma**, no a
   la API de GitHub: la API deja 60 consultas por hora sin cuenta y contesta
   403 al pasarse —lo hizo en la primera prueba—, y la descarga no tiene ese
   techo. El HEAD dice tamaño, fecha y huella (`etag`) del archivo, y eso
   alcanza: el release `ultimo` de la Hilux se reemplaza entero en cada tanda
   con el MISMO nombre, así que el nombre no sirve para saber nada.

   La versión anterior no se tira: pasa a `Instalar/anteriores/`, y quedan
   las DOS últimas. Si una tanda sale mal, la de ayer está a un toque. */
const ANTERIORES = 2;

async function consultar(url) {
  const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": "telefono.mjs" } });
  if (!r.ok) throw new Error(`la descarga contestó ${r.status}`);
  const fecha = r.headers.get("last-modified");
  return { url, bytes: Number(r.headers.get("content-length") || -1),
           fecha: fecha ? new Date(fecha).toISOString() : "",
           huella: r.headers.get("etag") || "" };
}

/* ¿Hay que bajar? Si cambió algo de lo que la descarga dice de sí misma, o
   si el archivo de acá no está o quedó de otro tamaño (una bajada cortada). */
function hayQueBajar(anterior, remoto, local) {
  if (!anterior || !local) return true;
  if (remoto.bytes >= 0 && local.bytes !== remoto.bytes) return true;
  return anterior.url !== remoto.url || anterior.bytes !== remoto.bytes ||
         anterior.fecha !== remoto.fecha || anterior.huella !== remoto.huella;
}

/* Rota lo anterior: la versión que se reemplaza pasa a `anteriores/` con su
   fecha, y de cada proyecto quedan las `ANTERIORES` más nuevas. */
function rotar(instalar, id, estadoViejo) {
  const actual = path.join(instalar, `${id}.apk`);
  if (!fs.existsSync(actual)) return;
  const dir = path.join(instalar, "anteriores");
  fs.mkdirSync(dir, { recursive: true });
  const fecha = (estadoViejo && estadoViejo.fecha || new Date().toISOString()).slice(0, 10);
  let destino = path.join(dir, `${id}-${fecha}.apk`);
  for (let n = 2; fs.existsSync(destino); n++) destino = path.join(dir, `${id}-${fecha}-${n}.apk`);
  fs.renameSync(actual, destino);
  const mios = fs.readdirSync(dir).filter((f) => f.startsWith(id + "-") && f.endsWith(".apk"))
    .sort().reverse();
  for (const f of mios.slice(ANTERIORES)) fs.rmSync(path.join(dir, f));
}

async function bajar(url, destino) {
  const r = await fetch(url, { headers: { "User-Agent": "telefono.mjs" } });
  if (!r.ok) throw new Error(`la descarga contestó ${r.status}`);
  // Por partes y no entero en memoria: un APK de 70 MB en un teléfono.
  const tmp = destino + ".nuevo";
  await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(tmp));
  fs.renameSync(tmp, destino);
  return fs.statSync(destino).size;
}

async function actualizarApks(man, destino, { consultar: preguntar = consultar, bajar: traer = bajar } = {}) {
  const instalar = path.join(destino, "Instalar");
  fs.mkdirSync(instalar, { recursive: true });
  const archivoEstado = path.join(instalar, "estado.json");
  let estado = {};
  try { estado = JSON.parse(fs.readFileSync(archivoEstado, "utf8")); } catch {}
  const filas = [];
  for (const p of man.proyectos.filter((x) => x.apk)) {
    const aca = path.join(instalar, `${p.id}.apk`);
    try {
      const remoto = await preguntar(p.apk);
      const local = fs.existsSync(aca) ? { bytes: fs.statSync(aca).size } : null;
      let nueva = false;
      if (hayQueBajar(estado[p.id], remoto, local)) {
        rotar(instalar, p.id, estado[p.id]);
        await traer(p.apk, aca);
        estado[p.id] = { ...remoto, bajado: new Date().toISOString() };
        fs.writeFileSync(archivoEstado, JSON.stringify(estado, null, 2));
        nueva = true;
      }
      filas.push({ id: p.id, nombre: p.nombre, nueva, ...estado[p.id],
                   ruta: path.join("Instalar", `${p.id}.apk`) });
    } catch (e) {
      // Sin red, lo que ya estaba sigue sirviendo: se dice, no se borra.
      filas.push({ id: p.id, nombre: p.nombre, error: e.message,
                   tieneCopia: fs.existsSync(aca) });
    }
  }
  return filas;
}

/* ── El informe ──────────────────────────────────────────────────────────────
   Pedido de Mauro, 2026-09-29: «que me presente en un html lo que va a
   hacer». Una sola página, sin nada de afuera —ni letras, ni scripts—, que
   se abre sola al terminar. Dice lo que HAY (para instalar, sitios,
   respaldos) y lo que se VA a hacer en Descargas, con el comando para
   hacerlo: la página no toca nada, porque un archivo abierto en el
   navegador no puede mover archivos, y está bien que no pueda. */
const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function informeHtml({ fecha, man, apks, repos, plan, deposito, automatico = null, bodega = null }) {
  const total = plan ? plan.mover.reduce((s, m) => s + m.bytes, 0) : 0;
  const tarj = (t, cuerpo, extra = "") => `<section${extra}><h2>${t}</h2>${cuerpo}</section>`;
  const vacio = (t) => `<p class="tenue">${esc(t)}</p>`;

  const bloqueApks = apks.length ? `<ul class="lista">${apks.map((a) => a.error
    ? `<li class="mal"><b>${esc(a.nombre)}</b><span>no se pudo mirar si hay versión nueva: ${esc(a.error)}${a.tieneCopia ? " — la que ya estaba sigue en Respaldos/Instalar" : ""}</span></li>`
    : `<li><b>${esc(a.nombre)}</b>${a.nueva ? ' <em class="nuevo">nueva</em>' : ""}
        <span>publicada el ${esc((a.fecha || a.bajado || "").slice(0, 10))} · ${mb(a.bytes)}</span>
        <span class="ruta">Respaldos/${esc(a.ruta)}</span>
        <a class="boton" href="${esc(a.url)}">Instalar desde GitHub</a></li>`).join("")}</ul>`
    : vacio("Ningún proyecto tiene una descarga en el panel todavía.");

  const sitios = man.proyectos.filter((p) => p.url);
  const bloqueSitios = sitios.length ? `<ul class="lista">${sitios.map((p) =>
    `<li><b>${esc(p.nombre)}</b><span>${esc(p.resumen)}</span>
       <a class="boton" href="${esc(p.url)}">Abrir la versión publicada</a></li>`).join("")}</ul>`
    : vacio("Sin sitios.");

  const bloqueRepos = repos.length ? `<ul class="lista">${repos.map((r) => r.error
    ? `<li class="mal"><b>${esc(r.repo)}</b><span>no se pudo: ${esc(r.error)}</span></li>`
    : `<li><b>${esc(r.repo)}</b><span>${r.ramas} ramas · ${mb(r.bytes)}</span>
        <span class="ruta">${esc(r.ultimo)}</span></li>`).join("")}</ul>`
    : vacio("No se respaldó nada en esta corrida.");

  let bloquePlan = vacio("No se miró Descargas en esta corrida.");
  if (plan) {
    const fila = (m) => `<li${m.viajaCon ? ' class="adentro"' : ""}>
        <b>${m.tipo === "carpeta" ? "📁 " : ""}${esc(m.ruta)}</b>
        <span>${esc(m.motivo)}${m.igualA ? ` — igual a <i>${esc(m.igualA)}</i>` : ""}
        ${m.viajaCon ? " · se va con su carpeta" : ` · ${mb(m.bytes)}`}</span></li>`;
    bloquePlan = (automatico ? `<p class="aviso-auto">Las reglas automáticas ya movieron
         <b>${automatico.movidos}</b> (lote ${esc(automatico.lote)}). Se deshace desde la interfaz.</p>` : "") +
      (plan.mover.length
      ? `<p class="gordo">${plan.mover.filter((m) => !m.viajaCon).length} cosas para botar · ${mb(total)}</p>
         <ul class="lista">${plan.mover.map(fila).join("")}</ul>
         <p>Todavía <b>no se movió nada</b>. Para elegir qué se hace, tildando, en Termux:</p>
         <pre>cd ~/datos && node herramientas/telefono.mjs interfaz</pre>
         <p class="tenue">Va a <code>Download/_Papelera/</code>. Se devuelve con
         <code>node herramientas/telefono.mjs deshacer</code>.</p>`
      : `<p class="gordo">Descargas está limpia.</p>`) +
      (plan.avisos.length ? `<h3>No se tocan, pero conviene que los mires</h3>
         <ul class="lista">${plan.avisos.map((a) => `<li class="aviso"><b>${esc(a.ruta)}</b>
         <span>${esc(a.motivo)} — igual a <i>${esc(a.igualA)}</i></span></li>`).join("")}</ul>` : "") +
      `<p class="tenue">${plan.archivos} archivos y ${plan.carpetas} carpetas mirados.</p>`;
  }

  const bloqueDeposito = `<p>Lo que pongas en <code>Respaldos/Deposito/</code> no lo toca ninguna
    limpieza.</p><p class="tenue">${deposito.archivos} archivos · ${mb(deposito.bytes)}</p>` +
    (!bodega ? "" : bodega.sinToken
      ? `<p class="tenue">Las copias de las bases que deja el chat todavía no bajan: falta el token
         (<code>node herramientas/telefono.mjs token</code>).</p>`
      : bodega.error ? `<p class="mal">El depósito del chat no contestó: ${esc(bodega.error)}</p>`
      : `<p>Copias de las bases que dejó el chat, en <code>Respaldos/Deposito/chat/</code>:
         <b>${bodega.archivos.length}</b> · ${esc(bodega.ultimo)}</p>`);

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>La bodega del teléfono</title><style>
:root{--fondo:#f6f4ef;--papel:#fff;--tinta:#1d1d1b;--tenue:#6b6862;--linea:#e3dfd6;--acento:#2f6b4f;--mal:#a23b2a;--aviso:#8a5a00}
@media (prefers-color-scheme:dark){:root{--fondo:#151513;--papel:#1f1f1c;--tinta:#ecebe6;--tenue:#9d9a92;--linea:#34332e;--acento:#7cc4a0;--mal:#ef8a78;--aviso:#e3b25a}}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--tinta);font:16px/1.45 system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:16px}h1{font-size:1.5rem;margin:.2em 0}h2{font-size:1.1rem;margin:0 0 .6em}
h3{font-size:1rem;margin:1.2em 0 .4em}section{background:var(--papel);border:1px solid var(--linea);border-radius:14px;padding:16px;margin:14px 0}
.lista{list-style:none;margin:0;padding:0}.lista li{padding:10px 0;border-top:1px solid var(--linea);display:flex;flex-direction:column;gap:3px;overflow-wrap:anywhere}
.lista li:first-child{border-top:0}.lista li.adentro{padding-left:18px;opacity:.75}.lista span{color:var(--tenue);font-size:.92rem}
.ruta{font-family:ui-monospace,monospace;font-size:.8rem!important}.mal b,.mal span{color:var(--mal)}.aviso b{color:var(--aviso)}
.nuevo{font-style:normal;font-size:.75rem;background:var(--acento);color:var(--papel);border-radius:99px;padding:1px 8px;margin-left:6px}
.boton{align-self:flex-start;margin-top:4px;padding:8px 14px;border-radius:10px;background:var(--acento);color:var(--papel);text-decoration:none;font-weight:600;font-size:.9rem}
.tenue{color:var(--tenue);font-size:.9rem}.gordo{font-size:1.15rem;font-weight:700}
pre{background:var(--fondo);border:1px solid var(--linea);border-radius:10px;padding:10px;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.85rem}
code{font-size:.85rem}</style></head><body><main>
<h1>La bodega del teléfono</h1><p class="tenue">${esc(fecha)} · proyectos según el panel del ${esc(man.generado)}</p>
${tarj("Descargas: lo que se va a botar", bloquePlan)}
${tarj("Lo último para instalar", bloqueApks)}
${tarj("Sitios", bloqueSitios)}
${tarj("Respaldos de los repositorios", bloqueRepos)}
${tarj("Depósito", bloqueDeposito)}
</main></body></html>`;
}

function medirCarpeta(dir) {
  let archivos = 0, bytes = 0;
  const ver = (d) => {
    let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of es) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) ver(p);
      else if (e.isFile()) { archivos++; bytes += fs.statSync(p).size; }
    }
  };
  ver(dir);
  return { archivos, bytes };
}

/* El inventario que viaja con un pedido: nombres, tamaños y fechas de lo que
   hay en Descargas. NUNCA el contenido. */
function inventario(raiz) {
  const { archivos } = recorrer(raiz);
  return archivos.map((a) => ({ ruta: a.ruta, bytes: a.bytes,
    fecha: new Date(a.mtimeMs).toISOString().slice(0, 10) }));
}

/* Lo que el chat dejó en el depósito, ya validado. Si no hay depósito todavía,
   no hay reglas del chat y todo sigue andando igual. */
function delChat(trabajo = Bodega.TRABAJO) {
  const crudo = Bodega.leerReglasCrudas(trabajo);
  return { reglas: reglasChatValidas(crudo.reglas), pedidos: Bodega.pedidos(trabajo, crudo.respuestas) };
}

/* ── Lo que corre en una SESIÓN, no en el teléfono ────────────────────────────
   `depositar` baja las bases y las deja en el depósito. Las credenciales son
   las del agente, que ya viven en la sesión; el teléfono no las ve nunca, ve
   el JSON que quedó en el repositorio privado.

   Lo que NO se deposita: lo sellado —las reglas de cada base ya se lo niegan
   al agente— y `recorridos` de la Hilux, que es dónde estuvo la camioneta
   punto por punto. Ya vive en su base y en el respaldo que sube la propia
   app; un tercer lugar no agrega nada y sí agrega dónde filtrarse. */
const NO_SE_DEPOSITA = { hilux: ["recorridos"] };

async function depositar(dirBodega) {
  const { PROYECTOS, entrarSuave } = await import("./firestore.mjs");
  /* `listarSuave` y no `listar`: `listar` corta el proceso entero ante un
     «no» de las reglas, y un respaldo no puede morirse porque UNA colección
     no contestó. Pasó el primer día: tiempos todavía no tenía publicado el
     bloque del historial y se llevaba puesto el respaldo de las seis bases. */
  const { listarSuave } = await import("./ronda.mjs");
  const salida = path.join(dirBodega, "bases");
  fs.mkdirSync(salida, { recursive: true });
  const filas = [];
  for (const [id, cfg] of Object.entries(PROYECTOS)) {
    const e = await entrarSuave(cfg);
    if (!e.ok) { filas.push(`✖ ${id}: ${e.motivo}`); continue; }
    const todo = { proyecto: id, bajadoEn: new Date().toISOString() };
    const cols = (cfg.colecciones || []).filter((c) => !(NO_SE_DEPOSITA[id] || []).includes(c));
    for (const c of cols) {
      const r = await listarSuave(cfg, e.sesion, c);
      todo[c] = r.ok ? r.docs : { error: r.motivo };
    }
    fs.writeFileSync(path.join(salida, `${id}.json`), JSON.stringify(todo, null, 2) + "\n");
    filas.push(`✓ ${id}: ` + cols.map((c) => `${Array.isArray(todo[c]) ? todo[c].length : "✖"} ${c}`).join(", "));
  }
  return filas;
}

/* ── Línea de comandos ───────────────────────────────────────────────────── */
const DESCARGAS = path.join(os.homedir(), "storage", "downloads");
const RESPALDOS = path.join(os.homedir(), "storage", "shared", "Respaldos");

const mb = (b) => b >= 1 << 20 ? (b / (1 << 20)).toFixed(1) + " MB" : Math.ceil(Math.max(b, 0) / 1024) + " KB";

function opcion(args, nombre, porDefecto) {
  const i = args.indexOf(nombre);
  return i >= 0 && args[i + 1] ? args[i + 1] : porDefecto;
}

/* Abre el informe en el navegador del teléfono. `termux-open` viene con
   Termux; en cualquier otro lado no existe, y no pasa nada. */
function abrirDireccion(url) {
  for (const c of ["termux-open-url", "termux-open"]) {
    try { execFileSync(c, [url], { stdio: "ignore" }); return true; } catch {}
  }
  return false;
}

function abrir(archivo) {
  try { execFileSync("termux-open", [archivo], { stdio: "ignore" }); return true; }
  catch { return false; }
}

function respaldarTodo(man, destino) {
  const espejos = path.join(os.homedir(), ".respaldos");
  fs.mkdirSync(espejos, { recursive: true });
  const filas = [];
  for (const p of man.proyectos.filter((x) => x.respaldar)) {
    try { filas.push(respaldarRepo(p.repo, espejos, path.join(destino, "repos"))); }
    catch (e) { filas.push({ repo: p.repo, error: String(e.stderr || e.message).trim().split("\n").pop() }); }
    const r = filas[filas.length - 1];
    console.log(r.error ? `  ✖ ${r.repo}  ·  ${r.error}` : `  ✓ ${r.repo}  ·  ${r.ramas} ramas  ·  ${mb(r.bytes)}`);
  }
  fs.writeFileSync(path.join(destino, "ESTADO.txt"),
    `Respaldo del ${new Date().toISOString()}\n\n` +
    filas.map((r) => r.error ? `✖ ${r.repo}  ·  ${r.error}` : `✓ ${r.repo}  ·  ${r.ramas} ramas  ·  ${r.ultimo}`).join("\n") +
    `\n\nPara recuperar un repositorio entero, con todas sus ramas:\n  git clone repos/<nombre>.bundle <nombre>\n`);
  return filas;
}

function escribirInforme(destino, datos) {
  fs.mkdirSync(path.join(destino, "Deposito"), { recursive: true });
  const archivo = path.join(destino, "informe.html");
  fs.writeFileSync(archivo, informeHtml({ fecha: new Date().toLocaleString("es-UY"),
    deposito: medirCarpeta(path.join(destino, "Deposito")), ...datos }));
  return archivo;
}

async function main(args) {
  const cmd = args[0];
  const carpeta = path.resolve(opcion(args, "--carpeta", DESCARGAS));
  const destino = path.resolve(opcion(args, "--destino", RESPALDOS));
  const aplica = args.includes("--aplicar");
  const silencioso = args.includes("--sin-abrir");
  const archivoAjustes = path.join(destino, "bodega-ajustes.json");

  if (cmd === "token") {
    // Se pega en Termux y no pasa por ningún chat. No se muestra al tipear.
    const rl = (await import("node:readline")).createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = (t) => { if (t.includes("Pegá")) process.stdout.write(t); };
    const token = await new Promise((ok) => rl.question("  Pegá el token de la bodega y tocá Enter: ", ok));
    rl.close();
    Bodega.guardarToken(token);
    console.log(`\n  ✓ guardado en ${Bodega.ARCHIVO_TOKEN}, sólo lo lee Termux.`);
    const r = Bodega.traerBodega({ destino });
    console.log(r.error ? `  ✖ ${r.error}` : `  ✓ el depósito contesta: ${r.archivos.length} copias · ${r.ultimo}`);
    return;
  }

  /* ARRANQUE SOLO (30-sep-2026, pedido de Mauro: que la lectura de Airbnb y
     WhatsApp ande «sin que yo tenga que hacer ninguna acción»). `--vigilar`
     tiene que estar corriendo para que llegue algo a la bodega, y Android lo
     corta al reiniciar o cuando cierra Termux. Termux:Boot corre al encender
     el teléfono los guiones de ~/.termux/boot/: éste deja uno que se pone al
     día y arranca la lectura. Lo único que no se puede hacer desde acá es
     instalar la app Termux:Boot y abrirla UNA vez: eso es de Mauro. */
  if (cmd === "arranque") {
    const boot = path.join(os.homedir(), ".termux", "boot");
    const repo = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
    const guion = path.join(boot, "bodega-vigilar.sh");
    const log = path.join(os.homedir(), ".bodega-vigilar.log");
    fs.mkdirSync(boot, { recursive: true });
    fs.writeFileSync(guion, [
      "#!/data/data/com.termux/files/usr/bin/sh",
      "# Lo escribió `node herramientas/telefono.mjs arranque`. Arranca solo con el teléfono.",
      "termux-wake-lock",
      `cd "${repo}" || exit 1`,
      "git pull -q --ff-only >/dev/null 2>&1",
      // Si se cae, vuelve a arrancar al minuto: un corte de red o un error de
      // una pasada no pueden dejar el teléfono sin leer hasta el próximo reinicio.
      `while true; do node herramientas/telefono.mjs whatsapp --vigilar >> "${log}" 2>&1; sleep 60; done`,
      ""
    ].join("\n"));
    fs.chmodSync(guion, 0o755);
    console.log(`\n  ✓ ${guion}`);
    console.log("  Al encender el teléfono arranca solo la lectura de WhatsApp y Airbnb.");
    console.log("  Falta, UNA vez: instalar la app Termux:Boot (del mismo lugar que Termux) y abrirla.");
    console.log("  Para arrancarlo ya sin reiniciar:  sh " + guion + " &");
    console.log(`  Lo que va pasando queda en ${log}\n`);
    return;
  }

  if (cmd === "whatsapp") {
    const W = await import("./telefono-whatsapp.mjs");
    const C = await import("./telefono-capturas.mjs");
    const pasada = () => {
      const hora = new Date().toLocaleTimeString("es-UY");
      // Las capturas de Airbnb van aparte y primero: si leer las
      // notificaciones falla, igual suben.
      try {
        const c = C.capturar();
        if (c.nuevas) console.log(`  ${hora} · ${c.nuevas} captura(s) de Airbnb${c.subido ? " · subidas" : " (no se pudieron subir: suben en la próxima)"}`);
      } catch (e) { console.log("  ✖ capturas: " + String(e.message).split("\n")[0]); }
      try {
        const r = W.capturar();
        if (r.nuevos) console.log(`  ${hora} · ${r.nuevos} mensajes nuevos${r.subido ? " · subidos" : " (no se pudieron subir: quedan guardados y suben en la próxima)"}`);
        return true;
      } catch (e) { console.log("  ✖ " + e.message); return false; }
    };
    // «--vigilar.» con un punto al final también vale: se copia de un mensaje.
    if (!args.some((a) => a.replace(/[.,;]+$/, "") === "--vigilar")) { pasada(); return; }
    // Una pasada por minuto. `termux-wake-lock` para que Android no duerma a
    // Termux con la pantalla apagada; si no está, sigue igual.
    try { execFileSync("termux-wake-lock", { stdio: "ignore" }); } catch {}
    console.log("  Leyendo WhatsApp y Airbnb cada minuto (y las capturas de Airbnb). Para cortar: Ctrl+C.");
    // Lo que quedó sin subir de una vuelta anterior (un rechazo, un corte de
    // red) sube ahora, sin esperar a que llegue un mensaje nuevo.
    try {
      const Bodega = await import("./telefono-bodega.mjs");
      const token = Bodega.leerToken();
      if (token) { Bodega.actualizarTrabajo({ remoto: `https://github.com/${Bodega.REPO_BODEGA}.git`, token }); console.log("  Bodega al día: lo pendiente subió."); }
    } catch (e) { console.log("  (no se pudo poner al día la bodega todavía: " + String(e.message).split("\n")[0] + ")"); }
    if (!pasada()) process.exit(1);
    setInterval(pasada, 60000);
    return;
  }

  if (cmd === "mensajes") {
    // En una SESIÓN: los mensajes de los últimos días, para preparar borradores.
    const dir = opcion(args, "--bodega", null);
    const dias = Number(opcion(args, "--dias", "2"));
    if (!dir) { console.log("✖ falta --bodega <copia del repositorio>"); process.exit(1); }
    const carpetaM = path.join(dir, "mensajes");
    const archivos = fs.existsSync(carpetaM) ? fs.readdirSync(carpetaM).filter((f) => f.endsWith(".json")).sort().slice(-dias) : [];
    for (const f of archivos) {
      console.log(`\n  ── ${f.replace(".json", "")}`);
      for (const m of JSON.parse(fs.readFileSync(path.join(carpetaM, f), "utf8")))
        console.log(`  [${m.id}] ${m.chat}: ${m.texto}${m.lineas.length ? "\n      " + m.lineas.join("\n      ") : ""}`);
    }
    if (!archivos.length) console.log("  No hay mensajes.");
    return;
  }

  if (cmd === "depositar") {
    // En una SESIÓN: --bodega <copia local de maurogasta-crypto/bodega>
    const dir = opcion(args, "--bodega", null);
    if (!dir || !fs.existsSync(path.join(dir, ".git"))) { console.log("✖ falta --bodega <copia del repositorio>"); process.exit(1); }
    for (const f of await depositar(dir)) console.log("  " + f);
    return;
  }

  if (cmd === "pedidos") {
    // En una SESIÓN: los pedidos del teléfono que todavía no tienen respuesta.
    const dir = opcion(args, "--bodega", null);
    if (!dir) { console.log("✖ falta --bodega <copia del repositorio>"); process.exit(1); }
    const lista = delChat(dir).pedidos;
    const sin = lista.filter((p) => !p.respuesta);
    console.log(`\n  ${lista.length} pedidos, ${sin.length} sin respuesta\n`);
    for (const p of sin) console.log(`  ▸ ${p.id}\n    ${p.texto.replace(/\n/g, "\n    ")}\n`);
    return;
  }

  if (cmd === "manifiesto") {
    // Lo corre una SESIÓN, con la credencial del agente. El teléfono no.
    const { PROYECTOS, entrar, listar } = await import("./firestore.mjs");
    const cfg = PROYECTOS.panel;
    const sesion = await entrar(cfg);
    const man = manifiestoDesde(await listar(cfg, sesion, "proyectos"));
    fs.writeFileSync(MANIFIESTO, JSON.stringify(man, null, 2) + "\n");
    console.log(`  ✓ ${man.proyectos.length} proyectos en herramientas/bodega.json`);
    return;
  }

  if (cmd === "interfaz") {
    if (!fs.existsSync(carpeta)) {
      console.log(`✖ no encuentro ${carpeta}.\n  En Termux, corré primero: termux-setup-storage`);
      process.exit(1);
    }
    const { crearInterfaz } = await import("./telefono-interfaz.mjs");
    const { servidor, direccion } = crearInterfaz({ carpeta, archivoAjustes,
      delChat: () => delChat(),
      borradores: async () => (await import("./telefono-whatsapp.mjs")).borradores(),
      enviarPedido: (texto) => Bodega.enviarPedido({ texto, inventario: inventario(carpeta) }),
      alCerrar: () => console.log("\n  Pantalla cerrada.\n") });
    servidor.listen(0, "127.0.0.1", () => {
      console.log(`\n  Abrí esto en el navegador del teléfono:\n  ${direccion()}\n`);
      console.log("  Termux tiene que quedar abierto. Se cierra sola a la media hora sin uso.");
      if (!silencioso) abrirDireccion(direccion());
    });
    return;
  }

  if (cmd === "sincronizar") {
    const man = leerManifiesto();
    fs.mkdirSync(destino, { recursive: true });
    console.log("\n  RESPALDOS");
    const repos = respaldarTodo(man, destino);
    console.log("\n  PARA INSTALAR");
    const apks = await actualizarApks(man, destino);
    for (const a of apks) console.log(a.error ? `  ✖ ${a.nombre}  ·  ${a.error}`
      : `  ${a.nueva ? "★" : "✓"} ${a.nombre}  ·  ${(a.fecha || "").slice(0, 10)}  ·  ${mb(a.bytes)}${a.nueva ? "  (nueva)" : ""}`);
    console.log("\n  DEPÓSITO DEL CHAT");
    let deposito = null;
    try {
      deposito = Bodega.traerBodega({ destino });
      console.log(deposito.error ? `  · ${deposito.sinToken ? "sin token todavía: node herramientas/telefono.mjs token" : deposito.error}`
        : `  ✓ ${deposito.archivos.length} copias · ${deposito.ultimo}`);
    } catch (e) { deposito = { error: String(e.stderr || e.message).trim().split("\n").pop() }; console.log(`  ✖ ${deposito.error}`); }
    const chat = delChat();

    // Las reglas que Mauro puso en «automática» se aplican acá, y nada más.
    let automatico = null;
    const ajustes = leerAjustes(archivoAjustes);
    if (fs.existsSync(carpeta)) {
      const autos = new Set([...REGLAS, ...chat.reglas].map((r) => r.id)
        .filter((id) => ajustes.reglas[id] && ajustes.reglas[id].estado === "automatica"));
      if (autos.size) {
        const p0 = planificar(carpeta, Date.now(), ajustes, chat.reglas);
        const sel = new Set(p0.mover.filter((m) => autos.has(m.regla)).map((m) => m.ruta));
        if (sel.size) {
          automatico = aplicar(carpeta, p0, nombreDeLote(), sel);
          console.log(`\n  AUTOMÁTICO: ${automatico.movidos} (lote ${automatico.lote})`);
        }
      }
    }
    const plan = fs.existsSync(carpeta) ? planificar(carpeta, Date.now(), ajustes, chat.reglas) : null;
    const archivo = escribirInforme(destino, { man, apks, repos, plan, automatico, bodega: deposito });
    console.log(`\n  Informe: ${archivo}`);
    if (!silencioso) abrir(archivo);
    return;
  }

  if (cmd === "descargas") {
    if (!fs.existsSync(carpeta)) {
      console.log(`✖ no encuentro ${carpeta}.\n  En Termux, corré primero: termux-setup-storage`);
      process.exit(1);
    }
    const plan = planificar(carpeta, Date.now(), leerAjustes(archivoAjustes), delChat().reglas);
    const total = plan.mover.reduce((s, m) => s + m.bytes, 0);
    console.log(`\n  DESCARGAS · ${carpeta}`);
    console.log(`  ${plan.archivos} archivos, ${plan.carpetas} carpetas mirados`);
    console.log(`  ${plan.mover.filter((m) => !m.viajaCon).length} cosas para botar, ${mb(total)}\n`);
    for (const m of plan.mover)
      console.log(`  ${m.viajaCon ? "    " : ""}${m.tipo === "carpeta" ? "▸" : "·"} ${m.ruta}\n      ${m.motivo}` +
                  (m.igualA ? ` — igual a ${m.igualA}` : "") + `  (${mb(m.bytes)})`);
    if (plan.avisos.length) {
      console.log(`\n  NO SE TOCAN, pero conviene que los mires:`);
      for (const a of plan.avisos) console.log(`  ! ${a.ruta}\n      ${a.motivo} — igual a ${a.igualA}`);
    }
    if (!aplica) {
      let man = { generado: "—", proyectos: [] };
      try { man = leerManifiesto(); } catch {}
      const archivo = escribirInforme(destino, { man, apks: [], repos: [], plan });
      console.log(`\n  No se movió nada. Para botarlos: agregá --aplicar`);
      console.log(`  Van a ${PAPELERA}/ y se pueden devolver con «deshacer».`);
      console.log(`  Informe: ${archivo}\n`);
      if (!silencioso) abrir(archivo);
      return;
    }
    if (!plan.mover.length) { console.log("\n  Nada que botar.\n"); return; }
    const r = aplicar(carpeta, plan);
    console.log(`\n  ✓ ${r.movidos} a ${PAPELERA}/${r.lote}`);
    for (const f of r.fallas) console.log(`  ✖ ${f.ruta}: ${f.error}`);
    console.log(`  Para devolverlos: node herramientas/telefono.mjs deshacer ${r.lote}\n`);
    return;
  }

  if (cmd === "deshacer") {
    const todos = lotes(carpeta);
    const lote = args[1] && !args[1].startsWith("--") ? args[1] : todos[todos.length - 1];
    if (!lote || !todos.includes(lote)) {
      console.log(`✖ no hay ese lote. Hay: ${todos.join(", ") || "ninguno"}`); process.exit(1);
    }
    const r = deshacer(carpeta, lote);
    console.log(`  ✓ ${r.hechos.length} devueltos del lote ${lote}`);
    for (const h of r.hechos.filter((x) => x.includes(" (restaurado)")))
      console.log(`  · ${h} — ya había otro con ese nombre, no se pisó`);
    for (const f of r.fallas) console.log(`  ✖ ${f.ruta}: ${f.error}`);
    return;
  }

  if (cmd === "vaciar") {
    const dias = Number(opcion(args, "--dias", "30"));
    if (!(dias >= 1)) { console.log("✖ --dias tiene que ser 1 o más"); process.exit(1); }
    const v = vencidos(carpeta, dias);
    console.log(`  ${lotes(carpeta).length} lotes en la papelera, ${v.length} con más de ${dias} días`);
    for (const l of v) console.log(`  · ${l}`);
    if (!aplica) { console.log(`  No se borró nada. Para borrarlos DE VERDAD: agregá --aplicar`); return; }
    for (const l of v) fs.rmSync(path.join(carpeta, PAPELERA, l), { recursive: true, force: true });
    console.log(`  ✓ ${v.length} lotes borrados. Esto no se deshace.`);
    return;
  }

  if (cmd === "respaldar") {
    fs.mkdirSync(destino, { recursive: true });
    respaldarTodo(leerManifiesto(), destino);
    console.log(`\n  Quedó en ${destino}`);
    return;
  }

  console.log(`
  node herramientas/telefono.mjs sincronizar             TODO: respaldos, APK, depósito e informe
  node herramientas/telefono.mjs interfaz                la pantalla: decidir, reglas y pedidos al chat
  node herramientas/telefono.mjs token                   pegar el token del depósito (una vez)
  node herramientas/telefono.mjs whatsapp [--vigilar]     leer los mensajes nuevos de WhatsApp
  node herramientas/telefono.mjs arranque                que la lectura arranque sola con el teléfono (Termux:Boot)
  node herramientas/telefono.mjs descargas [--aplicar]    repetidos y basura de Descargas
  node herramientas/telefono.mjs deshacer [<lote>]        devuelve lo último que se botó
  node herramientas/telefono.mjs vaciar [--dias 30] [--aplicar]   borra de verdad lo viejo
  node herramientas/telefono.mjs respaldar                sólo los repositorios
  node herramientas/telefono.mjs manifiesto               (en una sesión) la lista, desde el panel
  node herramientas/telefono.mjs depositar --bodega <dir> (en una sesión) las bases al depósito
  node herramientas/telefono.mjs pedidos --bodega <dir>   (en una sesión) los pedidos sin respuesta
  node herramientas/telefono.mjs mensajes --bodega <dir>  (en una sesión) los WhatsApp de los últimos días

  Sin --aplicar no se toca nada. Todo en herramientas/TELEFONO.md.`);
}

export { inventario, delChat, depositar, NO_SE_DEPOSITA, normalizarReglaChat, reglasChatValidas, globARegex,
         REGLAS, TIPOS, tipoDe, normalizarAjustes, leerAjustes, guardarAjustes, analizar, destinoValido,
         planificar, aplicar, deshacer, lotes, vencidos, motivoBasura, esProtegido,
         tieneMarcaDeCopia, elegirQueQueda, nombreDeLote, PAPELERA,
         manifiestoDesde, leerManifiesto, hayQueBajar, rotar, actualizarApks, informeHtml, esc, MANIFIESTO };

if (import.meta.url === `file://${process.argv[1]}`) {
  main(process.argv.slice(2)).catch((e) => { console.log("✖ " + (e && e.message || e)); process.exit(1); });
}
