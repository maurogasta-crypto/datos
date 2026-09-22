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
import { readFileSync } from "node:fs";
import { origenDe, cruzar, letrasEnUso, ordenarAbiertos, pesoDe,
         tocados, sinResponder, porProyecto, reglasSinPublicar,
         CON_REPORTES, BASES_CON_REPORTES, QUE_GUARDA,
         vivaL, diasTomada, lineasVivas,
         tieneCircuito, esPedido, MINUTOS_RESERVA, reservaViva, reservasDe,
         minutosQueQuedan, archivosTocados, CAMPOS_PENDIENTE, CAMPOS_LINEA,
         CAMPOS_PROYECTO, SOLO_NOMBRES,
         repoDeCadaProyecto, trabasVivas, desbloquea, hayComando,
         herramientaQueFalta, porQueNoSeToca, queTocarAhora
       } from "../../herramientas/ronda.mjs";
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

prueba("se ENTRA a todas las bases menos el panel, diga lo que diga", () => {
  /* Es la corrección del 2026-09-21 a la tarde: el primer arreglo sacaba a
     hilux de la vuelta entera, y con eso una base caída dejaba de aparecer en
     FUENTES. Leerla no cuesta nada que no se pagara ya. */
  assert.deepEqual([...BASES_CON_REPORTES].sort(),
    Object.keys(PROYECTOS).filter((x) => x !== "panel").sort());
});

prueba("pero sólo se CRUZAN contra los pendientes las que guardan fallas", () => {
  assert.deepEqual([...CON_REPORTES].sort(),
    Object.keys(PROYECTOS)
      .filter((x) => x !== "panel" && QUE_GUARDA(x) === "fallas")
      .sort());
});

prueba("lo que guarda se declara en POSITIVO, y sin declarar son fallas", () => {
  /* Una negación (`reportesSonFallas: false`) dice qué NO es y no qué es, y
     además invitaba a usarla para apagar la lectura. */
  assert.equal(QUE_GUARDA("remate"), "fallas");
  assert.equal(QUE_GUARDA("hilux"), "viajes");
  assert.equal(QUE_GUARDA("no-existe"), "fallas");
});

prueba("y el panel nunca está: es contra quien se cruzan", () => {
  assert.ok(!CON_REPORTES.includes("panel"));
});

prueba("una base que no dice nada SÍ entra: un sitio nuevo sigue entrando solo",
  () => {
    const callados = Object.keys(PROYECTOS).filter(
      (x) => x !== "panel" && PROYECTOS[x].reportesSon === undefined);
    assert.ok(callados.length > 0, "el ecosistema tiene que tener alguna");
    for (const x of callados) assert.ok(CON_REPORTES.includes(x), x);
  });

prueba("hilux se lee pero no se cruza: su `reportes` son viajes", () => {
  /* El 2026-09-21 la ronda trajo `maurogasta-viaje-1` y `-viaje-2` como
     reportes nuevos, con el título vacío y un `?`. No eran fallas: eran los
     dos viajes que el teléfono subió solo. Sin esto, dos pendientes vacíos
     por día y para siempre — pero tampoco se la puede dejar de leer, o una
     base caída no se entera nadie. */
  assert.equal(PROYECTOS.hilux.reportesSon, "viajes");
  assert.ok(BASES_CON_REPORTES.includes("hilux"), "se entra igual");
  assert.ok(!CON_REPORTES.includes("hilux"), "pero no se cruza");
});

prueba("lo declarado vive junto a la colección, no en una lista aparte", () => {
  /* Si alguien vuelve a poner la decisión en `ronda.mjs`, esta prueba no lo
     agarra — pero el que agrega una base mira `colecciones`, y ahí está. */
  assert.ok(PROYECTOS.hilux.colecciones.includes("reportes"));
  assert.ok(PROYECTOS.remate.reportesSon === undefined);
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

/* ── Un pedido no es una falla ───────────────────────────────────────────── */
titulo("Fallas y pedidos, que van a la misma colección y no se leen igual");

prueba("un pedido se reconoce por `tipo`", () => {
  assert.equal(esPedido({ tipo: "pedido" }), true);
  assert.equal(esPedido({ tipo: "falla" }), false);
});

prueba("SIN `tipo` es una falla, no un desconocido", () => {
  /* Los reportes anteriores al 21-sep-2026 no tienen el campo, y en esa época
     lo único que existía era una falla. Si esto empezara a devolver `true`, o
     a inventar una tercera categoría, los reportes viejos desaparecerían de la
     sección 3 sin que nadie lo note — que es exactamente el modo de fallar que
     esta rutina no puede tener, porque corre sola. */
  assert.equal(esPedido({ texto: "no anda el botón" }), false);
  assert.equal(esPedido({ tipo: undefined }), false);
  assert.equal(esPedido({ tipo: null }), false);
  assert.equal(esPedido({ tipo: "" }), false);
});

prueba("tiene que ser el texto exacto, no algo parecido", () => {
  /* Mismo criterio que `tieneCircuito`: el dato lo escribe un formulario, pero
     también podría escribirlo alguien a mano desde la consola. */
  assert.equal(esPedido({ tipo: "Pedido" }), false);
  assert.equal(esPedido({ tipo: "pedidos" }), false);
  assert.equal(esPedido({ tipo: " pedido" }), false);
});

prueba("no explota con lo que no es un reporte", () => {
  assert.equal(esPedido(undefined), false);
  assert.equal(esPedido(null), false);
});

prueba("separar una lista mezclada no pierde ni duplica ninguno", () => {
  /* La garantía que importa de una partición: todo cae de un lado y de uno
     solo. Un reporte que no aparece en ninguna de las dos listas es un reporte
     que nadie va a atender. */
  const lista = [
    { id: "a", tipo: "falla" },
    { id: "b", tipo: "pedido" },
    { id: "c" },                       // viejo, sin tipo
    { id: "d", tipo: "pedido" },
    { id: "e", tipo: "ruido" }
  ];
  const pedidos = lista.filter(esPedido);
  const fallas = lista.filter((r) => !esPedido(r));
  assert.deepEqual(pedidos.map((r) => r.id), ["b", "d"]);
  assert.deepEqual(fallas.map((r) => r.id), ["a", "c", "e"]);
  assert.equal(pedidos.length + fallas.length, lista.length);
});

/* ── EL SEMÁFORO ─────────────────────────────────────────────────────────── */
titulo("El semáforo: qué repositorio está tocando alguien, y hasta cuándo");

const enMin = (m) => new Date(Date.now() + m * 60000).toISOString();

prueba("una reserva con plazo por delante está viva", () => {
  assert.equal(reservaViva({ repo: "datos", vence: enMin(30) }), true);
});

prueba("VENCIDA es lo mismo que soltada", () => {
  /* Es toda la diferencia con `lineas.tomada`, que no vence: un chat que muere
     sin soltar dejaba la línea trabada para siempre. */
  assert.equal(reservaViva({ repo: "datos", vence: enMin(-1) }), false);
});

prueba("SIN plazo, o con basura, se rompe hacia el VERDE", () => {
  /* A propósito y vale escribirlo: un semáforo roto en rojo traba el ecosistema
     entero, y eso es peor que un choque. Un choque se ve y se arregla; un
     bloqueo fantasma no se sabe ni a quién preguntarle. */
  assert.equal(reservaViva({ repo: "datos" }), false);
  assert.equal(reservaViva({ repo: "datos", vence: "cuando sea" }), false);
  assert.equal(reservaViva({ repo: "datos", vence: null }), false);
});

prueba("sin repositorio no es una reserva", () => {
  assert.equal(reservaViva({ vence: enMin(30) }), false);
  assert.equal(reservaViva(null), false);
  assert.equal(reservaViva(undefined), false);
});

prueba("RENOVAR LO PROPIO no choca consigo mismo", () => {
  /* Si la reserva de uno contara como ajena, renovar sería imposible: el chat
     se bloquearía a sí mismo a los 90 minutos y no habría forma de seguir. */
  const todas = [{ repo: "datos", sesion: "session_A", vence: enMin(30) }];
  assert.equal(reservasDe(todas, "datos", "session_A").length, 0);
  assert.equal(reservasDe(todas, "datos", "session_B").length, 1);
});

prueba("sólo mira el repositorio que se pide, y sólo lo vivo", () => {
  const todas = [
    { repo: "datos",      sesion: "A", vence: enMin(30) },
    { repo: "CasaYourte", sesion: "B", vence: enMin(30) },
    { repo: "datos",      sesion: "C", vence: enMin(-5) }   // vencida
  ];
  assert.deepEqual(reservasDe(todas, "datos", "X").map((r) => r.sesion), ["A"]);
  assert.deepEqual(reservasDe(todas, "remate", "X"), []);
});

prueba("los minutos que quedan nunca son negativos", () => {
  /* «quedan -40 min» no es un dato, es un error de lectura esperando. */
  assert.equal(minutosQueQuedan({ vence: enMin(-40) }), 0);
  assert.equal(minutosQueQuedan({ vence: "basura" }), 0);
  assert.ok(minutosQueQuedan({ vence: enMin(30) }) >= 29);
});

prueba("el plazo es el que se decidió y no otro", () => {
  assert.equal(MINUTOS_RESERVA, 90);
});

/* ── QUÉ CAMBIÓ ──────────────────────────────────────────────────────────── */
titulo("Qué cambió: para no releer lo que otro chat ya hizo");

prueba("un archivo tocado por dos commits sale marcado", () => {
  /* Es la señal que importa: donde dos trabajos se cruzaron. Fue exactamente
     lo que pasó el 2026-09-22 con `herramientas/ronda.mjs`. */
  const cambios = [{ repo: "datos", commits: [
    { sha: "aaa", titulo: "uno", archivos: ["herramientas/ronda.mjs", "CLAUDE.md"] },
    { sha: "bbb", titulo: "dos", archivos: ["herramientas/ronda.mjs"] }
  ]}];
  const m = archivosTocados(cambios);
  assert.deepEqual(m.get("datos/herramientas/ronda.mjs"), ["uno", "dos"]);
  assert.deepEqual(m.get("datos/CLAUDE.md"), ["uno"]);
});

prueba("el mismo nombre en dos repos NO se mezcla", () => {
  /* `CLAUDE.md` existe en los seis. Si la clave no llevara el repositorio
     adelante, el andamio diría que está calentísimo y sería mentira. */
  const m = archivosTocados([
    { repo: "datos",      commits: [{ titulo: "a", archivos: ["CLAUDE.md"] }] },
    { repo: "CasaYourte", commits: [{ titulo: "b", archivos: ["CLAUDE.md"] }] }
  ]);
  assert.equal(m.get("datos/CLAUDE.md").length, 1);
  assert.equal(m.get("CasaYourte/CLAUDE.md").length, 1);
});

prueba("no explota con lo vacío ni con lo incompleto", () => {
  /* Esto informa, no mide: nunca puede voltear la ronda. */
  assert.equal(archivosTocados([]).size, 0);
  assert.equal(archivosTocados(undefined).size, 0);
  assert.equal(archivosTocados([{ repo: "x" }]).size, 0);
  assert.equal(archivosTocados([{ repo: "x", commits: [{ titulo: "t" }] }]).size, 0);
});

prueba("UNA RESERVA SIN IDENTIDAD ES UN FAROL EN VERDE", () => {
  /* Dos bugs reales del 2026-09-22, los dos encontrados probando contra la
     base y no leyendo el archivo, y los dos silenciosos:

     1 · El comando leía con `listar` + `deFirestore`, y `deFirestore`
         decodifica un VALOR, no un DOCUMENTO: devolvía null por cada reserva,
         `ajenas` quedaba siempre vacía y el semáforo NUNCA bloqueaba.
     2 · Sin `CLAUDE_SESSION` —que esta plataforma no define— la identidad era
         "", y entonces un chat no podía renovar lo suyo: se bloqueaba a sí
         mismo a los 90 minutos.

     Esta prueba fija las dos invariantes que quedaron: con identidad, lo
     propio no choca y lo ajeno sí. Si alguien vuelve a romper el decodificado,
     el banco no lo ve —es de cableado— pero la regla de abajo deja escrito qué
     tiene que pasar para que la comprobación contra la base valga. */
  const mia = [{ repo: "datos", sesion: "chat A", chat: "chat A", vence: enMin(30) }];
  assert.equal(reservasDe(mia, "datos", "chat A").length, 0, "lo propio NO choca");
  assert.equal(reservasDe(mia, "datos", "chat B").length, 1, "lo ajeno SÍ choca");
  /* Y la identidad vacía tiene que chocar contra todo: es lo que fuerza a que
     el comando exija un nombre en vez de reservar de forma anónima. */
  assert.equal(reservasDe(mia, "datos", "").length, 1,
    "sin identidad, todo es ajeno — por eso el comando pide --chat");
});

prueba("el comando exige identidad y lee con el decodificador correcto", () => {
  /* De cableado y no de lógica, así que se mira el texto. Vale la pena porque
     los dos bugs de arriba eran exactamente eso. */
  const src = readFileSync(new URL("../../herramientas/ronda.mjs", import.meta.url), "utf8");
  assert.match(src, /falta decir quién sos/, "tiene que negarse sin nombre");
  assert.match(src, /listarSuave\(cfg, sesion, "reservas"\)/,
    "tiene que leer con listarSuave, que decodifica un documento");
  assert.doesNotMatch(src, /listar\(cfg, sesion, "reservas"\)\.map/,
    "no vuelve el par listar+deFirestore, que devolvía null por documento");
  assert.match(src, /if \(!leidas\.ok\)/,
    "si no puede leer las reservas, NO reserva: a ciegas es peor que no hacerlo");
});

/* ── LAS MÁSCARAS ────────────────────────────────────────────────────────── */
titulo("Las máscaras de campos: traer menos sin mentir");

const fuente = readFileSync(new URL("../../herramientas/ronda.mjs", import.meta.url), "utf8");
const cuerpoDe = (nombre) => {
  const i = fuente.search(new RegExp(`^(const|function|async function) ${nombre}\\b`, "m"));
  if (i < 0) return "";
  return fuente.slice(i, fuente.indexOf("\n}", i));
};

prueba("TODO campo de un pendiente que la ronda lee está en la máscara", () => {
  /* LA PRUEBA QUE HACE SEGURO EL AHORRO, y el primer intento estuvo MAL: barría
     el texto buscando `p.campo`, pero `tocados` es una línea que usa `x`, así
     que no veía `pregunta` ni `tocado` y pasaba con la máscara rota. Una prueba
     que no puede fallar es peor que ninguna, porque da permiso.

     Ésta es de COMPORTAMIENTO: se arma un pendiente completo y el mismo
     pendiente con SÓLO los campos de la máscara, y se exige que las siete
     funciones decidan igual con los dos. Si a la máscara le falta un campo que
     alguna mira, las decisiones se separan y esto falla. */
  const completo = {
    id: "casayourte:T1", clave: "T1", proyecto: "casayourte", estado: "abierto",
    prioridad: "alta", quien: "mauro", titulo: "un título", tocado: true,
    pregunta: "¿y?", respuesta: "", esperaA: "", linea: "L-taller",
    origen: "casayourte:reportes/abc",
    // Los que la máscara deja afuera. Si alguno hiciera falta, se nota abajo.
    detalle: "x".repeat(500), historia: ["a", "b"], porQue: "el motivo",
    actualizadoEn: "2026-09-22"
  };
  const permitidos = new Set([...CAMPOS_PENDIENTE, "id"]);
  const enmascarado = Object.fromEntries(
    Object.entries(completo).filter(([k]) => permitidos.has(k)));
  assert.ok(Object.keys(enmascarado).length < Object.keys(completo).length,
    "si no sacó nada, la prueba no está comparando dos cosas distintas");

  const ids = (l) => (l || []).map((x) => x.id);
  const con = (f) => [f([completo]), f([enmascarado])];

  for (const [nombre, f] of [["tocados", tocados], ["sinResponder", sinResponder],
                             ["ordenarAbiertos", ordenarAbiertos]]) {
    const [a, b] = con(f);
    assert.deepEqual(ids(a), ids(b), `${nombre} decide distinto sin los campos de más`);
  }
  assert.equal(pesoDe(completo), pesoDe(enmascarado), "pesoDe cambia el orden");
  assert.deepEqual(letrasEnUso([completo], "casayourte"),
                   letrasEnUso([enmascarado], "casayourte"), "letrasEnUso cambia");
  assert.deepEqual(porProyecto([completo], []).map((g) => g.proyecto),
                   porProyecto([enmascarado], []).map((g) => g.proyecto), "porProyecto cambia");
  const r = [{ id: "abc" }];
  assert.deepEqual(ids(cruzar("casayourte", r, [completo]).nuevos),
                   ids(cruzar("casayourte", r, [enmascarado]).nuevos),
                   "cruzar traería dos veces el mismo reporte");
});

prueba("las máscaras NO piden los campos largos, que es de dónde sale el ahorro", () => {
  /* Medido el 2026-09-22: con estos tres afuera la corrida pasó de 1087 KiB a
     239 KiB. Si alguien los vuelve a meter «por las dudas», el ahorro se va. */
  for (const c of ["detalle", "historia", "porQue"])
    assert.ok(!CAMPOS_PENDIENTE.includes(c), `un pendiente no necesita ${c}`);
  assert.ok(!CAMPOS_LINEA.includes("bitacora"),
    "la bitácora son 23 de los 26 KiB de las líneas y la ronda no la imprime");
  for (const c of ["tecnica", "empaquetado"])
    assert.ok(!CAMPOS_PROYECTO.includes(c), `la ronda no mira ${c} de un proyecto`);
  assert.ok(!CAMPOS_PROYECTO.includes("sitio"),
    "`sitio` ENTERO son varios KiB de resumen, url y readme: eso no entra");
});

prueba("pero `sitio.repo` SÍ, y sin él el cruce del semáforo se cae", () => {
  /* La máscara de SUBCAMPO es lo que deja pedir treinta bytes en vez de los
     varios KiB del `sitio` entero. Y esta prueba es de comportamiento y no de
     lista a propósito: la primera versión sólo miraba que `sitio` no estuviera
     en `CAMPOS_PROYECTO`, y sacar `sitio.repo` la dejaba pasar igual — la
     ronda habría seguido corriendo, sin poder cruzar un solo pendiente con el
     semáforo y sin decir por qué. */
  const completo = {
    id: "hilux", orden: 7, nombre: "SITD-Hilux", reportes: true, acceso: {},
    sitio: { repo: "maurogasta-crypto/sitd-hilux", resumen: "x".repeat(4000),
             readme: "https://…", url: "https://…" },
    tecnica: "y".repeat(8000), empaquetado: { como: "…" }
  };
  /* Aplica la máscara como la aplica Firestore: un `a.b` trae `a` con sólo esa
     clave adentro. */
  const enmascarado = {};
  for (const campo of [...CAMPOS_PROYECTO, "id"]) {
    const [raiz, sub] = String(campo).split(".");
    if (!(raiz in completo)) continue;
    if (!sub) { enmascarado[raiz] = completo[raiz]; continue; }
    if (completo[raiz] && sub in completo[raiz])
      enmascarado[raiz] = { ...(enmascarado[raiz] || {}), [sub]: completo[raiz][sub] };
  }
  assert.ok(JSON.stringify(enmascarado).length < JSON.stringify(completo).length / 10,
    "si no achicó, la máscara no está ahorrando nada");
  assert.equal(repoDeCadaProyecto([enmascarado]).get("hilux"), "sitd-hilux",
    "sin la carpeta, QUÉ TOCAR AHORA no puede cruzar nada con el semáforo");
  assert.deepEqual(reglasSinPublicar([enmascarado]), reglasSinPublicar([completo]),
    "y la máscara tampoco puede cambiar lo de las reglas sin publicar");
});

prueba("pero sí piden lo que la ronda imprime de una línea y de un proyecto", () => {
  for (const c of ["titulo", "alcance", "objetivo", "proyectos", "estado", "tomada"])
    assert.ok(CAMPOS_LINEA.includes(c), `la ronda imprime ${c} de una línea`);
  /* `acceso` es de donde sale «reglas sin publicar», que encabeza «Lo primero»:
     sin él, la ronda diría que no hay reglas esperando y eso es lo único de esa
     lista que está perdiendo trabajo mientras se lee. */
  assert.ok(CAMPOS_PROYECTO.includes("acceso"));
  assert.ok(CAMPOS_PROYECTO.includes("reportes"), "de acá sale si el sitio tiene circuito");
});

prueba("contar una base no baja su contenido", () => {
  /* Los `reportes` de hilux son viajes con vectores de vibración: 461 KiB que
     se bajaban para tirarlos y quedarse con el número. */
  assert.deepEqual(SOLO_NOMBRES, ["__name__"]);
});

/* ── EL ACOTE ────────────────────────────────────────────────────────────── */
titulo("Acotar a un sitio: menos vueltas, sin perder el semáforo");

prueba("el panel NUNCA se acota, y es la parte que no se negocia", () => {
  /* Un semáforo que sólo mira el repositorio propio no es un semáforo. El
     acote saca las bases de los SITIOS —cada una es un login más un listado—
     y deja el panel entero. */
  const j = cuerpoDe("juntar");
  assert.match(j, /if \(soloSitio && nombre !== soloSitio\) continue;/,
    "el acote tiene que estar en el lazo de las bases de sitio");
  for (const c of ["pendientes", "lineas", "reservas", "proyectos"])
    assert.ok(new RegExp(`listarSuave\\(cfgPanel, sesionPanel, "${c}"`).test(j),
      `${c} del panel se trae siempre, acotado o no`);
});

prueba("un sitio que no existe se rechaza, no corre contra nada", () => {
  const a = cuerpoDe("acotar");
  assert.match(a, /!PROYECTOS\[s\]/, "tiene que validar contra la lista de siempre");
  assert.match(a, /s === "panel"/, "el panel no es un sitio");
  assert.match(a, /process\.exit\(1\)/, "y frenar, en vez de seguir en silencio");
});

prueba("y la salida DICE que está acotada", () => {
  /* Un listado corto sin ese renglón se lee como «no hay nada pendiente», que
     es la conclusión opuesta a la verdadera. */
  assert.match(fuente, /ACOTADA A/);
  assert.match(fuente, /las otras bases NO se consultaron/);
});

/* ── QUÉ TOCAR AHORA ─────────────────────────────────────────────────────────
   El cruce del semáforo con los pendientes. Es lo que decide qué se toca en
   una corrida desatendida, así que una equivocación acá no la ve nadie: o se
   trabaja sobre algo que otro chat está tocando, o se deja pasar lo único que
   se podía hacer. */
titulo("Qué tocar ahora: de dónde sale el repositorio de cada proyecto");

prueba("la carpeta sale de `sitio.repo`, que YA estaba escrito", () => {
  /* No hay campo nuevo: los nueve documentos de `proyectos/` traían
     `sitio.repo` desde antes; nadie lo estaba leyendo. */
  const m = repoDeCadaProyecto([
    { id: "hilux", sitio: { repo: "maurogasta-crypto/sitd-hilux" } },
    { id: "casayourte", sitio: { repo: "casayourte/CasaYourte" } },
  ]);
  assert.equal(m.get("hilux"), "sitd-hilux");
  assert.equal(m.get("casayourte"), "CasaYourte");
});

prueba("DOS proyectos pueden compartir repositorio, y hoy pasa", () => {
  /* `panel` y `datos` son dos entradas del tablero y un solo repositorio. Si
     la carpeta se dedujera del id, una de las dos no existiría. */
  const m = repoDeCadaProyecto([
    { id: "panel", sitio: { repo: "maurogasta-crypto/datos" } },
    { id: "datos", sitio: { repo: "maurogasta-crypto/datos" } },
  ]);
  assert.equal(m.get("panel"), "datos");
  assert.equal(m.get("datos"), "datos");
});

prueba("un proyecto sin `sitio.repo` no entra, y no se inventa una carpeta", () => {
  const m = repoDeCadaProyecto([{ id: "general" }, { id: "x", sitio: {} }]);
  assert.equal(m.size, 0);
});

prueba("funciona con la FORMA que devuelve la máscara de subcampo", () => {
  /* Firestore con `mask.fieldPaths=sitio.repo` devuelve `sitio` con esa sola
     clave adentro. Si esto dependiera de que venga el `sitio` entero, el
     ahorro de la máscara rompería el cruce en silencio. */
  const m = repoDeCadaProyecto([{ id: "remate", sitio: { repo: "rematetaller/remate" } }]);
  assert.equal(m.get("remate"), "remate");
});

titulo("Qué tocar ahora: trabas que ya no traban");

prueba("una `esperaA` que apunta a algo HECHO no traba", () => {
  /* § 9: «cuando la que trababa se marca hecha, la traba desaparece sola». El
     2026-09-22 la ronda mostraba `casayourte:T2 ⟵ espera casayourte:T1` con T1
     hecho hacía días: un pendiente que ya se podía empezar, apagado. */
  const abiertos = new Set(["casayourte:T2"]);
  assert.deepEqual(trabasVivas({ id: "casayourte:T2", esperaA: ["casayourte:T1"] }, abiertos), []);
});

prueba("y una que apunta a algo abierto SÍ traba", () => {
  const abiertos = new Set(["harmonia:H7", "harmonia:H8"]);
  assert.deepEqual(trabasVivas({ id: "harmonia:H8", esperaA: ["harmonia:H7"] }, abiertos),
                   ["harmonia:H7"]);
});

prueba("sin `esperaA` no hay traba, y no rompe", () => {
  assert.deepEqual(trabasVivas({ id: "a" }, new Set(["a"])), []);
  assert.deepEqual(trabasVivas(null, new Set()), []);
});

titulo("Qué tocar ahora: cuánto destraba");

prueba("cuenta los abiertos que lo esperan", () => {
  const lista = [
    { id: "a" },
    { id: "b", esperaA: ["a"] },
    { id: "c", esperaA: ["a"] },
    { id: "d", esperaA: ["b"] },
  ];
  assert.equal(desbloquea({ id: "a" }, lista), 2);
  assert.equal(desbloquea({ id: "b" }, lista), 1);
  assert.equal(desbloquea({ id: "d" }, lista), 0);
});

prueba("no se cuenta a sí mismo aunque el dato esté mal", () => {
  const lista = [{ id: "a", esperaA: ["a"] }];
  assert.equal(desbloquea({ id: "a" }, lista), 0);
});

titulo("Qué tocar ahora: ¿puedo verificarlo DESDE ACÁ?");

prueba("un comando se busca en el PATH, sin lanzar un proceso", () => {
  /* Sin `spawn` a propósito: esto lo corre una routine desatendida y un
     proceso que se cuelga la voltea entera. */
  assert.equal(hayComando("node", process.env.PATH), true);
  assert.equal(hayComando("no-existe-este-comando-99", process.env.PATH), false);
  assert.equal(hayComando("node", ""), false);
});

prueba("un repo con pubspec.yaml y sin `dart` NO se puede verificar acá", () => {
  /* El caso real del 2026-09-22: la sesión perdió el SDK de Dart al
     reiniciarse el contenedor. Un pendiente de `sitd-hilux` elegido ese día
     sólo podía terminar sin entregar, o entregado sin verificar. */
  const io = { hayArchivo: (c, m) => m === "pubspec.yaml", hayComando: () => false };
  const h = herramientaQueFalta("sitd-hilux", io);
  assert.ok(h, "tendría que faltar algo");
  assert.equal(h.manda, "dart");
});

prueba("con `dart` puesto, no falta nada", () => {
  const io = { hayArchivo: (c, m) => m === "pubspec.yaml", hayComando: () => true };
  assert.equal(herramientaQueFalta("sitd-hilux", io), null);
});

prueba("un repo de JavaScript no pide nada: `node` está siempre", () => {
  const io = { hayArchivo: () => false, hayComando: () => false };
  assert.equal(herramientaQueFalta("datos", io), null);
});

titulo("Qué tocar ahora: por qué NO se toca un pendiente");

const ctxBase = {
  abiertosIds: new Set(["a", "b"]),
  repoDe: new Map([["datos", "datos"], ["hilux", "sitd-hilux"]]),
  reservas: [],
  sesion: "yo",
  adjunto: () => true,
  faltaHerramienta: () => null,
};

prueba("uno de Mauro se descarta por ser de Mauro, y eso es lo que se dice", () => {
  const r = porQueNoSeToca({ id: "a", quien: "mauro", proyecto: "datos" }, ctxBase);
  assert.equal(r.codigo, "de-mauro");
});

prueba("el motivo de Mauro GANA aunque además esté trabado", () => {
  /* El orden de los chequeos es el del motivo que se imprime: del más general
     al más circunstancial. Decir «espera a b» de algo que no es mío haría
     pensar que se destraba solo. */
  const r = porQueNoSeToca(
    { id: "a", quien: "mauro", proyecto: "datos", esperaA: ["b"] }, ctxBase);
  assert.equal(r.codigo, "de-mauro");
});

prueba("uno trabado por otro ABIERTO se descarta, y nombra a cuál espera", () => {
  const r = porQueNoSeToca(
    { id: "a", quien: "claude", proyecto: "datos", esperaA: ["b"] }, ctxBase);
  assert.equal(r.codigo, "trabado");
  assert.match(r.texto, /\bb\b/);
});

prueba("uno con pregunta sin responder se descarta: empezarlo es trabajo a tirar", () => {
  const r = porQueNoSeToca(
    { id: "a", quien: "claude", proyecto: "datos", pregunta: "¿y?" }, ctxBase);
  assert.equal(r.codigo, "sin-respuesta");
});

prueba("contestada, deja de descartarse", () => {
  const r = porQueNoSeToca(
    { id: "a", quien: "claude", proyecto: "datos", pregunta: "¿y?", respuesta: "sí" }, ctxBase);
  assert.equal(r, null);
});

prueba("EL SEMÁFORO: si el repo lo tiene otro chat, no se toca", () => {
  const ctx = { ...ctxBase, reservas: [{
    repo: "datos", sesion: "otro", chat: "el otro chat",
    vence: new Date(Date.now() + 60 * 60000).toISOString() }] };
  const r = porQueNoSeToca({ id: "a", quien: "claude", proyecto: "datos" }, ctx);
  assert.equal(r.codigo, "repo-ocupado");
  assert.match(r.texto, /el otro chat/);
});

prueba("MI PROPIA reserva no me bloquea — si no, no podría renovar", () => {
  /* Es el «un chat se bloquea a sí mismo» que el § 2.1 sexies ya nombra para
     las reservas, y que acá volvería por la ventana. */
  const ctx = { ...ctxBase, reservas: [{
    repo: "datos", sesion: "yo", chat: "yo",
    vence: new Date(Date.now() + 60 * 60000).toISOString() }] };
  assert.equal(porQueNoSeToca({ id: "a", quien: "claude", proyecto: "datos" }, ctx), null);
});

prueba("una reserva VENCIDA no bloquea: el semáforo se rompe hacia el verde", () => {
  const ctx = { ...ctxBase, reservas: [{
    repo: "datos", sesion: "otro",
    vence: new Date(Date.now() - 60000).toISOString() }] };
  assert.equal(porQueNoSeToca({ id: "a", quien: "claude", proyecto: "datos" }, ctx), null);
});

prueba("un repo que no está adjunto a esta sesión se descarta (§ 4.1)", () => {
  const ctx = { ...ctxBase, adjunto: () => false };
  const r = porQueNoSeToca({ id: "a", quien: "claude", proyecto: "hilux" }, ctx);
  assert.equal(r.codigo, "no-adjunto");
});

prueba("y uno que no se puede verificar acá también, DICIENDO qué falta", () => {
  const ctx = { ...ctxBase,
    faltaHerramienta: () => ({ manda: "dart", queEs: "el SDK de Dart/Flutter" }) };
  const r = porQueNoSeToca({ id: "a", quien: "claude", proyecto: "hilux" }, ctx);
  assert.equal(r.codigo, "sin-herramienta");
  assert.match(r.texto, /dart/);
});

prueba("un proyecto SIN repo declarado pasa, y no se lo descarta a ciegas", () => {
  /* `general` no tiene documento en `proyectos/`. Descartarlo sería esconder
     trabajo por una ficha incompleta; dejarlo pasar sin avisar sería el choque
     que el semáforo evita. Pasa CON AVISO — y el aviso se comprueba abajo. */
  assert.equal(porQueNoSeToca({ id: "a", quien: "claude", proyecto: "general" }, ctxBase), null);
});

titulo("Qué tocar ahora: el orden de los tres términos");

const ctxOrden = { ...ctxBase, abiertosIds: new Set(), repoDe: new Map([["p", "datos"]]) };
const mio = (id, extra) => ({ id, quien: "claude", proyecto: "p", ...extra });

prueba("1º manda TU prioridad, y ningún cálculo la pasa por arriba", () => {
  /* § 9: la propone el agente y la corrige Mauro, porque él sabe qué le urge.
     Acá el de media destraba tres y el de alta ninguno: gana el de alta. */
  const lista = [
    mio("z", { prioridad: "media" }),
    mio("a", { prioridad: "alta" }),
    mio("b", { esperaA: ["z"] }), mio("c", { esperaA: ["z"] }), mio("d", { esperaA: ["z"] }),
  ];
  const { elegibles } = queTocarAhora(lista, ctxOrden);
  assert.equal(elegibles[0].p.id, "a");
});

prueba("2º a igual prioridad, gana el que DESTRABA más", () => {
  const lista = [
    mio("m", { prioridad: "media" }),
    mio("n", { prioridad: "media" }),
    mio("x", { prioridad: "media", esperaA: ["n"] }),
  ];
  const { elegibles } = queTocarAhora(lista, ctxOrden);
  assert.equal(elegibles[0].p.id, "n");
  assert.equal(elegibles[0].destraba, 1);
});

prueba("3º a igual todo, gana el repo que este chat YA tiene reservado", () => {
  /* Es la única medida de costo que se puede tomar sin inventar un campo:
     seguir donde ya se está ahorra la reserva, el CLAUDE.md del otro repo y su
     banco de pruebas. */
  const ctx = { ...ctxOrden,
    repoDe: new Map([["aca", "datos"], ["alla", "remate"]]),
    reservas: [{ repo: "datos", sesion: "yo",
                 vence: new Date(Date.now() + 60 * 60000).toISOString() }] };
  const lista = [
    { id: "b-alla", quien: "claude", proyecto: "alla", prioridad: "media" },
    { id: "z-aca", quien: "claude", proyecto: "aca", prioridad: "media" },
  ];
  const { elegibles } = queTocarAhora(lista, ctx);
  assert.equal(elegibles[0].p.id, "z-aca", "el del repo reservado va primero");
  assert.equal(elegibles[0].yaReservado, true);
});

prueba("y con todo igual desempata el id: dos sesiones eligen LO MISMO", () => {
  /* Es la propiedad que hace que esto sea un criterio unificado y no una
     opinión: sin un desempate determinado, dos chats con los mismos datos
     podrían elegir distinto según cómo vino ordenada la lista. */
  const lista = [mio("b", { prioridad: "alta" }), mio("a", { prioridad: "alta" })];
  const a = queTocarAhora(lista, ctxOrden).elegibles.map((x) => x.p.id);
  const b = queTocarAhora(lista.slice().reverse(), ctxOrden).elegibles.map((x) => x.p.id);
  assert.deepEqual(a, ["a", "b"]);
  assert.deepEqual(a, b);
});

prueba("sin prioridad se cae al fondo: no declararla no es declararla alta", () => {
  const lista = [mio("sin"), mio("baja", { prioridad: "baja" })];
  assert.equal(queTocarAhora(lista, ctxOrden).elegibles[0].p.id, "baja");
});

titulo("Qué tocar ahora: lo que devuelve");

prueba("los descartados vienen CON el motivo, no sólo contados", () => {
  const lista = [
    { id: "a", quien: "mauro", proyecto: "p" },
    { id: "b", quien: "claude", proyecto: "p", pregunta: "¿?" },
  ];
  const { elegibles, descartados } = queTocarAhora(lista, ctxOrden);
  assert.equal(elegibles.length, 0);
  assert.equal(descartados.length, 2);
  for (const d of descartados) assert.ok(d.codigo && d.texto, "sin motivo no se puede auditar");
});

prueba("el elegible de un proyecto sin repo trae el AVISO del semáforo", () => {
  const { elegibles } = queTocarAhora(
    [{ id: "a", quien: "claude", proyecto: "desconocido", prioridad: "alta" }], ctxOrden);
  assert.equal(elegibles.length, 1);
  assert.equal(elegibles[0].carpeta, null);
  assert.match(elegibles[0].aviso, /sitio\.repo/);
  assert.match(elegibles[0].aviso, /SEMÁFORO/);
});

prueba("una lista vacía no rompe y no inventa un candidato", () => {
  const r = queTocarAhora([], ctxOrden);
  assert.deepEqual(r.elegibles, []);
  assert.deepEqual(r.descartados, []);
});

titulo("Qué tocar ahora: lo que la pantalla NO puede dejar de decir");

prueba("si no hay elegibles, se imprimen los MOTIVOS y no una lista vacía", () => {
  /* Tercera vez que este ecosistema arregla lo mismo: «no hay nada que hacer»
     y «hay cuatro cosas y las cuatro están frenadas» son estados opuestos que
     sin el motivo al lado se ven idénticos. */
  assert.match(fuente, /NINGUNO se puede empezar ahora/);
  assert.match(fuente, /NO INVENTES trabajo para llenar la corrida/);
});

prueba("y la pantalla dice que esto ORDENA pero no verifica", () => {
  /* El 2026-09-22 `hilux:R3` decía que unas reglas no estaban publicadas y
     hacía días que lo estaban. Un orden calculado no arregla eso: el que lee
     tiene que comprobar que el pendiente todavía sea cierto. */
  assert.match(fuente, /TODAVÍA/);
  assert.match(fuente, /Esto ordena; no verifica/);
});

prueba("sin saber quién sos, la ronda lo DICE en vez de descartarte lo tuyo", () => {
  assert.match(fuente, /no sé quién sos/);
  assert.match(fuente, /--chat/);
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
