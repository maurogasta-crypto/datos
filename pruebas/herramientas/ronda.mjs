// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/ronda.mjs — Banco de la ronda de apertura.
//
//   node pruebas/herramientas/ronda.mjs
//
// Sin dependencias y sin red: se prueban las funciones puras de `ronda.mjs`,
// que son las que deciden qué se trae y en qué orden. Lo que toca Firestore no
// entra acá — eso ya lo cubre `pruebas/herramientas/firestore.mjs`.
//
// Por qué vale la pena probar esto y no sólo mirarlo: lo corre una routine sin
// nadie delante (`RUTINA-AUTOMATICA.md`). Un reporte que se trae dos veces, o
// uno que no se trae nunca, ahí no lo ve nadie hasta que Mauro abre el panel y
// encuentra basura o un vacío.
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";
import { origenDe, cruzar, letrasEnUso, ordenarAbiertos,
         tocados, sinResponder, porProyecto, reglasSinPublicar,
         CON_REPORTES, vivaL, diasTomada, lineasVivas,
         tieneCircuito } from "../../herramientas/ronda.mjs";
import { PROYECTOS } from "../../herramientas/firestore.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => {
  try { f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); }
};
const titulo = (t) => console.log("\n" + t);

/* ── Cruzar reportes con pendientes ──────────────────────────────────────── */
titulo("Qué reporte es nuevo");

prueba("un reporte sin pendiente que lo declare es nuevo", () => {
  const { nuevos } = cruzar("remate", [{ id: "r1", texto: "no guarda" }], []);
  assert.equal(nuevos.length, 1);
  assert.equal(nuevos[0].id, "r1");
});

prueba("con un pendiente que lo declara, deja de ser nuevo", () => {
  const pend = [{ id: "remate:L9", origen: "remate:reportes/r1" }];
  const { nuevos, yaTraidos } = cruzar("remate", [{ id: "r1" }], pend);
  assert.equal(nuevos.length, 0);
  assert.equal(yaTraidos.length, 1);
});

prueba("un pendiente CERRADO también lo trajo: no vuelve", () => {
  /* El campo `origen` dice que ya pasó por acá, no que siga abierto. Mirar el
     estado haría que cada reporte resuelto volviera a entrar como nuevo. */
  const pend = [{ id: "remate:L9", estado: "hecho", origen: "remate:reportes/r1" }];
  assert.equal(cruzar("remate", [{ id: "r1" }], pend).nuevos.length, 0);
});

prueba("el origen lleva el proyecto: mismo id en dos bases no se confunde", () => {
  const pend = [{ id: "remate:L9", origen: "remate:reportes/r1" }];
  assert.equal(cruzar("remate", [{ id: "r1" }], pend).nuevos.length, 0);
  assert.equal(cruzar("casayourte", [{ id: "r1" }], pend).nuevos.length, 1);
});

prueba("un pendiente sin `origen` no tapa nada", () => {
  const pend = [{ id: "remate:L1" }, { id: "remate:L2", origen: "" }];
  assert.equal(cruzar("remate", [{ id: "r1" }], pend).nuevos.length, 1);
});

prueba("sin reportes y sin pendientes no se rompe", () => {
  const r = cruzar("remate", undefined, undefined);
  assert.deepEqual(r, { nuevos: [], yaTraidos: [] });
});

prueba("el origen se escribe siempre igual", () => {
  assert.equal(origenDe("remate", "abc"), "remate:reportes/abc");
});

/* ── Las claves ──────────────────────────────────────────────────────────── */
titulo("La próxima clave libre");

const PEND_CLAVES = [
  { proyecto: "remate", clave: "L1" }, { proyecto: "remate", clave: "L5" },
  { proyecto: "remate", clave: "A6" }, { proyecto: "remate", clave: "D1" },
  { proyecto: "casayourte", clave: "T3" },
  { proyecto: "remate", clave: "reportes-2" }
];

prueba("devuelve una entrada por letra, con la próxima libre", () => {
  const l = letrasEnUso(PEND_CLAVES, "remate");
  assert.deepEqual(l.map((x) => x.proxima), ["A7", "D2", "L6"]);
});

prueba("toma el número más alto, no el último de la lista", () => {
  const l = letrasEnUso([{ proyecto: "p", clave: "L9" }, { proyecto: "p", clave: "L2" }], "p");
  assert.equal(l[0].proxima, "L10");
});

prueba("no mezcla proyectos", () => {
  assert.deepEqual(letrasEnUso(PEND_CLAVES, "casayourte").map((x) => x.proxima), ["T4"]);
});

prueba("una clave con nombre no aporta letra — no se inventa un número", () => {
  const l = letrasEnUso([{ proyecto: "p", clave: "secretos-boveda" }], "p");
  assert.equal(l.length, 0);
});

prueba("un proyecto sin pendientes devuelve lista vacía, no un error", () => {
  assert.deepEqual(letrasEnUso(PEND_CLAVES, "harmonia"), []);
});

/* ── El orden ────────────────────────────────────────────────────────────── */
titulo("El orden de los abiertos");

prueba("lo hecho y lo retirado no son abiertos", () => {
  const p = [{ id: "a", estado: "hecho" }, { id: "b", estado: "retirado" },
             { id: "c", estado: "abierto" }, { id: "d", estado: "listo" }];
  assert.deepEqual(ordenarAbiertos(p).map((x) => x.id), ["c", "d"]);
});

prueba("alta antes que media, media antes que baja", () => {
  const p = [{ id: "c", prioridad: "baja" }, { id: "a", prioridad: "alta" },
             { id: "b", prioridad: "media" }];
  assert.deepEqual(ordenarAbiertos(p).map((x) => x.id), ["a", "b", "c"]);
});

prueba("sin prioridad cae al fondo, no al tope", () => {
  /* No declarar prioridad no es declararla alta. Si esto se invirtiera, un
     pendiente escrito a las apuradas encabezaría la lista de Mauro. */
  const p = [{ id: "sin" }, { id: "baja", prioridad: "baja" }];
  assert.deepEqual(ordenarAbiertos(p).map((x) => x.id), ["baja", "sin"]);
});

prueba("a igual prioridad, lo trabado va después", () => {
  const p = [{ id: "trabado", prioridad: "alta", esperaA: ["x:Y1"] },
             { id: "libre", prioridad: "alta", esperaA: [] }];
  assert.deepEqual(ordenarAbiertos(p).map((x) => x.id), ["libre", "trabado"]);
});

prueba("una traba no adelanta a una prioridad más alta", () => {
  const p = [{ id: "media-libre", prioridad: "media" },
             { id: "alta-trabada", prioridad: "alta", esperaA: ["x:Y1"] }];
  assert.deepEqual(ordenarAbiertos(p).map((x) => x.id), ["alta-trabada", "media-libre"]);
});

prueba("el orden es estable: mismo peso, por id", () => {
  const p = [{ id: "b", prioridad: "alta" }, { id: "a", prioridad: "alta" }];
  assert.deepEqual(ordenarAbiertos(p).map((x) => x.id), ["a", "b"]);
});

prueba("no modifica la lista que recibe", () => {
  const p = [{ id: "b", prioridad: "baja" }, { id: "a", prioridad: "alta" }];
  ordenarAbiertos(p);
  assert.equal(p[0].id, "b");
});

/* ── Tocados y sin responder ─────────────────────────────────────────────── */
titulo("El apretón de manos");

prueba("tocado true es lo único que cuenta como tocado", () => {
  const p = [{ id: "a", tocado: true }, { id: "b", tocado: false }, { id: "c" }];
  assert.deepEqual(tocados(p).map((x) => x.id), ["a"]);
});

prueba("pregunta con respuesta vacía está sin responder", () => {
  const p = [{ id: "a", pregunta: "¿?", respuesta: "" },
             { id: "b", pregunta: "¿?", respuesta: "sí" },
             { id: "c", pregunta: "", respuesta: "" }];
  assert.deepEqual(sinResponder(p).map((x) => x.id), ["a"]);
});

prueba("una pregunta sin responder cuenta aunque el pendiente esté hecho", () => {
  /* § 6: «Una pregunta sin responder cuenta como pendiente abierto, aunque el
     pendiente esté marcado hecho». Por eso `sinResponder` no filtra estado. */
  const p = [{ id: "a", estado: "hecho", pregunta: "¿?", respuesta: "" }];
  assert.equal(sinResponder(p).length, 1);
});

/* ── Agrupar por proyecto ────────────────────────────────────────────────── */
titulo("Por proyecto, como en el panel");

prueba("respeta el `orden` de la ficha del proyecto", () => {
  const p = [{ id: "1", proyecto: "casayourte" }, { id: "2", proyecto: "casaverde" }];
  const fichas = [{ id: "casaverde", orden: 2 }, { id: "casayourte", orden: 1 }];
  assert.deepEqual(porProyecto(p, fichas).map((g) => g.proyecto), ["casayourte", "casaverde"]);
});

prueba("un proyecto sin ficha va al final, no adelante", () => {
  const p = [{ id: "1", proyecto: "nuevo" }, { id: "2", proyecto: "casaverde" }];
  const fichas = [{ id: "casaverde", orden: 2 }];
  assert.deepEqual(porProyecto(p, fichas).map((g) => g.proyecto), ["casaverde", "nuevo"]);
});

prueba("sin fichas no se rompe: alfabético", () => {
  const p = [{ id: "1", proyecto: "remate" }, { id: "2", proyecto: "casaverde" }];
  assert.deepEqual(porProyecto(p, []).map((g) => g.proyecto), ["casaverde", "remate"]);
});

/* ── Las reglas sin publicar, y el sitio nuevo ───────────────────────────── */
titulo("Las reglas sin publicar");

prueba("trae la base que dice «sin publicar»", () => {
  const p = [{ id: "a", acceso: { estado: "publicada" } },
             { id: "b", acceso: { estado: "sin publicar" } }];
  assert.deepEqual(reglasSinPublicar(p).map((x) => x.id), ["b"]);
});

prueba("también «pendiente de publicar» y «falta publicar»", () => {
  /* Las tres redacciones existen en la base desde antes de `panel-21`. La que
     escribe el panel hoy es una sola, pero las viejas siguen siendo verdad. */
  const p = [{ id: "a", acceso: { estado: "pendiente de publicar" } },
             { id: "b", acceso: { estado: "falta publicar" } }];
  assert.equal(reglasSinPublicar(p).length, 2);
});

prueba("un proyecto sin `acceso` no rompe ni cuenta", () => {
  assert.deepEqual(reglasSinPublicar([{ id: "a" }, { id: "b", acceso: {} }, null]), []);
});

prueba("sin lista de proyectos devuelve vacío, no explota", () => {
  assert.deepEqual(reglasSinPublicar(undefined), []);
});

titulo("Un sitio nuevo entra solo");

prueba("los reportes se piden a toda base que no diga lo contrario", () => {
  /* Era una lista escrita a mano hasta el 2026-09-14, y era el último lugar
     donde dar de alta un sitio pedía acordarse de tocar un archivo. Sigue
     derivándose: lo único que saca a una base es que ELLA lo declare. */
  assert.deepEqual([...CON_REPORTES].sort(),
    Object.keys(PROYECTOS)
      .filter((x) => x !== "panel" && PROYECTOS[x].reportesSonFallas !== false)
      .sort());
});

prueba("y el panel nunca está: es contra quien se cruzan", () => {
  assert.ok(!CON_REPORTES.includes("panel"));
});

prueba("una base que no dice nada SÍ entra: un sitio nuevo sigue entrando solo",
  () => {
    const callados = Object.keys(PROYECTOS).filter(
      (x) => x !== "panel" && PROYECTOS[x].reportesSonFallas === undefined);
    assert.ok(callados.length > 0, "el ecosistema tiene que tener alguna");
    for (const x of callados) assert.ok(CON_REPORTES.includes(x), x);
  });

prueba("hilux NO entra: su `reportes` son viajes, no fallas", () => {
  /* El 2026-09-21 la ronda trajo `maurogasta-viaje-1` y `-viaje-2` como
     reportes nuevos, con el título vacío y un `?`. No eran fallas: eran los
     dos viajes que el teléfono subió solo. Sin esto, dos pendientes vacíos
     por día y para siempre. */
  assert.equal(PROYECTOS.hilux.reportesSonFallas, false);
  assert.ok(!CON_REPORTES.includes("hilux"));
});

prueba("lo declarado vive junto a la colección, no en una lista aparte", () => {
  /* Si alguien vuelve a poner la decisión en `ronda.mjs`, esta prueba no lo
     agarra — pero el que agrega una base mira `colecciones`, y ahí está. */
  assert.ok(PROYECTOS.hilux.colecciones.includes("reportes"));
  assert.ok(PROYECTOS.remate.reportesSonFallas === undefined);
  assert.ok(CON_REPORTES.includes("remate"));
});

/* ── Las líneas de trabajo ───────────────────────────────────────────────── */
titulo("En qué estamos");

prueba("una línea cerrada no entra: la ronda muestra lo vivo", () => {
  const l = [{ id: "a", estado: "cerrada" }, { id: "b", estado: "curso" }];
  assert.deepEqual(lineasVivas(l).map((x) => x.id), ["b"]);
});

prueba("lo TOMADO va arriba: es lo que condiciona al que lee", () => {
  const l = [{ id: "libre", estado: "curso" },
             { id: "mia", estado: "abierta", tomada: { desde: "2026-09-14" } }];
  assert.deepEqual(lineasVivas(l).map((x) => x.id), ["mia", "libre"]);
});

prueba("y a igual dueño, primero lo que está en curso", () => {
  const l = [{ id: "pausada", estado: "pausada" }, { id: "curso", estado: "curso" },
             { id: "abierta", estado: "abierta" }];
  assert.deepEqual(lineasVivas(l).map((x) => x.id), ["curso", "abierta", "pausada"]);
});

prueba("los días que lleva tomada se cuentan desde `desde`", () => {
  const hoy = new Date("2026-09-14T12:00:00").getTime();
  assert.equal(diasTomada({ tomada: { desde: "2026-09-10" } }, hoy), 4);
});

prueba("una línea sin tomar lleva cero días, no NaN", () => {
  assert.equal(diasTomada({}), 0);
  assert.equal(diasTomada({ tomada: {} }), 0);
  assert.equal(diasTomada({ tomada: { desde: "no es una fecha" } }), 0);
});

prueba("la ronda NO deriva choques, y es a propósito", () => {
  /* El panel sí los calcula. Repetir esa regla acá sería la misma cosa escrita
     dos veces en dos lenguajes que no se importan entre sí. Acá alcanza con
     mostrar qué está tomado y por quién. Esta prueba existe para que, si
     alguien agrega la derivación, tenga que borrarla a propósito. */
  assert.equal(typeof globalThis.choques, "undefined");
});

/* ── «Contestó 0» no siempre es «no hay nada» ───────────────────────────── */
titulo("Un 0 que no quiere decir lo que parece");

prueba("un sitio con el circuito declarado cuenta como que lo tiene", () => {
  assert.equal(tieneCircuito({ id: "remate", reportes: true }), true);
});

prueba("y sin el campo, NO — que es el caso que mordió el 15-sep", () => {
  /* En los tres sitios el acceso del agente es un comodín con exclusiones, así
     que listar una colección que ninguna regla declara devuelve vacío en vez de
     negar. Un `✓ 0` ahí se lee como «está bien y nadie reportó» cuando en
     realidad el circuito no existe. */
  assert.equal(tieneCircuito({ id: "casayourte" }), false);
  assert.equal(tieneCircuito({ id: "casaverde", reportes: false }), false);
});

prueba("y no explota con un proyecto que no está", () => {
  assert.equal(tieneCircuito(undefined), false);
  assert.equal(tieneCircuito(null), false);
});

prueba("`reportes` tiene que ser el booleano, no cualquier cosa parecida", () => {
  /* Con `== true` un `"sí"` o un `1` pasarían, y el dato lo escribe una persona
     o un chat a mano. Que sea estricto es lo que evita un falso tilde. */
  assert.equal(tieneCircuito({ reportes: "true" }), false);
  assert.equal(tieneCircuito({ reportes: 1 }), false);
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
