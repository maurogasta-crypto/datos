// ─────────────────────────────────────────────────────────────────────────────
// telefono-bodega.mjs — El depósito privado entre el chat y el teléfono.
//
// Pedido de Mauro, 2026-09-29: «que el chat pueda disponer de espacio de
// almacenamiento para guardar las últimas copias o respaldos sin que yo tenga
// que estar copiando manualmente», y poder hacerle pedidos desde la pantalla.
//
// ── POR QUÉ UN REPOSITORIO PRIVADO ───────────────────────────────────────────
// Un chat no puede entrar al teléfono, y el teléfono no puede entrar al chat.
// Hace falta un lugar en el medio al que lleguen los dos, y el único que ya
// tienen los dos es GitHub. Los repositorios del ecosistema son públicos; las
// bases no pueden ir ahí. Por eso uno PRIVADO: `maurogasta-crypto/bodega`.
//
//   chat  ── depositar ──▶  bodega/bases/<proyecto>.json   ──▶  teléfono
//   chat  ◀── pedidos/<fecha>.json ◀── «Enviar al chat» ────────  teléfono
//   chat  ── reglas.json (reglas y respuestas) ──────────────▶  teléfono
//
// Se descartó subir cifrado a un repositorio público: si la llave se pierde o
// se filtra, todo lo que se subió queda expuesto para siempre en el historial.
//
// ── LA CREDENCIAL DEL TELÉFONO ───────────────────────────────────────────────
// Un token de GitHub de grano fino, con acceso a ESTE repositorio y a ningún
// otro. Lo crea Mauro en GitHub, lo pega en Termux con `telefono.mjs token`, y
// vive en `~/.config/bodega/token` —la carpeta privada de Termux, que ninguna
// otra app lee— con permisos 600. **No pasa por ningún chat.**
//
// Y no se escribe nunca en `.git/config` ni en la línea de comandos: git lo
// recibe por variables de entorno en cada llamada (`GIT_CONFIG_*`). Así un
// `git remote -v` no lo muestra, y un respaldo de la carpeta no lo lleva.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const REPO_BODEGA = "maurogasta-crypto/bodega";
const ARCHIVO_TOKEN = path.join(os.homedir(), ".config", "bodega", "token");
const TRABAJO = path.join(os.homedir(), ".respaldos", "bodega");

function leerToken(archivo = ARCHIVO_TOKEN) {
  try { return fs.readFileSync(archivo, "utf8").trim() || null; } catch { return null; }
}

function guardarToken(token, archivo = ARCHIVO_TOKEN) {
  const t = String(token || "").trim();
  // Los tokens de GitHub no llevan espacios ni saltos: si trae, se pegó mal.
  if (!/^[A-Za-z0-9_]{20,255}$/.test(t)) throw new Error("eso no parece un token de GitHub");
  fs.mkdirSync(path.dirname(archivo), { recursive: true, mode: 0o700 });
  fs.writeFileSync(archivo, t, { mode: 0o600 });
  fs.chmodSync(archivo, 0o600);
}

/* El token viaja por el entorno de ESA llamada a git y de ninguna otra. */
function entornoGit(token) {
  const e = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
  if (token) {
    const b = Buffer.from(`x-access-token:${token}`).toString("base64");
    Object.assign(e, { GIT_CONFIG_COUNT: "1",
      GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
      GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${b}` });
  }
  return e;
}

const gitCon = (token) => (args, cwd) =>
  execFileSync("git", args, { cwd, env: entornoGit(token), stdio: ["ignore", "pipe", "pipe"] })
    .toString().trim();

const IDENTIDAD = ["-c", "user.name=teléfono", "-c", "user.email=telefono@bodega.invalid"];

/* Deja la copia de trabajo al día. Primero sube lo que el teléfono tenga sin
   subir —un pedido que se escribió sin red—, después trae. `pull --rebase` y
   no `reset --hard`: un pedido local no se pierde por traer. */
function actualizarTrabajo({ remoto, trabajo = TRABAJO, token }) {
  const git = gitCon(token);
  if (!fs.existsSync(path.join(trabajo, ".git"))) {
    fs.mkdirSync(path.dirname(trabajo), { recursive: true });
    git(["clone", "-q", remoto, trabajo]);
    return;
  }
  git([...IDENTIDAD, "pull", "-q", "--rebase"], trabajo);
  const adelante = git(["rev-list", "--count", "@{u}..HEAD"], trabajo);
  if (adelante !== "0") git(["push", "-q"], trabajo);
}

/* Lo que el chat dejó en `bases/` sale a la memoria compartida, a
   `Respaldos/Deposito/chat/`, como archivos comunes: se abren, se copian a
   Drive, se mandan. El historial entero sigue en la copia de trabajo. */
function traerBodega({ remoto = `https://github.com/${REPO_BODEGA}.git`, trabajo = TRABAJO,
                       destino, token = leerToken() }) {
  if (!token && remoto.startsWith("https://")) return { error: "sin token", sinToken: true };
  actualizarTrabajo({ remoto, trabajo, token });
  const git = gitCon(token);
  const origen = path.join(trabajo, "bases");
  const salida = path.join(destino, "Deposito", "chat");
  const archivos = [];
  if (fs.existsSync(origen)) {
    fs.mkdirSync(salida, { recursive: true });
    for (const f of fs.readdirSync(origen)) {
      if (!f.endsWith(".json")) continue;
      const tmp = path.join(salida, f + ".nuevo");
      fs.copyFileSync(path.join(origen, f), tmp);
      fs.renameSync(tmp, path.join(salida, f));
      archivos.push({ archivo: f, bytes: fs.statSync(path.join(salida, f)).size });
    }
  }
  let ultimo = "";
  try { ultimo = git(["log", "-1", "--format=%cs %s"], trabajo); } catch {}
  return { archivos, ultimo };
}

/* Un pedido: lo que Mauro escribió y el inventario de Descargas en ese
   momento —nombres, tamaños y fechas, NUNCA el contenido—, para que el chat
   sepa de qué le hablan sin tener que preguntar. Se sube en el momento; si no
   hay red, queda en la copia de trabajo y sube en la próxima sincronización. */
function enviarPedido({ texto, inventario, trabajo = TRABAJO, token = leerToken(),
                        remoto = `https://github.com/${REPO_BODEGA}.git`, ahora = new Date() }) {
  const t = String(texto || "").trim();
  if (!t) throw new Error("el pedido está vacío");
  if (t.length > 4000) throw new Error("el pedido es demasiado largo");
  if (!token && remoto.startsWith("https://")) throw new Error("falta el token: corré «node herramientas/telefono.mjs token»");
  const git = gitCon(token);
  if (!fs.existsSync(path.join(trabajo, ".git"))) actualizarTrabajo({ remoto, trabajo, token });
  const id = ahora.toISOString().replace(/\.\d+Z$/, "").replace(/[-:]/g, "").replace("T", "-");
  const dir = path.join(trabajo, "pedidos");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${id}.json`), JSON.stringify({
    id, fecha: ahora.toISOString(), texto: t,
    inventario: (inventario || []).slice(0, 3000) }, null, 2));
  git(["add", "pedidos"], trabajo);
  git([...IDENTIDAD, "commit", "-q", "-m", `Pedido del teléfono ${id}`], trabajo);
  let subido = true;
  try { git(["push", "-q"], trabajo); } catch { subido = false; }
  return { id, subido };
}

/* Escribe un archivo en la copia de trabajo, lo commitea y lo sube. Lo usan
   los pedidos y los mensajes de WhatsApp. Sin red, el commit queda local y
   sube en la próxima vuelta (`actualizarTrabajo` empuja lo pendiente). */
function guardarYSubir({ ruta, contenido, mensaje, trabajo = TRABAJO, token = leerToken(),
                         remoto = `https://github.com/${REPO_BODEGA}.git` }) {
  if (!token && remoto.startsWith("https://")) throw new Error("falta el token: corré «node herramientas/telefono.mjs token»");
  const git = gitCon(token);
  if (!fs.existsSync(path.join(trabajo, ".git"))) actualizarTrabajo({ remoto, trabajo, token });
  const abs = path.join(trabajo, ruta);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, contenido);
  git(["add", ruta], trabajo);
  git([...IDENTIDAD, "commit", "-q", "-m", mensaje], trabajo);
  try { git(["push", "-q"], trabajo); return true; } catch { return false; }
}

/* Los pedidos que hay en la copia de trabajo, del más nuevo al más viejo, con
   la respuesta del chat si ya la escribió en `reglas.json`. */
function pedidos(trabajo = TRABAJO, respuestas = {}) {
  const dir = path.join(trabajo, "pedidos");
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().reverse().map((f) => {
    try {
      const p = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      return { id: p.id, fecha: p.fecha, texto: String(p.texto || "").slice(0, 4000),
               respuesta: typeof respuestas[p.id] === "string" ? respuestas[p.id].slice(0, 2000) : null };
    } catch { return null; }
  }).filter(Boolean);
}

/* Lo que el chat escribió para el teléfono: reglas y respuestas. Se lee de
   la copia de trabajo y se VALIDA del lado del teléfono (`normalizarReglaChat`
   en telefono.mjs): una regla que llega del repositorio es un dato, no una
   orden. */
function leerReglasCrudas(trabajo = TRABAJO) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(trabajo, "reglas.json"), "utf8"));
    return { reglas: Array.isArray(j.reglas) ? j.reglas : [],
             respuestas: j.respuestas && typeof j.respuestas === "object" ? j.respuestas : {} };
  } catch { return { reglas: [], respuestas: {} }; }
}

export { REPO_BODEGA, ARCHIVO_TOKEN, TRABAJO, leerToken, guardarToken, entornoGit,
         actualizarTrabajo, traerBodega, enviarPedido, pedidos, leerReglasCrudas, guardarYSubir };
