// pruebas/placa.mjs — el banco de la guía para armar la placa de la Hilux
// (placa.js + placa.html, 4-nov-2026). Sin npm ni red:  node pruebas/placa.mjs
// Prueba sobre todo lo que NO deja hacer: saltear la etapa A, mandar sobre el
// pedal antes de los pasos de seguridad, o sumar las opcionales al costo.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const aca = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.join(aca, "..");
const G = await import(path.join(raiz, "placa.js"));
let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

const todoHecho = (hasta) => {
  const e = { marcas: {}, compras: {}, medidas: {}, notas: {} };
  for (const s of G.SECCIONES) {
    if (hasta && !hasta.includes(s.id)) continue;
    for (const p of s.pasos || []) e.marcas[p.id] = { en: "2026-11-04T12:00:00Z" };
    for (const p of s.piezas || []) e.compras[p.id] = "llego";
  }
  return e;
};

prueba("cada paso y cada pieza tiene un id único y estable", () => {
  const ids = [...G.PASOS, ...G.PIEZAS].map((x) => x.id);
  assert.equal(new Set(ids).size, ids.length, "ids repetidos");
  for (const id of ids) assert.match(id, /^[a-z]-[a-z0-9-]+$/, id + " no sirve como ruta de un campo");
});

prueba("con todo vacío, lo que sigue es encontrar los cables y comprar la caja básica, y nada del crucero", () => {
  const s = G.siguiente({});
  const secs = s.map((x) => x.seccion);
  assert.ok(secs.includes("cables") && secs.includes("comprar-a"), secs.join(","));
  for (const b of ["medir", "decidir-b", "comprar-b", "armar-b", "probar"]) assert.ok(!secs.includes(b), b + " no puede estar abierta");
  for (const s2 of G.SECCIONES.filter((x) => x.etapa === "b")) assert.ok(G.bloqueos(s2.id, {}).length, s2.id + " del crucero sin traba");
});

prueba("la caja básica no interviene: ni pedal, ni relés, ni cortar cables", () => {
  const basicas = G.SECCIONES.filter((x) => !x.etapa);
  assert.deepEqual(basicas.map((x) => x.id), ["cables", "comprar-a", "herramientas", "armar-a", "instalar-a", "aprender"]);
  const ids = basicas.flatMap((x) => [...(x.pasos || []), ...(x.piezas || [])].map((y) => y.id));
  for (const no of ["c-fichas", "a-pedal", "c-reles", "c-dac"]) assert.ok(!ids.includes(no), no + " está en la caja básica");
  const texto = JSON.stringify(basicas);
  assert.ok(!/relé/i.test(texto), "la caja básica nombra un relé");
  for (const p of G.SECCIONES.find((x) => x.id === "cables").pasos.filter((x) => /^k-(fusible|freno|tac|vss)$/.test(x.id))) {
    assert.ok(p.buscar && p.buscar.length, p.id + " sin qué buscar");
    assert.ok(/tester/i.test(p.prueba), p.id + " no se confirma con el tester");
  }
  for (const pz of G.SECCIONES.find((x) => x.id === "comprar-a").piezas) assert.ok(pz.para !== undefined && pz.usd, pz.id);
  assert.ok(/igual/.test(G.PASOS.find((x) => x.id === "i-senales").prueba), "falta la prueba de que la camioneta marca igual");
});

prueba("la etapa B no se abre con la A armada si faltan las medidas", () => {
  const e = todoHecho(["cables", "comprar-a", "herramientas", "armar-a", "instalar-a", "aprender"]);
  assert.deepEqual(G.bloqueos("decidir-b", e), ["medir"]);
  assert.ok(!G.siguiente(e).some((x) => x.seccion === "comprar-b"));
});

prueba("los pasos de seguridad van antes de que la placa toque la ECU, y hay un solo cerebro", () => {
  assert.ok(!G.PIEZAS.some((p) => p.id === "c-nano"), "volvió el segundo cerebro");
  const orden = G.PASOS.map((p) => p.id);
  for (const s of ["b-nucleo", "b-reposo", "b-wdt", "b-autocontrol", "b-toma", "b-cortes", "b-cadena"]) {
    assert.ok(orden.includes(s), "falta " + s);
    assert.ok(orden.indexOf(s) < orden.indexOf("p-directo"), s + " después del paso directo");
    assert.ok(G.PASOS.find((p) => p.id === s).seguridad, s + " sin marca de seguridad");
  }
  assert.deepEqual(G.ESPERA.probar, ["armar-b"]);
  const e = todoHecho(["medir", "comprar-a", "herramientas", "armar-a", "decidir-b", "comprar-b"]);
  e.marcas["b-programa"] = { en: "x" }; e.marcas["b-reposo"] = { en: "x" };
  assert.ok(!G.siguiente(e).some((x) => x.seccion === "probar"), "se pudo probar sin el watchdog");
});

prueba("las etapas de prueba son las del § 7, en su orden", () => {
  const p = G.SECCIONES.find((s) => s.id === "probar").pasos.map((x) => x.id);
  assert.deepEqual(p, ["p-escuchar", "p-vacio", "p-directo", "p-espejo", "p-andando", "p-lento", "p-ruta"]);
});

prueba("el costo no suma las opcionales y separa lo que falta de lo pedido", () => {
  const c0 = G.costo({}, ["herramientas"]);
  const sin = G.SECCIONES.find((s) => s.id === "herramientas").piezas.filter((p) => !p.opcional);
  assert.deepEqual(c0.falta, [sin.reduce((a, p) => a + p.usd[0], 0), sin.reduce((a, p) => a + p.usd[1], 0)]);
  const c1 = G.costo({ compras: { "h-soldador": "pedido" } }, ["herramientas"]);
  assert.equal(c1.pedido[0], 10);
  assert.equal(c1.falta[0], c0.falta[0] - 10);
});

prueba("una sección se completa con lo opcional sin llegar", () => {
  const e = todoHecho(["herramientas"]);
  delete e.compras["h-logico"];
  assert.ok(G.progreso("herramientas", e).completa);
});

prueba("la relación VPA/VPA2: corrida, proporcional, y nada si falta una", () => {
  const corr = G.relacionVPA({ vpa0: "0,80", vpa1: "2,0", vpa2: "3,6", vpb0: "1,60", vpb1: "2,8", vpb2: "4,4" });
  assert.equal(corr.forma, "corrida"); assert.equal(corr.corrimiento, 0.8); assert.ok(corr.sube);
  const prop = G.relacionVPA({ vpa0: "0.5", vpa1: "1.5", vpa2: "2.0", vpb0: "1.0", vpb1: "3.0", vpb2: "4.0" });
  assert.equal(prop.forma, "proporcional"); assert.equal(prop.razon, 2);
  assert.equal(G.relacionVPA({ vpa0: "0.8" }), null);
  assert.equal(G.relacionVPA({ vpa0: "0.8 V", vpa1: "x", vpa2: "3", vpb0: "1", vpb1: "2", vpb2: "4" }), null);
  assert.equal(G.relacionVPA({ vpa0: "3", vpa1: "2", vpa2: "1", vpb0: "4", vpb1: "3", vpb2: "2" }).sube, false);
});

prueba("la cadena: lista cerrada de emergencias, casi todas por cable, y frenar no es una", () => {
  const porCable = G.EMERGENCIAS.filter((e) => e.por === "cable").map((e) => e.id);
  for (const id of ["interruptor", "colgada", "no-obedece", "sin-energia"]) assert.ok(porCable.includes(id), id + " no va por cable");
  assert.ok(G.EMERGENCIAS.every((e) => e.por === "cable" || /sólo puede soltar/.test(e.por)), "el programa no puede tener otro papel que soltar");
  const uso = G.USO_ESPERADO.join(" | ");
  for (const t of ["frenar", "arranque", "cancelar", "Bluetooth", "teléfono no esté", "GPS"]) assert.ok(uso.includes(t), "falta en el uso esperado: " + t);
  const acc = Object.fromEntries(G.ACCESORIAS.map((a) => [a.id, a.entra]));
  assert.deepEqual(acc, { gps: true, rpm: true, "sin-telefono": false, rastreador: false }, "cambió una decisión de las ideas accesorias sin cambiar el banco");
  assert.ok(/caja/.test(G.PASOS.find((p) => p.id === "b-programa").d) && G.PIEZAS.some((p) => p.id === "c-gps"), "el crucero tiene que ir con la velocidad de la caja, y el GPS sólo controlarla");
  const cadena = G.PASOS.find((p) => p.id === "b-cadena");
  assert.ok(/no hacen clic ni una vez/.test(cadena.prueba), "la cadena no prueba lo que NO la abre");
  const fuente = G.PIEZAS.find((p) => p.id === "c-fuente");
  assert.ok(/arranque/.test(fuente.n + fuente.para), "la fuente no dice que aguanta el arranque");
});

prueba("los dos archivos parsean como módulo (también el script del .html)", () => {
  execFileSync(process.execPath, ["--input-type=module", "--check"], { input: fs.readFileSync(path.join(raiz, "placa.js")) });
  const html = fs.readFileSync(path.join(raiz, "placa.html"), "utf8");
  const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
  assert.ok(m, "sin módulo");
  execFileSync(process.execPath, ["--input-type=module", "--check"], { input: m[1] });
});

prueba("la página pide los sellos que dicen los archivos", () => {
  const html = fs.readFileSync(path.join(raiz, "placa.html"), "utf8");
  assert.ok(html.includes("./placa.js?v=" + G.VERSION), "el ?v= de placa.js no es " + G.VERSION);
  assert.ok(html.includes('P.PANEL = "placa-6"') && html.includes("Sello: placa-6"));
});

prueba("la página escribe sólo adentro de placa., campo por campo", () => {
  const html = fs.readFileSync(path.join(raiz, "placa.html"), "utf8");
  assert.ok(!/setDoc\s*\(/.test(html), "un setDoc pisaría proyectos/hilux entero");
  const rutas = [...html.matchAll(/\["(placa\.[a-zA-Z]+\.)"/g)].map((m) => m[1]);
  assert.deepEqual([...new Set(rutas)].sort(), ["placa.compras.", "placa.marcas.", "placa.medidas.", "placa.notas."]);
});

prueba("ni un mail ni un UID en la guía (el repositorio es público)", () => {
  const t = fs.readFileSync(path.join(raiz, "placa.js"), "utf8") + fs.readFileSync(path.join(raiz, "placa.html"), "utf8");
  assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(t), "hay un mail");
  assert.ok(!/\b[A-Za-z0-9]{28}\b/.test(t), "hay algo con forma de UID");
});

prueba("el panel enlaza la guía sólo con direcciones propias", () => {
  const html = fs.readFileSync(path.join(raiz, "index.html"), "utf8");
  assert.ok(html.includes("s.guias"), "el panel no dibuja sitio.guias");
  assert.ok(html.includes("[a-z0-9-]+\\.html"), "falta el filtro de direcciones");
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas`);
process.exit(fallidas ? 1 : 0);
