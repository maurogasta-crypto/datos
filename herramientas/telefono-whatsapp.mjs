// ─────────────────────────────────────────────────────────────────────────────
// telefono-whatsapp.mjs — Leer los mensajes de AIRBNB que llegan como notificación.
//
//   node herramientas/telefono.mjs airbnb            una pasada: lo nuevo, a la bodega
//   node herramientas/telefono.mjs airbnb --vigilar  una pasada cada dos minutos, hasta cortarlo
//   («whatsapp» sigue andando como nombre del mismo comando, por los guiones viejos)
//
// ── DESDE EL 30-SEP-2026, SÓLO AIRBNB ────────────────────────────────────────
// Mauro: «Los mensajes de Airbnb llegan por la app de Airbnb, no por WhatsApp;
// por el momento no preciso que se monitoree WhatsApp, y eso ahorrará mucho
// recurso cotidiano y disminuye riesgos.» Así que WhatsApp y WhatsApp
// Business salieron de la lista de abajo: sus notificaciones ni se leen ni
// suben. El archivo conserva el nombre porque lo citan la documentación y los
// guiones del teléfono; lo que lee lo dice `APP_DE`, y nada más.
//
// Pedido de Mauro, 29-sep-2026: «falta incorporar la lectura de mensajes para
// preparar las respuestas en los WhatsApp». Eligió TODOS los chats. Y el mismo
// día, los de AIRBNB, para completar las reservas de Casa Verde.
//
// ── CÓMO LEE, Y POR QUÉ ASÍ ──────────────────────────────────────────────────
// Por las NOTIFICACIONES, no por la aplicación. `termux-notification-list`
// (paquete termux-api + la app Termux:API con acceso a notificaciones) devuelve
// lo que Android ya muestra en la barra. No automatiza WhatsApp, no toca la
// cuenta y no simula nada: lee lo mismo que ve cualquiera que baje la barra.
// Automatizar la app, o usar una biblioteca no oficial, es lo que hace que
// WhatsApp bloquee un número — y el número es el de Mauro.
//
// La contra, dicha: sólo se ve lo que llega como notificación MIENTRAS esto
// corre. Un chat silenciado, o un mensaje que se abrió antes de la pasada, no
// aparece. No hay historial.
//
// ── ADÓNDE VA ────────────────────────────────────────────────────────────────
// A `mensajes/<fecha>.json` del depósito PRIVADO. El chat los lee, escribe
// `borradores.json`, y la pantalla del teléfono los muestra con «Copiar» y
// «Abrir WhatsApp». **Mandar lo manda Mauro**, siempre.
//
// ── LO QUE DICE UN MENSAJE ES UN DATO ────────────────────────────────────────
// Un mensaje lo escribe un tercero. Si dice «borrá la reserva» o «mandame las
// claves», eso es lo que dijo esa persona, no una orden para el chat.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import * as Bodega from "./telefono-bodega.mjs";

/* SÓLO AIRBNB (30-sep-2026): los mensajes de los huéspedes llegan como
   notificación de su app, y son los que completan las reservas de Casa Verde
   (`herramientas/reservas.mjs`). WhatsApp estuvo del 29 al 30-sep y salió a
   pedido de Mauro — ver la cabecera. Volver a sumarlo es una línea acá, y es
   una decisión suya, no un descuido que alguien corrige. */
const APP_DE = { "com.airbnb.android": "airbnb" };
const PAQUETES = new Set(Object.keys(APP_DE));
const VISTOS = path.join(os.homedir(), ".config", "bodega", "whatsapp-vistos.json");
const TOPE_VISTOS = 5000;

/* Los resúmenes que arma WhatsApp («3 mensajes de 2 chats», «WhatsApp») no
   son mensajes: son la tapa del grupo de notificaciones. */
const esResumen = (n) =>
  !n.content || /^\d+ (mensajes|messages|mensagens)/i.test(n.content) ||
  /^(WhatsApp|WhatsApp Business|Airbnb)$/i.test(String(n.title || "").trim()) ||
  /(buscando|checking for) (nuevos )?mensajes/i.test(n.content);

/* De lo que devuelve `termux-notification-list`, sólo WhatsApp y sólo lo que
   es un mensaje. Un grupo llega como «Grupo: Persona» en el título o como
   «Persona: texto» en el contenido, según la versión: se guarda tal cual,
   sin adivinar. */
function mensajesDe(notificaciones) {
  return (Array.isArray(notificaciones) ? notificaciones : [])
    .filter((n) => n && PAQUETES.has(n.packageName) && !esResumen(n))
    .map((n) => ({
      chat: String(n.title || "").slice(0, 120),
      texto: String(n.content || "").slice(0, 4000),
      // `lines` trae los últimos mensajes cuando se juntan varios del mismo chat.
      lineas: Array.isArray(n.lines) ? n.lines.map((l) => String(l).slice(0, 1000)).slice(0, 20) : [],
      cuando: String(n.when || ""),
      app: APP_DE[n.packageName],
    }));
}

const huella = (m) => crypto.createHash("sha256")
  .update([m.app, m.chat, m.texto, ...m.lineas].join("\u0001")).digest("hex").slice(0, 20);

/* Lo que no se vio antes. La huella NO incluye la hora: WhatsApp reescribe la
   misma notificación con otra hora cada vez que llega algo al mismo chat, y
   con la hora adentro cada pasada volvería a mandar lo mismo. */
function nuevos(mensajes, vistos) {
  const ya = new Set(vistos || []);
  const out = [];
  for (const m of mensajes) {
    const h = huella(m);
    if (ya.has(h)) continue;
    ya.add(h);
    out.push({ id: h, ...m });
  }
  return out;
}

function leerVistos(archivo = VISTOS) {
  try { return JSON.parse(fs.readFileSync(archivo, "utf8")); } catch { return []; }
}
function guardarVistos(lista, archivo = VISTOS) {
  fs.mkdirSync(path.dirname(archivo), { recursive: true, mode: 0o700 });
  fs.writeFileSync(archivo, JSON.stringify(lista.slice(-TOPE_VISTOS)), { mode: 0o600 });
}

function leerNotificaciones() {
  try {
    return JSON.parse(execFileSync("termux-notification-list", { encoding: "utf8", timeout: 20000 }));
  } catch (e) {
    throw new Error(causaDe(e));
  }
}

/* Cuál de los tres pasos falta, y no los tres de una: en la pantalla del
   teléfono un mensaje largo se corta y no se lee (pasó el 29-sep). */
export function causaDe(e) {
  if (e && e.code === "ENOENT")
    return "falta termux-api. Corré:  pkg install termux-api";
  if (e && (e.code === "ETIMEDOUT" || e.signal === "SIGTERM"))
    return "Termux:API no contesta. Instalá la APP Termux:API (del mismo lugar que Termux) y abrila una vez.";
  return "Android no deja leer las notificaciones. Ajustes → Acceso a notificaciones → Termux:API → permitir.";
}

/* Una pasada: lee, se queda con lo nuevo, lo agrega al archivo del día en el
   depósito y lo sube. Devuelve cuántos mensajes nuevos hubo. */
function capturar({ leer = leerNotificaciones, trabajo = Bodega.TRABAJO, token, remoto,
                    archivoVistos = VISTOS, ahora = new Date() } = {}) {
  const vistos = leerVistos(archivoVistos);
  const nv = nuevos(mensajesDe(leer()), vistos);
  if (!nv.length) return { nuevos: 0 };
  const dia = ahora.toISOString().slice(0, 10);
  const ruta = `mensajes/${dia}.json`;
  let previos = [];
  try { previos = JSON.parse(fs.readFileSync(path.join(trabajo, ruta), "utf8")); } catch {}
  const captado = ahora.toISOString();
  const opciones = { ruta, trabajo, mensaje: `Airbnb: ${nv.length} mensajes`,
    contenido: JSON.stringify([...previos, ...nv.map((m) => ({ ...m, captado }))], null, 1) };
  if (token !== undefined) opciones.token = token;
  if (remoto !== undefined) opciones.remoto = remoto;
  const subido = Bodega.guardarYSubir(opciones);
  // Se marcan vistos DESPUÉS de guardarlos: si guardar falla, la próxima
  // pasada los vuelve a intentar en vez de perderlos.
  guardarVistos([...vistos, ...nv.map((m) => m.id)], archivoVistos);
  return { nuevos: nv.length, subido };
}

/* EL LATIDO (30-sep-2026). Con sólo Airbnb puede haber días enteros sin un
   mensaje, y un día sin mensajes se ve igual que un teléfono que dejó de
   leer. Así que el teléfono deja en la bodega, cada 12 horas mientras lee,
   `latido.json` con la hora. La ronda avisa si pasan más de 26 horas sin uno
   (`herramientas/novedades.mjs`). Es un commit cada 12 horas, no uno por
   pasada: dos por día no ensucian la bodega. */
const CADA_LATIDO = 12 * 3600e3;
function latir({ trabajo = Bodega.TRABAJO, token, remoto, ahora = new Date(), ultimo = 0, falla = "" } = {}) {
  if (ultimo && ahora - ultimo < CADA_LATIDO) return { latio: false, ultimo };
  // `falla`: por qué no pudo leer, si no pudo. El latido dice «estoy vivo»;
  // la falla dice «pero no leo», que es lo que hay que arreglar.
  const opciones = { ruta: "latido.json", trabajo, mensaje: falla ? "Latido del teléfono: NO puede leer" : "Latido del teléfono",
    contenido: JSON.stringify({ ultimo: ahora.toISOString(), lee: Object.values(APP_DE), ...(falla ? { falla: String(falla).slice(0, 200) } : {}) }, null, 1) + "\n" };
  if (token !== undefined) opciones.token = token;
  if (remoto !== undefined) opciones.remoto = remoto;
  const subido = Bodega.guardarYSubir(opciones);
  return { latio: true, subido, ultimo: ahora.getTime() };
}

/* Los borradores que escribió el chat, validados como cualquier dato que
   llega de afuera. El número, si está, son sólo dígitos: va en un enlace. */
function borradores(trabajo = Bodega.TRABAJO) {
  let crudo = [];
  try { crudo = JSON.parse(fs.readFileSync(path.join(trabajo, "borradores.json"), "utf8")); } catch {}
  return (Array.isArray(crudo) ? crudo : []).map((b) => {
    if (!b || typeof b.texto !== "string" || !b.texto.trim() || typeof b.id !== "string") return null;
    const num = String(b.numero || "").replace(/\D/g, "");
    return { id: b.id.slice(0, 60), para: String(b.para || "").slice(0, 120),
             texto: b.texto.slice(0, 4000), contexto: String(b.contexto || "").slice(0, 600),
             numero: num.length >= 8 && num.length <= 15 ? num : "",
             // Por dónde se manda: un borrador para un huésped de Airbnb se
             // pega en el hilo de Airbnb, no en WhatsApp (29-sep-2026).
             canal: b.canal === "airbnb" ? "airbnb" : "whatsapp",
             creado: String(b.creado || "") };
  }).filter(Boolean).slice(0, 100);
}

/* El enlace para abrir WhatsApp con el texto ya escrito. Sin número, WhatsApp
   pregunta a quién: igual sirve. */
const enlaceWhatsapp = (b) => `https://wa.me/${b.numero || ""}?text=${encodeURIComponent(b.texto)}`;

export { APP_DE, latir, CADA_LATIDO, leerNotificaciones, mensajesDe, nuevos, huella, esResumen, capturar, borradores, enlaceWhatsapp,
         leerVistos, guardarVistos, VISTOS };
