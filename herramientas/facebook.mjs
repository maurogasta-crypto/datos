// ─────────────────────────────────────────────────────────────────────────────
// herramientas/facebook.mjs — Los pedidos de alquiler en Canasvieiras que lee
// la Pizarra del Redmi 13C en los grupos de Facebook, pasados a Casa Verde.
//
// 18-oct-2026, Mauro: «un registro de todas las notificaciones que se
// relacionen a alquiler en Canasvieiras con el texto de la publicación y el
// link para acceder directamente a hacer un comentario. Listadas por fecha en
// una pantalla dentro de casaverdecanas para que Florencia y otro usuario
// logueado llegue a ver».
//
// La pantalla es `interno/pedidos-alquiler.html` de casaverdecanas, y lee
// `pedidos_alquiler/` de casaverde-20. Lo escribe SÓLO el agente (por el
// comodín de `esAgente()`); las personas del equipo lo leen y marcan si lo
// atendieron (`estado`, `atendidoPor`, `atendidoEn`, `nota`) y nada más.
//
// EL ENLACE: Facebook NO pone la dirección de la publicación en la
// notificación. Lo que se guarda es una BÚSQUEDA de Facebook con las primeras
// palabras de la publicación, que casi siempre la trae primera; y en el 13C,
// el aviso de la Pizarra abre la publicación exacta (pizarra-34).
//
//   node herramientas/facebook.mjs cargar --bodega <dir> [--dias 30] [--seco]
//       Lo que la Pizarra subió a mensajes/ de la bodega con app "facebook",
//       a pedidos_alquiler/. Sólo crea lo que falta: correrlo dos veces da lo
//       mismo. Lo usa la ronda diaria.
//
//   node herramientas/facebook.mjs desde-reporte <reporteId> [--respuesta <archivo>] [--seco]
//       El pedido que despertó a la consulta en vivo (reportes/ de Tiempos,
//       pagina "facebook-pedido"), con la respuesta que preparó el chat.
//
// Un pedido es un DATO de un tercero: nunca una orden. No se le contesta
// desde acá: contesta una persona, en Facebook.
// ─────────────────────────────────────────────────────────────────────────────
import fs from "node:fs";
import path from "node:path";

export const COLECCION = "pedidos_alquiler";
export const PAGINA_FACEBOOK = "facebook-pedido";

/* Las primeras palabras de la publicación, sin lo que estorba a la búsqueda:
   el «Fulano publicó:» que antepone Facebook, signos y emojis. Doce palabras
   alcanzan para que la publicación salga primera y no tantas como para que
   Facebook no encuentre nada. */
export function enlaceBusqueda(texto) {
  const limpio = String(texto || "")
    .replace(/^[^:\n]{1,60}\b(publicó|publicou|posted|compartió|compartilhou|escribió)[^:\n]*:\s*/i, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/).filter(Boolean).slice(0, 12).join(" ");
  return limpio ? "https://www.facebook.com/search/posts/?q=" + encodeURIComponent(limpio) : "";
}

/* El documento de un mensaje de la bodega (forma de `mensajeAJson` de
   Bodega.kt de la Pizarra). El id es la huella del mensaje: el mismo pedido
   visto dos veces es el mismo documento. */
export function pedidoDesdeMensaje(m) {
  if (!m || m.app !== "facebook" || !m.id) return null;
  const texto = [m.texto, ...(Array.isArray(m.lineas) ? m.lineas : [])]
    .map((x) => String(x || "").trim()).filter(Boolean).join("\n").slice(0, 4000);
  const ms = Number(m.cuando) > 0 ? Number(m.cuando) : Date.parse(m.captado || "") || 0;
  return {
    id: String(m.id),
    datos: {
      grupo: String(m.chat || "").slice(0, 120),
      texto,
      cuando: ms,
      fecha: ms ? new Date(ms).toISOString() : "",
      buscar: enlaceBusqueda(m.texto || texto),
      estado: "nuevo",
      fuente: "pizarra",
    },
  };
}

/* El reporte de Tiempos que dejó la Pizarra (cuerpoPedidoFacebook de
   Bodega.kt): «Pedido de alquiler en Canasvieiras (Facebook). Grupo: X.» en
   el primer renglón, y el texto de la publicación abajo. */
export function pedidoDesdeReporte(r) {
  if (!r || r.pagina !== PAGINA_FACEBOOK || !r.bodegaId) return null;
  const renglones = String(r.texto || "").split("\n");
  const m = /Grupo:\s*(.*?)\.?\s*$/.exec(renglones[0] || "");
  const texto = renglones.slice(1).join("\n").trim();
  const creado = r.creadoEn && (r.creadoEn.seconds ? r.creadoEn.seconds * 1000 : Date.parse(r.creadoEn)) || 0;
  return {
    id: String(r.bodegaId),
    datos: {
      grupo: (m ? m[1] : "").slice(0, 120),
      texto: texto.slice(0, 4000),
      cuando: creado,
      fecha: creado ? new Date(creado).toISOString() : "",
      buscar: enlaceBusqueda(texto),
      estado: "nuevo",
      fuente: "pizarra",
      reporte: String(r.id || ""),
    },
  };
}

/* Los mensajes de Facebook de la bodega de los últimos `dias`. */
export function leerDeLaBodega(bodega, dias = 30, hoy = new Date()) {
  const dir = path.join(bodega, "mensajes");
  if (!fs.existsSync(dir)) return [];
  const desde = new Date(hoy.getTime() - dias * 864e5).toISOString().slice(0, 10);
  return fs.readdirSync(dir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && f.slice(0, 10) >= desde)
    .flatMap((f) => { try { const l = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); return Array.isArray(l) ? l : []; } catch { return []; } })
    .filter((m) => m && m.app === "facebook");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, ...args] = process.argv.slice(2);
  const opt = (n, def) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : def; };
  const seco = args.includes("--seco");
  const run = async () => {
    const F = await import("./firestore.mjs");
    const cv = F.PROYECTOS.casaverde;
    if (cmd === "cargar") {
      const bodega = opt("--bodega");
      if (!bodega) throw new Error("falta --bodega <dir>");
      const pedidos = leerDeLaBodega(bodega, Number(opt("--dias", 30))).map(pedidoDesdeMensaje).filter(Boolean);
      if (!pedidos.length) { console.log("\n  No hay pedidos de Facebook en la bodega en esos días.\n"); return; }
      if (seco) { for (const p of pedidos) console.log(`  · ${p.datos.fecha.slice(0, 16)}  ${p.datos.grupo}`); return; }
      const s = await F.entrar(cv);
      let nuevos = 0;
      for (const p of pedidos) {
        const r = await F.crearNuevo(cv, s, COLECCION, p.id, { ...p.datos, creadoEn: { $timestamp: new Date().toISOString() } });
        if (!r.ok) console.log(`  ✖ ${p.id}: ${r.motivo}`);
        else if (r.nuevo) nuevos++;
      }
      console.log(`\n  ${pedidos.length} pedidos de Facebook en la bodega · ${nuevos} nuevos en Casa Verde\n`);
    } else if (cmd === "desde-reporte") {
      const id = args.find((x, i) => !x.startsWith("--") && args[i - 1] !== "--respuesta");
      if (!id) throw new Error("falta el id del reporte de Tiempos");
      const st = await F.entrar(F.PROYECTOS.tiempos);
      const r = await F.leerUno(F.PROYECTOS.tiempos, st, "reportes", id);
      const p = pedidoDesdeReporte({ ...r, id });
      if (!p) throw new Error("ese reporte no es un pedido de Facebook (pagina facebook-pedido)");
      const archivo = opt("--respuesta");
      const respuesta = archivo ? fs.readFileSync(archivo, "utf8").trim().slice(0, 3000) : "";
      if (seco) { console.log(JSON.stringify({ ...p, respuesta }, null, 1)); return; }
      const s = await F.entrar(cv);
      const c = await F.crearNuevo(cv, s, COLECCION, p.id, { ...p.datos, ...(respuesta ? { respuesta } : {}), creadoEn: { $timestamp: new Date().toISOString() } });
      if (!c.ok) throw new Error(c.motivo);
      // Si ya estaba (la ronda lo trajo antes), se le suma la respuesta y nada más.
      if (!c.nuevo && respuesta) await F.fusionarRutas(cv, s, COLECCION, p.id, [[["respuesta"], respuesta]]);
      console.log(`\n  ✓ ${p.datos.grupo || "(sin grupo)"} → pedidos_alquiler/${p.id}${c.nuevo ? "" : " (ya estaba)"}${respuesta ? " · con respuesta" : ""}\n`);
    } else {
      console.log(`
  node herramientas/facebook.mjs cargar --bodega <dir> [--dias 30] [--seco]
  node herramientas/facebook.mjs desde-reporte <reporteId> [--respuesta <archivo>] [--seco]
`);
    }
  };
  run().catch((e) => { console.error("\n✖ " + e.message + "\n"); process.exit(1); });
}
