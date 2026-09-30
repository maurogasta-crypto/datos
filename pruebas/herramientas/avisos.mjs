// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/avisos.mjs — Banco de los avisos del agente por WhatsApp.
//
//   node pruebas/herramientas/avisos.mjs
//
// Sin red: la base y el puente de Netlify son de mentira. Lo que importa probar
// no es que mande, es que NO mande lo que no debe —a quien no lo pidió, más
// de la cuenta, con un teléfono o con plata adentro— y que el número y la
// clave de nadie queden escritos en ningún lado.
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validarTexto, armarMensaje, leerRespuesta, buscarPersona, estadoDe, huella, hoyMontevideo,
         cuantosHoy, leerRegistro, avisar, quienes, baseDe, TEMAS, TOPE_DIA, BASES, PUENTE } from "../../herramientas/avisos.mjs";
import { avisoDeLlegada, textoParaEnviar } from "../../herramientas/reservas.mjs";
import { PROYECTOS } from "../../herramientas/firestore.mjs";

let pasadas = 0, fallidas = 0;
const prueba = async (n, f) => { try { await f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const titulo = (t) => console.log("\n" + t);
const AQUI = path.dirname(fileURLToPath(import.meta.url));

/* Datos inventados: ningún número ni clave de verdad. */
const TEL = "+59899000111", CLAVE = "clave-inventada-123";
const USUARIOS = [
  { id: "u1", nombre: "Mauro", rol: "admin", activo: true },
  { id: "u2", nombre: "Florencia", rol: "equipo", activo: true },
  { id: "u3", nombre: "Esteban", rol: "equipo", activo: false },
  { id: "u4", nombre: "Flor de Lis", rol: "equipo", activo: true },
  { id: "u5", nombre: "Sin Clave", rol: "equipo", activo: true },
  { id: "u6", nombre: "Apagada", rol: "equipo", activo: true }
];
const CONTACTOS = {
  u1: { telefono: TEL, apikey: CLAVE, agente: true },
  u2: { telefono: "+55 48 9999-0000", apikey: CLAVE, agente: true },
  u3: { telefono: "+59899000333", apikey: CLAVE, agente: true },
  u5: { telefono: "+59899000555", apikey: "", agente: true },
  u6: { telefono: "+59899000666", apikey: CLAVE, agente: false }
};
const conexion = (niega = false) => ({ cfg: {}, sesion: {}, F: {
  listar: async () => USUARIOS,
  contactoAviso: async (cfg, s, uid) => niega ? { ok: false, motivo: "las reglas dijeron que no", contacto: null }
    : { ok: true, motivo: "", contacto: CONTACTOS[uid] ? { ...CONTACTOS[uid] } : null }
} });

/* El puente de mentira: anota lo que le llegó y contesta lo que se le diga. */
let pedidos = [], respuesta = "Message to: +59899000111 Message queued. You will receive it in a few seconds.";
globalThis.fetch = async (url, op = {}) => {
  pedidos.push({ url: String(url), body: JSON.parse(op.body || "{}") });
  return { ok: true, status: 200, json: async () => ({ ok: true, status: 200, respuesta }) };
};
const bodega = () => fs.mkdtempSync(path.join(os.tmpdir(), "bodega-avisos-"));

titulo("El texto");
await prueba("un aviso corto con un enlace a un sitio del ecosistema pasa", () => {
  assert.ok(validarTexto("Llega Natalia mañana. Ficha: https://casaverdecanas.com.br/interno/llegada.html?r=abc12345678").ok);
});
await prueba("un teléfono no pasa, con o sin espacios", () => {
  assert.ok(!validarTexto("Llamala al +55 48 99926-4723").ok);
  assert.ok(!validarTexto("su número es 099123456").ok);
});
await prueba("un identificador largo DENTRO de un enlace no cuenta como teléfono", () => {
  assert.ok(validarTexto("https://casayourte.com/editar.html?x=12345678901234").ok);
});
await prueba("la plata no pasa, en cualquier moneda", () => {
  for (const t of ["El saldo es R$ 450", "Podrías ganar 637,94 R$", "debe US$120", "quedan $ 3000", "son 200 reales", "1.500 pesos"])
    assert.ok(!validarTexto(t).ok, t);
});
await prueba("un número chico (horas, personas, noches) sí pasa", () => {
  assert.ok(validarTexto("Llegan 4 adultos a las 19:30, 3 noches.").ok);
});
await prueba("un mail no pasa", () => assert.ok(!validarTexto("escribile a alguien@ejemplo.com").ok));
await prueba("un enlace de afuera no pasa, tampoco disfrazado de subdominio", () => {
  assert.ok(!validarTexto("mirá https://bit.ly/xyz").ok);
  assert.ok(!validarTexto("https://casayourte.com.malo.io/x").ok);
});
await prueba("vacío y demasiado largo no pasan, y el motivo dice qué hacer", () => {
  assert.ok(!validarTexto("  ").ok);
  const r = validarTexto("x".repeat(700));
  assert.ok(!r.ok && /enlace/.test(r.motivos[0]));
});
await prueba("el aviso de llegada de reservas.mjs pasa el mismo control", () => {
  const t = avisoDeLlegada([{ id: "Rz8Kq1234567890", estado: "confirmada", cabanaId: "c1", checkIn: "2026-10-02",
    checkOut: "2026-10-05", adultos: 2, clienteNombre: "Natalia" }], { cabanas: [{ id: "c1", nombre: "Colibrí" }], hoy: "2026-10-01" });
  const v = validarTexto(t);
  assert.ok(v.ok, v.motivos.join("; "));
});

await prueba("al mandarlo, el aviso de llegada no repite «Casa Verde» debajo del encabezado", () => {
  const t = textoParaEnviar("🏡 Casa Verde · llega Natalia mañana\nColibrí · 3 noches");
  assert.equal(t.split("\n")[0], "Llega Natalia mañana");
  assert.equal(armarMensaje("casaverde", "llegada", t).split("\n")[1], "Llega Natalia mañana");
});

titulo("El mensaje que llega");
await prueba("dice que es Claude, de qué sitio, y cómo se apaga", () => {
  const m = armarMensaje("casayourte", "pedido", "Tu pedido quedó en el taller.");
  assert.match(m, /^💬 Claude · CasaYourte\n/);
  assert.match(m, /se apaga en CasaYourte → Más → Mis avisos por WhatsApp$/);
});
await prueba("con --sobre dice de qué proyecto habla", () => {
  assert.match(armarMensaje("casaverde", "urgente", "x", "hilux"), /Claude · Casa Verde \(hilux\)/);
});
await prueba("entra en el tope del puente (900) con el texto más largo permitido", () => {
  for (const b of Object.keys(BASES)) assert.ok(armarMensaje(b, "resumen", "x".repeat(600), "harmonia").length <= 900, b);
});

titulo("La respuesta de CallMeBot se lee de verdad");
await prueba("un 200 con la cuenta en pausa NO es un envío", () => {
  const r = leerRespuesta('<p style="color:red">Your account is paused. Send resume to +34 644 00 00 00</p>');
  assert.equal(r.ok, false); assert.equal(r.motivo, "pausada");
});
await prueba("clave mala, sin alta, límite, y rojo genérico", () => {
  assert.equal(leerRespuesta("APIKey is not valid").motivo, "clave");
  assert.equal(leerRespuesta("Phone not registered").motivo, "sin_alta");
  assert.equal(leerRespuesta("Too many requests").motivo, "limite");
  assert.equal(leerRespuesta('<b style="color:red">algo</b>').motivo, "rechazado");
  assert.equal(leerRespuesta("Message queued").ok, true);
});
await prueba("la respuesta de CallMeBot repite el número: se tapa antes de mostrarla o anotarla", () => {
  const r = leerRespuesta("Message to: +554899990000 Text to send: hola Message queued.");
  assert.ok(r.ok);
  assert.ok(!/\d{5,}/.test(r.detalle), r.detalle);
  assert.match(r.detalle, /…000/);
});
await prueba("busca las mismas señales que CV2._leerRespuestaWa de Casa Verde", () => {
  const f = path.join(AQUI, "..", "..", "..", "casaverdecanas", "interno", "nucleo.js");
  if (!fs.existsSync(f)) { console.log("      (sin la copia de casaverdecanas al lado: no se compara)"); return; }
  const cv = fs.readFileSync(f, "utf8");
  const bloque = cv.slice(cv.indexOf("CV2._leerRespuestaWa = function"), cv.indexOf("CV2.enviarWhatsApp = function"));
  const señales = (s) => [...s.matchAll(/indexOf\('([^']+)'\)|includes\("([^"]+)"\)/g)].map((m) => m[1] || m[2]).sort();
  const nuestro = fs.readFileSync(path.join(AQUI, "..", "..", "herramientas", "avisos.mjs"), "utf8");
  const b2 = nuestro.slice(nuestro.indexOf("export function leerRespuesta"), nuestro.indexOf("/* ── Quién"));
  assert.deepEqual([...new Set(señales(b2))], [...new Set(señales(bloque))]);
});

titulo("A quién");
await prueba("por nombre, sin acentos ni mayúsculas, y el entero gana al prefijo", () => {
  assert.equal(buscarPersona(USUARIOS, "mauro").persona.id, "u1");
  assert.equal(buscarPersona(USUARIOS, "Florencia").persona.id, "u2");
});
await prueba("si dos coinciden no elige: dice cuáles", () => {
  const r = buscarPersona(USUARIOS, "flor");
  assert.equal(r.ok, false); assert.match(r.motivo, /Florencia o Flor de Lis/);
});
await prueba("nadie, y sin nombre", () => {
  assert.equal(buscarPersona(USUARIOS, "Romina").ok, false);
  assert.equal(buscarPersona(USUARIOS, "").ok, false);
});
await prueba("sólo está listo quien está activo, tiene número y clave, y lo encendió", () => {
  assert.equal(estadoDe(USUARIOS[0], CONTACTOS.u1).listo, true);
  assert.equal(estadoDe(USUARIOS[2], CONTACTOS.u3).estado, "inactivo");
  assert.equal(estadoDe(USUARIOS[3], null).estado, "sin-numero");
  assert.equal(estadoDe(USUARIOS[4], CONTACTOS.u5).estado, "sin-clave");
  assert.equal(estadoDe(USUARIOS[5], CONTACTOS.u6).estado, "apagado");
  // Sin el campo no es un sí: encender es un acto de la persona.
  assert.equal(estadoDe(USUARIOS[0], { telefono: TEL, apikey: CLAVE }).estado, "apagado");
});
await prueba("tiempos va por casaverde; una base sin gente se rechaza diciendo adónde ir", () => {
  assert.equal(baseDe("tiempos"), "casaverde");
  assert.throws(() => baseDe("hilux"), /a Mauro por casaverde/);
});
await prueba("las bases con avisos declaran la colección y la tienen sellada en firestore.mjs", () => {
  for (const b of Object.keys(BASES)) {
    assert.equal(PROYECTOS[b].avisos, "avisos_contacto", b);
    assert.ok(PROYECTOS[b].selladas.includes("avisos_contacto"), b + " no la sella");
  }
});

await prueba("las reglas de cada sitio: avisos_contacto fuera del comodín del agente y con su get propio", () => {
  const REGLAS = { casaverde: "casaverdecanas/interno/firestore.rules", casayourte: "CasaYourte/REGLAS.txt",
                   remate: "remate/firestore.rules" };
  let vistas = 0;
  for (const [b, rel] of Object.entries(REGLAS)) {
    const f = path.join(AQUI, "..", "..", "..", rel);
    if (!fs.existsSync(f)) continue;
    vistas++;
    const t = fs.readFileSync(f, "utf8").replace(/\/\/.*$/gm, "");
    const comodin = t.match(/allow read: if esAgente\(\) && !\(coleccion in \[([^\]]*)\]/);
    assert.ok(comodin && /'avisos_contacto'/.test(comodin[1]), `${b}: el comodín del agente lee avisos_contacto entera`);
    const bloque = t.slice(t.indexOf("match /avisos_contacto/{uid}"));
    const cuerpo = bloque.slice(0, bloque.indexOf("\n    }"));
    assert.match(cuerpo, /allow get: if[^;]*esAgente\(\)/, `${b}: falta el get del agente`);
    assert.ok(!/allow (read|list|write|create|update|delete)[^;]*esAgente/.test(cuerpo), `${b}: el agente tiene más que get`);
  }
  if (!vistas) console.log("      (sin los repos de los sitios al lado: no se comparan)");
});

titulo("Mandar");
await prueba("manda por el puente, sin el '+', y anota sin número ni clave", async () => {
  pedidos = []; const dir = bodega();
  const r = await avisar({ base: "casaverde", a: "Mauro", tema: "prueba", texto: "hola", bodega: dir, conexion: conexion() });
  assert.equal(r.ok, true, r.detalle);
  assert.equal(pedidos.length, 1);
  assert.equal(pedidos[0].url, PUENTE);
  assert.equal(pedidos[0].body.phone, "59899000111");
  const escrito = fs.readFileSync(r.archivo, "utf8");
  assert.ok(!escrito.includes("59899000111") && !escrito.includes(CLAVE), "el registro tiene el número o la clave");
  assert.equal(JSON.parse(escrito)[0].huella, huella(TEL));
});
await prueba("--seco no llama al puente ni anota nada", async () => {
  pedidos = []; const dir = bodega();
  const r = await avisar({ base: "casaverde", a: "Mauro", tema: "resumen", texto: "hola", bodega: dir, seco: true, conexion: conexion() });
  assert.equal(r.motivo, "seco"); assert.equal(pedidos.length, 0);
  assert.ok(!fs.existsSync(path.join(dir, "avisos")));
});
await prueba("a quien no lo encendió, a un inactivo o sin clave: no sale nada", async () => {
  pedidos = [];
  for (const a of ["Apagada", "Esteban", "Sin Clave"]) {
    const r = await avisar({ base: "casaverde", a, tema: "urgente", texto: "x", bodega: bodega(), conexion: conexion() });
    assert.equal(r.ok, false, a);
  }
  assert.equal(pedidos.length, 0);
});
await prueba("si la base niega el contacto, se dice y no se manda", async () => {
  pedidos = [];
  const r = await avisar({ base: "casaverde", a: "Mauro", tema: "urgente", texto: "x", bodega: bodega(), conexion: conexion(true) });
  assert.equal(r.motivo, "contacto"); assert.equal(pedidos.length, 0);
});
await prueba("un texto con plata ni siquiera va a buscar a la persona", async () => {
  pedidos = [];
  const r = await avisar({ base: "casaverde", a: "Mauro", tema: "urgente", texto: "debe R$ 300", bodega: bodega(), conexion: conexion() });
  assert.equal(r.motivo, "texto"); assert.equal(pedidos.length, 0);
});
await prueba("un tema inventado es un error de uso", async () => {
  await assert.rejects(avisar({ base: "casaverde", a: "Mauro", tema: "chisme", texto: "x", bodega: bodega(), conexion: conexion() }));
});
await prueba("sin bodega no se manda: sin registro no hay tope", async () => {
  await assert.rejects(avisar({ base: "casaverde", a: "Mauro", tema: "prueba", texto: "x", bodega: "/no/existe", conexion: conexion() }), /bodega/);
});
await prueba("el minuto de CallMeBot: el segundo aviso seguido espera (o rebota si no se deja esperar)", async () => {
  pedidos = []; const dir = bodega();
  await avisar({ base: "casaverde", a: "Mauro", tema: "prueba", texto: "uno", bodega: dir, conexion: conexion() });
  const r = await avisar({ base: "casaverde", a: "Mauro", tema: "prueba", texto: "dos", bodega: dir, esperar: false, conexion: conexion() });
  assert.equal(r.motivo, "espera"); assert.equal(pedidos.length, 1);
});
await prueba(`el tope: ${TOPE_DIA} por número y por día, contando también los rechazados`, async () => {
  const dir = bodega(); const h = huella(TEL);
  const f = path.join(dir, "avisos", hoyMontevideo().slice(0, 7) + ".json");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const viejo = new Date(Date.now() - 5 * 60000).toISOString();
  fs.writeFileSync(f, JSON.stringify(Array.from({ length: TOPE_DIA }, (_, i) =>
    ({ en: viejo, huella: h, intentado: true, ok: i !== 0, motivo: i ? "" : "pausada", a: "Mauro", base: "casaverde", tema: "prueba", texto: "x" }))));
  assert.equal(cuantosHoy(leerRegistro(dir, 1), h, hoyMontevideo()), TOPE_DIA);
  pedidos = [];
  const r = await avisar({ base: "casaverde", a: "Mauro", tema: "urgente", texto: "x", bodega: dir, conexion: conexion() });
  assert.equal(r.motivo, "tope"); assert.equal(pedidos.length, 0);
});
await prueba("la huella es la misma con o sin '+', espacios y guiones: el tope es por número", () => {
  assert.equal(huella("+55 48 9999-0000"), huella("554899990000"));
  assert.notEqual(huella("554899990000"), huella("554899990001"));
});
await prueba("un rechazo de CallMeBot se anota como no enviado", async () => {
  respuesta = '<p style="color:red">APIKey is not valid</p>';
  const r = await avisar({ base: "casaverde", a: "Florencia", tema: "prueba", texto: "x", bodega: bodega(), conexion: conexion() });
  respuesta = "Message queued.";
  assert.equal(r.ok, false); assert.equal(r.motivo, "clave");
  assert.equal(JSON.parse(fs.readFileSync(r.archivo, "utf8"))[0].ok, false);
});
await prueba("quienes: dice el estado de cada uno activo y nunca un número", async () => {
  const l = await quienes("tiempos", conexion());
  assert.ok(!JSON.stringify(l).includes("5989"), "salió un número");
  assert.deepEqual(l.map((x) => x.nombre), ["Apagada", "Flor de Lis", "Florencia", "Mauro", "Sin Clave"]);
});
await prueba("los temas están todos escritos en el protocolo", () => {
  const p = fs.readFileSync(path.join(AQUI, "..", "..", "protocolos", "PROTOCOLO-AVISOS.md"), "utf8");
  for (const t of Object.keys(TEMAS)) assert.ok(p.includes("`" + t + "`"), t);
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
