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
import { enlaceBusqueda, pedidoDesdeMensaje, pedidoDesdeReporte, leerDeLaBodega, sinRespuesta, vencidos, enlaceLimpio, pedidoDesdeMail, COLECCION } from "../../herramientas/facebook.mjs";

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

prueba("esperan respuesta los sin atender y sin respuesta, del más viejo al más nuevo", () => {
  const l = sinRespuesta([
    { id: "c", cuando: 3, estado: "nuevo" },
    { id: "a", cuando: 1 },
    { id: "r", cuando: 0, estado: "nuevo", respuesta: "hola" },
    { id: "d", cuando: 2, estado: "respondido" },
    { id: "b", cuando: 2, estado: "nuevo", respuesta: "  " },
  ]);
  assert.deepEqual(l.map((p) => p.id), ["a", "b", "c"]);
});

prueba("se vencen los sin atender de más de N días, y nada sin fecha", () => {
  const dia = 864e5, ahora = 100 * dia;
  const l = vencidos([
    { id: "viejo", cuando: ahora - 8 * dia },
    { id: "nuevo", cuando: ahora - 2 * dia, estado: "nuevo" },
    { id: "hecho", cuando: ahora - 30 * dia, estado: "respondido" },
    { id: "sinfecha", cuando: 0 },
  ], 7, ahora);
  assert.deepEqual(l.map((p) => p.id), ["viejo"]);
});

prueba("el enlace de un mail de Facebook se desenvuelve y pierde el rastreo", () => {
  assert.equal(enlaceLimpio("https://www.facebook.com/nd/?groups%2Falugueltemporadafloripa%2Fposts%2F123%2F&aref=1&n_m=x%40gmail.com"),
    "https://www.facebook.com/groups/alugueltemporadafloripa/posts/123/");
  assert.equal(enlaceLimpio("https://www.facebook.com/groups/g/permalink/9/?n_m=a%40b.com&mid=1"), "https://www.facebook.com/groups/g/permalink/9/");
  assert.equal(enlaceLimpio("https://evil.com/groups/g"), "");
  assert.equal(enlaceLimpio("no es"), "");
});

prueba("un pedido de un mail: id mail-, fuente mail, con enlace y búsqueda", () => {
  const p = pedidoDesdeMail({ id: "mail-1a0c61fe47d802ea", grupo: "alquileres en Florianópolis", texto: "Busco alquiler en Canasvieiras", cuando: 5,
    enlace: "https://www.facebook.com/groups/g/posts/1/?n_m=x" });
  assert.equal(p.datos.fuente, "mail");
  assert.equal(p.datos.enlace, "https://www.facebook.com/groups/g/posts/1/");
  assert.ok(p.datos.buscar.includes("Busco"));
  assert.equal(pedidoDesdeMail({ id: "otro", texto: "x" }), null);
  assert.equal(pedidoDesdeMail({ id: "mail-1a0c61fe47d802ea", texto: " " }), null);
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
