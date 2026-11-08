// Banco de herramientas/desplegar.mjs — sin npm ni red:  node pruebas/herramientas/desplegar.mjs
// Lo que importa (8-nov-2026, plan Timón): el despliegue va SIEMPRE con las seis
// funciones, al proyecto correcto, y el registro dice qué se publicó sin llevar
// nunca un valor. Y mientras las funciones sigan también en Casa Verde, las dos
// copias son idénticas (si no, el día del cambio de servidor cambia la conducta).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { DESTINOS, argumentosDeploy, renglonRegistro, funcionesDelPaquete } from "../../herramientas/desplegar.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => { try { f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); } };
const D = DESTINOS.servidor;
const raiz = new URL("../../", import.meta.url).pathname;

prueba("despliega a producción, al proyecto timon-servidor, con las carpetas del paquete", () => {
  const a = argumentosDeploy(D, "/tmp/x", "datos@abc");
  assert.deepEqual(a.slice(0, 3), ["deploy", "--prod", "--json"]);
  assert.equal(a[a.indexOf("--site") + 1], "e17abd4c-d811-4edf-8f70-513bac3415dc");
  assert.equal(a[a.indexOf("--dir") + 1], path.join("/tmp/x", "publico"));
  assert.equal(a[a.indexOf("--functions") + 1], path.join("/tmp/x", "netlify", "functions"));
  assert.equal(a[a.indexOf("--message") + 1], "datos@abc");
});
prueba("servidor/ más lo que se baja de remate son exactamente las seis funciones", () => {
  const propias = funcionesDelPaquete(path.join(raiz, "servidor"));
  const externas = D.externos.filter(([, , r]) => r.startsWith("netlify/functions/")).map(([, , r]) => path.basename(r).replace(/\.m?js$/, ""));
  assert.deepEqual([...propias, ...externas].sort(), [...D.funciones].sort());
});
prueba("el registro dice qué se publicó y nada más", () => {
  const r = renglonRegistro({ destino: D, commitDatos: "abc1234", commitsExternos: { "rematetaller/remate": "def5678" },
    salida: { deploy_id: "d1", deploy_url: "https://d1--timon-servidor.netlify.app", logs: "x", function_logs: "y" }, fecha: new Date("2026-11-08T18:00:00Z") });
  assert.deepEqual(Object.keys(r).sort(), ["datos", "deploy", "destino", "externos", "fecha", "funciones", "ok", "sitio", "url"]);
  assert.equal(r.ok, true); assert.equal(r.deploy, "d1");
});
prueba("un despliegue que falla también se registra, con el error corto", () => {
  const r = renglonRegistro({ destino: D, commitDatos: "abc", commitsExternos: {}, error: "x".repeat(500) });
  assert.equal(r.ok, false); assert.equal(r.error.length, 300); assert.ok(!("deploy" in r));
});
prueba("ni el paquete ni la herramienta llevan un valor de una credencial", () => {
  const textos = [fs.readFileSync(path.join(raiz, "herramientas/desplegar.mjs"), "utf8"), fs.readFileSync(path.join(raiz, "servidor/netlify.toml"), "utf8")];
  for (const t of textos) assert.doesNotMatch(t, /AIza[0-9A-Za-z_-]{20,}|-----BEGIN|private_key/);
});
prueba("mientras sigan en Casa Verde, las funciones son las mismas que allá (si está al lado)", () => {
  const cv = path.join(raiz, "..", "casaverdecanas", "netlify", "functions");
  if (!fs.existsSync(cv)) { console.log("      (no está casaverdecanas al lado)"); return; }
  for (const f of fs.readdirSync(path.join(raiz, "servidor/netlify/functions"))) {
    const otra = path.join(cv, f);
    if (!fs.existsSync(otra)) continue;   // ya se sacó de Casa Verde: manda la de acá
    assert.equal(fs.readFileSync(path.join(raiz, "servidor/netlify/functions", f), "utf8"), fs.readFileSync(otra, "utf8"), f + " difiere de la de Casa Verde");
  }
});

console.log(`\n${pasadas} pasadas, ${fallidas} fallidas`);
process.exit(fallidas ? 1 : 0);
