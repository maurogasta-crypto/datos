/* ═══════════════════════════════════════════════════════════
   errores.js — UN ERROR MUESTRA LA CAUSA, NO EL CÓDIGO, en todo el ecosistema.
   Sello: errores-1

   PROTOCOLO-INTERFAZ § 7.2: «permission-denied» o «Error 400» no se pueden
   diagnosticar desde un teléfono, donde no hay consola; «las reglas no dejan
   hacer eso» se resuelve sabiendo dónde mirar.

   Desde el 29-oct-2026 (`general:C7`, tercera pieza del módulo común) la
   tabla es UNA. Hasta ese día había dos, distintas —`CY.explicar` de
   CasaYourte y `P.explicar` del panel—, y los otros tres sitios mostraban el
   código pelado. Cada sitio le suma SUS causas propias (las que nombran su
   consola o su pantalla) en el segundo argumento, y ésas ganan.

   Los errores se muestran en el acto, así que cada sitio lo pide AL CARGAR,
   diferido y con catch, y guarda el módulo:
       import("https://maurogasta-crypto.github.io/datos/errores.js").then(…).catch(() => {})
   Si no bajó, el sitio muestra lo que mostraba antes (el código o el
   mensaje): nunca peor que hoy. Banco: `node pruebas/errores.mjs`.
   Sin DOM y sin Firebase: corre igual en Node y en el navegador.
   ═══════════════════════════════════════════════════════════ */

export const VERSION = "errores-1";

export const CAUSAS = {
  // Firestore
  "permission-denied": "Las reglas de la base no dejan hacer eso: puede ser que tu ficha no esté activa o que falte publicar las reglas.",
  "unavailable": "No hay conexión con la base. Es la red, no un permiso: probá con mejor señal.",
  "failed-precondition": "La base pide algo que no está: casi siempre, un índice. Si lo ves, avisá.",
  "unauthenticated": "La sesión caducó. Salí y volvé a entrar.",
  "not-found": "No se encontró ese documento: puede que alguien lo haya borrado.",
  "already-exists": "Eso ya existe.",
  "invalid-argument": "Algún dato tiene un formato que la base no acepta.",
  "resource-exhausted": "Se agotó el cupo gratuito de la base por hoy. Vuelve a andar mañana.",
  "deadline-exceeded": "La base tardó demasiado en contestar. Probá de nuevo.",
  "cancelled": "Se cortó antes de terminar. Probá de nuevo.",
  // Authentication
  "auth/invalid-credential": "El mail o la contraseña no coinciden. (Firebase ya no dice cuál de los dos.)",
  "auth/wrong-password": "El mail o la contraseña no coinciden.",
  "auth/user-not-found": "No existe ninguna cuenta con ese mail.",
  "auth/invalid-email": "Ese mail está mal escrito.",
  "auth/email-already-in-use": "Ese mail ya tiene cuenta.",
  "auth/weak-password": "La contraseña necesita al menos 6 caracteres.",
  "auth/too-many-requests": "Demasiados intentos seguidos. Esperá un rato y probá de nuevo.",
  "auth/network-request-failed": "No se pudo llegar a Firebase. Es la red.",
  "auth/user-disabled": "Esa cuenta está desactivada.",
  "auth/requires-recent-login": "Por seguridad, salí y volvé a entrar antes de hacer eso.",
  "auth/popup-closed-by-user": "Se cerró la ventana antes de terminar.",
  "auth/unauthorized-domain": "Esta dirección no está autorizada en Firebase → Authentication → Settings → Authorized domains.",
  "auth/operation-not-allowed": "El acceso con mail y contraseña está apagado en Firebase → Authentication → Sign-in method.",
  "auth/configuration-not-found": "El proyecto todavía no tiene Authentication: Firebase → Authentication → Comenzar.",
  "auth/invalid-api-key": "La configuración de Firebase no corresponde a ningún proyecto: el projectId o la apiKey están mal copiados."
};

/** La causa en castellano, con el código al final para poder buscarlo. `propias` gana. */
export function explicar(e, propias) {
  const c = (e && e.code) || "";
  const m = (e && e.message) || (typeof e === "string" ? e : "");
  const t = (propias && propias[c]) || CAUSAS[c];
  if (t) return t + " · " + c;
  if (/Cloud Firestore API|not.*enabled/i.test(m)) return "La base de Firestore no está creada: creala en la consola de Firebase.";
  if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return "No se pudo llegar al servidor. Es la red: probá con mejor señal.";
  return c || m || "Error desconocido";
}
