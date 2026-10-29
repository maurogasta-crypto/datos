// pruebas/exportar.mjs — el banco de exportar.js (panel-44, 29-oct-2026).
// Lo que se le pasa a Gemini: qué entra, qué se tapa y qué no sale nunca.
//   node pruebas/exportar.mjs
import assert from "node:assert/strict";
import { entra, vaAlMapa, reposDe, tapar, archivo, cabecera, estadoPanel, DE_PERSONAS, tokens } from "../exportar.js";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };

prueba("entra el texto del desarrollo; no los binarios, las dependencias, los lock ni los respaldos", () => {
  for (const r of ["index.html", "interno/nucleo.js", "herramientas/ronda.mjs", "firestore.rules", "app/src/main/java/A.kt",
                   "lib/main.dart", "REGLAS.txt", "build.gradle.kts", "manifest.json"]) assert.ok(entra(r, 1000), r);
  for (const r of ["icono-192.png", "a.apk", "node_modules/x/index.js", "package-lock.json", "pubspec.lock",
                   "respaldos/2026-10-09-panel.json", "android/app/build/x.kt", ".git/config"]) assert.ok(!entra(r, 1000), r);
  assert.ok(!entra("datos.json", 70 * 1024), "un JSON grande es un dato");
  assert.ok(!entra("interno/enorme.md", 600 * 1024), "más de 500 KB es un generado");
  assert.ok(entra("interno/CASAVERDEDOCUMENTACION.md", 453 * 1024), "la documentación grande de Casa Verde sí entra");
});
prueba("el mapa: los CLAUDE.md de todos, y de datos el reglamento y la ronda", () => {
  assert.ok(vaAlMapa("maurogasta-crypto/tiempos", "CLAUDE.md"));
  assert.ok(!vaAlMapa("maurogasta-crypto/tiempos", "README.md"));
  assert.ok(vaAlMapa("maurogasta-crypto/datos", "protocolos/PROTOCOLO-GENERAL.md"));
  assert.ok(vaAlMapa("maurogasta-crypto/datos", "TRASPASO.md"));
  assert.ok(!vaAlMapa("maurogasta-crypto/datos", "protocolos/sub/x.md"));
  assert.ok(!vaAlMapa("casaverdecanas-blip/casaverdecanas", "protocolos/X.md"), "sólo los protocolos de datos");
});
prueba("los repos salen de proyectos/ (sitio.repo), sin repetir; la bodega no está", () => {
  const r = reposDe([{ id: "panel", sitio: { repo: "maurogasta-crypto/datos" } }, { id: "datos", sitio: { repo: "maurogasta-crypto/datos" } },
                     { id: "obra", clase: "obra" }, { id: "x", sitio: { repo: "mal formado" } }, { id: "tiempos", sitio: { repo: "maurogasta-crypto/tiempos" } }]);
  assert.deepEqual(r.map((x) => x.repo), ["maurogasta-crypto/datos", "maurogasta-crypto/tiempos"]);
  assert.deepEqual(r[0].proyectos, ["panel", "datos"]);
  assert.ok(!r.some((x) => /bodega/.test(x.repo)));
});
prueba("se tapan mails, teléfonos y UIDs; no las fechas, los sellos ni los instantes", () => {
  // Datos inventados: un dato real de una persona no entra a un repositorio público.
  const t = tapar("a ana.b+c@ejemplo.com, +55 48 9999-0000, 099000111, uid AbCdEf1234567890abcdef123456 · 2026-10-29 10:20 · 12/10/2026 · sitd-55 · 1793196440000 · 3 de 4");
  assert.doesNotMatch(t, /ejemplo|9999|099000111|AbCdEf/);
  assert.match(t, /2026-10-29 10:20/); assert.match(t, /12\/10\/2026/); assert.match(t, /sitd-55/); assert.match(t, /1793196440000/);
});
prueba("cada archivo con su principio y su fin; la cabecera con los commits y cómo devolver una propuesta", () => {
  assert.equal(archivo("o/r", "a.md", "hola\n\n"), "\n===== ARCHIVO: o/r/a.md =====\nhola\n===== FIN: o/r/a.md =====\n");
  const c = cabecera({ nivel: "mapa", repos: [{ repo: "o/r", sha: "abcdef1234", fecha: "2026-10-29" }], faltan: ["x/y: 404"] });
  assert.match(c, /o\/r @ abcdef1/); assert.match(c, /NO SE PUDO LEER/); assert.match(c, /PRIMERA LÍNEA es el título/);
  assert.match(c, /auditor/); assert.match(c, /Es una propuesta de Gemini/);
});
prueba("el estado del panel: abiertos sí, hechos no; de reservas y clientes sólo el título; tapado", () => {
  const s = estadoPanel({
    proyectos: [{ id: "tiempos", nombre: "Tiempos", sitio: { repo: "maurogasta-crypto/tiempos" } }],
    lineas: [{ id: "L-a", titulo: "Una línea", tomada: { chat: "ronda" } }, { id: "L-b", titulo: "Cerrada", estado: "cerrada" }],
    pendientes: [
      { id: "tiempos:A1", proyecto: "tiempos", titulo: "Algo del sitio", porQue: "escribile a x@y.com", estado: "abierto" },
      { id: "tiempos:A2", proyecto: "tiempos", titulo: "Ya está", estado: "hecho" },
      { id: "casaverde:R1", proyecto: "casaverde", titulo: "Reservas: lo que falta", pregunta: "¿Cómo se llama Fulano Inventado?", estado: "abierto" },
      { id: "general:P9", proyecto: "general", titulo: "Una idea", estado: "abierto", origen: "gemini" }],
    tandas: [{ id: "t1", fecha: "2026-10-28", titulo: "Una tanda", hecho: ["se hizo algo", "completé la reserva de Fulano Inventado"] }]
  });
  assert.match(s, /tiempos:A1/); assert.doesNotMatch(s, /tiempos:A2/); assert.doesNotMatch(s, /Cerrada/);
  assert.match(s, /la tiene ronda/); assert.doesNotMatch(s, /object Object/);
  assert.match(s, /\[mail\]/); assert.doesNotMatch(s, /Fulano/);
  assert.match(s, /casaverde:R1.*Reservas/); assert.match(s, /el detalle no se exporta/);
  assert.match(s, /propuesta de Gemini/);
  assert.ok(DE_PERSONAS.test("huésped") && !DE_PERSONAS.test("el enlace cerca"));
});
prueba("los tokens se estiman (≈3,5 caracteres)", () => { assert.equal(tokens("x".repeat(350)), 100); });

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
