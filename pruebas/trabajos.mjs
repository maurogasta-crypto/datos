// BANCO DE LA RONDA POR TRABAJOS (plan «Timón», etapa 7a, 16-nov-2026).
// Por qué existe: los pasos de la ronda dejaron de ser un texto único en TRASPASO.md § 4 y pasaron a
// ronda/trabajos/, un archivo por trabajo. Si un archivo pierde un campo, el índice se desencuentra con la
// carpeta, o una herramienta de la ronda queda sin trabajo que la corra, la ronda del día siguiente trabaja
// ciega SIN que nadie lo note. Este banco comprueba el formato, la coherencia índice↔archivos, el reparto
// entre corridas (extra/completa) y que ningún comando clave haya quedado afuera en la mudanza.
// Correr con:  node pruebas/trabajos.mjs   (sin npm ni red)

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const CARPETA = join(RAIZ, "ronda", "trabajos");

let fallas = 0, casos = 0;
const ok = (cond, texto) => { casos++; if (!cond) { fallas++; console.log("  ✘ " + texto); } };

// ── 1 · Los archivos: nombre, orden, formato ─────────────────────────────────
const archivos = readdirSync(CARPETA).filter((a) => a.endsWith(".md")).sort();
ok(archivos.length >= 20, `hay al menos 20 trabajos (hay ${archivos.length})`);

const CUANDOS = ["todas las corridas", "sólo la corrida de la mañana"];
const NIVELES = ["Mirar", "Completar", "Proponer", "Ejecutar"];
const porArchivo = {};
let numeroAnterior = -1;

for (const a of archivos) {
  const m = a.match(/^(\d{3})-[a-z0-9-]+\.md$/);
  ok(m, `${a}: el nombre es NNN-nombre.md (minúsculas y guiones)`);
  if (!m) continue;
  const numero = Number(m[1]);
  ok(numero > numeroAnterior, `${a}: el número ${m[1]} no se repite y va en orden`);
  numeroAnterior = numero;

  const texto = readFileSync(join(CARPETA, a), "utf8");
  const campo = (nombre) => {
    const linea = texto.split("\n").find((l) => l.includes(`**${nombre}**`));
    if (!linea) return null;
    const celdas = linea.split("|").map((c) => c.trim()).filter(Boolean);
    return celdas.length >= 2 ? celdas[1] : null;
  };
  const app = campo("App"), cuando = campo("Cuándo"), lee = campo("Qué lee"),
    deja = campo("Qué puede dejar"), nivel = campo("Nivel");
  ok(app, `${a}: declara App`);
  ok(cuando && CUANDOS.some((c) => cuando.startsWith(c)), `${a}: Cuándo es «${CUANDOS[0]}» o «${CUANDOS[1]}» (dice: ${cuando})`);
  ok(lee, `${a}: declara Qué lee`);
  ok(deja, `${a}: declara Qué puede dejar`);
  ok(nivel && NIVELES.some((n) => nivel.startsWith(n)), `${a}: Nivel empieza con Mirar/Completar/Proponer/Ejecutar (dice: ${nivel})`);
  const criterio = texto.split("## Criterio")[1] || "";
  ok(criterio.trim().length > 150, `${a}: tiene un ## Criterio con contenido`);
  porArchivo[a] = { numero: m[1], cuando, nivel, texto };
}

// ── 2 · El índice de LEEME.md dice lo mismo que la carpeta ───────────────────
const leeme = readFileSync(join(RAIZ, "ronda", "LEEME.md"), "utf8");
const filas = leeme.split("\n").filter((l) => /^\| \d{3} \|/.test(l));
ok(filas.length === archivos.length, `el índice tiene una fila por archivo (${filas.length} filas, ${archivos.length} archivos)`);
const enIndice = [];
for (const f of filas) {
  const celdas = f.split("|").map((c) => c.trim());
  const [, numero, archivo, , cuando, nivel] = celdas;
  const nombre = archivo.replaceAll("`", "");
  enIndice.push(nombre);
  const real = porArchivo[nombre];
  ok(real, `el índice nombra ${nombre} y el archivo existe`);
  if (!real) continue;
  ok(real.numero === numero, `${nombre}: el número del índice (${numero}) es el del archivo (${real.numero})`);
  ok(real.cuando.startsWith(cuando), `${nombre}: el Cuándo del índice («${cuando}») es el del archivo («${real.cuando}»)`);
  ok(real.nivel.startsWith(nivel), `${nombre}: el Nivel del índice (${nivel}) es el del archivo (${real.nivel})`);
}
for (const a of archivos) ok(enIndice.includes(a), `${a} está en el índice de LEEME.md`);
ok(JSON.stringify(enIndice) === JSON.stringify(archivos), "el orden del índice es el orden de la carpeta");

// ── 3 · El reparto extra/completa es una DECISIÓN: si cambia, cambia acá ─────
const extraEsperada = ["010", "020", "030", "040", "050", "060", "070", "080", "090", "110", "210", "220"];
const extraReal = archivos.filter((a) => porArchivo[a].cuando.startsWith("todas las corridas")).map((a) => a.slice(0, 3));
ok(JSON.stringify(extraReal) === JSON.stringify(extraEsperada),
  `la corrida extra corre exactamente ${extraEsperada.join(",")} (corre: ${extraReal.join(",")})`);

// ── 4 · Ninguna herramienta de la ronda quedó sin trabajo (cobertura) ────────
const todo = archivos.map((a) => porArchivo[a].texto).join("\n");
const COMANDOS = [
  "ronda.mjs abrir", "firestore.mjs panel bajar", "telefono.mjs pedidos", "telefono.mjs mensajes",
  "latido.mjs", "facebook.mjs cargar", "facebook.mjs pendientes", "facebook.mjs responder",
  "reservas.mjs vincular", "reservas.mjs capturas", "reservas.mjs proponer", "reservas.mjs revisar",
  "reservas.mjs estado", "reservas.mjs llegadas", "notificaciones.mjs pendientes", "notificaciones.mjs vencer",
  "charla.mjs nuevos", "charla.mjs salud", "charla.mjs revisado", "grabaciones.mjs listar",
  "consultas.mjs aprender", "consultas.mjs pendientes", "telefono.mjs depositar", "obras.mjs respaldar",
  "ingresos.mjs", "avisos.mjs quienes", "novedades.mjs", "avisos.mjs enviar", "avisos.mjs buzon",
];
for (const c of COMANDOS) ok(todo.includes(c), `algún trabajo corre ${c}`);

// ── 5 · Lo que no puede pasar ────────────────────────────────────────────────
ok(!todo.includes("════ NUNCA ════"), "el NUNCA vive UNA vez, en TRASPASO.md § 4 (ningún trabajo lo copia)");
const traspaso = readFileSync(join(RAIZ, "TRASPASO.md"), "utf8");
ok(traspaso.includes("ronda/trabajos/"), "TRASPASO.md § 4 apunta a ronda/trabajos/");
ok(traspaso.includes("════ NUNCA ════"), "TRASPASO.md § 4 conserva el NUNCA");
const nunca = traspaso.split("════ NUNCA ════")[1] || "";
ok((nunca.match(/^· /gm) || []).length >= 9, "el NUNCA conserva sus renglones (al menos 9)");
ok(!traspaso.includes("PARTE 1 · MIRAR"), "los pasos viejos ya no están duplicados en TRASPASO.md");
const claude = readFileSync(join(RAIZ, "CLAUDE.md"), "utf8");
ok(claude.includes("ronda/trabajos/"), "el CLAUDE.md del panel apunta a ronda/trabajos/");

console.log(fallas ? `\n${fallas} falla(s) de ${casos} casos` : `trabajos: ${casos} casos en verde (${archivos.length} trabajos)`);
process.exit(fallas ? 1 : 0);
