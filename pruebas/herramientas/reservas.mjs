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
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { limpiar, digitos, telefonoEn, mismoTelefono, paisDeTelefono, codigoAirbnb, nombreDeAirbnb,
         faltantes, vincular, planCompletar, PERMITIDOS, DE_MAURO, fechasEn, cabanaDeAnuncio, esConfirmacion, ultimos4, capturasSinLeer,
         llegadasPorAvisar, avisoDeLlegada, cuandoLlega } from "../../herramientas/reservas.mjs";

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

titulo("Lo que trae el importador de Airbnb (el caso de Natalia)");
const NATI = { id: "n1", origen: "airbnb", estado: "confirmada", cabanaId: "c2", checkIn: "2026-11-20", checkOut: "2026-11-22",
  clienteId: null, clienteNombre: "Airbnb · HM2DNEZXSP", adultos: 2, ninos: 0, horaEntrada: "14:00",
  notas: "Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM2DNEZXSP\\nPhone Number (Last 4 Digits): 2041",
  historial: [{ autorNombre: "Sync Airbnb", cambio: "importada desde Airbnb" }] };
prueba("los últimos 4 dígitos del teléfono salen de las notas del calendario", () => {
  assert.equal(ultimos4(NATI.notas), "2041");
  assert.equal(ultimos4("sin nada"), "");
});
prueba("los 2 adultos del importador se marcan como no confirmados; si alguien los tocó, no", () => {
  assert.ok(faltantes(NATI, null, {}).some((x) => x.campo === "personas"));
  assert.ok(!faltantes({ ...NATI, historial: [...NATI.historial, { autorNombre: "Florencia", cambio: "adultos 2 → 2" }] }, null, {}).some((x) => x.campo === "personas"));
  assert.ok(!faltantes({ ...NATI, adultos: 4 }, null, {}).some((x) => x.campo === "personas"));
});
prueba("al darle cliente a una de Airbnb, el título suma el nombre y CONSERVA el código", () => {
  const p = planCompletar(NATI, null, { cliente: { nombre: "Natalia" } });
  assert.equal(p.reserva.clienteNombre, "Airbnb · HM2DNEZXSP Natalia");
  // Si ya tiene nombre, no se toca.
  assert.equal(planCompletar({ ...NATI, clienteNombre: "Airbnb · HM2DNEZXSP Nati" }, null, { cliente: { nombre: "Natalia" } }).reserva.clienteNombre, undefined);
});
prueba("un teléfono que termina en esos 4 dígitos apunta a esa reserva", () => {
  const v = vincular({ chat: "+55 48 99123-2041", textos: ["oi, chegamos às 16h"] }, [NATI], [], "2026-10-01", []);
  assert.equal(v.reserva.id, "n1"); assert.ok(v.por.includes("últimos 4 del teléfono"));
});

titulo("Las capturas de Airbnb");
prueba("se listan las que no se leyeron; lo anotado en leidas.json no vuelve", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "cap-"));
  fs.mkdirSync(path.join(d, "capturas", "2026-09-29"), { recursive: true });
  fs.writeFileSync(path.join(d, "capturas", "2026-09-29", "a_com.airbnb.android.jpg"), "x");
  fs.writeFileSync(path.join(d, "capturas", "2026-09-29", "b_com.airbnb.android.jpg"), "x");
  fs.writeFileSync(path.join(d, "capturas", "leidas.json"), JSON.stringify([path.join("2026-09-29", "a_com.airbnb.android.jpg")]));
  assert.deepEqual(capturasSinLeer(d).map((f) => path.basename(f)), ["b_com.airbnb.android.jpg"]);
  assert.deepEqual(capturasSinLeer(path.join(d, "no-existe")), []);
});

titulo("Completar: lo que sí y lo que NO");
prueba("de un mensaje de Airbnb: crea el cliente con el país del prefijo, y la llegada", () => {
  const p = planCompletar(AIRBNB, null, { cliente: { nombre: "Amparo Gualadupe", telefono: "‪+54 342 516-5677‬" }, llegada: "19:30" }, { fuente: "Airbnb", ahora: "2026-12-20T10:00:00Z" });
  assert.equal(p.clienteNuevo.nombre, "Amparo Gualadupe");
  assert.equal(p.clienteNuevo.telefono, "+54 342 516-5677");
  assert.equal(p.clienteNuevo.pais, "Argentina");
  assert.equal(p.clienteNuevo.llegoPor, "airbnb");
  assert.equal(p.reserva.llegadaEstimada, "19:30");
  assert.equal(p.reserva.horaEntrada, undefined, "la hora de entrada es la de la casa, no la del huésped");
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
  assert.equal(planCompletar({ ...DIRECTA, llegadaEstimada: "14:00" }, CLI_D, { adultos: 4, ninos: 0, llegada: "14:00" }).vacio, true);
});
prueba("la lista de lo permitido y lo de Mauro no se pisan", () => {
  for (const k of PERMITIDOS) assert.ok(!(k in DE_MAURO), k);
  for (const k of ["checkIn", "checkOut", "cabanaId", "estado", "precio"]) assert.ok(k in DE_MAURO, k);
});

titulo("Lo que sabemos del huésped (reservas-4)");
prueba("bebés, mascota, llegada y pedidos se completan", () => {
  const p = planCompletar(DIRECTA, CLI_D, { bebes: 1, mascotas: "1 perrita", llegada: "21:00", pedidos: ["cuna", "  cuna "] },
    { fuente: "WhatsApp", ahora: "2026-12-10T10:00:00Z" });
  assert.equal(p.reserva.bebes, 1);
  assert.equal(p.reserva.mascotas, "1 perrita");
  assert.equal(p.reserva.llegadaEstimada, "21:00");
  assert.deepEqual(p.reserva.pedidos, [{ texto: "cuna", estado: "pendiente", fuente: "whatsapp", fecha: "2026-12-10" }]);
  assert.deepEqual(p.rechazados, []);
});
prueba("un pedido que ya está no se repite, y los anteriores se conservan con su estado", () => {
  const r = { ...DIRECTA, pedidos: [{ texto: "Cuna", estado: "resuelto", fuente: "panel", fecha: "2026-12-01" }] };
  assert.equal(planCompletar(r, CLI_D, { pedidos: ["cuna"] }).vacio, true);
  const p = planCompletar(r, CLI_D, { pedidos: "toallas extra" });
  assert.equal(p.reserva.pedidos.length, 2);
  assert.equal(p.reserva.pedidos[0].estado, "resuelto");
});
prueba("la mascota que escribió una persona no se pisa; la llegada nueva del huésped sí", () => {
  const r = { ...DIRECTA, mascotas: "un gato", llegadaEstimada: "18:00" };
  const p = planCompletar(r, CLI_D, { mascotas: "dos perros", llegada: "20:00" });
  assert.ok(p.rechazados.some((x) => /mascotas/.test(x)));
  assert.equal(p.reserva.llegadaEstimada, "20:00");
});
prueba("cantidades y horas raras rebotan", () => {
  const p = planCompletar(DIRECTA, CLI_D, { bebes: -1, llegada: "25:00", contacto: { canal: "telegram", idioma: "klingon", telefono: "123" } });
  assert.equal(p.vacio, true);
  for (const k of ["bebes", "llegada", "contacto.canal", "contacto.idioma", "contacto.telefono"]) assert.ok(p.rechazados.some((x) => x.startsWith(k)), k);
});
prueba("el teléfono del chat va al contacto de la reserva Y a la ficha del cliente que no lo tiene", () => {
  const cli = { id: "cN", nombre: "Natalia" };
  const r = { ...AIRBNB, clienteId: "cN", clienteNombre: "Airbnb · HM2DNEZXSP Natalia" };
  const p = planCompletar(r, cli, { contacto: { telefono: "+55 48 99912-3456", canal: "whatsapp", idioma: "pt" } });
  assert.equal(p.reserva.contacto.telefono, "+55 48 99912-3456");
  assert.equal(p.reserva.contacto.canal, "whatsapp");
  assert.equal(p.reserva.contacto.idioma, "pt");
  assert.equal(p.clienteCambios.telefono, "+55 48 99912-3456");
  assert.equal(p.clienteCambios.pais, "Brasil");
});
prueba("un teléfono de contacto distinto al que ya está no se pisa; el mismo escrito distinto no es conflicto", () => {
  const r = { ...DIRECTA, contacto: { telefono: "+54 9 3547 55-1234", canal: "whatsapp", idioma: "" } };
  assert.ok(planCompletar(r, CLI_D, { contacto: { telefono: "+54 11 5555-0000" } }).rechazados.some((x) => /contacto.telefono/.test(x)));
  const p = planCompletar(r, CLI_D, { contacto: { telefono: "3547551234", idioma: "es" } });
  assert.deepEqual(p.rechazados, []);
  assert.deepEqual(p.reserva.contacto, { telefono: "+54 9 3547 55-1234", canal: "whatsapp", idioma: "es" });
});
prueba("sin teléfono en ningún lado, faltantes pide pedírselo; con el de contacto, no falta", () => {
  const r = { ...AIRBNB, notas: "sin nada" };
  const f = faltantes(r, null, {}).find((x) => x.campo === "telefono");
  assert.ok(f && f.pedir);
  assert.ok(!faltantes({ ...r, contacto: { telefono: "+55 48 99912-3456" } }, null, {}).some((x) => x.campo === "telefono"));
});
prueba("un bebé en las notas se cuenta como bebé, no como niño", () => {
  const r = { ...DIRECTA, notas: "vienen con 1 bebé", ninos: 0 };
  const f = faltantes(r, CLI_D, {}).map((x) => x.campo);
  assert.ok(f.includes("bebes")); assert.ok(!f.includes("ninos"));
  assert.ok(!faltantes({ ...r, bebes: 1 }, CLI_D, {}).some((x) => x.campo === "bebes"));
});
prueba("la llegada ya sabida (en llegadaEstimada) no se vuelve a pedir", () => {
  assert.ok(!faltantes({ ...DIRECTA, llegadaEstimada: "20:00" }, CLI_D, { hoy: "2026-12-05" }).some((x) => x.campo === "llegada"));
});
prueba("vincular devuelve el teléfono del chat sólo si la reserva no lo tiene; si el chat es agendado, lo dice", () => {
  const r = { ...AIRBNB, id: "n1", clienteNombre: "Airbnb · HM2DNEZXSP Natalia", notas: "Phone Number (Last 4 Digits): 3456", checkIn: "2026-11-20", checkOut: "2026-11-22" };
  const v = vincular({ app: "whatsapp", chat: "+55 48 99912-3456", textos: ["Oi, sou a Natalia"] }, [r], [], "2026-10-01");
  assert.equal(v.reserva.id, "n1");
  assert.equal(v.telefono, "+55 48 99912-3456");
  const v2 = vincular({ app: "whatsapp", chat: "Natalia Airbnb", textos: ["Oi"] }, [r], [], "2026-10-01");
  assert.equal(v2.reserva.id, "n1"); assert.equal(v2.telefono, ""); assert.equal(v2.agendado, true);
  const v3 = vincular({ app: "whatsapp", chat: "+55 48 99912-3456", textos: [] }, [{ ...r, contacto: { telefono: "+55 48 99912-3456" } }], [], "2026-10-01");
  assert.equal(v3.telefono, "");
});

titulo("Las llegadas: el aviso para quien recibe (reservas-5)");
const LL = (o) => ({ id: "x", estado: "confirmada", cabanaId: "c2", checkIn: "2026-10-02", checkOut: "2026-10-04", adultos: 2, ninos: 0, horaEntrada: "14:00", ...o });
prueba("entran las confirmadas de los próximos 3 días que no se avisaron; un acuerdo es UNA llegada", () => {
  const rs = [LL({ id: "a" }), LL({ id: "b", estado: "presupuesto" }), LL({ id: "c", checkIn: "2026-10-05" }),
    LL({ id: "d", bienvenida: { avisadaEn: "2026-09-28" } }), LL({ id: "e", bienvenida: { enviadaEn: "2026-09-28" } }),
    LL({ id: "f", checkIn: "2026-09-28" }), LL({ id: "g1", grupoId: "G", cabanaId: "c1" }), LL({ id: "g2", grupoId: "G", cabanaId: "c3" }),
    LL({ id: "h1", grupoId: "H" }), LL({ id: "h2", grupoId: "H", bienvenida: { avisadaEn: "2026-09-29" } })];
  const l = llegadasPorAvisar(rs, "2026-09-29");
  assert.deepEqual(l.map((g) => g.map((r) => r.id)), [["g1", "g2"], ["a"]]);   // por fecha y cabaña
});
prueba("el aviso lleva nombre, cuándo, cabañas, gente, lo que falta y el enlace — y NO el teléfono", () => {
  const r = LL({ id: "r1", clienteNombre: "Airbnb · HM2DNEZXSP Natalia", clienteId: null, notas: "+55 48 99912-3456", bebes: 1, mascotas: "perro",
    pedidos: [{ texto: "cuna", estado: "pendiente" }, { texto: "x", estado: "resuelto" }] });
  const t = avisoDeLlegada([r], { cabanas: [{ id: "c2", nombre: { es: "Loft con terraza" } }], hoy: "2026-10-01" });
  assert.ok(t.includes("llega Natalia mañana"), t);
  assert.ok(t.includes("Loft con terraza · 2 noches · 2 adultos + 1 bebé + mascota · 1 pedido"), t);
  assert.ok(t.includes("a qué hora llegan"), t);
  assert.ok(t.endsWith("https://casaverdecanas.com.br/interno/llegada.html?r=r1"), t);
  assert.ok(!/\d{4}/.test(t.replace(/https:\S+/, "")), "ningún número largo fuera del enlace");
});
prueba("con teléfono y llegada sabidos, el aviso no pide nada", () => {
  const t = avisoDeLlegada([LL({ clienteId: "cD", clienteNombre: "Darío", llegadaEstimada: "20:00" })], { clientes: [CLI_D], hoy: "2026-09-25" });
  assert.ok(!t.includes("Falta"), t);
  assert.ok(t.includes("llega Darío Américo Morini el vie 02/10"), t);
});
prueba("cuándo: hoy, mañana, o el día con fecha", () => {
  assert.equal(cuandoLlega("2026-10-02", "2026-10-02"), "hoy");
  assert.equal(cuandoLlega("2026-10-03", "2026-10-02"), "mañana");
  assert.equal(cuandoLlega("2026-10-04", "2026-10-02"), "el dom 04/10");
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
