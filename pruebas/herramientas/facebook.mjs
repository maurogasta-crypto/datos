// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/facebook.mjs — Banco de los pedidos de alquiler de
// Facebook que pasan a Casa Verde (herramientas/facebook.mjs, 18-oct-2026).
//
//   node pruebas/herramientas/facebook.mjs
//
// Sin npm ni red. Prueba que el mismo pedido sea siempre el mismo documento,
// que no pase nada que no sea de Facebook, y que el enlace de búsqueda no se
// lleve el «Fulano publicó:» ni signos que confunden a la búsqueda.
// ─────────────────────────────────────────────────────────────────────────────
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { enlaceBusqueda, pedidoDesdeMensaje, pedidoDesdeReporte, leerDeLaBodega, COLECCION } from "../../herramientas/facebook.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

const M = (o = {}) => ({ id: "abc123", app: "facebook", chat: "Aluguel Floripa", texto: "Ana publicou: Busco aluguel em Canasvieiras para janeiro, 4 pessoas!", lineas: [], cuando: "1792300000000", captado: "2026-10-18T12:00:00.000Z", ...o });

prueba("la colección es pedidos_alquiler", () => assert.equal(COLECCION, "pedidos_alquiler"));

prueba("el enlace busca las palabras de la publicación, sin «Fulano publicó:» ni signos", () => {
  const u = enlaceBusqueda("Ana publicou: Busco aluguel em Canasvieiras para janeiro, 4 pessoas!");
  assert.ok(u.startsWith("https://www.facebook.com/search/posts/?q="));
  const q = decodeURIComponent(u.split("q=")[1]);
  assert.equal(q, "Busco aluguel em Canasvieiras para janeiro 4 pessoas");
  assert.equal(enlaceBusqueda(""), "");
  assert.equal(decodeURIComponent(enlaceBusqueda("a ".repeat(40)).split("q=")[1]).split(" ").length, 12);
});

prueba("un mensaje de Facebook es un pedido; uno de Airbnb no", () => {
  const p = pedidoDesdeMensaje(M());
  assert.equal(p.id, "abc123");
  assert.equal(p.datos.grupo, "Aluguel Floripa");
  assert.equal(p.datos.estado, "nuevo");
  assert.equal(p.datos.cuando, 1792300000000);
  assert.ok(p.datos.buscar.includes("Canasvieiras"));
  assert.equal(pedidoDesdeMensaje(M({ app: "airbnb" })), null);
  assert.equal(pedidoDesdeMensaje(M({ id: "" })), null);
});

prueba("las líneas se suman al texto y sin hora sale la de captado", () => {
  const p = pedidoDesdeMensaje(M({ lineas: ["Somos 2", ""], cuando: "" }));
  assert.ok(p.datos.texto.endsWith("Somos 2"));
  assert.equal(p.datos.cuando, Date.parse("2026-10-18T12:00:00.000Z"));
});

prueba("del reporte de Tiempos sale el mismo documento (el id es la huella de la bodega)", () => {
  const r = { id: "rep1", pagina: "facebook-pedido", bodegaId: "abc123", creadoEn: "2026-10-18T12:00:05Z",
    texto: "Pedido de alquiler en Canasvieiras (Facebook). Grupo: Aluguel Floripa.\nAna publicou: Busco aluguel em Canasvieiras" };
  const p = pedidoDesdeReporte(r);
  assert.equal(p.id, "abc123");
  assert.equal(p.datos.grupo, "Aluguel Floripa");
  assert.equal(p.datos.reporte, "rep1");
  assert.ok(p.datos.texto.startsWith("Ana publicou"));
  assert.equal(pedidoDesdeReporte({ ...r, pagina: "pizarra" }), null);
  assert.equal(pedidoDesdeReporte({ ...r, bodegaId: "" }), null);
});

prueba("de la bodega se leen sólo los de Facebook y de los días pedidos", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fb-"));
  fs.mkdirSync(path.join(dir, "mensajes"));
  fs.writeFileSync(path.join(dir, "mensajes", "2026-10-18.json"), JSON.stringify([M(), M({ id: "x", app: "airbnb" })]));
  fs.writeFileSync(path.join(dir, "mensajes", "2026-01-01.json"), JSON.stringify([M({ id: "viejo" })]));
  fs.writeFileSync(path.join(dir, "mensajes", "roto.json"), "{");
  const l = leerDeLaBodega(dir, 30, new Date("2026-10-18T13:00:00Z"));
  assert.deepEqual(l.map((m) => m.id), ["abc123"]);
  fs.rmSync(dir, { recursive: true });
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
