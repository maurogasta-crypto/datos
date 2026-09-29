// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/firestore.mjs — Banco de la herramienta de Firestore.
//
//   node pruebas/herramientas/firestore.mjs
//
// Sin dependencias y sin red: `globalThis.fetch` se reemplaza por una Firestore
// de mentira que guarda en memoria. Lo que se prueba es lo que puede salir mal
// de verdad: que la traducción de tipos no pierda datos, que un documento se
// pueda ACHICAR, y sobre todo que lo sellado no se toque — en las cuatro bases,
// que no sellan lo mismo.
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";

let pasadas = 0, fallidas = 0;
const prueba = async (n, f) => {
  try { await f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); }
};
const titulo = (t) => console.log("\n" + t);

const CLAVE_FALSA = "clave-de-prueba-no-real";
process.env.FB_AGENTE_MAIL = "agente@ejemplo.invalido";
process.env.FB_AGENTE_CLAVE = CLAVE_FALSA;
delete process.env.FB_PANEL_MAIL;
delete process.env.FB_PANEL_CLAVE;

/* ── La nube de mentira ──────────────────────────────────────────────────── */
const BASE = {};                 // { coleccion: { id: {fields} } }
let ultimoLogin = null;
/* Lo que la BASE niega, con independencia del guardia. Es la cerradura de
   mentira: sirve para comprobar que las dos capas existen.

   Tiene que decir lo MISMO que las reglas publicadas. Hasta el 2026-09-13 acá
   decía `["claves", "fichas"]`, que era la v3, y eso escondía un verde falso:
   la prueba de «fichas está sellada» pasaba porque la base de mentira decía que
   no, no porque el guardia frenara. Cuando la v4 le devolvió `fichas` al
   equipo, el guardia dejó de frenarla y la prueba SIGUIÓ pasando — lo que se
   rompió fue otra, la del respaldo. Una prueba que pasa por el motivo
   equivocado es peor que una que falla. */
const NIEGA_LA_BASE = ["claves"];
/* Para probar que sin copia no hay cambio: se puede hacer que la base niegue
   el historial. */
let niegaHistorial = false;
globalThis.fetch = async (url, op = {}) => {
  const u = String(url);
  const ok = (j) => ({ ok: true, status: 200, json: async () => j });
  const mal = (c, m) => ({ ok: false, status: c, json: async () => ({ error: { message: m } }) });

  if (u.includes("identitytoolkit")) {
    ultimoLogin = JSON.parse(op.body);
    if (ultimoLogin.password !== CLAVE_FALSA) return mal(400, "INVALID_LOGIN_CREDENTIALS");
    return ok({ idToken: "tok-de-prueba", localId: "uid-agente", email: ultimoLogin.email });
  }

  /* Sin el token no se contesta nada: es lo que hace la base de verdad. */
  if ((op.headers || {}).Authorization !== "Bearer tok-de-prueba") return mal(401, "sin token");

  const ruta = u.split("/documents")[1].split("?")[0];
  const [, col, id] = ruta.split("/");
  if (NIEGA_LA_BASE.includes(col) || (niegaHistorial && col === "_historial"))
    return mal(403, "Missing or insufficient permissions.");

  if (!id) {
    const m = BASE[col] || {};
    return ok({ documents: Object.entries(m).map(([k, f]) => ({ name: "x/y/" + col + "/" + k, fields: f })) });
  }
  if (op.method === "DELETE") { delete (BASE[col] || {})[id]; return ok({}); }
  if (op.method === "PATCH") {
    (BASE[col] ||= {})[id] = JSON.parse(op.body).fields;   // REEMPLAZA, no mezcla
    return ok({});
  }
  const d = (BASE[col] || {})[id];
  return d ? ok({ name: "x/y/" + col + "/" + id, fields: d }) : { ok: false, status: 404, json: async () => ({}) };
};

const { PROYECTOS, MAIL_COMPARTIDO, CLAVE_COMPARTIDA, MAIL_HEREDADO, CLAVE_HEREDADA, credenciales,
        entrar, entrarSuave, listar, leerUno, escribir, fusionar, borrar, aFirestore, deFirestore,
        deshacer, HISTORIAL } =
  await import("../../herramientas/firestore.mjs");
const cfg = PROYECTOS.panel;

/* Corta la salida del guardia (llama a process.exit) y contesta si cortó. */
const salidaReal = process.exit;
async function frena(fn) {
  let corto = false;
  process.exit = () => { corto = true; throw new Error("__guardia__"); };
  try { await fn(); } catch (e) { if (e.message !== "__guardia__") throw e; }
  finally { process.exit = salidaReal; }
  return corto;
}

titulo("Entrar");
const sesion = await entrar(cfg);
await prueba("entra y devuelve el UID, que es lo que va en las reglas", () => {
  assert.equal(sesion.uid, "uid-agente");
});
await prueba("manda la contraseña al login y NO la guarda en la sesión", () => {
  assert.equal(ultimoLogin.password, CLAVE_FALSA);
  assert.ok(!JSON.stringify(sesion).includes(CLAVE_FALSA), "la clave quedó en la sesión");
});

/* ── Una base que no deja entrar NO puede voltear la corrida ──────────────
   Entró el 2026-09-20 y cubre una falla que pasó de verdad. `entrar` termina
   en `ex()`, que hace `process.exit(1)`, y eso **no se atrapa con try/catch**:
   la ronda tenía uno alrededor de su login por base y no servía para nada. El
   19-sep entró `hilux` a `PROYECTOS` sin que el usuario del agente estuviera
   dado de alta en esa base, y la ronda diaria dejó de correr entera, sin
   imprimir una sola línea del panel.

   Se prueban las DOS mitades, porque arreglar una rompiendo la otra sería peor:
   que `entrarSuave` informe sin cortar, y que `entrar` siga cortando —en la
   línea de comandos, morir con un mensaje claro es lo correcto. */
titulo("Una base que no deja entrar");
await prueba("entrarSuave contesta ok con la sesión adentro", async () => {
  const e = await entrarSuave(cfg);
  assert.equal(e.ok, true);
  assert.equal(e.sesion.uid, "uid-agente");
  assert.equal(e.motivo, "");
});
await prueba("entrarSuave INFORMA y no corta cuando la base dice que no", async () => {
  process.env.FB_AGENTE_CLAVE = "otra-que-no-es";
  try {
    const e = await entrarSuave(cfg);
    assert.equal(e.ok, false, "dijo que sí con la clave equivocada");
    assert.equal(e.sesion, null);
    assert.ok(e.motivo.includes("INVALID_LOGIN_CREDENTIALS"), "el motivo no dice qué pasó");
    assert.ok(e.motivo.includes("ACCESO-A-LAS-BASES"), "no explica cómo darse de alta");
  } finally { process.env.FB_AGENTE_CLAVE = CLAVE_FALSA; }
});
await prueba("y el motivo NO trae la contraseña que se mandó", async () => {
  process.env.FB_AGENTE_CLAVE = "otra-que-no-es";
  try {
    const e = await entrarSuave(cfg);
    assert.ok(!e.motivo.includes("otra-que-no-es"), "la clave se coló en el mensaje");
  } finally { process.env.FB_AGENTE_CLAVE = CLAVE_FALSA; }
});
await prueba("entrar, el de la línea de comandos, SIGUE cortando", async () => {
  process.env.FB_AGENTE_CLAVE = "otra-que-no-es";
  try { assert.ok(await frena(() => entrar(cfg)), "no cortó"); }
  finally { process.env.FB_AGENTE_CLAVE = CLAVE_FALSA; }
});

titulo("Un solo usuario para las cuatro bases");
await prueba("sin variable propia, usa el par compartido", () => {
  assert.equal(credenciales(cfg).mail, "agente@ejemplo.invalido");
  assert.equal(credenciales(PROYECTOS.casaverde).mail, "agente@ejemplo.invalido");
});
await prueba("la variable propia del proyecto le gana a la compartida", () => {
  process.env[cfg.mail] = "solo-para-el-panel@ejemplo.invalido";
  try { assert.equal(credenciales(cfg).mail, "solo-para-el-panel@ejemplo.invalido"); }
  finally { delete process.env[cfg.mail]; }
});
await prueba("los nombres compartidos son los que dice la documentación", () => {
  assert.equal(MAIL_COMPARTIDO, "FB_AGENTE_MAIL");
  assert.equal(CLAVE_COMPARTIDA, "FB_AGENTE_CLAVE");
  assert.equal(MAIL_HEREDADO, "FB_PANEL_MAIL");
  assert.equal(CLAVE_HEREDADA, "FB_PANEL_CLAVE");
});
await prueba("con SÓLO el par viejo, las cuatro bases entran igual", () => {
  /* Es el caso real de Mauro: cargó FB_PANEL_* cuando la única base era el
     panel, y no tiene por qué volver a escribir lo mismo con otro nombre. */
  const mail = process.env[MAIL_COMPARTIDO], clave = process.env[CLAVE_COMPARTIDA];
  delete process.env[MAIL_COMPARTIDO]; delete process.env[CLAVE_COMPARTIDA];
  process.env[MAIL_HEREDADO] = "el-de-siempre@ejemplo.invalido";
  process.env[CLAVE_HEREDADA] = CLAVE_FALSA;
  try {
    for (const p of Object.values(PROYECTOS)) {
      assert.equal(credenciales(p).mail, "el-de-siempre@ejemplo.invalido");
      assert.equal(credenciales(p).clave, CLAVE_FALSA);
    }
  } finally {
    delete process.env[MAIL_HEREDADO]; delete process.env[CLAVE_HEREDADA];
    process.env[MAIL_COMPARTIDO] = mail; process.env[CLAVE_COMPARTIDA] = clave;
  }
});
await prueba("y si están los dos pares, gana el nombre bueno", () => {
  process.env[MAIL_HEREDADO] = "el-viejo@ejemplo.invalido";
  try { assert.equal(credenciales(PROYECTOS.remate).mail, "agente@ejemplo.invalido"); }
  finally { delete process.env[MAIL_HEREDADO]; }
});
/* La ÚNICA base que no sella ninguna colección, y está acá con nombre para
   que sea una decisión y no un olvido. En `hilux` no hay nada que sellar: no
   hay credenciales, no hay datos de terceros, y el recorrido —lo único
   sensible del proyecto— NO sube: lo que llega a esa base es el reporte sin
   coordenadas, el mismo que se puede mandar por un chat.

   Si algún día sube algo más, deja de estar exenta y sella lo que
   corresponda. */
// `tiempos` tampoco sella por colección: lo personal es por CAMPO (una tarea
// «personal»), y eso sólo lo puede cortar la regla, no una lista.
const SIN_NADA_QUE_SELLAR = new Set(["hilux"]);

await prueba("las seis bases están, y ninguna comparte projectId con otra", () => {
  const ids = Object.values(PROYECTOS).map((p) => p.projectId);
  assert.equal(ids.length, 6);
  assert.equal(new Set(ids).size, 6);
  for (const [n, p] of Object.entries(PROYECTOS)) {
    assert.ok(p.apiKey && p.projectId, `${n} sin identificadores`);
    if (!SIN_NADA_QUE_SELLAR.has(n)) {
      assert.ok(p.selladas.length > 0, `${n} no sella nada — revisar a propósito`);
    }
    assert.ok(p.colecciones.length > 0, `${n} sin colecciones para bajar`);
  }
});

await prueba("hilux no sella nada, y el recorrido SÍ se baja — cambió el 2026-09-21", () => {
  const h = PROYECTOS.hilux;
  assert.deepEqual(h.selladas, []);
  /* Las tres colecciones y ninguna más: si alguien agrega una cuarta, tiene
     que venir acá y decidir si sella.

     **`recorridos` entró el 2026-09-21 y esta prueba decía lo contrario.**
     Su nombre era «hilux no sella nada PORQUE EL RECORRIDO NO SUBE», que era
     cierto y era la regla de fondo de ese proyecto: dónde estuvo la camioneta
     no salía del teléfono por ningún canal. Mauro la dio vuelta a propósito
     —«por más que haya puntos o coordenadas»— para poder cruzar todos los
     datos desde el chat en esta etapa.

     Se deja escrito acá y no sólo en el `CLAUDE.md` de hilux porque es
     exactamente el tipo de cambio que alguien deshace de buena fe creyendo
     que fue un descuido. Si algún día se quiere volver a sellar, se agrega
     "recorridos" a `selladas` Y se le saca el `allow read` al agente en el
     `firestore.rules` de ese proyecto: el archivo da el mensaje claro, la
     regla da la garantía. */
  assert.deepEqual(h.colecciones, ["reportes", "recorridos", "analisis"]);
});
await prueba("ninguna colección de `bajar` está sellada — el respaldo no se cuelga", async () => {
  for (const [n, p] of Object.entries(PROYECTOS)) {
    for (const c of p.colecciones) {
      const corto = await frena(async () => listar(p, sesion, c));
      assert.ok(!corto, `${n}: «${c}» está en colecciones Y en selladas`);
    }
  }
});

titulo("La traducción de tipos, que es donde se pierden datos en silencio");
await prueba("ida y vuelta sin pérdida, con los tipos que usa el panel", () => {
  const original = {
    titulo: "Una ficha", orden: 6, activo: true, vacio: null,
    campos: [{ clave: "a", valor: "1" }, { clave: "b", valor: "2" }],
    tecnica: [{ clave: "Repositorio", valor: "x/y", nota: "colaborador" }]
  };
  assert.deepEqual(deFirestore(aFirestore(original)), original);
});
await prueba("un entero no se convierte en texto ni al revés", () => {
  assert.equal(deFirestore(aFirestore(99)), 99);
  assert.equal(deFirestore(aFirestore("99")), "99");
});
await prueba("un arreglo vacío sigue siendo un arreglo vacío", () => {
  assert.deepEqual(deFirestore(aFirestore({ esperaA: [] })), { esperaA: [] });
});

titulo("Escribir, leer y ACHICAR");
await prueba("lo que se escribe se lee igual", async () => {
  await escribir(cfg, sesion, "pendientes", "p1",
    { titulo: "Uno", estado: "abierto", historia: [{ fecha: "2026-09-11", texto: "nace" }] });
  const leido = await leerUno(cfg, sesion, "pendientes", "p1");
  assert.equal(leido.id, "p1");
  assert.equal(leido.historia[0].texto, "nace");
});
await prueba("escribir REEMPLAZA: un campo que se sacó desaparece", async () => {
  await escribir(cfg, sesion, "pendientes", "p1", { titulo: "Uno", estado: "hecho" });
  const leido = await leerUno(cfg, sesion, "pendientes", "p1");
  assert.ok(!("historia" in leido), "la historia sobrevivió a una escritura que no la traía");
});
await prueba("listar trae todo con su id", async () => {
  await escribir(cfg, sesion, "pendientes", "p2", { titulo: "Dos" });
  const todos = await listar(cfg, sesion, "pendientes");
  assert.deepEqual(todos.map((x) => x.id).sort(), ["p1", "p2"]);
});
await prueba("un documento que no existe da null, no un error", async () => {
  assert.equal(await leerUno(cfg, sesion, "pendientes", "no-existe"), null);
});
await prueba("borrar borra", async () => {
  await borrar(cfg, sesion, "pendientes", "p2");
  assert.equal(await leerUno(cfg, sesion, "pendientes", "p2"), null);
});

titulo("La bóveda — lo único que no se negocia");
/* El guardia corta ANTES de la red. Si no cortara, la nube de mentira también
   lo negaría: las dos capas tienen que estar, y la de abajo es la que manda. */
for (const [nombre, fn] of [
  ["leer", () => leerUno(cfg, sesion, "claves", "x")],
  ["listar", () => listar(cfg, sesion, "claves")],
  ["escribir", () => escribir(cfg, sesion, "claves", "x", { a: 1 })],
  ["borrar", () => borrar(cfg, sesion, "claves", "x")]
]) {
  await prueba(`${nombre} en «claves» se frena antes de salir a la red`, async () => {
    assert.ok(await frena(fn), "el guardia dejó pasar una colección sellada");
  });
}
await prueba("y una subcolección de claves tampoco pasa", async () => {
  assert.ok(await frena(() => leerUno(cfg, sesion, "claves/x/historial", "y")));
});
await prueba("«fichas» NO está sellada: la administra el agente desde la v4", async () => {
  /* Esto decía lo contrario hasta el 2026-09-13, y el cambio es a propósito.
     La v3 selló `fichas` con el criterio del RIESGO —«la colección donde una
     credencial PUEDE aparecer»—, que es inaplicable: con eso cualquier
     colección termina sellada, y en nueve días dejó las fichas sin que nadie
     las mantuviera. La v4 sella por PROPÓSITO: ¿abre algo? va en `claves`.

     Si alguien vuelve a sellar `fichas` «por precaución», esta prueba falla y
     el comentario de arriba le dice por qué no. Lo que no se toca es `claves`,
     y de eso se ocupan las cuatro pruebas de más arriba. */
  assert.ok(!(await frena(() => listar(cfg, sesion, "fichas"))), "`fichas` se frenó y no debía");
  assert.ok(!(await frena(() => leerUno(cfg, sesion, "fichas", "x"))));
  assert.ok(!(await frena(() => escribir(cfg, sesion, "fichas", "x", { a: 1 }))));
  /* Y que la escritura haya llegado de verdad, no que sólo no se haya frenado. */
  assert.equal((await leerUno(cfg, sesion, "fichas", "x")).a, 1);
});
await prueba("las colecciones que NO están selladas sí pasan", async () => {
  for (const c of ["proyectos", "pendientes", "protocolos", "tandas", "fichas"]) {
    assert.ok(!(await frena(() => listar(cfg, sesion, c))), `«${c}» se frenó y no debía`);
  }
});

titulo("Un sello puede ser un documento suelto, no sólo una colección");
const cv = PROYECTOS.casaverde;
await prueba("config/integraciones está sellada — guarda claves de terceros", async () => {
  assert.ok(await frena(() => leerUno(cv, sesion, "config", "integraciones")));
  assert.ok(await frena(() => escribir(cv, sesion, "config", "integraciones", { a: 1 })));
});
await prueba("listar «config» entero también se frena: traería ese documento", async () => {
  assert.ok(await frena(() => listar(cv, sesion, "config")));
});
await prueba("pero config/sitio se puede leer: no es lo sellado", async () => {
  assert.ok(!(await frena(() => leerUno(cv, sesion, "config", "sitio"))));
});
await prueba("y lo que cuelga de un documento sellado tampoco pasa", async () => {
  assert.ok(await frena(() => listar(cv, sesion, "config/integraciones/historial")));
});

titulo("Cada base sella lo suyo, y no lo de la otra");
await prueba("«llaves» está sellada en remate — el código ES la credencial", async () => {
  assert.ok(await frena(() => listar(PROYECTOS.remate, sesion, "llaves")));
});
await prueba("«llaves» NO está sellada en el panel: el sello es por base", async () => {
  assert.ok(!(await frena(() => listar(cfg, sesion, "llaves"))));
});
await prueba("«calculos» está sellada en casayourte — costos y datos de clientes", async () => {
  assert.ok(await frena(() => listar(PROYECTOS.casayourte, sesion, "calculos")));
});
await prueba("«productos» de remate se lee sin problema: es el catálogo público", async () => {
  assert.ok(!(await frena(() => listar(PROYECTOS.remate, sesion, "productos"))));
});
// Desde el 29-sep-2026 el agente lee la operación, la gente y la plata de
// Casa Verde (pedido de Mauro, para gestionar y planificar). Lo que sigue
// sellado es lo que ABRE algo.
await prueba("casaverde: lo que abre algo sigue sellado", async () => {
  for (const c of ["claves_recuerdos", "avisos_contacto"]) {
    assert.ok(await frena(() => listar(cv, sesion, c)), `«${c}» pasó el guardia`);
  }
  assert.ok(await frena(() => leerUno(cv, sesion, "config", "airbnb")), "config/airbnb pasó el guardia");
});
await prueba("casaverde: la operación, la gente y la plata ya se leen", async () => {
  for (const c of ["reservas", "chequeos", "clientes", "huespedes", "comunicaciones",
                   "pagos", "movimientos", "liquidaciones", "cierres", "honorarios"]) {
    assert.ok(!(await frena(() => listar(cv, sesion, c))), `«${c}» se frenó y no debía`);
  }
});

/* ── El historial ──────────────────────────────────────────────────────── */
titulo("Ningún cambio del agente sin su copia de antes");
const cvh = PROYECTOS.casaverde;
const entradas = () => Object.keys(BASE[HISTORIAL] || {}).length;

await prueba("escribir guarda antes cómo estaba, CRUDO, y después cambia", async () => {
  BASE.reservas = { r1: { total: { integerValue: "100" }, checkIn: { timestampValue: "2026-10-01T00:00:00Z" } } };
  const n = entradas();
  await escribir(cvh, sesion, "reservas", "r1", { total: 200 });
  assert.equal(entradas(), n + 1);
  const h = Object.values(BASE[HISTORIAL]).at(-1);
  assert.equal(h.coleccion.stringValue, "reservas");
  assert.ok(h.antes.stringValue.includes("timestampValue"), "la copia perdió el tipo");
  assert.equal(BASE.reservas.r1.total.integerValue, "200");
});

await prueba("deshacer lo devuelve EXACTO, con la fecha como fecha", async () => {
  const hid = Object.keys(BASE[HISTORIAL]).at(-1);
  await deshacer(cvh, sesion, hid);
  assert.deepEqual(BASE.reservas.r1, { total: { integerValue: "100" }, checkIn: { timestampValue: "2026-10-01T00:00:00Z" } });
});

await prueba("y el deshacer también deja su entrada: se puede deshacer", async () => {
  const h = Object.values(BASE[HISTORIAL]).at(-1);
  assert.ok(h.op.stringValue.startsWith("deshacer:"));
});

await prueba("borrar guarda la copia y deshacer lo vuelve a crear", async () => {
  BASE.chequeos = { c1: { nota: { stringValue: "faltan toallas" } } };
  await borrar(cvh, sesion, "chequeos", "c1");
  assert.equal(BASE.chequeos.c1, undefined);
  await deshacer(cvh, sesion, Object.keys(BASE[HISTORIAL]).at(-1));
  assert.equal(BASE.chequeos.c1.nota.stringValue, "faltan toallas");
});

await prueba("crear algo nuevo anota «no existía», y deshacer lo borra", async () => {
  await escribir(cvh, sesion, "reservas", "nueva", { total: 1 });
  const hid = Object.keys(BASE[HISTORIAL]).at(-1);
  assert.equal(BASE[HISTORIAL][hid].antes.nullValue, null);
  await deshacer(cvh, sesion, hid);
  assert.equal(BASE.reservas.nueva, undefined);
});

await prueba("SIN copia no hay cambio: si el historial se niega, el documento queda como estaba", async () => {
  BASE.pagos = { p1: { monto: { integerValue: "5" } } };
  niegaHistorial = true;
  try { assert.ok(await frena(() => fusionar(cvh, sesion, "pagos", "p1", { monto: 999 }))); }
  finally { niegaHistorial = false; }
  assert.equal(BASE.pagos.p1.monto.integerValue, "5");
});

await prueba("los cierres de Casa Verde no se escriben: son inmutables", async () => {
  assert.ok(await frena(() => escribir(cvh, sesion, "cierres", "k", { a: 1 })));
  assert.ok(await frena(() => borrar(cvh, sesion, "cierres", "k")));
});

await prueba("el historial no se escribe ni se borra a mano, ni siquiera por el agente", async () => {
  assert.ok(await frena(() => escribir(cvh, sesion, HISTORIAL, "x", { a: 1 })));
  assert.ok(await frena(() => borrar(cvh, sesion, HISTORIAL, Object.keys(BASE[HISTORIAL])[0])));
});

await prueba("una base sin historial (el panel) escribe como siempre, sin entradas", async () => {
  const n = entradas();
  await escribir(cfg, sesion, "pendientes", "z", { t: 1 });
  assert.equal(entradas(), n);
});

await prueba("Casa Verde y Tiempos llevan historial", () => {
  assert.equal(PROYECTOS.casaverde.historial, true);
  assert.equal(PROYECTOS.tiempos.historial, true);
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
