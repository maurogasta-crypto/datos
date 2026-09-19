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
  if (NIEGA_LA_BASE.includes(col)) return mal(403, "Missing or insufficient permissions.");

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
        entrar, listar, leerUno, escribir, borrar, aFirestore, deFirestore } =
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
const SIN_NADA_QUE_SELLAR = new Set(["hilux"]);

await prueba("las cinco bases están, y ninguna comparte projectId con otra", () => {
  const ids = Object.values(PROYECTOS).map((p) => p.projectId);
  assert.equal(ids.length, 5);
  assert.equal(new Set(ids).size, 5);
  for (const [n, p] of Object.entries(PROYECTOS)) {
    assert.ok(p.apiKey && p.projectId, `${n} sin identificadores`);
    if (!SIN_NADA_QUE_SELLAR.has(n)) {
      assert.ok(p.selladas.length > 0, `${n} no sella nada — revisar a propósito`);
    }
    assert.ok(p.colecciones.length > 0, `${n} sin colecciones para bajar`);
  }
});

await prueba("hilux no sella nada porque el recorrido no sube, y se comprueba", () => {
  const h = PROYECTOS.hilux;
  assert.deepEqual(h.selladas, []);
  /* Las dos colecciones y ninguna más: si alguien agrega una tercera, tiene
     que venir acá y decidir si sella. */
  assert.deepEqual(h.colecciones, ["reportes", "analisis"]);
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
await prueba("el dinero de casaverde no se toca", async () => {
  for (const c of ["movimientos", "liquidaciones", "honorarios", "pagos", "cierres"]) {
    assert.ok(await frena(() => listar(cv, sesion, c)), `«${c}» pasó el guardia`);
  }
});
await prueba("la gente de casaverde tampoco", async () => {
  for (const c of ["huespedes", "clientes", "reservas", "comunicaciones", "claves_recuerdos"]) {
    assert.ok(await frena(() => listar(cv, sesion, c)), `«${c}» pasó el guardia`);
  }
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
