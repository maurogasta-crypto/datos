// pruebas/herramientas/consultas.mjs — Banco de herramientas/consultas.mjs.
//   node pruebas/herramientas/consultas.mjs
// Sin red: se prueban las funciones puras que arman lo que se escribe.
import assert from "node:assert/strict";
import fs from "node:fs";
import { estadoTras, mensajeNuevo, agregar, editar, quitar, ficha, tapar, idNuevo, opciones, ESTADOS, esperaRespuesta, lecciones } from "../../herramientas/consultas.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const c0 = () => ({ estado: "nueva", cliente: { nombre: "L", telefono: "+44 7398 000279" }, mensajes: [
  { en: "2026-10-26T17:09:00.000Z", quien: "cliente", texto: "segundo" },
  { en: "2026-10-26T17:07:00.000Z", quien: "cliente", texto: "primero" }] });

prueba("agregar ordena por fecha y firma Claude", () => {
  const r = agregar(c0(), mensajeNuevo({ quien: "nota", texto: "ojo", en: "2026-10-26T17:08:00Z" }));
  assert.deepEqual(r.mensajes.map((m) => m.texto), ["primero", "ojo", "segundo"]);
  assert.equal(r.mensajes[1].por, "Claude"); assert.equal(r.estado, "nueva");
});
prueba("el estado avanza como en la página; un borrador no cuenta", () => {
  assert.equal(estadoTras("nueva", { quien: "nosotros" }), "respondida");
  assert.equal(estadoTras("nueva", { quien: "nosotros", estado: "borrador" }), "nueva");
  assert.equal(estadoTras("respondida", { quien: "cliente" }), "conversacion");
  assert.equal(estadoTras("presupuesto", { quien: "cliente" }), "presupuesto");
});
prueba("un mensaje sin texto, de quien no existe o borrador de un cliente, no entra", () => {
  assert.throws(() => mensajeNuevo({ quien: "cliente", texto: "  " }));
  assert.throws(() => mensajeNuevo({ quien: "otro", texto: "x" }));
  assert.throws(() => mensajeNuevo({ quien: "cliente", texto: "x", borrador: true }));
  assert.throws(() => mensajeNuevo({ quien: "nota", texto: "x", en: "ayer" }));
});
prueba("editar cambia SÓLO el mensaje n (numerado en orden de fecha) y lo marca editado", () => {
  const r = editar(c0(), 1, { texto: "primero, corregido", trad: "traducción" });
  assert.equal(r.mensajes[0].texto, "primero, corregido"); assert.equal(r.mensajes[0].traduccion, "traducción");
  assert.equal(r.mensajes[1].texto, "segundo"); assert.ok(r.mensajes[0].editado);
  assert.throws(() => editar(c0(), 3, { texto: "x" })); assert.throws(() => editar(c0(), 1, { texto: " " }));
});
prueba("marcar mandado un borrador lo saca de borrador y deja la consulta respondida", () => {
  const c = agregar(c0(), mensajeNuevo({ quien: "nosotros", texto: "hola", borrador: true, en: "2026-10-27T10:00:00Z" }));
  const r = editar({ ...c0(), ...c }, 3, { mandado: true });
  assert.equal(r.mensajes[2].estado, undefined); assert.equal(r.estado, "respondida");
});
prueba("quitar saca uno solo", () => {
  const r = quitar(c0(), 2); assert.deepEqual(r.mensajes.map((m) => m.texto), ["primero"]);
  assert.throws(() => quitar(c0(), 0));
});
prueba("la ficha toca sólo lo que se le dice, sin perder el resto del cliente", () => {
  const r = ficha(c0(), { pais: "Reino Unido", estado: "presupuesto" });
  assert.deepEqual(r.cliente, { nombre: "L", telefono: "+44 7398 000279", pais: "Reino Unido" });
  assert.equal(r.estado, "presupuesto"); assert.equal(r.mensajes, undefined);
  assert.throws(() => ficha(c0(), { estado: "inventado" })); assert.throws(() => ficha(c0(), {}));
  assert.deepEqual(ESTADOS, ["nueva", "respondida", "conversacion", "presupuesto", "cerrada"]);
});
prueba("los estados son los de consultas.html de CasaYourte (si está al lado)", () => {
  const p = new URL("../../../CasaYourte/consultas.html", import.meta.url);
  if (!fs.existsSync(p)) return;
  const h = fs.readFileSync(p, "utf8");
  for (const e of ESTADOS) assert.ok(h.includes(`["${e}",`), e);
  assert.ok(/quien: \$\("n-quien"\)/.test(h) && /value="cliente"/.test(h) && /value="nosotros"/.test(h) && /value="nota"/.test(h));
});
prueba("el teléfono se muestra tapado salvo los 3 últimos", () => {
  assert.equal(tapar("+44 7398 000279"), "+•• •••• •••279"); assert.equal(tapar(""), "");
});
prueba("el id nace de la fecha y el nombre", () => {
  assert.equal(idNuevo(new Date("2026-10-27T12:00:00Z"), "José Pérez"), "c-2026-10-27-jose-perez");
});
prueba("--texto @archivo lee el archivo", () => {
  const f = "/tmp/consultas-banco.txt"; fs.writeFileSync(f, "línea 1\nlínea 2");
  const { o, resto } = opciones(["c-1", "--quien", "cliente", "--texto", "@" + f, "--borrador"]);
  assert.deepEqual(resto, ["c-1"]); assert.equal(o.texto, "línea 1\nlínea 2"); assert.equal(o.borrador, true);
  fs.unlinkSync(f);
});
prueba("espera respuesta: lo último real es del cliente y no hay borrador después", () => {
  const m = (quien, en, extra = {}) => ({ quien, en, texto: quien + en, ...extra });
  assert.equal(esperaRespuesta({ mensajes: [m("cliente", "1")] }), true);
  assert.equal(esperaRespuesta({ mensajes: [m("cliente", "1"), m("nosotros", "2")] }), false);
  assert.equal(esperaRespuesta({ mensajes: [m("cliente", "1"), m("nosotros", "2", { estado: "borrador", por: "Claude" })] }), false);
  assert.equal(esperaRespuesta({ mensajes: [m("cliente", "1"), m("nota", "2")] }), true);
  // un borrador VIEJO, de antes de que el cliente volviera a escribir, no cuenta
  assert.equal(esperaRespuesta({ mensajes: [m("cliente", "1"), m("nosotros", "2", { estado: "borrador" }), m("cliente", "3")] }), true);
  assert.equal(esperaRespuesta({ estado: "cerrada", mensajes: [m("cliente", "1")] }), false);
  assert.equal(esperaRespuesta({ mensajes: [] }), false);
});
prueba("aprender: el borrador de Claude contra lo que se mandó de verdad", () => {
  const c = { id: "c-1", mensajes: [
    { en: "1", quien: "cliente", texto: "¿precio?" },
    { en: "2", quien: "nosotros", texto: "Hola! Depende del diámetro.", por: "Claude", estado: "mandado" },
    { en: "3", quien: "nosotros", texto: "Hola Claire! Depende del diámetro, ¿qué medida pensás?", fuente: "captura" },
    { en: "4", quien: "cliente", texto: "7 m" },
    { en: "5", quien: "nosotros", texto: "Perfecto", por: "Claude", estado: "borrador" },
    { en: "6", quien: "nosotros", texto: "perfecto ", fuente: "captura" },
    { en: "7", quien: "cliente", texto: "ok" },
    { en: "8", quien: "nosotros", texto: "Te mando el presupuesto", por: "Claude", estado: "borrador" },
  ] };
  const l = lecciones(c);
  assert.equal(l.length, 3);
  assert.equal(l[0].igual, false); assert.match(l[0].mandado, /qué medida/);
  assert.equal(l[1].igual, true);
  assert.equal(l[2].mandado, null); assert.equal(l[2].marcado, false);
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
