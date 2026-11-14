/* herramientas/secciones.mjs — el mapa de secciones de un sitio, desde la terminal.
   Sello: paquete-3.  Desde la raíz del repositorio:
     node herramientas/secciones.mjs                  lista las secciones
     node herramientas/secciones.mjs armar <id> [--salida x.md]
                                                      arma el paquete de una sección
     node herramientas/secciones.mjs verificar        arma TODAS y avisa lo que esté desactualizado
     node herramientas/secciones.mjs analizar         propone un secciones.json para un sitio que no lo tiene
     (en cualquier orden, `--raiz ../otro-sitio` la aplica a otro sitio en vez de a este)
     node herramientas/secciones.mjs mapa             crea o actualiza el MAPA.md del sitio: qué es cada archivo y de
                                                      cuáles depende. Agrega lo que falta y NO pisa lo que ya escribiste
   Lee los archivos de la carpeta; no toca nada (salvo escribir el .md o el borrador). */
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";
import { construir, proponerSecciones, esArchivoDeSitio, construirMapaMd, filasDelMapa, compararMapa } from "../paquete.js";

// `--raiz <carpeta>` apunta la herramienta a OTRO sitio (por ejemplo `--raiz ../rematetaller`)
const crudo = process.argv.slice(2), kr = crudo.indexOf("--raiz");
const raiz = kr >= 0 && crudo[kr + 1] ? resolve(process.cwd(), crudo[kr + 1]) : join(dirname(fileURLToPath(import.meta.url)), "..");
if (kr >= 0) crudo.splice(kr, 2);
const [orden, ...args] = crudo;
const hoy = new Date(), p = (n) => String(n).padStart(2, "0");
const fecha = `${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}`;
const cargar = async () => JSON.parse(await readFile(join(raiz, "secciones.json"), "utf8"));
const leerDe = (base) => (ruta) => readFile(join(base, ruta), "utf8");
const listarDe = (base) => async () => {
  const rutas = (await archivosDe(base, base, [], true)), out = [];
  for (const r of rutas) out.push({ ruta: r, bytes: (await stat(join(base, r))).size });
  return out;
};

async function archivosDe(dir, base = dir, out = [], todos = false) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (/^(\.git$|node_modules$)/.test(e.name) || (!todos && (e.name === "pruebas" || e.name.startsWith(".")))) continue;
    const ruta = join(dir, e.name);
    const rel = relative(base, ruta).split("\\").join("/");
    if (e.isDirectory()) await archivosDe(ruta, base, out, todos);
    else if (todos ? esArchivoDeSitio(rel) : /\.(html?|m?js)$/i.test(e.name)) out.push(rel);
  }
  return out;
}

if (!orden) {
  const cfg = await cargar();
  console.log("Secciones:\n" + cfg.secciones.map((s) => `  ${s.id} — ${s.titulo}`).join("\n"));
} else if (orden === "armar") {
  const cfg = await cargar(), id = args[0];
  if (!id) { console.log("Falta el id de la sección."); process.exit(1); }
  const k = args.indexOf("--salida"), salida = k >= 0 && args[k + 1] ? args[k + 1] : `paquete-${id}.md`;
  const r = await construir(cfg, id, leerDe(raiz), { fecha, repo: cfg.repo, listar: listarDe(raiz) });
  await writeFile(salida, r.md);
  console.log(`${salida}: ~${Math.round(r.tokens / 1000)} mil unidades de lectura (código ${Math.round(r.pesoCodigo / 1000)} mil).`);
  r.avisos.forEach((a) => console.log("⚠ " + a));
} else if (orden === "verificar") {
  const cfg = await cargar(); let mal = 0;
  for (const s of cfg.secciones) {
    const r = await construir(cfg, s.id, leerDe(raiz), { fecha, repo: cfg.repo, listar: listarDe(raiz) });
    const nota = r.cierre.length ? ` · NO cerrada: ${r.cierre.map((c) => c.ruta).join(", ")} la usan otros` : " · cerrada";
    console.log(`${r.avisos.length ? "✗" : "✓"} ${s.id}: ~${Math.round(r.tokens / 1000)} mil${nota}`);
    r.avisos.forEach((a) => { mal++; console.log("    ⚠ " + a); });
  }
  try {
    const md = await readFile(join(raiz, cfg.mapaDoc || "MAPA.md"), "utf8"), reales = (await listarDe(raiz)()).map((x) => x.ruta);
    const c = compararMapa(filasDelMapa(md).map((f) => f.ruta), reales, [cfg.mapaDoc || "MAPA.md"]);
    console.log(c.sinDescribir.length || c.fantasmas.length ? `⚠ MAPA.md desactualizado: sin describir ${c.sinDescribir.join(", ") || "—"} · filas huérfanas ${c.fantasmas.join(", ") || "—"} (corré «mapa»)` : "✓ MAPA.md al día");
  } catch (e) { console.log("⚠ Este sitio no tiene MAPA.md (corré «mapa»)"); }
  process.exit(mal ? 1 : 0);
} else if (orden === "analizar") {
  const dir = raiz;
  const rutas = await archivosDe(dir), textos = {};
  for (const r of rutas) textos[r] = await readFile(join(dir, r), "utf8");
  const borrador = proponerSecciones(textos, { espacio: args.includes("--espacio") ? args[args.indexOf("--espacio") + 1] : "P" });
  const salida = join(dir, "secciones.borrador.json");
  await writeFile(salida, JSON.stringify(borrador, null, 2) + "\n");
  console.log(`${salida}: ${borrador.secciones.length} secciones propuestas. Revisá los «REVISAR» antes de publicarlo como secciones.json.`);
  borrador.secciones.forEach((s) => console.log(`  ${s.id} · ~${Math.round(s.pesoTokens / 1000)} mil${s.aviso ? " · " + s.aviso : ""}`));
} else if (orden === "mapa") {
  let cfg = {}; try { cfg = await cargar(); } catch (e) { /* un sitio nuevo todavía no tiene secciones.json */ }
  const ruta = cfg.mapaDoc || "MAPA.md";
  const lista = await listarDe(raiz)(), textos = {};
  for (const f of lista) textos[f.ruta] = await readFile(join(raiz, f.ruta), "utf8");
  let existente = ""; try { existente = await readFile(join(raiz, ruta), "utf8"); } catch (e) { /* primera vez */ }
  const md = construirMapaMd({ proyecto: cfg.proyecto || "", existente, archivos: lista, textos });
  await writeFile(join(raiz, ruta), md);
  const filas = filasDelMapa(md), sin = filas.filter((f) => /^_\(sin describir\)_$/.test(f.que)).map((f) => f.ruta);
  console.log(`${ruta}: ${filas.length} filas.${sin.length ? " Sin describir (escribilas a mano): " + sin.join(", ") : " Todo descripto."}`);
  filas.filter((f) => /^⚠/.test(f.que)).forEach((f) => console.log("  ⚠ provisoria: " + f.ruta));
} else { console.log("Orden desconocida: " + orden); process.exit(1); }
