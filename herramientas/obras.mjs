#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// obras.mjs — El respaldo de las OBRAS, en la bodega privada. Sello: obras-1
//
// Mauro, 15-oct-2026: «los links a los artefactos y documentos con su respaldo
// dentro del repositorio de datos». Las obras viven en `proyectos/<id>` del
// panel con `clase: "obra"` (ver obra.html). Este repositorio es PÚBLICO, así
// que el respaldo va a la bodega (`maurogasta-crypto/bodega`, privada):
//
//   node herramientas/obras.mjs respaldar --bodega /home/user/bodega [--seco]
//
// Por cada obra deja `obras/<id>/ficha.json` (la ficha entera, tal cual) y, por
// cada cosa con una imagen de NUESTRA cuenta de Cloudinary, el archivo en
// `obras/<id>/archivos/<item>.<ext>`. Después anota en la cosa dónde quedó
// (`obra.items.<id>.respaldo`), tocando SÓLO ese campo (`fusionarRutas`): lo
// que Mauro escriba mientras tanto no se pisa.
//
// Lo que NO baja, y lo dice: un enlace a otro sitio (un documento de claude.ai
// pide sesión; un Drive, también). Ésos los respalda a mano la sesión que los
// escribe —exportándolos a `obras/<id>/`— y anota el `respaldo` ella misma.
// El commit y el push de la bodega los hace quien corre esto.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";
import { PROYECTOS, entrar, listar, fusionarRutas } from "./firestore.mjs";

const NUESTRA = /^https:\/\/res\.cloudinary\.com\/dnwfu8ffn\//;
const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };

/** Qué hay que bajar de una obra: las cosas con imagen nuestra y sin respaldo,
 *  y los enlaces de afuera que no tienen respaldo (sólo para decirlo). */
export function planDeRespaldo(obra) {
  const items = Object.entries((obra && obra.obra && obra.obra.items) || {});
  return {
    bajar: items.filter(([, x]) => x && !x.respaldo && NUESTRA.test(String(x.imagen || ""))).map(([id, x]) => ({ id, url: x.imagen })),
    aMano: items.filter(([, x]) => x && !x.respaldo && /^https:\/\//.test(String(x.url || "")) && !NUESTRA.test(String(x.url)))
      .map(([id, x]) => ({ id, titulo: x.titulo || "", url: x.url })),
  };
}
const seguro = (id) => /^[\w-]{1,80}$/.test(String(id || ""));

async function respaldar({ bodega, seco }) {
  if (!bodega || !fs.existsSync(bodega)) throw new Error("falta --bodega <copia de la bodega>");
  const cfg = PROYECTOS.panel;
  const s = await entrar(cfg);
  const obras = (await listar(cfg, s, "proyectos")).filter((p) => p && p.clase === "obra" && seguro(p.id));
  if (!obras.length) { console.log("  No hay obras."); return; }
  for (const o of obras) {
    const dir = path.join(bodega, "obras", o.id);
    const plan = planDeRespaldo(o);
    console.log(`\n  ${o.nombre || o.id}: ${Object.keys((o.obra && o.obra.items) || {}).length} cosas · ${plan.bajar.length} archivo(s) para bajar`);
    if (seco) { for (const x of plan.aMano) console.log(`    · a mano: ${x.titulo} (${x.url})`); continue; }
    fs.mkdirSync(path.join(dir, "archivos"), { recursive: true });
    fs.writeFileSync(path.join(dir, "ficha.json"), JSON.stringify(o, null, 1) + "\n");
    const anotar = [];
    for (const x of plan.bajar) {
      if (!seguro(x.id)) continue;
      try {
        const r = await fetch(x.url);
        if (!r.ok) throw new Error("contestó " + r.status);
        const ext = EXT[(r.headers.get("content-type") || "").split(";")[0]] || "bin";
        const rel = `obras/${o.id}/archivos/${x.id}.${ext}`;
        fs.writeFileSync(path.join(bodega, rel), Buffer.from(await r.arrayBuffer()));
        anotar.push([["obra", "items", x.id, "respaldo"], rel]);
        console.log(`    ✓ ${rel}`);
      } catch (e) { console.log(`    ✖ ${x.id}: ${e.message}`); }
    }
    for (const x of plan.aMano) console.log(`    · sin bajar (pide sesión): ${x.titulo} — respaldalo a mano en obras/${o.id}/`);
    if (anotar.length) await fusionarRutas(cfg, s, "proyectos", o.id, anotar);
  }
  console.log("\n  Falta: commit y push de la bodega.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, ...args] = process.argv;
  const op = (n) => { const i = args.indexOf("--" + n); return i >= 0 ? args[i + 1] : ""; };
  if (cmd !== "respaldar") { console.log("Uso: node herramientas/obras.mjs respaldar --bodega <copia> [--seco]"); process.exit(1); }
  respaldar({ bodega: op("bodega"), seco: args.includes("--seco") }).catch((e) => { console.error("✖ " + e.message); process.exit(1); });
}
