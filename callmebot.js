/* ═══════════════════════════════════════════════════════════
   callmebot.js — LEER LA RESPUESTA DE CALLMEBOT, para todo el ecosistema.
   Sello: callmebot-1

   CallMeBot contesta HTTP 200 aunque rechace el pedido, y mete el error como
   HTML rojo en el cuerpo. Mirar sólo el código de estado da un «salió bien»
   cuando no salió nada — pasó la primera vez que se probó (jul-2026): la
   pantalla dijo «aceptado» y la cuenta estaba en pausa.

   Desde el 29-oct-2026 (`general:C7`, segunda pieza del módulo común) es la
   ÚNICA copia. Hasta ese día eran cuatro, y ya no decían lo mismo: la de Casa
   Verde (`CV2._leerRespuestaWa`) daba el motivo y el número del bot; las de
   CasaYourte y remate eran una versión corta sin motivo; y la de
   `herramientas/avisos.mjs` tapaba los números de teléfono, que las otras tres
   dejaban pasar a la pantalla. Ésta junta lo mejor de las cuatro.

   La usan: `herramientas/avisos.mjs` (import local), y Casa Verde, CasaYourte
   y remate desde el navegador, DIFERIDO y con catch:
       import("https://maurogasta-crypto.github.io/datos/callmebot.js")
   Si no baja, cada sitio dice con su propia frase que no pudo leer la
   respuesta y que hay que mirar si llegó el WhatsApp (motivo «sin_leer»):
   nunca inventa un «salió bien».
   Banco: `node pruebas/callmebot.mjs`. Cambiarla cambia los cuatro a la vez.

   Sin DOM y sin Firebase a propósito: corre igual en Node y en el navegador.
   ═══════════════════════════════════════════════════════════ */

export const VERSION = "callmebot-1";

/* CallMeBot repite en su respuesta el número al que mandó («Message to:
   +55…»). Eso no puede llegar ni a la pantalla ni a un registro: se tapa todo
   número largo, dejando los tres últimos dígitos para poder reconocerlo.
   Lo encontró la primera prueba real, el 30-sep-2026. */
export const taparNumeros = (t) => String(t || "").replace(/\+?\d[\d\s().-]{6,}\d/g,
  (m) => "…" + m.replace(/\D/g, "").slice(-3));

/** { ok, motivo, detalle }. motivo: "" | pausada | clave | sin_alta | limite | rechazado. */
export function leerRespuestaWa(txt) {
  const crudo = String(txt || "");
  const limpio = crudo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const plano = taparNumeros(limpio);
  const b = plano.toLowerCase();
  if (b.includes("paused") || b.includes("pausada")) {
    // El número del BOT lo dice la propia respuesta y CAMBIA con el tiempo:
    // por eso se saca de acá (antes de tapar) y no se escribe fijo en ningún
    // lado. No es de una persona: es a quien hay que escribirle «resume».
    const bot = limpio.match(/\+\s?\d[\d\s]{7,}\d/);
    return { ok: false, motivo: "pausada",
      detalle: "La cuenta de CallMeBot de ese número está EN PAUSA: hay que mandarle «resume» por WhatsApp al bot"
        + (bot ? " (" + bot[0].trim() + ")" : "") + " desde ese mismo teléfono." };
  }
  if (b.includes("apikey") && (b.includes("not valid") || b.includes("invalid") || b.includes("missing") || b.includes("wrong")))
    return { ok: false, motivo: "clave", detalle: "CallMeBot no acepta esa clave: hay que mandarle «Recover APIKey» al bot desde ese teléfono, y devuelve la que corresponde." };
  if (b.includes("not found") || b.includes("no registrado") || b.includes("not registered"))
    return { ok: false, motivo: "sin_alta", detalle: "Ese número no está dado de alta en CallMeBot." };
  if (b.includes("limit") || b.includes("too many"))
    return { ok: false, motivo: "limite", detalle: "CallMeBot frenó por límite de uso. Probá de nuevo en un rato." };
  // Marca genérica: el servicio pinta sus errores de rojo.
  if (crudo.toLowerCase().includes("color:red"))
    return { ok: false, motivo: "rechazado", detalle: plano.slice(0, 240) };
  return { ok: true, motivo: "", detalle: plano.slice(0, 240) };
}
