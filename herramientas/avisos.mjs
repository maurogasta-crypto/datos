// ─────────────────────────────────────────────────────────────────────────────
// herramientas/avisos.mjs — Los avisos del agente por WhatsApp (CallMeBot).
//
//   node herramientas/avisos.mjs quienes [base...]
//       Quién del equipo de cada base puede recibir un aviso del agente, y si
//       no, por qué. Nunca muestra un número ni una clave.
//
//   node herramientas/avisos.mjs enviar <base> --a <nombre> --tema <tema>
//                                --texto "…" [--sobre <proyecto>] [--seco]
//                                [--bodega <dir>]
//       Le manda UN aviso a UNA persona. Con --seco dice qué mandaría.
//
//   node herramientas/avisos.mjs probar <base> --a <nombre> [--bodega <dir>]
//       Un aviso de prueba, con texto fijo: lo primero después de un alta.
//
//   node herramientas/avisos.mjs registro [--dias N] [--bodega <dir>]
//       Lo que se mandó, de la bodega.
//
// avisos-1 · 30-sep-2026 · línea L-avisos del panel.
//
// Pedido de Mauro: extender a todo el ecosistema lo de CallMeBot que hasta hoy
// sólo usaba Casa Verde, para que la ronda diaria —unificada en su chat— pueda
// mandar reportes, alertas y avisos especiales a cada persona registrada.
// LOS CRITERIOS (qué merece un WhatsApp y qué no) están en
// `protocolos/PROTOCOLO-AVISOS.md`; este archivo es la mitad que se puede
// comprobar con código, y por eso los límites viven acá y no en la memoria de
// un chat:
//
//   · sólo a personas del EQUIPO de una base —con ficha activa en `usuarios/`—
//     que encendieron «Avisos de Claude» en su pantalla de avisos. Nunca a un
//     huésped, a un cliente ni a un número que no salió de esa pantalla;
//   · el texto no lleva teléfonos, plata, mails ni enlaces de afuera: el
//     detalle va detrás del login, en el enlace al sitio;
//   · un tope por persona y por día, y un minuto entre dos avisos al mismo
//     número (el plan gratis de CallMeBot no deja menos);
//   · cada envío queda anotado en la bodega (privada), con lo que contestó
//     CallMeBot leído DE VERDAD: un 200 no quiere decir que salió;
//   · la clave de CallMeBot se trae de a una, se usa y se olvida: no se
//     imprime ni se guarda. Ver `contactoAviso` en firestore.mjs.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const VERSION = "avisos-2";
const AQUI = path.dirname(fileURLToPath(import.meta.url));

/* La función de Netlify de Casa Verde es el puente de TODO el ecosistema. No se
   duplica: el destinatario viaja en el pedido (desde jul-2026), así que sirve
   igual para una persona de CasaYourte que para una de Casa Verde, y dar de
   alta a alguien nuevo no toca Netlify. Ver casaverdecanas/netlify/functions/
   notify-whatsapp.js. */
export const PUENTE = "https://serene-scone-76bd4e.netlify.app/.netlify/functions/notify-whatsapp";

/* Las bases que tienen PERSONAS con pantalla de avisos. Tiempos no está: su
   gente es la de Casa Verde (Mauro y Florencia), que ya tiene su número en
   casaverde-20, y cargarlo dos veces es un dato en dos lugares. Hilux, gestos
   y el panel no tienen equipo propio: lo que haya que decir de ellos se le
   dice a Mauro desde la base donde tiene su número (`--sobre hilux`). */
export const BASES = {
  casaverde:  { sitio: "Casa Verde", pantalla: "Casa Verde → Mis avisos" },
  casayourte: { sitio: "CasaYourte", pantalla: "CasaYourte → Más → Mis avisos por WhatsApp" },
  remate:     { sitio: "remateTaller", pantalla: "remate → tu cuenta → Mis avisos por WhatsApp" }
};
export const ALIAS = { tiempos: "casaverde" };

/* Los temas: por qué se manda. Se anotan con cada envío y encabezan el
   mensaje, así quien lo recibe sabe de un vistazo si tiene que hacer algo. */
export const TEMAS = {
  urgente: "algo que no deja trabajar o que se pierde si nadie actúa hoy",
  llegada: "llega un huésped (Casa Verde): el enlace a la ficha de llegada",
  pedido:  "lo que esa persona pidió o reportó: quedó hecho o hace falta que conteste",
  resumen: "el resumen de la ronda, para quien lo pidió",
  prueba:  "comprobar que el camino anda"
};
const ICONO = { urgente: "⚠️", llegada: "🏡", pedido: "💬", resumen: "📋", prueba: "🔧" };

export const TOPE_DIA = 3;            // avisos por número y por día (de Montevideo)
export const ESPERA_MS = 65000;       // CallMeBot: uno por minuto al mismo número
export const LARGO_MAX = 600;         // el puente corta en 900; esto deja lugar al encabezado

/* Los únicos enlaces que puede llevar un aviso: los de los sitios del
   ecosistema, donde el detalle está detrás del login. */
export const DOMINIOS = ["casaverdecanas.com.br", "casayourte.com", "rematetaller.github.io",
  "maurogasta-crypto.github.io", "casaverdecanas-blip.github.io"];

/* ── El texto ────────────────────────────────────────────────────────────────
   Devuelve { ok, motivos[] }. Cada motivo dice qué sacar, porque el que lee
   esto es un chat que va a corregir y volver a intentar. */
export function validarTexto(texto) {
  const t = String(texto ?? "").trim();
  const motivos = [];
  if (!t) motivos.push("el texto está vacío");
  if (t.length > LARGO_MAX) motivos.push(`tiene ${t.length} caracteres; el tope es ${LARGO_MAX}: el detalle va en el enlace`);
  const urls = t.match(/https?:\/\/[^\s)]+/gi) || [];
  for (const u of urls) {
    let host = "";
    try { host = new URL(u).hostname.toLowerCase(); } catch { host = ""; }
    if (!host || !DOMINIOS.some((d) => host === d || host.endsWith("." + d)))
      motivos.push(`enlace a «${host || u}»: sólo se enlazan los sitios del ecosistema`);
  }
  // Lo que queda sin los enlaces: un identificador largo adentro de una URL no
  // es un teléfono.
  const sin = t.replace(/https?:\/\/[^\s)]+/gi, " ");
  if (/(\d[\s.-]?){8,}/.test(sin)) motivos.push("lleva un número largo (¿un teléfono, una cuenta?): va detrás del login");
  if (/(R\$|US\$|U\$S|\$|€)\s?\d|\d[\d.,]*\s?(reales|pesos|d[oó]lares|usd|uyu|brl)\b/i.test(sin))
    motivos.push("lleva plata: los montos se ven en el sitio, no en un WhatsApp");
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(sin)) motivos.push("lleva un mail");
  return { ok: motivos.length === 0, motivos };
}

/* Lo que llega al teléfono. El encabezado dice que es Claude y de qué sitio:
   quien lo recibe tiene derecho a saber que lo escribió una IA, y un aviso sin
   sitio obliga a adivinar de dónde viene. El pie dice cómo apagarlo. */
export function armarMensaje(base, tema, texto, sobre) {
  const b = BASES[base];
  const de = sobre && sobre !== base ? `${b.sitio} (${sobre})` : b.sitio;
  return `${ICONO[tema] || "🤖"} Claude · ${de}\n${String(texto).trim()}\n— aviso automático; se apaga en ${b.pantalla}`;
}

/* Lee la respuesta de CallMeBot DE VERDAD. Es la misma lectura que
   `CV2._leerRespuestaWa` de casaverdecanas/interno/nucleo.js —que vive en el
   navegador y no se puede importar desde acá—: CallMeBot contesta 200 aunque
   rechace el pedido, y mete el error como HTML rojo en el cuerpo. Si cambia
   una, cambia la otra: el banco compara las palabras que busca cada una. */
/* CallMeBot repite en su respuesta el número al que mandó («Message to:
   +55…»). Eso no puede llegar ni a la pantalla ni al registro: se tapa todo
   número largo, dejando los tres últimos dígitos para poder reconocerlo.
   Lo encontró la primera prueba real, el 30-sep-2026. */
export const taparNumeros = (t) => String(t || "").replace(/\+?\d[\d\s().-]{6,}\d/g,
  (m) => "…" + m.replace(/\D/g, "").slice(-3));

export function leerRespuesta(txt) {
  const crudo = String(txt || "");
  const plano = taparNumeros(crudo.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
  const b = plano.toLowerCase();
  if (b.includes("paused") || b.includes("pausada"))
    return { ok: false, motivo: "pausada", detalle: "la cuenta de CallMeBot de esa persona está EN PAUSA: tiene que mandarle «resume» al bot desde su teléfono" };
  if (b.includes("apikey") && (b.includes("not valid") || b.includes("invalid") || b.includes("missing") || b.includes("wrong")))
    return { ok: false, motivo: "clave", detalle: "CallMeBot no acepta esa clave: tiene que pedirle «Recover APIKey» al bot y volver a cargarla" };
  if (b.includes("not found") || b.includes("no registrado") || b.includes("not registered"))
    return { ok: false, motivo: "sin_alta", detalle: "ese número no está dado de alta en CallMeBot" };
  if (b.includes("limit") || b.includes("too many"))
    return { ok: false, motivo: "limite", detalle: "CallMeBot frenó por límite de uso" };
  if (crudo.toLowerCase().includes("color:red"))
    return { ok: false, motivo: "rechazado", detalle: plano.slice(0, 240) };
  return { ok: true, motivo: "", detalle: plano.slice(0, 240) };
}

/* ── Quién ───────────────────────────────────────────────────────────────── */
const plano = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/* Por el nombre de la ficha, como lo diría Mauro: «Florencia», «flor», «Romina».
   Primero el nombre entero, después el principio de alguna palabra. Si hay dos,
   no se elige: se dice cuáles, y quien llama lo escribe mejor. */
export function buscarPersona(usuarios, nombre) {
  const q = plano(nombre);
  if (!q) return { ok: false, motivo: "falta a quién (--a <nombre>)" };
  const exactos = usuarios.filter((u) => plano(u.nombre) === q);
  const lista = exactos.length ? exactos
    : usuarios.filter((u) => plano(u.nombre).split(/\s+/).some((p) => p.startsWith(q)));
  if (lista.length === 1) return { ok: true, persona: lista[0] };
  if (!lista.length) return { ok: false, motivo: `nadie se llama «${nombre}» en esa base` };
  return { ok: false, motivo: `«${nombre}» puede ser ${lista.map((u) => u.nombre).join(" o ")}` };
}

/* Si a esa persona se le puede escribir, y si no, por qué — en palabras que
   se le puedan decir a Mauro. El orden importa: primero lo que es de la ficha,
   después lo que es de su pantalla de avisos. */
export function estadoDe(u, contacto) {
  if (!u) return { listo: false, estado: "inactivo", texto: "sin ficha en usuarios/" };
  if (u.activo !== true) return { listo: false, estado: "inactivo", texto: "la ficha no está activa" };
  if (!contacto || !contacto.telefono) return { listo: false, estado: "sin-numero", texto: "no cargó su número" };
  if (!contacto.apikey) return { listo: false, estado: "sin-clave", texto: "cargó el número pero no la clave de CallMeBot" };
  if (contacto.agente !== true) return { listo: false, estado: "apagado", texto: "no encendió «Avisos de Claude»" };
  return { listo: true, estado: "listo", texto: "listo" };
}

/* ── El registro, en la bodega ───────────────────────────────────────────────
   Un archivo por mes: `avisos/AAAA-MM.json`. Lo que se anota de cada envío es
   lo que hace falta para el tope y para responder «¿le avisaste?»: a quién
   (nombre y base), de qué, el texto, qué contestó CallMeBot, y una HUELLA del
   número —no el número—, que es lo que deja contar el tope aunque la misma
   persona esté en dos bases con dos uid distintos. */
export const huella = (tel) => crypto.createHash("sha256")
  .update("avisos:" + String(tel || "").replace(/\D/g, "")).digest("hex").slice(0, 16);

export function hoyMontevideo(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Montevideo" }).format(d);
}

const archivoMes = (dir, dia) => path.join(dir, "avisos", dia.slice(0, 7) + ".json");

export function leerRegistro(dir, dias = 2, ahora = new Date()) {
  const salida = [];
  const meses = new Set();
  for (let i = 0; i <= dias; i++) meses.add(hoyMontevideo(new Date(ahora - i * 86400000)).slice(0, 7));
  for (const m of meses) {
    try {
      const l = JSON.parse(fs.readFileSync(path.join(dir, "avisos", m + ".json"), "utf8"));
      if (Array.isArray(l)) salida.push(...l);
    } catch { /* un mes sin avisos no es un error */ }
  }
  const desde = hoyMontevideo(new Date(ahora - dias * 86400000));
  return salida.filter((e) => e && hoyMontevideo(new Date(e.en)) >= desde)
    .sort((a, b) => String(a.en).localeCompare(String(b.en)));
}

function anotar(dir, e) {
  const f = archivoMes(dir, hoyMontevideo(new Date(e.en)));
  fs.mkdirSync(path.dirname(f), { recursive: true });
  let l = [];
  try { l = JSON.parse(fs.readFileSync(f, "utf8")); } catch { l = []; }
  if (!Array.isArray(l)) l = [];
  l.push(e);
  fs.writeFileSync(f, JSON.stringify(l, null, 1) + "\n");
  return f;
}

/* Cuenta TODO lo que salió hacia ese número hoy —también lo que CallMeBot
   rechazó—: un intento fallido también es un mensaje que pudo haber llegado. */
export function cuantosHoy(registro, h, hoy) {
  return registro.filter((e) => e.huella === h && e.intentado && hoyMontevideo(new Date(e.en)) === hoy).length;
}
export function ultimoA(registro, h) {
  const l = registro.filter((e) => e.huella === h && e.intentado);
  return l.length ? new Date(l[l.length - 1].en).getTime() : 0;
}

/* ── Mandar ──────────────────────────────────────────────────────────────── */
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

async function mandarPorElPuente(contacto, mensaje) {
  try {
    const r = await fetch(PUENTE, {
      method: "POST", headers: { "Content-Type": "application/json" },
      // SIN el '+': es la forma que el propio bot entrega y la probada
      // (CV2.enviarWhatsApp, jul-2026).
      body: JSON.stringify({ text: mensaje, phone: String(contacto.telefono).replace(/\D/g, ""), apikey: contacto.apikey })
    });
    const d = await r.json().catch(() => null);
    if (!d || d.ok !== true) return { ok: false, motivo: "puente", detalle: (d && d.error) || `el puente contestó ${r.status}` };
    return leerRespuesta(d.respuesta);
  } catch (e) {
    return { ok: false, motivo: "red", detalle: e && e.message ? e.message : String(e) };
  }
}

async function conectar(base) {
  const F = await import("./firestore.mjs");
  const cfg = F.PROYECTOS[base];
  const s = await F.entrarSuave(cfg);
  if (!s.ok) throw new Error(`no se pudo entrar a ${base}: ${s.motivo}`);
  return { F, cfg, sesion: s.sesion };
}

/* Resuelve el alias, y dice qué hacer si la base no tiene gente. */
export function baseDe(nombre) {
  const b = ALIAS[nombre] || nombre;
  if (!BASES[b]) throw new Error(`«${nombre}» no tiene personas con avisos. Bases: ${Object.keys(BASES).join(", ")}`
    + ` (tiempos va por casaverde; hilux, gestos y el panel, a Mauro por casaverde con --sobre).`);
  return b;
}

/**
 * Manda UN aviso a UNA persona. Nunca lanza por algo que no sea un error de
 * uso: devuelve { ok, motivo, detalle, a } para que la ronda siga con el resto.
 * Opciones: base, a, tema, texto, sobre, bodega, seco, esperar (true por
 * defecto: espera el minuto de CallMeBot en vez de rechazar).
 */
export async function avisar({ base, a, tema, texto, sobre, bodega, seco = false, esperar = true, conexion }) {
  base = baseDe(base);
  if (!TEMAS[tema]) throw new Error(`tema desconocido «${tema}». Temas: ${Object.keys(TEMAS).join(", ")}`);
  const v = validarTexto(texto);
  if (!v.ok) return { ok: false, motivo: "texto", detalle: v.motivos.join("; "), a };
  if (!bodega || !fs.existsSync(bodega)) throw new Error("falta la bodega (--bodega <dir>): sin el registro no hay tope");

  const { F, cfg, sesion } = conexion || await conectar(base);
  const usuarios = await F.listar(cfg, sesion, "usuarios");
  const b = buscarPersona(usuarios, a);
  if (!b.ok) return { ok: false, motivo: "quien", detalle: b.motivo, a };
  const p = b.persona;
  const c = await F.contactoAviso(cfg, sesion, p.id);
  if (!c.ok) return { ok: false, motivo: "contacto", detalle: c.motivo, a: p.nombre };
  const est = estadoDe(p, c.contacto);
  if (!est.listo) return { ok: false, motivo: est.estado, detalle: `${p.nombre}: ${est.texto}`, a: p.nombre };

  const h = huella(c.contacto.telefono);
  const hoy = hoyMontevideo();
  const reg = leerRegistro(bodega, 1);
  const n = cuantosHoy(reg, h, hoy);
  if (n >= TOPE_DIA) return { ok: false, motivo: "tope", detalle: `${p.nombre} ya recibió ${n} avisos hoy (tope ${TOPE_DIA})`, a: p.nombre };

  const mensaje = armarMensaje(base, tema, texto, sobre);
  if (seco) return { ok: true, motivo: "seco", detalle: mensaje, a: p.nombre };

  const falta = ESPERA_MS - (Date.now() - ultimoA(reg, h));
  if (falta > 0) {
    if (!esperar) return { ok: false, motivo: "espera", detalle: `hay que esperar ${Math.ceil(falta / 1000)} s`, a: p.nombre };
    await dormir(falta);
  }
  const r = await mandarPorElPuente(c.contacto, mensaje);
  const archivo = anotar(bodega, { en: new Date().toISOString(), base, sobre: sobre || base, a: p.nombre, uid: p.id,
    tema, texto: String(texto).trim(), intentado: true, ok: r.ok, motivo: r.motivo, detalle: String(r.detalle || "").slice(0, 240),
    huella: h, version: VERSION });
  return { ok: r.ok, motivo: r.motivo, detalle: r.detalle, a: p.nombre, archivo };
}

/** Quién de una base puede recibir avisos. Sin números ni claves. */
export async function quienes(base, conexion) {
  base = baseDe(base);
  const { F, cfg, sesion } = conexion || await conectar(base);
  const usuarios = (await F.listar(cfg, sesion, "usuarios")).filter((u) => u.activo === true);
  const salida = [];
  for (const u of usuarios.sort((x, y) => String(x.nombre).localeCompare(String(y.nombre)))) {
    const c = await F.contactoAviso(cfg, sesion, u.id);
    salida.push({ nombre: u.nombre || "(sin nombre)", rol: u.rol || "", ...(c.ok ? estadoDe(u, c.contacto)
      : { listo: false, estado: "sin-lectura", texto: c.motivo }) });
  }
  return salida;
}

/* ── La línea de comandos ────────────────────────────────────────────────── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
  const CON_VALOR = ["--a", "--tema", "--texto", "--sobre", "--bodega", "--dias"];
  const libres = args.filter((x, i) => !x.startsWith("--") && !CON_VALOR.includes(args[i - 1]));
  const bodega = opt("--bodega", path.join(AQUI, "..", "..", "bodega"));
  const decir = (r) => console.log(`\n  ${r.ok ? "✓" : "✖"} ${r.a || ""}${r.motivo ? "  [" + r.motivo + "]" : ""}\n  ${String(r.detalle || "").split("\n").join("\n  ")}\n`
    + (r.archivo ? `  anotado en ${r.archivo} (falta commit y push de la bodega)\n` : ""));

  const run = async () => {
    if (cmd === "quienes") {
      const bases = libres.length ? libres : Object.keys(BASES);
      for (const b of bases) {
        console.log(`\n  ${BASES[baseDe(b)].sitio}`);
        try {
          for (const q of await quienes(b)) console.log(`    ${q.listo ? "✓" : "·"} ${q.nombre.padEnd(22)} ${q.texto}`);
        } catch (e) { console.log(`    ✖ ${e.message}`); }
      }
      console.log("");
    } else if (cmd === "enviar" || cmd === "probar") {
      const base = libres[0];
      if (!base) throw new Error("falta la base");
      const tema = cmd === "probar" ? "prueba" : opt("--tema");
      const texto = cmd === "probar"
        ? "Prueba de los avisos de Claude: si leés esto, te pueden llegar los avisos de la ronda diaria."
        : opt("--texto");
      decir(await avisar({ base, a: opt("--a"), tema, texto, sobre: opt("--sobre"), bodega, seco: args.includes("--seco") }));
    } else if (cmd === "registro") {
      const l = leerRegistro(bodega, Number(opt("--dias", 7)));
      if (!l.length) console.log("\n  No se mandó ningún aviso en esos días.\n");
      for (const e of l) console.log(`  ${e.en.slice(0, 16).replace("T", " ")}  ${e.ok ? "✓" : "✖"} ${String(e.a).padEnd(14)} ${e.base}/${e.tema}  ${e.ok ? "" : "[" + e.motivo + "] "}${String(e.texto).split("\n")[0].slice(0, 60)}`);
    } else {
      console.log(`
  node herramientas/avisos.mjs quienes [base...]
  node herramientas/avisos.mjs enviar <base> --a <nombre> --tema <tema> --texto "…" [--sobre <proyecto>] [--seco]
  node herramientas/avisos.mjs probar <base> --a <nombre>
  node herramientas/avisos.mjs registro [--dias N]
      (todas aceptan --bodega <dir>; por defecto ../bodega)

  Bases: ${Object.keys(BASES).join(", ")}  ·  tiempos → casaverde
  Temas: ${Object.entries(TEMAS).map(([k, v]) => k + " (" + v + ")").join("\n         ")}
  Criterios: protocolos/PROTOCOLO-AVISOS.md
`);
    }
  };
  run().catch((e) => { console.error("\n✖ " + e.message + "\n"); process.exit(1); });
}
