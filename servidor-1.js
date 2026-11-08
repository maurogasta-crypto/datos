/* ═══════════════════════════════════════════════════════════
   servidor-1.js — EL SERVIDOR DEL ECOSISTEMA, en un solo lugar.
   Sello: servidor-1 (8-nov-2026; apunta a timon-servidor desde el mismo día)

   Plan «Timón» (Mauro, 8-nov-2026: «independizar estas estructuras»). Las
   funciones de servidor del ecosistema —la IA, despertar a las Pizarras,
   avisarle a Claude— viven hoy en el Netlify de Casa Verde, y su dirección
   estaba escrita a mano en cada app que las usa (en Tiempos, tres veces).
   Ahora la dirección y la forma de llamarlas viven ACÁ, y el día que el
   servidor se mude a su propio lugar (general:C9) cambia este archivo y
   nada más.

   Es un CONTRATO con número, como el conector de Casa Verde: lo que exporta
   no se saca ni cambia de forma mientras exista servidor-1.js (banco
   `node pruebas/servidor.mjs`); un cambio incompatible es servidor-2.js,
   al lado.

   Cada app lo pide DIFERIDO y lo espera sólo cuando lo usa:
       const S = await import("https://maurogasta-crypto.github.io/datos/servidor-1.js");
   Si no baja, lo que dependía del servidor no anda (la IA, el aviso) y la
   pantalla lo dice; lo demás sigue. No guarda ni ve ninguna credencial:
   el token de sesión lo pasa quien llama, y las claves están en el servidor.
   ═══════════════════════════════════════════════════════════ */

export const CONTRATO = "servidor-1";
export const SERVIDOR = "https://timon-servidor.netlify.app/.netlify/functions";   // desde el 8-nov-2026 (antes, el Netlify de Casa Verde)
export const FUNCIONES = Object.freeze({
  ia: "claude-proxy",          // Gemini, con la ÚNICA clave del ecosistema
  despertar: "despertar",      // aviso SIN contenido a las Pizarras (FCM)
  avisarClaude: "avisar-claude", // despierta la rutina «Consulta en vivo»
  hielo: "hielo",              // servidores de conexión para las llamadas
  whatsapp: "notify-whatsapp", // avisos por CallMeBot (lo usan los sitios y avisos.mjs)
  luces: "luces-remate",       // el puente de luces de remate (código en rematetaller/remate)
});

/** La dirección de una función del servidor, por su nombre en FUNCIONES. */
export function url(nombre) {
  if (!Object.prototype.hasOwnProperty.call(FUNCIONES, nombre)) throw new Error("función desconocida: " + nombre);
  return SERVIDOR + "/" + FUNCIONES[nombre];
}

/** Le pregunta a la IA. `contenido` es la lista de partes del mensaje
 *  ({type:"text",text} o {type:"image",source}); devuelve el texto. Tira si
 *  el servidor contesta mal: quien llama decide qué decir en pantalla.
 *  flash-lite por defecto: el que «piensa» se come los tokens y corta el JSON. */
export async function preguntarIA({ contenido, model = "gemini-2.5-flash-lite", max_tokens = 900 } = {}, f = fetch) {
  if (!Array.isArray(contenido) || !contenido.length) throw new Error("no hay nada que preguntarle a la IA");
  const r = await f(url("ia"), {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, max_tokens, messages: [{ role: "user", content: contenido }] }),
  });
  if (!r.ok) throw new Error("la IA contestó " + r.status);
  const j = await r.json();
  return String(((j.content || [])[0] || {}).text || "");
}

/** Despierta la rutina de Claude por un reporte. Sólo la base y el id, nunca
 *  el texto: la función lo lee de la base. Nunca tira. */
export async function avisarClaude({ base, reporteId, token }, f = fetch) {
  if (!base || !reporteId || !token) return false;
  try {
    const r = await f(url("avisarClaude"), {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ base, reporteId }),
    });
    return !!r.ok;
  } catch { return false; }
}

/** Avisa a las Pizarras de una base que cambió algo («qué»), sin contenido.
 *  Nunca tira: si no llega, la Pizarra se pone al día sola a los 10 minutos. */
export async function despertar({ base, que, token }, f = fetch) {
  if (!base || !que || !token) return false;
  try {
    const r = await f(url("despertar"), {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ base, que }),
    });
    return !!r.ok;
  } catch { return false; }
}
