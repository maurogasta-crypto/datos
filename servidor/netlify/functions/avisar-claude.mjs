// =====================================================
// netlify/functions/avisar-claude.mjs — Despierta al chat de Claude cuando
// alguien del equipo manda una consulta desde el formulario de un sitio.
//
// 3-oct-2026, pedido de Mauro: «quiero que se dispare cuando un usuario
// registrado hace una consulta a la IA en el formulario de cualquiera de los
// sitios del ecosistema». Hasta hoy esa consulta esperaba a la ronda diaria
// de las 07:47; ahora el sitio, después de guardar el reporte, llama acá, y
// esto le dispara a la rutina «Consulta en vivo» del chat de Mauro.
//
// ── LO QUE HACE, Y LO QUE NO ───────────────────────────────────────
//   1. Verifica el ID token de Firebase (firma RS256 contra las claves
//      públicas de Google) del proyecto de ESE sitio. Una sesión anónima
//      —el muro de recuerdos de Casa Verde las tiene— no cuenta.
//   2. Lee la ficha de la persona CON SU PROPIO TOKEN (`usuarios/{uid}`, o
//      `miembros/{uid}` en Tiempos): las reglas de cada base deciden igual
//      que desde el navegador. Sin ficha activa, no despierta a nadie.
//   3. Dispara la rutina con un texto FIJO: el sitio y el id del reporte.
//      NUNCA el texto que escribió la persona — lo lee el chat de la base,
//      como dato. Así un formulario no le puede dar órdenes a la rutina.
//
// No escribe en ninguna base y no tiene credencial de servidor de Firebase.
//
// ── LAS VARIABLES (Netlify → Environment variables) ──────────────
//   CLAUDE_RUTINA_URL    la dirección «fire» de la rutina, tal cual la da
//                        claude.ai/code → Rutinas → la rutina → API
//   CLAUDE_RUTINA_TOKEN  el token de esa misma pantalla (secreto: se ve
//                        una sola vez; lo pega Mauro, nunca un chat)
//   CLAUDE_RUTINA_BETA   opcional: la cabecera anthropic-beta, si la
//                        pantalla muestra otra distinta de la de abajo
//
// La verificación del token es la misma idea que `api/_sesion.mjs` de
// remate, pero acá son CUATRO proyectos y no uno: por eso no se importa
// de allá (aquél fija `remate-acbc9` a propósito, y con razón).
// =====================================================

import crypto from "node:crypto";

// projectId de cada base: públicos por diseño. Van fijos y no en el entorno
// por lo mismo que en remate: uno mal cargado aceptaría tokens de otro lado.
export const BASES = {
  casaverde:  { proyecto: "casaverde-20",     ficha: "usuarios", nombre: "Casa Verde" },
  casayourte: { proyecto: "casayourte-mauro", ficha: "usuarios", nombre: "CasaYourte" },
  remate:     { proyecto: "remate-acbc9",     ficha: "usuarios", nombre: "remateTaller" },
  tiempos:    { proyecto: "tiempos-71d42",    ficha: "miembros", nombre: "Tiempos" },
  // 6-oct-2026 (panel:U2): un INVITADO del panel manda un pedido. Su ficha es
  // `personas/{uid}` y tiene que estar ACTIVA; el pedido es un pendiente.
  panel:      { proyecto: "datos-830f8",      ficha: "personas", nombre: "Panel", coleccion: "pendientes" },
};

// Lista BLANCA de orígenes: un «*» dejaría que cualquier página usara la
// sesión de quien la visite para despertar al chat.
export const ORIGENES = [
  "https://casaverdecanas.com.br",
  "https://www.casaverdecanas.com.br",
  "https://casaverdecanas-blip.github.io",
  "https://casayourte.com",
  "https://www.casayourte.com",
  "https://casayourte.github.io",
  "https://rematetaller.github.io",
  "https://maurogasta-crypto.github.io",
];

const CERTS_GOOGLE =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const BETA_POR_DEFECTO = "experimental-cc-routine-2026-04-01";

// Un id de reporte de Firestore: letras y números. Cualquier otra cosa no
// viaja en el texto de la rutina.
// Los pendientes del panel se llaman `<proyecto>:<clave>`: por eso los dos puntos.
export const idValido = (s) => typeof s === "string" && /^[A-Za-z0-9_:-]{1,40}$/.test(s);

// El texto que recibe la rutina. Fijo, sin nada que haya escrito la persona.
export function textoParaLaRutina(base, reporteId, nombre) {
  const quien = String(nombre || "").replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 40);
  return `CONSULTA EN VIVO · ${BASES[base].nombre}: ${BASES[base].coleccion || "reportes"}/${reporteId}` +
    (quien ? ` (de ${quien})` : "") + ". Leela de la base y seguí TRASPASO.md § 4 bis.";
}

// ---------- el ID token ----------
let certs = { valor: null, vence: 0 };
async function certificados() {
  if (certs.valor && Date.now() < certs.vence) return certs.valor;
  const r = await fetch(CERTS_GOOGLE);
  if (!r.ok) throw new Error("no se pudieron leer las claves públicas de Google");
  const m = (r.headers.get("cache-control") || "").match(/max-age=(\d+)/);
  certs = { valor: await r.json(), vence: Date.now() + Math.max(60, m ? Number(m[1]) : 3600) * 1000 };
  return certs.valor;
}
const b64 = (s) => Buffer.from(String(s).replace(/-/g, "+").replace(/_/g, "/"), "base64");

export async function verificarToken(idToken, proyecto, deps = {}) {
  const partes = String(idToken || "").split(".");
  if (partes.length !== 3) throw new Error("token mal formado");
  let cab, cuerpo;
  try { cab = JSON.parse(b64(partes[0]).toString("utf8")); cuerpo = JSON.parse(b64(partes[1]).toString("utf8")); }
  catch (e) { throw new Error("token ilegible"); }
  if (cab.alg !== "RS256" || !cab.kid) throw new Error("firma inesperada");
  const lista = await (deps.certificados || certificados)();
  const cert = lista[cab.kid];
  if (!cert) throw new Error("clave desconocida");
  const ok = crypto.createVerify("RSA-SHA256").update(`${partes[0]}.${partes[1]}`).verify(cert, b64(partes[2]));
  if (!ok) throw new Error("la firma no verifica");
  const ahora = Math.floor((deps.ahora || Date.now()) / 1000), margen = 60;
  if (cuerpo.aud !== proyecto || cuerpo.iss !== `https://securetoken.google.com/${proyecto}`)
    throw new Error("el token es de otro proyecto");
  if (!cuerpo.sub) throw new Error("token sin usuario");
  if (typeof cuerpo.exp !== "number" || cuerpo.exp + margen < ahora) throw new Error("token vencido");
  // Tener sesión no es permiso: el muro de recuerdos da sesiones anónimas.
  if ((cuerpo.firebase || {}).sign_in_provider === "anonymous") throw new Error("sesión anónima");
  return { uid: cuerpo.sub };
}

// ---------- la ficha, leída con el token de la persona ----------
export async function fichaActiva(base, uid, idToken, deps = {}) {
  const b = BASES[base];
  const url = `https://firestore.googleapis.com/v1/projects/${b.proyecto}` +
    `/databases/(default)/documents/${b.ficha}/${encodeURIComponent(uid)}`;
  const r = await (deps.fetch || fetch)(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (!r.ok) return { ok: false };
  const f = (await r.json()).fields || {};
  // Tiempos no tiene `activo`: estar en `miembros/` ES ser de la familia.
  // Un invitado del panel, sí: una ficha pausada no despierta a nadie.
  if ((b.ficha === "usuarios" || b.ficha === "personas") && f.activo?.booleanValue !== true) return { ok: false };
  return { ok: true, nombre: f.nombre?.stringValue || "" };
}

// Un toque por persona por minuto, en esta instancia. No es una garantía
// —una instancia nueva arranca en cero—: es para que un doble toque no
// despierte dos veces. La garantía es que hace falta una ficha activa.
const ultimo = new Map();
export function frenar(uid, ahora = Date.now()) {
  const antes = ultimo.get(uid) || 0;
  if (ahora - antes < 60000) return true;
  ultimo.set(uid, ahora);
  return false;
}

// Un renglón por pedido en el registro de Netlify. Nada de lo que escribió
// la persona, ni el token: el sitio, el id y qué pasó.
const anotar = (t) => { try { console.log("avisar-claude · " + t); } catch (e) {} };

const respuesta = (codigo, origen, cuerpo) => ({
  statusCode: codigo,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    ...(origen ? { "Access-Control-Allow-Origin": origen, Vary: "Origin",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Max-Age": "86400" } : {}),
  },
  body: cuerpo ? JSON.stringify(cuerpo) : "",
});

export async function manejar(event, deps = {}) {
  const h = {};
  for (const [k, v] of Object.entries(event.headers || {})) h[k.toLowerCase()] = v;
  const origen = ORIGENES.includes(h.origin) ? h.origin : "";
  if (event.httpMethod === "OPTIONS") return respuesta(origen ? 204 : 403, origen);
  if (event.httpMethod !== "POST") return respuesta(405, origen, { error: "método no permitido" });
  if (!origen) return respuesta(403, "", { error: "origen no permitido" });

  let pedido;
  try { pedido = JSON.parse(event.body || "{}"); } catch (e) { return respuesta(400, origen, { error: "no es JSON" }); }
  const { base, reporteId } = pedido;
  if (!BASES[base]) return respuesta(400, origen, { error: "base desconocida" });
  if (!idValido(reporteId)) return respuesta(400, origen, { error: "reporte inválido" });

  const token = (h.authorization || "").replace(/^Bearer\s+/i, "");
  let quien;
  try { quien = await verificarToken(token, BASES[base].proyecto, deps); }
  catch (e) { anotar(`${base}/${reporteId}: token rechazado (${e.message})`); return respuesta(401, origen, { error: e.message }); }
  const ficha = await fichaActiva(base, quien.uid, token, deps);
  if (!ficha.ok) { anotar(`${base}/${reporteId}: sin ficha activa`); return respuesta(403, origen, { error: "sin ficha activa en " + BASES[base].nombre }); }
  if (frenar(quien.uid, deps.ahora)) return respuesta(202, origen, { ok: true, frenado: true });

  const env = deps.env || process.env;
  if (!env.CLAUDE_RUTINA_URL || !env.CLAUDE_RUTINA_TOKEN)
    return respuesta(503, origen, { error: "la rutina no está configurada en Netlify" });
  const r = await (deps.fetch || fetch)(env.CLAUDE_RUTINA_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.CLAUDE_RUTINA_TOKEN}`,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": env.CLAUDE_RUTINA_BETA || BETA_POR_DEFECTO,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text: textoParaLaRutina(base, reporteId, ficha.nombre) }),
  });
  // El sitio no muestra esto: el reporte ya quedó guardado y la ronda diaria
  // lo levanta igual. Sólo sirve para mirarlo en el registro de Netlify.
  if (!r.ok) {
    // Lo que contestó la rutina va al registro de Netlify (Logs → Functions):
    // el número y el mensaje de error, nunca el token ni la dirección.
    let detalle = "";
    try { detalle = String(await r.text()).slice(0, 300); } catch (e) {}
    anotar(`${base}/${reporteId}: la rutina contestó ${r.status} ${detalle}`);
    return respuesta(502, origen, { error: "la rutina contestó " + r.status });
  }
  anotar(`${base}/${reporteId}: rutina despertada`);
  return respuesta(200, origen, { ok: true });
}

export const handler = (event) => manejar(event);
