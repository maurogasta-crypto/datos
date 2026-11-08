// =====================================================
// netlify/functions/despertar.mjs — Despierta a las Pizarras cuando alguien
// guarda algo en un sitio (o manda un mensaje desde la Pizarra).
//
// 24-oct-2026, Mauro (general:C1, fase 2): «una conexión en tiempo real entre
// todos los integrantes, sin un consumo extra que el de la comunicación»; y
// «los mensajes en el ecosistema tienen que usar ese canal para notificar
// despertando el dispositivo».
//
// ── LO QUE HACE, Y LO QUE NO ───────────────────────────────────────
//   1. Verifica el ID token de Firebase de ESA base y la ficha activa de la
//      persona, con su propio token: lo mismo que avisar-claude (de ahí se
//      importa, no se copia).
//   2. Manda por Firebase Cloud Messaging un aviso de DATOS al tema de esa
//      base (`pizarra-<base>`), con prioridad alta: despierta el teléfono por
//      la conexión que Google ya tiene abierta, sin gastar batería de más.
//   3. El aviso dice SÓLO qué cambió (`que`) y de qué base: nunca el
//      contenido. La Pizarra, al recibirlo, se pone al día con su propia sesión
//      (Despertar.todo). Si el canal cambia algún día (ntfy, sin Google), la
//      Pizarra no cambia.
//
// No escribe en ninguna base. La credencial es una cuenta de servicio del
// proyecto `avisos-23b6a` —que no tiene ninguna base de los sitios— con UN
// solo rol: mandar avisos. Si se filtrara, lo peor es despertar Pizarras.
//
// ── LA VARIABLE (Netlify → Environment variables) ─────────────────
//   FCM_CUENTA   el JSON entero de la clave de la cuenta de servicio
//                `despertar-pizarras` (lo pega Mauro; nunca un chat)
//
// ── QUIÉN LLAMA ───────────────────────────────────────────────────
//   La Pizarra (Android) no manda cabecera Origin: no es un navegador. Un
//   navegador sí, y tiene que ser de la lista. La garantía no es el origen
//   —eso se falsifica fuera de un navegador— sino el token y la ficha.
// =====================================================

import crypto from "node:crypto";
import { BASES, ORIGENES, verificarToken, fichaActiva } from "./avisar-claude.mjs";

export const PROYECTO_AVISOS = "avisos-23b6a";
// Qué puede cambiar. Lo demás no viaja.
export const QUE = ["mensajes", "tareas", "agenda", "alertas", "avisos", "reservas", "pedidos", "plata", "llamadas", "todo"];
// El panel no tiene Pizarras: sus invitados no despiertan a nadie.
export const BASES_PIZARRA = Object.keys(BASES).filter((b) => b !== "panel");
export const temaDe = (base) => `pizarra-${base}`;

/** El aviso, sin contenido: qué cambió, de qué base y quién (para que su propio teléfono no se avise a sí mismo). */
export function mensajeFCM(base, que, uid) {
  return { message: {
    topic: temaDe(base),
    data: { que, base, de: String(uid || "") },
    // Alta prioridad: el teléfono dormido lo recibe en el acto. Un aviso viejo
    // no sirve (la próxima pasada de 10 minutos ya lo trajo): vence a los 10.
    android: { priority: "HIGH", ttl: "600s", collapse_key: `${base}-${que}` },
  } };
}

// ---------- la cuenta de servicio: un JWT firmado y un token de acceso ----------
const b64u = (x) => Buffer.from(typeof x === "string" ? x : JSON.stringify(x)).toString("base64url");
export function jwtDeCuenta(cuenta, ahoraMs = Date.now()) {
  const iat = Math.floor(ahoraMs / 1000);
  const cab = b64u({ alg: "RS256", typ: "JWT" });
  const cuerpo = b64u({ iss: cuenta.client_email, scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600 });
  const firma = crypto.createSign("RSA-SHA256").update(`${cab}.${cuerpo}`).sign(cuenta.private_key).toString("base64url");
  return `${cab}.${cuerpo}.${firma}`;
}
let acceso = { valor: null, vence: 0 };
async function tokenDeAcceso(env, deps) {
  const ahora = deps.ahora || Date.now();
  if (acceso.valor && ahora < acceso.vence) return acceso.valor;
  let cuenta;
  try { cuenta = JSON.parse(env.FCM_CUENTA || ""); } catch (e) { throw new Error("FCM_CUENTA no es un JSON"); }
  if (!cuenta.client_email || !cuenta.private_key) throw new Error("FCM_CUENTA incompleta");
  const r = await (deps.fetch || fetch)("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + jwtDeCuenta(cuenta, ahora),
  });
  if (!r.ok) throw new Error("Google no dio el token de acceso (" + r.status + ")");
  const j = await r.json();
  acceso = { valor: j.access_token, vence: ahora + Math.max(60, (j.expires_in || 3600) - 120) * 1000 };
  return acceso.valor;
}
export const olvidarAcceso = () => { acceso = { valor: null, vence: 0 }; };

// Un mismo «qué» de la misma persona, uno cada 5 segundos: guardar tres cosas
// seguidas despierta una vez. No es una garantía (otra instancia arranca en
// cero); la garantía es la ficha.
const ultimo = new Map();
export function frenar(clave, ahora = Date.now()) {
  if (ahora - (ultimo.get(clave) || 0) < 5000) return true;
  ultimo.set(clave, ahora);
  return false;
}

const anotar = (t) => { try { console.log("despertar · " + t); } catch (e) {} };
const respuesta = (codigo, origen, cuerpo) => ({
  statusCode: codigo,
  headers: { "Content-Type": "application/json; charset=utf-8",
    ...(origen ? { "Access-Control-Allow-Origin": origen, Vary: "Origin",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" } : {}) },
  body: cuerpo ? JSON.stringify(cuerpo) : "",
});

export async function manejar(event, deps = {}) {
  const h = {};
  for (const [k, v] of Object.entries(event.headers || {})) h[k.toLowerCase()] = v;
  const conOrigen = !!h.origin, origen = ORIGENES.includes(h.origin) ? h.origin : "";
  if (event.httpMethod === "OPTIONS") return respuesta(origen ? 204 : 403, origen);
  if (event.httpMethod !== "POST") return respuesta(405, origen, { error: "método no permitido" });
  if (conOrigen && !origen) return respuesta(403, "", { error: "origen no permitido" });

  let pedido;
  try { pedido = JSON.parse(event.body || "{}"); } catch (e) { return respuesta(400, origen, { error: "no es JSON" }); }
  const { base, que } = pedido;
  if (!BASES_PIZARRA.includes(base)) return respuesta(400, origen, { error: "base desconocida" });
  if (!QUE.includes(que)) return respuesta(400, origen, { error: "qué cambió: desconocido" });

  const token = (h.authorization || "").replace(/^Bearer\s+/i, "");
  let quien;
  try { quien = await verificarToken(token, BASES[base].proyecto, deps); }
  catch (e) { anotar(`${base}/${que}: token rechazado (${e.message})`); return respuesta(401, origen, { error: e.message }); }
  const ficha = await fichaActiva(base, quien.uid, token, deps);
  if (!ficha.ok) { anotar(`${base}/${que}: sin ficha activa`); return respuesta(403, origen, { error: "sin ficha activa en " + BASES[base].nombre }); }
  if (frenar(`${quien.uid}|${base}|${que}`, deps.ahora)) return respuesta(202, origen, { ok: true, frenado: true });

  const env = deps.env || process.env;
  if (!env.FCM_CUENTA) return respuesta(503, origen, { error: "falta FCM_CUENTA en Netlify" });
  try {
    const acc = await tokenDeAcceso(env, deps);
    const r = await (deps.fetch || fetch)(`https://fcm.googleapis.com/v1/projects/${PROYECTO_AVISOS}/messages:send`, {
      method: "POST", headers: { Authorization: `Bearer ${acc}`, "Content-Type": "application/json" },
      body: JSON.stringify(mensajeFCM(base, que, quien.uid)),
    });
    if (!r.ok) {
      let detalle = ""; try { detalle = String(await r.text()).slice(0, 300); } catch (e) {}
      anotar(`${base}/${que}: FCM contestó ${r.status} ${detalle}`);
      if (r.status === 401) olvidarAcceso();
      return respuesta(502, origen, { error: "FCM contestó " + r.status });
    }
  } catch (e) { anotar(`${base}/${que}: ${e.message}`); return respuesta(502, origen, { error: e.message }); }
  anotar(`${base}/${que}: Pizarras despertadas`);
  return respuesta(200, origen, { ok: true });
}

export const handler = (event) => manejar(event);
