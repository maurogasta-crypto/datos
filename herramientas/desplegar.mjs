#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// desplegar.mjs — despliega el servidor del ecosistema y deja el REGISTRO.
// Sello: desplegar-1 (8-nov-2026, plan «Timón»)
//
// Mauro, 8-nov-2026: «en los futuros trabajos usaremos la terminal con los
// logueos correspondientes, guardando estos registros». Corre en TERMUX, en el
// teléfono de Mauro, donde está `netlify` con su sesión (netlify login): el
// chat no tiene ni ve esa sesión ni ninguna clave de Netlify.
//
//   cd ~/datos && git pull && node herramientas/desplegar.mjs servidor
//   node herramientas/desplegar.mjs servidor --seco     arma el paquete y no despliega
//
// Qué hace, en orden:
//   1. arma el paquete en una carpeta temporal: servidor/ de este repositorio
//      más las tres piezas de las luces, bajadas de rematetaller/remate (su
//      código vive allá; no se copia acá);
//   2. `netlify deploy --prod` al proyecto timon-servidor, con el commit de
//      `datos` y el de `remate` en el mensaje del despliegue;
//   3. guarda el REGISTRO: una línea en ~/registros/despliegues.jsonl del
//      teléfono y la misma en despliegues/AAAA-MM.jsonl de la bodega (privada),
//      con fecha, commits, id y dirección del despliegue y las funciones.
//      Nunca un valor de una variable: la salida de netlify no los trae.
// Si el despliegue falla, también se registra (con el error), y sale con 1.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = path.resolve(AQUI, "..");

export const DESTINOS = {
  servidor: {
    sitio: "e17abd4c-d811-4edf-8f70-513bac3415dc",   // timon-servidor (un id de proyecto no abre nada)
    nombre: "timon-servidor",
    carpeta: "servidor",
    externos: [   // [repositorio, rama, ruta allá = ruta en el paquete]
      ["rematetaller/remate", "main", "netlify/functions/luces-remate.mjs"],
      ["rematetaller/remate", "main", "api/tuya.mjs"],
      ["rematetaller/remate", "main", "api/_sesion.mjs"],
    ],
    funciones: ["avisar-claude", "claude-proxy", "despertar", "hielo", "luces-remate", "notify-whatsapp"],
  },
};

/** Los argumentos de `netlify deploy` (puro: lo prueba el banco). */
export function argumentosDeploy(destino, dir, mensaje) {
  return ["deploy", "--prod", "--json", "--site", destino.sitio,
    "--dir", path.join(dir, "publico"), "--functions", path.join(dir, "netlify", "functions"),
    "--message", mensaje];
}

/** La línea del registro (puro). Sólo lo que dice qué se publicó: nada de valores. */
export function renglonRegistro({ destino, commitDatos, commitsExternos, salida, error, fecha = new Date() }) {
  const r = { fecha: fecha.toISOString(), destino: destino.nombre, sitio: destino.sitio,
    datos: commitDatos, externos: commitsExternos, funciones: destino.funciones, ok: !error };
  if (salida) { r.deploy = salida.deploy_id || null; r.url = salida.deploy_url || salida.url || null; }
  if (error) r.error = String(error).slice(0, 300);
  return r;
}

/** Las funciones del paquete armado (puro sobre el disco): sin extensión, ordenadas. */
export function funcionesDelPaquete(dir) {
  return fs.readdirSync(path.join(dir, "netlify", "functions")).filter((f) => /\.m?js$/.test(f))
    .map((f) => f.replace(/\.m?js$/, "")).sort();
}

async function bajar(repo, rama, ruta) {
  const r = await fetch(`https://raw.githubusercontent.com/${repo}/${rama}/${ruta}`);
  if (!r.ok) throw new Error(`no se pudo bajar ${repo}/${ruta}: ${r.status}`);
  return r.text();
}
async function commitDe(repo, rama) {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/commits/${rama}`, { headers: { Accept: "application/vnd.github.sha" } });
    return r.ok ? (await r.text()).trim().slice(0, 7) : "?";
  } catch { return "?"; }
}

export async function armar(destino, dir) {
  fs.cpSync(path.join(DATOS, destino.carpeta), dir, { recursive: true });
  const commits = {};
  for (const [repo, rama, ruta] of destino.externos) {
    const abs = path.join(dir, ruta);
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, await bajar(repo, rama, ruta));
    commits[repo] ??= await commitDe(repo, rama);
  }
  const hay = funcionesDelPaquete(dir);
  const faltan = destino.funciones.filter((f) => !hay.includes(f));
  if (faltan.length) throw new Error("al paquete le faltan funciones: " + faltan.join(", "));
  return commits;
}

function registrar(renglon) {
  const linea = JSON.stringify(renglon) + "\n";
  const local = path.join(os.homedir(), "registros", "despliegues.jsonl");
  fs.mkdirSync(path.dirname(local), { recursive: true });
  fs.appendFileSync(local, linea);
  console.log("  registro local: " + local);
  // La bodega (privada), con la copia de trabajo y el token del teléfono.
  return import("./telefono-bodega.mjs").then(({ guardarYSubir, TRABAJO, actualizarTrabajo, leerToken }) => {
    const ruta = `despliegues/${renglon.fecha.slice(0, 7)}.jsonl`;
    try { actualizarTrabajo({ remoto: "https://github.com/maurogasta-crypto/bodega.git", trabajo: TRABAJO, token: leerToken() }); } catch { /* sin red: sube la próxima */ }
    const abs = path.join(TRABAJO, ruta);
    const antes = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
    guardarYSubir({ ruta, contenido: antes + linea, mensaje: `Despliegue ${renglon.destino} ${renglon.ok ? "ok" : "FALLÓ"} (datos@${renglon.datos})` });
    console.log("  registro en la bodega: " + ruta);
  }).catch((e) => console.log("  ⚠ no se pudo anotar en la bodega (queda el local): " + e.message));
}

async function main() {
  const [cual, ...resto] = process.argv.slice(2);
  const destino = DESTINOS[cual];
  if (!destino) { console.log("Uso: node herramientas/desplegar.mjs <" + Object.keys(DESTINOS).join("|") + "> [--seco]"); process.exit(1); }
  const seco = resto.includes("--seco");
  const commitDatos = execFileSync("git", ["-C", DATOS, "rev-parse", "--short", "HEAD"]).toString().trim();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "desplegar-"));
  console.log(`\n  Armando ${destino.nombre} desde datos@${commitDatos} en ${dir}`);
  const externos = await armar(destino, dir);
  console.log("  funciones: " + funcionesDelPaquete(dir).join(", "));
  console.log("  de afuera: " + Object.entries(externos).map(([r, c]) => `${r}@${c}`).join(", "));
  const mensaje = `datos@${commitDatos} ` + Object.entries(externos).map(([r, c]) => `${r.split("/")[1]}@${c}`).join(" ");
  const args = argumentosDeploy(destino, dir, mensaje);
  if (seco) { console.log("\n  --seco: no se desplegó. Sería:\n  netlify " + args.join(" ")); return; }
  let salida = null, error = null;
  try {
    const out = execFileSync("netlify", args, { cwd: dir, stdio: ["inherit", "pipe", "inherit"] }).toString();
    salida = JSON.parse(out.slice(out.indexOf("{")));
    console.log(`\n  ✓ publicado: ${salida.deploy_url || salida.url}`);
  } catch (e) { error = e.message; console.log("\n  ✗ el despliegue falló: " + e.message); }
  await registrar(renglonRegistro({ destino, commitDatos, commitsExternos: externos, salida, error }));
  if (error) process.exit(1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main();
