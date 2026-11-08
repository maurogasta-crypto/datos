// Banco de servidor-1.js — sin red ni npm:  node pruebas/servidor.mjs
// Lo que importa (8-nov-2026, plan Timón): la forma de llamar al servidor del
// ecosistema es UNA y no cambia mientras exista servidor-1; lo que se manda es
// lo mínimo (sin texto en los avisos), y nada tira donde no debe.
import assert from "node:assert/strict";
import fs from "node:fs";
import * as S from "../servidor-1.js";

let pasadas = 0, fallidas = 0;
const esperando = [];
const prueba = (n, f) => esperando.push((async () => {
  try { await f(); pasadas++; console.log("  ✓ " + n); } catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); }
})());
const falso = (resp) => { const v = []; const f = async (u, o) => { v.push({ u, o, body: JSON.parse(o.body) }); if (resp instanceof Error) throw resp; return resp; }; f.vistos = v; return f; };
const ok = (j = {}) => ({ ok: true, status: 200, json: async () => j });

prueba("el contrato y las cuatro funciones", () => {
  assert.equal(S.CONTRATO, "servidor-1");
  assert.deepEqual(Object.keys(S.FUNCIONES).sort(), ["avisarClaude", "despertar", "hielo", "ia"]);
  assert.equal(S.url("ia"), S.SERVIDOR + "/claude-proxy");
  assert.throws(() => S.url("otra"));
});
prueba("apunta a timon-servidor, y cada función está en servidor/ de este repositorio (o se baja de remate)", () => {
  assert.equal(S.SERVIDOR, "https://timon-servidor.netlify.app/.netlify/functions");
  const hay = fs.readdirSync(new URL("../servidor/netlify/functions/", import.meta.url)).map((f) => f.replace(/\.m?js$/, ""));
  for (const n of Object.values(S.FUNCIONES)) assert.ok(hay.includes(n), n);
});
prueba("preguntarIA manda el contenido y devuelve el texto", async () => {
  const f = falso(ok({ content: [{ text: "hola" }] }));
  assert.equal(await S.preguntarIA({ contenido: [{ type: "text", text: "x" }], max_tokens: 600 }, f), "hola");
  assert.equal(f.vistos[0].u, S.url("ia"));
  assert.equal(f.vistos[0].body.model, "gemini-2.5-flash-lite");
  assert.equal(f.vistos[0].body.max_tokens, 600);
  assert.equal(f.vistos[0].body.messages[0].content[0].text, "x");
});
prueba("preguntarIA tira si el servidor contesta mal o no hay contenido", async () => {
  await assert.rejects(S.preguntarIA({ contenido: [{ type: "text", text: "x" }] }, falso({ ok: false, status: 502 })), /502/);
  await assert.rejects(S.preguntarIA({ contenido: [] }, falso(ok())));
});
prueba("avisarClaude manda sólo la base y el id, con el token", async () => {
  const f = falso(ok());
  assert.equal(await S.avisarClaude({ base: "tiempos", reporteId: "r1", token: "t" }, f), true);
  assert.deepEqual(f.vistos[0].body, { base: "tiempos", reporteId: "r1" });
  assert.equal(f.vistos[0].o.headers.Authorization, "Bearer t");
});
prueba("avisar y despertar nunca tiran, y sin token no llaman", async () => {
  assert.equal(await S.avisarClaude({ base: "tiempos", reporteId: "r1", token: "t" }, falso(new Error("sin red"))), false);
  assert.equal(await S.despertar({ base: "tiempos", que: "tareas", token: "t" }, falso(new Error("sin red"))), false);
  const f = falso(ok());
  assert.equal(await S.despertar({ base: "tiempos", que: "tareas" }, f), false);
  assert.equal(f.vistos.length, 0);
});
prueba("despertar manda la base y el qué, nada más", async () => {
  const f = falso(ok());
  await S.despertar({ base: "casaverde", que: "reservas", token: "t" }, f);
  assert.deepEqual(f.vistos[0].body, { base: "casaverde", que: "reservas" });
});
prueba("no importa nada ni lleva una credencial", () => {
  const t = fs.readFileSync(new URL("../servidor-1.js", import.meta.url), "utf8");
  assert.doesNotMatch(t, /^import /m);
  assert.doesNotMatch(t, /AIza|api[_-]?key\s*[:=]/i);
});

await Promise.all(esperando);
console.log(`\n${pasadas} pasadas, ${fallidas} fallidas`);
process.exit(fallidas ? 1 : 0);
