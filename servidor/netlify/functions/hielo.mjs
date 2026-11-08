// =====================================================
// netlify/functions/hielo.mjs — Los servidores de conexión (ICE) para las
// llamadas entre Pizarras (general:C2, Fase B, pizarra-63).
//
// Mauro, 24-oct-2026: «que las llamadas puedan hacerse directamente desde la
// pizarra sin utilizar WhatsApp», y la condición: «no quiero que ningún
// desarrollo pase de los cupos gratuitos» (PROTOCOLO-DESARROLLO § 13).
//
// Una llamada va DIRECTO de teléfono a teléfono (WebRTC). Para encontrarse
// usan STUN, que es gratis y sin límite (Cloudflare y Google). Cuando los dos
// están detrás de una red que no deja hablar directo —pasa con el 4G— hace
// falta un TURN, que retransmite. El TURN tiene usuario y clave: no pueden ir
// en la app (cualquiera la baja), así que los entrega esta función, y sólo a
// quien tiene sesión y ficha activa en su base (lo mismo que despertar).
//
// ── LAS VARIABLES (Netlify → Environment variables), todas opcionales ──
//   TURN_URLS     las direcciones del TURN, separadas por coma
//                 (p. ej. «turn:…:80,turns:…:443?transport=tcp»)
//   TURN_USUARIO  el usuario que da el proveedor
//   TURN_CLAVE    la clave que da el proveedor (secreto: la pega Mauro)
// Sin ellas, sólo STUN: anda en wifi y en muchas redes; en un 4G cerrado, la
// llamada no conecta y la Pizarra lo dice. El TURN tiene que ser de CUPO FIJO
// sin tarjeta: si se pasa, se frena, no cobra (§ 13).
// =====================================================

import { BASES, ORIGENES, verificarToken, fichaActiva } from "./avisar-claude.mjs";
import { BASES_PIZARRA } from "./despertar.mjs";

export const STUN = ["stun:stun.cloudflare.com:3478", "stun:stun.l.google.com:19302"];

/** Los servidores para RTCPeerConnection: siempre STUN; TURN si está configurado. */
export function servidores(env = {}) {
  const l = [{ urls: STUN }];
  const urls = String(env.TURN_URLS || "").split(",").map((x) => x.trim()).filter((x) => /^turns?:/.test(x));
  if (urls.length && env.TURN_USUARIO && env.TURN_CLAVE) l.push({ urls, username: env.TURN_USUARIO, credential: env.TURN_CLAVE });
  return l;
}

const respuesta = (codigo, origen, cuerpo) => ({
  statusCode: codigo,
  headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    ...(origen ? { "Access-Control-Allow-Origin": origen, Vary: "Origin", "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS" } : {}) },
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
  const { base } = pedido;
  if (!BASES_PIZARRA.includes(base)) return respuesta(400, origen, { error: "base desconocida" });
  const token = (h.authorization || "").replace(/^Bearer\s+/i, "");
  let quien;
  try { quien = await verificarToken(token, BASES[base].proyecto, deps); }
  catch (e) { return respuesta(401, origen, { error: e.message }); }
  const ficha = await fichaActiva(base, quien.uid, token, deps);
  if (!ficha.ok) return respuesta(403, origen, { error: "sin ficha activa en " + BASES[base].nombre });
  return respuesta(200, origen, { iceServers: servidores(deps.env || process.env) });
}

export const handler = (event) => manejar(event);
