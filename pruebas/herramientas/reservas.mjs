// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/reservas.mjs — Banco del completado de reservas.
//
//   node pruebas/herramientas/reservas.mjs
//
// Sin red. Lo que importa probar acá no es que complete, es que NO complete
// lo que no le toca: un mensaje de un huésped que pide cambiar las fechas,
// anular o bajar el precio tiene que rebotar, con el motivo dicho.
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";
import { limpiar, digitos, telefonoEn, mismoTelefono, paisDeTelefono, codigoAirbnb, nombreDeAirbnb,
         faltantes, vincular, planCompletar, PERMITIDOS, DE_MAURO, fechasEn, cabanaDeAnuncio, esConfirmacion } from "../../herramientas/reservas.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const titulo = (t) => console.log("\n" + t);

// Datos con la forma de la base real (las marcas invisibles incluidas).
const AIRBNB = { id: "a1", origen: "airbnb", estado: "confirmada", cabanaId: "c2", checkIn: "2027-01-03", checkOut: "2027-01-12",
  clienteId: null, clienteNombre: "Airbnb · HMKAYYR3FJ Amparo Gualadupe", notas: "‪+54 342 516-5677‬", adultos: 5, ninos: 0, horaEntrada: "14:00" };
const DIRECTA = { id: "d1", origen: "directa", estado: "confirmada", cabanaId: "c3", checkIn: "2026-12-20", checkOut: "2026-12-28",
  clienteId: "cD", clienteNombre: "Darío Américo Morini", notas: "Hay 2 niños en esta reserva", adultos: 4, ninos: 0, horaEntrada: "14:00" };
const CLI_D = { id: "cD", nombre: "Darío Américo Morini", telefono: "+54 9 3547 55-1234", pais: "Argentina" };

titulo("Los teléfonos y los códigos");
prueba("las marcas invisibles de Airbnb/WhatsApp no rompen nada", () => {
  assert.equal(limpiar("‪+54 342‬"), "+54 342");
  assert.equal(digitos("⁦+55 (32) 99926-4723⁩"), "553299926472" + "3");
});
prueba("un teléfono se encuentra dentro de un texto, y un número corto no es un teléfono", () => {
  assert.equal(telefonoEn("llamame al ‪+54 351 246-8459‬ gracias"), "+54 351 246-8459");
  assert.equal(telefonoEn("somos 4 adultos y 2 niños"), "");
  assert.equal(telefonoEn("099 123 456"), "099 123 456");
});
prueba("el mismo teléfono con y sin el 9 o el código de país es el mismo", () => {
  assert.ok(mismoTelefono("+54 9 342 516-5677", "3425165677"));
  assert.ok(!mismoTelefono("+54 342 516-5677", "+54 342 516-9999"));
  assert.ok(!mismoTelefono("1234", "1234"));
});
prueba("el país sale del prefijo, y sin + no se adivina", () => {
  assert.equal(paisDeTelefono("+598 99 123 456"), "Uruguay");
  assert.equal(paisDeTelefono("+54 342 516-5677"), "Argentina");
  assert.equal(paisDeTelefono("+55 32 99926-4723"), "Brasil");
  assert.equal(paisDeTelefono("342 516 5677"), "");
});
prueba("el código de Airbnb y el nombre que dejó el sincronizador", () => {
  assert.equal(codigoAirbnb("tu reserva HMKAYYR3FJ está confirmada"), "HMKAYYR3FJ");
  assert.equal(nombreDeAirbnb("Airbnb · HMKAYYR3FJ Amparo Gualadupe"), "Amparo Gualadupe");
  assert.equal(nombreDeAirbnb("Airbnb · HM34N3C4W8"), "");
});

titulo("Lo que le falta a una reserva");
prueba("una de Airbnb recién importada: sin cliente, nombre dudoso, teléfono sólo en las notas", () => {
  const f = faltantes(AIRBNB, null, { hoy: "2026-12-20" }).map((x) => x.campo);
  assert.deepEqual(f.slice(0, 3), ["cliente", "nombre", "telefono"]);
  assert.ok(f.includes("llegada"));
});
prueba("las notas dicen «2 niños» y la reserva 0: se avisa con los dos números", () => {
  const f = faltantes(DIRECTA, CLI_D, { hoy: "2026-12-01" });
  assert.ok(f.some((x) => x.campo === "ninos" && /2 niños/.test(x.texto) && /dice 0/.test(x.texto)));
});
prueba("la hora de llegada se pide sólo cuando faltan tres semanas o menos", () => {
  assert.ok(!faltantes(DIRECTA, CLI_D, { hoy: "2026-10-01" }).some((x) => x.campo === "llegada"));
  assert.ok(faltantes(DIRECTA, CLI_D, { hoy: "2026-12-05" }).some((x) => x.campo === "llegada"));
  assert.ok(!faltantes({ ...DIRECTA, horaEntrada: "18:00" }, CLI_D, { hoy: "2026-12-05" }).some((x) => x.campo === "llegada"));
});
prueba("un nombre con «?» es dudoso aunque tenga cliente", () => {
  assert.ok(faltantes({ ...DIRECTA, clienteNombre: "Alejandro? Uruguay" }, { nombre: "Alejandro? Uruguay", telefono: "1" }, {}).some((x) => x.campo === "nombre"));
});
prueba("un acuerdo en cero avisa que falta el precio", () => {
  assert.ok(faltantes(DIRECTA, CLI_D, { grupo: { total: 0 } }).some((x) => x.campo === "precio"));
});

titulo("A qué reserva se refiere un chat");
const RS = [AIRBNB, DIRECTA, { ...DIRECTA, id: "d2", cabanaId: "c2" }, { ...AIRBNB, id: "vieja", checkOut: "2026-01-01" }];
prueba("por el teléfono del título del chat (WhatsApp sin agendar)", () => {
  const v = vincular({ chat: "+54 9 342 516-5677", textos: ["hola, llegamos a las 19"] }, RS, [CLI_D], "2026-12-01");
  assert.equal(v.reserva.id, "a1"); assert.ok(v.por.includes("teléfono"));
});
prueba("por el nombre (una notificación de Airbnb con el nombre del huésped)", () => {
  const v = vincular({ chat: "Amparo", textos: ["¿hay toallas?"] }, RS, [CLI_D], "2026-12-01");
  assert.equal(v.reserva.id, "a1");
});
prueba("las dos cabañas del mismo cliente son UNA estadía, no un empate", () => {
  const v = vincular({ chat: "Darío Morini", textos: [] }, RS, [CLI_D], "2026-12-01");
  assert.equal(v.reserva.clienteId, "cD"); assert.equal(v.todas.length, 2);
});
prueba("un chat que no se parece a nada no se vincula, y lo dice", () => {
  const v = vincular({ chat: "Mamá", textos: ["¿venís el domingo?"] }, RS, [CLI_D], "2026-12-01");
  assert.equal(v.reserva, null); assert.ok(v.motivo);
});
prueba("una reserva que ya terminó hace días no se toma, y una anulada tampoco", () => {
  const v = vincular({ chat: "Amparo", textos: [] }, [{ ...AIRBNB, checkOut: "2026-11-01" }, { ...AIRBNB, id: "x", estado: "anulada" }], [], "2026-12-01");
  assert.equal(v.reserva, null);
});

titulo("Los avisos de Airbnb: fechas y alojamiento, no teléfono (el caso del 29-sep)");
const CABS = [{ id: "c1", nombre: { es: "Cabaña con vista al bosque" } }, { id: "c2", nombre: { es: "Loft con terraza", pt: "Loft com terraço" } },
              { id: "c3", nombre: { es: "Departamento para familias" } }];
prueba("las fechas, en los tres formatos que manda Airbnb", () => {
  assert.deepEqual(fechasEn("para el periodo del 20 de noviembre de 2026 al 22 de noviembre de 2026 (2 noches)", "2026-09-29"), { desde: "2026-11-20", hasta: "2026-11-22" });
  assert.deepEqual(fechasEn("20–22 nov • Loft en Canasvieiras", "2026-09-29"), { desde: "2026-11-20", hasta: "2026-11-22" });
  assert.deepEqual(fechasEn("el día 20–22 nov 2026", "2026-09-29"), { desde: "2026-11-20", hasta: "2026-11-22" });
  assert.deepEqual(fechasEn("30 dic – 3 ene", "2026-09-29"), { desde: "2026-12-30", hasta: "2027-01-03" });
  assert.equal(fechasEn("Nueva consulta", "2026-09-29"), null);
});
prueba("sin año, el próximo en que caen: en noviembre, «5–8 feb» es el año que viene", () => {
  assert.deepEqual(fechasEn("5–8 feb", "2026-11-10"), { desde: "2027-02-05", hasta: "2027-02-08" });
});
prueba("el anuncio de Airbnb se reconoce por una palabra del nombre de la cabaña", () => {
  assert.equal(cabanaDeAnuncio("Loft en Canasvieiras cerquita de la playa", CABS), "c2");
  assert.equal(cabanaDeAnuncio("Casa linda en la playa", CABS), null);
});
prueba("una consulta o una solicitud no son una reserva; «ha reservado» sí", () => {
  assert.ok(esConfirmacion("Natalia ha reservado «Loft…»"));
  assert.ok(!esConfirmacion("A Natalia le gustaría reservar tu espacio"));
  assert.ok(!esConfirmacion("Nueva consulta para una reserva"));
});
prueba("una reserva confirmada que Casa Verde no tiene se avisa como NUEVA, con fechas y cabaña", () => {
  const v = vincular({ chat: "Nueva reserva confirmada", textos: ["Natalia ha reservado «Loft en Canasvieiras cerquita de la playa» para el periodo del 20 de noviembre de 2026 al 22 de noviembre de 2026 (2 noches)."] },
    RS, [CLI_D], "2026-09-29", CABS);
  assert.equal(v.reserva, null);
  assert.deepEqual(v.nueva, { desde: "2026-11-20", hasta: "2026-11-22", cabanaId: "c2" });
});
prueba("y cuando ya entró, el mismo aviso se vincula por fechas y alojamiento", () => {
  const NAT = { id: "n1", origen: "airbnb", estado: "confirmada", cabanaId: "c2", checkIn: "2026-11-20", checkOut: "2026-11-22", clienteId: null, clienteNombre: "Airbnb · HMABCDEF12" };
  const v = vincular({ chat: "20–22 nov • Loft en Canasvieiras cerquita de la playa: Natalia", textos: ["¿A qué hora es el check-in?"] }, [...RS, NAT], [CLI_D], "2026-09-29", CABS);
  assert.equal(v.reserva.id, "n1"); assert.ok(v.por.includes("fechas y alojamiento"));
  // La misma fecha en OTRA cabaña no es ésta.
  assert.equal(vincular({ chat: "20–22 nov • Loft", textos: [] }, [{ ...NAT, cabanaId: "c1" }], [], "2026-09-29", CABS).reserva, null);
});

titulo("Completar: lo que sí y lo que NO");
prueba("de un mensaje de Airbnb: crea el cliente con el país del prefijo, y la llegada", () => {
  const p = planCompletar(AIRBNB, null, { cliente: { nombre: "Amparo Gualadupe", telefono: "‪+54 342 516-5677‬" }, llegada: "19:30" }, { fuente: "Airbnb", ahora: "2026-12-20T10:00:00Z" });
  assert.equal(p.clienteNuevo.nombre, "Amparo Gualadupe");
  assert.equal(p.clienteNuevo.telefono, "+54 342 516-5677");
  assert.equal(p.clienteNuevo.pais, "Argentina");
  assert.equal(p.clienteNuevo.llegoPor, "airbnb");
  assert.equal(p.reserva.horaEntrada, "19:30");
  assert.deepEqual(p.rechazados, []);
});
prueba("«cambiame al martes», «anulá» y «haceme precio» REBOTAN, con el motivo", () => {
  const p = planCompletar(AIRBNB, null, { checkIn: "2027-01-05", estado: "anulada", precio: 100, cabanaId: "c1" });
  assert.equal(p.rechazados.length, 4);
  assert.ok(p.rechazados.every((r) => /las decide Mauro/.test(r)));
  assert.equal(p.vacio, true);
  assert.deepEqual(Object.keys(p.reserva), []);
});
prueba("un campo inventado tampoco pasa", () => {
  const p = planCompletar(DIRECTA, CLI_D, { descuento: 10 });
  assert.ok(/no es un campo/.test(p.rechazados[0]));
});
prueba("lo que escribió una persona en el cliente no se pisa; lo vacío o dudoso sí se completa", () => {
  const p = planCompletar(DIRECTA, CLI_D, { cliente: { nombre: "Dario M.", email: "d@x.com", telefono: "3547551234" } });
  assert.deepEqual(p.clienteCambios, { email: "d@x.com" });
  assert.ok(p.rechazados.some((r) => /cliente\.nombre: ya dice/.test(r)));
  assert.ok(!p.rechazados.some((r) => /telefono/.test(r)), "el mismo teléfono escrito distinto no es un conflicto");
  const q = planCompletar(DIRECTA, { nombre: "Alejandro? Uruguay" }, { cliente: { nombre: "Alejandro Pérez" } });
  assert.deepEqual(q.clienteCambios, { nombre: "Alejandro Pérez" });
});
prueba("niños y adultos: enteros razonables; una hora tiene que ser una hora", () => {
  const p = planCompletar(DIRECTA, CLI_D, { ninos: 2, adultos: 0, llegada: "a la tarde" });
  assert.equal(p.reserva.ninos, 2);
  assert.ok(p.rechazados.some((r) => /adultos/.test(r)));
  assert.ok(p.rechazados.some((r) => /llegada/.test(r)));
  assert.equal(planCompletar(DIRECTA, CLI_D, { ninos: "dos" }).rechazados.length, 1);
});
prueba("la nota se AGREGA con sello, y la misma nota dos veces no se repite", () => {
  const p = planCompletar(DIRECTA, CLI_D, { nota: "llevan una perrita" }, { fuente: "WhatsApp", ahora: "2026-12-10T10:00:00Z" });
  assert.ok(p.reserva.notas.startsWith("Hay 2 niños en esta reserva\n[Claude · WhatsApp · 10/12] llevan una perrita"));
  assert.equal(planCompletar({ ...DIRECTA, notas: p.reserva.notas }, CLI_D, { nota: "llevan una perrita" }).vacio, true);
});
prueba("lo que ya estaba igual no cuenta como cambio", () => {
  assert.equal(planCompletar(DIRECTA, CLI_D, { adultos: 4, ninos: 0, llegada: "14:00" }).vacio, true);
});
prueba("la lista de lo permitido y lo de Mauro no se pisan", () => {
  for (const k of PERMITIDOS) assert.ok(!(k in DE_MAURO), k);
  for (const k of ["checkIn", "checkOut", "cabanaId", "estado", "precio"]) assert.ok(k in DE_MAURO, k);
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
