/* ═══════════════════════════════════════════════════════════
   nucleo.js — EL NÚCLEO DEL PANEL.
   Sello: nucleo-3

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
  sendPasswordResetEmail
} from "./firebase-init.js?v=init-1";

export const P = {};
P.VERSION = "nucleo-3";
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
const CAUSAS = {
  "permission-denied": "Las reglas de Firestore no dejan hacer eso. Si es la primera vez "
    + "que entrás, todavía no publicaste las reglas con tu UID: mirá «La puerta» en el README.",
  "unavailable": "No hay conexión con Firestore. Es la red, no un permiso.",
  "failed-precondition": "Firestore pide algo que no está: casi siempre, un índice.",
  "auth/invalid-credential": "El mail o la contraseña no coinciden. (Firebase ya no dice cuál de los dos.)",
  "auth/invalid-email": "Ese mail está mal escrito.",
  "auth/user-not-found": "No existe ninguna cuenta con ese mail.",
  "auth/too-many-requests": "Demasiados intentos seguidos. Esperá un rato y probá de nuevo.",
  "auth/network-request-failed": "No se pudo llegar a Firebase. Es la red.",
  /* Los dos errores del primer día. No son un problema del panel: son un paso
     de configuración que todavía no se dio, y cada uno pide una cosa distinta
     en la consola. Sin esta explicación, el panel devuelve el código pelado y
     no hay forma de saber que la respuesta está en Firebase y no acá. */
  "auth/configuration-not-found": "El proyecto todavía no tiene Authentication. Consola de "
    + "Firebase → datos-830f8 → Authentication → Comenzar, y habilitá «Correo electrónico/contraseña».",
  "auth/operation-not-allowed": "Authentication existe, pero el acceso con mail y contraseña está "
    + "apagado. Consola de Firebase → Authentication → Sign-in method → habilitalo.",
  "auth/invalid-api-key": "La configuración de firebase-init.js no corresponde a ningún proyecto. "
    + "No es un permiso: es el projectId o la apiKey mal copiados."
};
P.explicar = (e) => {
  const c = (e && e.code) || "";
  return (CAUSAS[c] || (e && e.message) || String(e)) + (c ? " · " + c : "");
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

export { auth, db };
