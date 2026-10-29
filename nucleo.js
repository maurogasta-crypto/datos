/* ═══════════════════════════════════════════════════════════
   nucleo.js — EL NÚCLEO DEL PANEL.
   Sello: nucleo-8

   Todo lo que hace falta en más de una pantalla vive acá y no se copia.
   Es la regla de los otros tres proyectos (PROTOCOLO-DESARROLLO §2, §3.2).

   Este panel es de UNA sola persona. No hay roles, no hay permisos, no hay
   invitaciones: o sos vos, o no entrás. Eso simplifica todo y hay que
   mantenerlo simple a propósito — cada camino de entrada que se agregue es
   superficie que hay que revisar, y acá no hay nadie más a quien darle
   acceso.
   ═══════════════════════════════════════════════════════════ */

import {
  auth, db, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail, createUserWithEmailAndPassword, cargarFirebase
} from "./firebase-init.js?v=init-5";

export const P = {};
P.VERSION = "nucleo-11";
P.PANEL = "";           // lo pone cada pantalla con su propio sello

/* ---------- lo mínimo, en un solo lugar ---------- */
export const $ = (id) => document.getElementById(id);

/* Escapa lo que va a un innerHTML. Incluye la comilla simple: sin ella, un
   apóstrofo dentro de un atributo con comillas simples se sale del atributo.
   (Es el punto D10 del ESTADO-DE-LOS-TRES: dos funciones que se llaman
   igual tienen que hacer lo mismo, y ésta nace ya con las cinco.) */
P.esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Un aviso breve, abajo y por encima de la barra, que se va solo.
   PROTOCOLO-INTERFAZ §7.1. */
P.aviso = function (texto, tipo) {
  let a = $("aviso");
  if (!a) {
    a = document.createElement("div");
    a.id = "aviso";
    document.body.appendChild(a);
  }
  a.textContent = texto;
  a.className = "on" + (tipo === "error" ? " malo" : "");
  clearTimeout(a._t);
  a._t = setTimeout(() => { a.className = ""; }, texto.length > 70 ? 7000 : 3500);
};

/* Un error muestra la CAUSA, no el código (PROTOCOLO-INTERFAZ §7.2).
   «Error 400» no se puede diagnosticar; «permission-denied» se resuelve
   sabiendo dónde mirar. */
/* Desde nucleo-11 (29-oct-2026, `general:C7`) la tabla común vive en
   `errores.js` —la ÚNICA del ecosistema— y acá quedan sólo las causas que
   nombran ESTE panel («La puerta», datos-830f8). Ganan sobre las comunes. */
const PROPIAS = {
  "permission-denied": "Las reglas de Firestore no dejan hacer eso. Si es la primera vez "
    + "que entrás, todavía no publicaste las reglas con tu UID: mirá «La puerta» en el README.",
  "auth/configuration-not-found": "El proyecto todavía no tiene Authentication. Consola de "
    + "Firebase → datos-830f8 → Authentication → Comenzar, y habilitá «Correo electrónico/contraseña».",
  "auth/operation-not-allowed": "Authentication existe, pero el acceso con mail y contraseña está "
    + "apagado. Consola de Firebase → Authentication → Sign-in method → habilitalo.",
  "auth/invalid-api-key": "La configuración de firebase-init.js no corresponde a ningún proyecto. "
    + "No es un permiso: es el projectId o la apiKey mal copiados."
};
// Se pide al cargar: los errores se muestran en el acto. Si no bajó, se ve
// lo de antes —la causa propia o el mensaje—: nunca peor.
let _errores = null;
import("./errores.js").then((m) => { _errores = m; }).catch(() => {});
P.explicar = (e) => {
  if (_errores) return _errores.explicar(e, PROPIAS);
  const c = (e && e.code) || "";
  return (PROPIAS[c] || (e && e.message) || String(e)) + (c ? " · " + c : "");
};

/* ---------- fechas ---------- */
/* La fecha LOCAL, nunca toISOString(): eso da UTC, y de noche en Uruguay
   ya es el día siguiente. Es el mismo error que Casa Verde documentó. */
P.hoy = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
};
P.fecha = (v) => {
  if (!v) return "";
  const d = v.toDate ? v.toDate() : (v instanceof Date ? v : new Date(v));
  return isNaN(d) ? String(v) : d.toLocaleDateString("es-UY",
    { day: "2-digit", month: "short", year: "numeric" });
};

/* ---------- la puerta ---------- */
/* Devuelve el usuario, o null si no hay sesión. NO redirige a ningún lado:
   quien llama decide qué pintar. Redirigir desde el núcleo es lo que hace
   que una pantalla de diagnóstico no se pueda usar para diagnosticar. */
P.quienEntra = () => new Promise((res) => {
  if (typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => res(auth.currentUser || null));
    return;
  }
  const off = onAuthStateChanged(auth, (u) => { off(); res(u || null); });
});

P.entrar = (mail, clave) => signInWithEmailAndPassword(auth, mail.trim(), clave);
P.salir = () => signOut(auth);
P.recuperar = (mail) => sendPasswordResetEmail(auth, mail.trim());
/* El nombre de una clave en la bóveda: `acceso-<proyecto>-<nombre>` (o el que
   diga la ficha). Vive acá desde nucleo-5 porque lo usan DOS pantallas —el
   panel y la de los invitados— y las reglas v6 dependen de esta forma para
   saber de qué proyecto es una clave. */
P.slug = (v) => String(v || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
P.idBoveda = (f, a) => a.boveda || ("acceso-" + (f.proyecto || "general") + "-" + P.slug(a.nombre));

// nucleo-5 (panel:U2): un invitado crea su cuenta y después pide acceso.
P.crearCuenta = (mail, clave) => createUserWithEmailAndPassword(auth, mail.trim(), clave);

/* ---------- una captura a Cloudinary (nucleo-6, panel:U1) ---------- */
/* La usan el pedido de Mauro y el de un invitado. Misma cuenta y mismo preset
   SIN FIRMA que los sitios (públicos por diseño: identifican, no abren nada).
   Se achica a 1600 px y se sube AL MANDAR, nunca al elegirla: si no, cada
   foto mirada y descartada queda huérfana en Cloudinary. */
P.CLOUDINARY = { cloud: "dnwfu8ffn", preset: "preset-comprobantes" };
P.esImagenNuestra = (u) => /^https:\/\/res\.cloudinary\.com\/dnwfu8ffn\//.test(String(u || ""));
P.achicar = async function (file, lado = 1600) {
  const img = await createImageBitmap(file);
  const k = Math.min(1, lado / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.82));
};
P.subirCaptura = async function (file) {
  const blob = await P.achicar(file);
  const fd = new FormData();
  fd.append("file", blob, "captura.jpg"); fd.append("upload_preset", P.CLOUDINARY.preset); fd.append("asset_folder", "panel");
  const r = await fetch(`https://api.cloudinary.com/v1_1/${P.CLOUDINARY.cloud}/image/upload`, { method: "POST", body: fd });
  if (!r.ok) throw new Error("Cloudinary contestó " + r.status);
  return (await r.json()).secure_url;
};

/* ---------- la foto de una factura, leída por la IA (nucleo-9) ---------- */
/* Mauro, 15-oct-2026: «la carga de gastos dentro de General Flores con la
   misma dinámica de la carga de fotos de facturas que ya usamos en el resto
   del ecosistema». Es la de Tiempos (plata-15): la foto primero, la IA
   completa lo que está vacío, la persona revisa y guarda; la imagen se sube
   al GUARDAR. Misma función de IA (`claude-proxy` del Netlify de Casa Verde,
   la ÚNICA clave de Gemini del ecosistema), mismo modelo y mismo límite
   —flash-lite y 2000 tokens: el que «piensa» corta el JSON—, y lo que vuelve
   se lee con desconfianza: lo que no se entiende queda vacío, nunca
   inventado. Nunca bloquea: si no anda, se completa a mano. */
P.IA = "https://serene-scone-76bd4e.netlify.app/.netlify/functions/claude-proxy";
P.MONEDAS_IA = ["UYU", "USD", "BRL"];
P.MEDIOS_PAGO = { efectivo: "Efectivo", debito: "Débito", credito: "Crédito", transferencia: "Transferencia", pix: "PIX" };
P.leerFacturaIA = function (texto, rubros = []) {
  let j = null;
  const t = String(texto || "").replace(/```(?:json)?/gi, "");
  const i = t.indexOf("{"), k = t.lastIndexOf("}");
  if (i !== -1 && k > i) { try { j = JSON.parse(t.slice(i, k + 1)); } catch { j = null; } }
  if (!j || typeof j !== "object") return null;
  const txt = (x, n) => String(x ?? "").replace(/\s+/g, " ").trim().slice(0, n);
  const num = (x) => { const v = Number(String(x ?? "").replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return v > 0 ? Math.round(v * 100) / 100 : ""; };
  const moneda = String(j.moneda || "").toUpperCase().replace("R$", "BRL").replace("$U", "UYU").replace("U$S", "USD");
  const medio = String(j.medio || "").toLowerCase().normalize("NFD").replace(/[^a-z]/g, "");
  const factura = {
    rut: txt(j.rut, 30).replace(/[^\d./-]/g, ""), numero: txt(j.numero, 40),
    medio: P.MEDIOS_PAGO[medio] ? medio : medio.startsWith("tarjetadecredito") ? "credito" : medio.startsWith("tarjetadedebito") ? "debito" : "",
    renglones: (Array.isArray(j.renglones) ? j.renglones : []).slice(0, 40)
      .map((r) => ({ d: txt(r && (r.detalle ?? r.d), 80), m: num(r && (r.monto ?? r.m)) || null })).filter((r) => r.d),
  };
  if (!factura.renglones.length) delete factura.renglones;
  for (const x of Object.keys(factura)) if (factura[x] === "") delete factura[x];
  return {
    monto: num(j.monto), moneda: P.MONEDAS_IA.includes(moneda) ? moneda : "",
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(j.fecha || "")) ? j.fecha : "",
    comercio: txt(j.comercio, 80), detalle: txt(j.detalle, 300),
    rubro: rubros.includes(j.rubro) ? j.rubro : "",
    factura: Object.keys(factura).length ? factura : null,
  };
};
P.leerFactura = async function (file, { rubros = [], hoy = P.hoy() } = {}) {
  const blob = await P.achicar(file);
  const data = await new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = mal; r.readAsDataURL(blob); });
  const r = await fetch(P.IA, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gemini-2.5-flash-lite", max_tokens: 2000, messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: "image/jpeg", data } },
      { type: "text", text: `Es una factura, boleta o comprobante de un gasto de una obra o un local en alquiler, en Uruguay o Brasil. Hoy es ${hoy}. Devolvé SOLO un JSON, sin texto alrededor:
{"monto": número total, "moneda": "UYU" | "USD" | "BRL", "fecha": "AAAA-MM-DD", "comercio": nombre del comercio o de quien cobra, "detalle": qué se compró o qué trabajo fue, en pocas palabras, "rubro": uno de [${rubros.join(", ")}] (materiales de construcción, jornales o mano de obra, servicios como UTE u OSE, honorarios de un profesional, u otros),
 "rut": el RUT o CNPJ del comercio, "numero": número o serie del comprobante, "medio": "efectivo" | "debito" | "credito" | "transferencia" | "pix" | "", "renglones": [{"detalle": cada cosa, "monto": su importe}] (hasta 40)}.
Si un dato no se lee con seguridad, dejalo vacío (""). No inventes.` }] }] }) });
  if (!r.ok) throw new Error("la IA contestó " + r.status);
  const j = await r.json();
  return P.leerFacturaIA(((j.content || [])[0] || {}).text, rubros);
};

/* ---------- preguntar antes de algo irreversible ---------- */
/* Sin depender del confirm() del navegador, que en Android se ve como un
   cartel del sistema y no dice de qué app viene. */
P.preguntar = (texto) => new Promise((res) => {
  const capa = document.createElement("div");
  capa.className = "capa";
  capa.innerHTML = '<div class="caja"><p></p><div class="fila-btn">'
    + '<button class="btn" data-no>Cancelar</button>'
    + '<button class="btn p" data-si>Sí, hacerlo</button></div></div>';
  capa.querySelector("p").textContent = texto;
  const cerrar = (r) => { capa.remove(); res(r); };
  capa.querySelector("[data-si]").onclick = () => cerrar(true);
  capa.querySelector("[data-no]").onclick = () => cerrar(false);
  capa.onclick = (e) => { if (e.target === capa) cerrar(false); };
  document.body.appendChild(capa);
});

/* ---------- el sello, siempre a la vista ---------- */
/* Ante un comportamiento raro, lo primero que se mira es qué versión está
   sirviendo el teléfono. Por eso el número se muestra, no se esconde. */
P.pintarSello = () => {
  const s = $("sello");
  if (s) s.textContent = P.PANEL + " · " + P.VERSION;
};

/* ---------- el SDK, que ya no viene puesto ---------- */
/* Desde init-3 el SDK de Firebase se baja cuando se lo pide, no al importar
   el módulo. Esto es lo que hay que esperar antes de tocar `auth` o `db`:
   antes de que resuelva, las dos valen `undefined`.

   Se pone acá y no en cada pantalla porque es el núcleo el que las usa
   (`P.quienEntra`, `P.entrar`, `P.salir`, `P.recuperar`), y porque mañana
   puede haber una segunda pantalla: la regla es que esto no se duplique.

   Devuelve `true` si el SDK está listo, o `false` si no bajó. NO tira: el
   punto entero es que la pantalla siga viva para poder contar qué pasa. El
   detalle queda en `P.fallaFirebase`. */
P.fallaFirebase = null;
P.arrancarFirebase = async function () {
  try {
    await cargarFirebase();
    P.fallaFirebase = null;
    return true;
  } catch (e) {
    P.fallaFirebase = e;
    return false;
  }
};

/* ---------- el ojo de las contraseñas ---------- */
/* Desde nucleo-10 (29-oct-2026, `general:C7`) vive en `ojos.js`, la ÚNICA copia
   del ecosistema: los otros cuatro sitios lo piden de acá. Diferido y con
   catch: si no baja, la contraseña sigue andando, sin ojo. */
import("./ojos.js").catch(() => {});

export { auth, db, cargarFirebase };
