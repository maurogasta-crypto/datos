// ─────────────────────────────────────────────────────────────────────────────
// telefono-capturas.mjs — Las capturas de pantalla de AIRBNB, a la bodega.
// Sello: capturas-1
//
// Pedido de Mauro, 29-sep-2026: completar cada reserva de Airbnb con lo que
// muestra la app en «Administrar reservación» —el teléfono del huésped,
// cuántos son—. Automatizar los toques dentro de la app de Airbnb NO se hace:
// hace falta un servicio que controle la pantalla entera, y Airbnb puede
// suspender una cuenta de anfitrión que maneja un programa. Lo que se hace es
// esto: Mauro abre la reserva y saca una CAPTURA; `whatsapp --vigilar` la ve
// en la carpeta de capturas y la sube a la bodega privada; la ronda la lee.
//
// ── SÓLO LAS DE AIRBNB ───────────────────────────────────────────────────────
// Android (HyperOS, MIUI y otros) pone en el nombre del archivo la app que
// estaba en pantalla: `Screenshot_2026-09-29-18-12-34-123_com.airbnb.android.jpg`.
// Se sube sólo lo que tiene ese nombre: una captura de cualquier otra cosa —el
// banco, una conversación— no sale del teléfono. Si el teléfono no pone el
// nombre de la app, no se sube nada, y eso se dice.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import * as Bodega from "./telefono-bodega.mjs";

export const CARPETAS = [
  path.join(os.homedir(), "storage", "shared", "DCIM", "Screenshots"),
  path.join(os.homedir(), "storage", "shared", "Pictures", "Screenshots"),
];
const VISTAS = path.join(os.homedir(), ".config", "bodega", "capturas-vistas.json");
const TOPE_BYTES = 8 * 1024 * 1024;
const PRIMERA_VEZ_DIAS = 7;

export const esDeAirbnb = (nombre) => /com\.airbnb\.android/i.test(nombre) && /\.(jpe?g|png|webp)$/i.test(nombre);

/* Las capturas de Airbnb que no se subieron. La primera vez, sólo las de la
   última semana: no se sube un año de capturas viejas de golpe. */
export function nuevas(carpetas, vistas, ahoraMs = Date.now()) {
  const ya = new Set(vistas || []);
  const desde = vistas ? 0 : ahoraMs - PRIMERA_VEZ_DIAS * 86400000;
  const out = [];
  for (const dir of carpetas) {
    let nombres = [];
    try { nombres = fs.readdirSync(dir); } catch { continue; }
    for (const n of nombres) {
      if (!esDeAirbnb(n) || ya.has(n)) continue;
      const ruta = path.join(dir, n);
      let st; try { st = fs.statSync(ruta); } catch { continue; }
      if (!st.isFile() || st.mtimeMs < desde || st.size > TOPE_BYTES) continue;
      out.push({ ruta, nombre: n, fecha: new Date(st.mtimeMs).toISOString().slice(0, 10), bytes: st.size });
    }
  }
  return out.sort((a, b) => a.nombre.localeCompare(b.nombre));
}

const leerVistas = (a = VISTAS) => { try { return JSON.parse(fs.readFileSync(a, "utf8")); } catch { return null; } };
const guardarVistas = (l, a = VISTAS) => {
  fs.mkdirSync(path.dirname(a), { recursive: true, mode: 0o700 });
  fs.writeFileSync(a, JSON.stringify(l.slice(-3000)), { mode: 0o600 });
};

/* Una pasada: sube lo nuevo a `capturas/<fecha>/` de la bodega. Se marca como
   visto DESPUÉS de guardarlo en la copia de trabajo: si algo falla antes, la
   próxima pasada lo vuelve a intentar. */
export function capturar({ carpetas = CARPETAS, trabajo = Bodega.TRABAJO, token, remoto, archivoVistas = VISTAS, ahoraMs = Date.now() } = {}) {
  const vistas = leerVistas(archivoVistas);
  const nv = nuevas(carpetas, vistas, ahoraMs);
  if (!nv.length) {
    if (!vistas) guardarVistas([], archivoVistas);            // ya no es la primera vez
    return { nuevas: 0 };
  }
  const opciones = { archivos: nv.map((c) => ({ desde: c.ruta, ruta: `capturas/${c.fecha}/${c.nombre}` })),
    trabajo, mensaje: `Airbnb: ${nv.length} captura(s)` };
  if (token !== undefined) opciones.token = token;
  if (remoto !== undefined) opciones.remoto = remoto;
  const subido = Bodega.guardarArchivosYSubir(opciones);
  guardarVistas([...(vistas || []), ...nv.map((c) => c.nombre)], archivoVistas);
  return { nuevas: nv.length, subido };
}
