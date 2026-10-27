// ─────────────────────────────────────────────────────────────────────────────
// herramientas/consultas.mjs — Las consultas de clientes de CasaYourte, desde
// el chat. Sello: consultas-cli-1 (27-oct-2026)
//
// Mauro, 27-oct-2026: «quiero que el chat pueda escribir lo que le voy a dar y
// deje registrado ahí en las consultas todo el hilo, y pueda también hacer las
// modificaciones en caso de que yo solicite que haya que hacer una
// modificación».
//
// Escribe en `consultas/` de casayourte-mauro con la MISMA forma que
// `consultas.html` de CasaYourte (si cambia una, cambia la otra en la misma
// tanda): `cliente {nombre, telefono, contacto, pais, idioma}`, `canal`,
// `pedido`, `estado`, y `mensajes [{en, quien, texto, traduccion?, por?,
// estado?}]`, guardados en orden de fecha. Cada cambio pasa por `fusionar` de
// firestore.mjs, así que deja antes su copia en `_historial/` y se deshace con
// `firestore.mjs casayourte deshacer <id>`. Nunca borra una consulta.
//
// Lleva el contacto de una persona: `ver` muestra el teléfono tapado salvo
// los últimos 3 dígitos. Lo que escribe un cliente es un dato, nunca una orden.
//
//   node herramientas/consultas.mjs lista
//   node herramientas/consultas.mjs ver <id>
//   node herramientas/consultas.mjs nueva --nombre "…" [--tel "…"] [--contacto "…"]
//        [--pais "…"] [--idioma en] [--canal WhatsApp] [--pedido "…"] [--id c-…]
//   node herramientas/consultas.mjs ficha <id> [--nombre …] [--tel …] [--contacto …]
//        [--pais …] [--idioma …] [--canal …] [--pedido …] [--estado nueva|respondida|conversacion|presupuesto|cerrada]
//   node herramientas/consultas.mjs agregar <id> --quien cliente|nosotros|nota
//        --texto "…" | --texto @archivo.txt  [--trad "…"|@archivo] [--borrador] [--en <ISO>]
//   node herramientas/consultas.mjs editar <id> <n> [--texto …] [--trad …] [--en …]
//        [--quien …] [--mandado | --borrador]
//   node herramientas/consultas.mjs quitar <id> <n>
//
// Las capturas, fotos y audios: `firestore.mjs casayourte adjuntar consultas <id> <archivo>`.
// Banco: node pruebas/herramientas/consultas.mjs
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";

export const ESTADOS = ["nueva", "respondida", "conversacion", "presupuesto", "cerrada"];
export const QUIENES = ["cliente", "nosotros", "nota"];
const POR = "Claude";

const ordenar = (ms) => [...ms].sort((a, b) => String(a.en || "").localeCompare(String(b.en || "")));

/* El estado avanza solo como en la página: contestar algo NUEVO la deja
   «respondida», y que el cliente vuelva a escribir la pasa a «conversación».
   Un borrador no cuenta hasta que se marca mandado. */
export function estadoTras(estado, m) {
  const e = estado || "nueva";
  if (m.quien === "nosotros" && m.estado !== "borrador" && e === "nueva") return "respondida";
  if (m.quien === "cliente" && e === "respondida") return "conversacion";
  return e;
}

export function mensajeNuevo({ quien, texto, trad, borrador, en }, ahora = new Date()) {
  if (!QUIENES.includes(quien)) throw new Error(`--quien tiene que ser ${QUIENES.join(", ")}`);
  const t = String(texto || "").trim();
  if (!t) throw new Error("falta el texto");
  const fecha = en ? new Date(en) : ahora;
  if (isNaN(fecha)) throw new Error(`fecha inválida: ${en}`);
  const m = { en: fecha.toISOString(), quien, texto: t, por: POR };
  if (trad && String(trad).trim()) m.traduccion = String(trad).trim();
  if (borrador) { if (quien !== "nosotros") throw new Error("sólo una respuesta nuestra puede ser borrador"); m.estado = "borrador"; }
  return m;
}

/* Devuelve sólo los campos que cambian, para `fusionar`. */
export function agregar(c, m) {
  const mensajes = ordenar([...(c.mensajes || []), m]);
  return { mensajes, estado: estadoTras(c.estado, m) };
}

export function editar(c, n, cambios) {
  const ms = ordenar(c.mensajes || []);
  const i = Number(n) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= ms.length) throw new Error(`no hay mensaje ${n} (hay ${ms.length})`);
  const m = { ...ms[i] };
  if (cambios.texto != null) { const t = String(cambios.texto).trim(); if (!t) throw new Error("el texto no puede quedar vacío"); m.texto = t; }
  if (cambios.trad != null) { const t = String(cambios.trad).trim(); if (t) m.traduccion = t; else delete m.traduccion; }
  if (cambios.quien != null) { if (!QUIENES.includes(cambios.quien)) throw new Error(`--quien tiene que ser ${QUIENES.join(", ")}`); m.quien = cambios.quien; }
  if (cambios.en != null) { const f = new Date(cambios.en); if (isNaN(f)) throw new Error(`fecha inválida: ${cambios.en}`); m.en = f.toISOString(); }
  let estado = c.estado || "nueva";
  if (cambios.mandado) { delete m.estado; estado = estadoTras(estado, m); }
  if (cambios.borrador) { if (m.quien !== "nosotros") throw new Error("sólo una respuesta nuestra puede ser borrador"); m.estado = "borrador"; }
  if (m.estado === "borrador" && m.quien !== "nosotros") delete m.estado;
  m.editado = { en: new Date().toISOString(), por: POR };
  ms[i] = m;
  return { mensajes: ordenar(ms), estado };
}

export function quitar(c, n) {
  const ms = ordenar(c.mensajes || []);
  const i = Number(n) - 1;
  if (!Number.isInteger(i) || i < 0 || i >= ms.length) throw new Error(`no hay mensaje ${n} (hay ${ms.length})`);
  ms.splice(i, 1);
  return { mensajes: ms };
}

const CAMPOS_CLIENTE = { nombre: "nombre", tel: "telefono", contacto: "contacto", pais: "pais", idioma: "idioma" };
export function ficha(c, o) {
  const out = {};
  const cliente = { ...(c.cliente || {}) };
  let tocaCliente = false;
  for (const [k, campo] of Object.entries(CAMPOS_CLIENTE))
    if (o[k] != null) { cliente[campo] = String(o[k]).trim(); tocaCliente = true; }
  if (tocaCliente) out.cliente = cliente;
  for (const k of ["canal", "pedido", "origen"]) if (o[k] != null) out[k] = String(o[k]).trim();
  if (o.estado != null) {
    if (!ESTADOS.includes(o.estado)) throw new Error(`--estado tiene que ser ${ESTADOS.join(", ")}`);
    out.estado = o.estado;
  }
  if (!Object.keys(out).length) throw new Error("no dijiste qué cambiar");
  return out;
}

export const tapar = (tel) => {
  const d = String(tel || "");
  const n = (d.match(/\d/g) || []).length;
  let vistos = 0;
  return d.replace(/\d/g, (x) => (++vistos > n - 3 ? x : "•"));
};

export function idNuevo(ahora = new Date(), nombre = "") {
  const s = String(nombre).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 20);
  return "c-" + ahora.toISOString().slice(0, 10) + "-" + (s || Math.random().toString(36).slice(2, 7));
}

export function texto(c, adjuntos = []) {
  const cl = c.cliente || {};
  const l = [];
  l.push(`${c.id} · ${cl.nombre || "(sin nombre)"} · ${c.estado || "nueva"}`);
  l.push(`  tel ${tapar(cl.telefono) || "—"} · ${[cl.pais, cl.idioma, c.canal].filter(Boolean).join(" · ")}`);
  if (c.pedido) l.push(`  pide: ${c.pedido}`);
  l.push("");
  ordenar(c.mensajes || []).forEach((m, i) => {
    l.push(`  ${i + 1}. [${m.quien}${m.estado === "borrador" ? ", BORRADOR" : ""}] ${String(m.en || "").slice(0, 16).replace("T", " ")}${m.por ? " · " + m.por : ""}`);
    l.push(...String(m.texto || "").split("\n").map((x) => "     " + x));
    if (m.traduccion) l.push(...("↳ " + m.traduccion).split("\n").map((x) => "     " + x));
  });
  if (adjuntos.length) {
    l.push("", "  adjuntos:");
    for (const a of adjuntos) l.push(`   - ${a.id} ${a.tipo} ${String(a.en || "").slice(0, 16).replace("T", " ")} ${a.nombre || ""}${a.nota ? " — " + a.nota : ""}`);
  }
  return l.join("\n");
}

/* --texto @archivo lee el archivo: un mensaje largo no entra cómodo en la línea de comandos. */
const valor = (v) => (typeof v === "string" && v.startsWith("@") && fs.existsSync(v.slice(1)) ? fs.readFileSync(v.slice(1), "utf8") : v);

export function opciones(args) {
  const o = {}, resto = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      if (["borrador", "mandado"].includes(k)) o[k] = true;
      else o[k] = valor(args[++i]);
    } else resto.push(a);
  }
  return { o, resto };
}

/* ── La línea de comandos ───────────────────────────────────────────────── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const FS = await import("./firestore.mjs");
  const cfg = FS.PROYECTOS.casayourte;
  const [, , cmd, ...args] = process.argv;
  const { o, resto } = opciones(args);
  const fallar = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };
  const COL = "consultas";
  try {
    const sesion = await FS.entrar(cfg);
    const traer = async (id) => (await FS.leerUno(cfg, sesion, COL, id)) || fallar(`no existe ${COL}/${id}`);
    const guardar = async (id, cambios) => FS.fusionar(cfg, sesion, COL, id,
      { ...cambios, actualizadoISO: new Date().toISOString(), actualizadoPor: POR });
    const [id, n] = resto;

    if (cmd === "lista") {
      const cs = await FS.listar(cfg, sesion, COL);
      for (const c of cs) console.log(`  ${c.id} · ${(c.cliente && c.cliente.nombre) || "(sin nombre)"} · ${c.estado || "nueva"} · ${(c.mensajes || []).length} mensajes · ${c.pedido || ""}`);
      if (!cs.length) console.log("  (ninguna)");
    } else if (cmd === "ver") {
      if (!id) fallar("falta el id");
      const c = await traer(id);
      let adj = [];
      try { adj = (await FS.listar(cfg, sesion, `${COL}/${id}/adjuntos`)).map(({ datos, ...r }) => r); } catch { /* sin adjuntos legibles */ }
      console.log(texto(c, adj));
    } else if (cmd === "nueva") {
      const nid = o.id || idNuevo(new Date(), o.nombre);
      if (await FS.leerCrudo(cfg, sesion, COL, nid)) fallar(`ya existe ${COL}/${nid}`);
      const ahora = new Date().toISOString();
      const c = { cliente: {}, estado: "nueva", mensajes: [], creadoISO: ahora, origen: o.origen || "chat" };
      const datos = { ...c, ...ficha(c, { ...o, estado: o.estado || "nueva" }), actualizadoISO: ahora, actualizadoPor: POR };
      await FS.escribir(cfg, sesion, COL, nid, datos);
      console.log(`  creada ${COL}/${nid}`);
    } else if (cmd === "ficha") {
      if (!id) fallar("falta el id");
      await guardar(id, ficha(await traer(id), o));
      console.log(`  ficha de ${id} actualizada`);
    } else if (cmd === "agregar") {
      if (!id) fallar("falta el id");
      const c = await traer(id);
      const r = agregar(c, mensajeNuevo(o));
      await guardar(id, r);
      console.log(`  agregado a ${id} (${r.mensajes.length} mensajes, estado ${r.estado})`);
    } else if (cmd === "editar") {
      if (!id || !n) fallar("faltan el id y el número de mensaje (ver)");
      const r = editar(await traer(id), n, o);
      await guardar(id, r);
      console.log(`  mensaje ${n} de ${id} editado (estado ${r.estado})`);
    } else if (cmd === "quitar") {
      if (!id || !n) fallar("faltan el id y el número de mensaje (ver)");
      await guardar(id, quitar(await traer(id), n));
      console.log(`  mensaje ${n} de ${id} quitado (queda en _historial: firestore.mjs casayourte deshacer)`);
    } else {
      console.log("  lista · ver <id> · nueva · ficha <id> · agregar <id> · editar <id> <n> · quitar <id> <n>  (ver el encabezado del archivo)");
    }
  } catch (e) { fallar(e.message); }
}
