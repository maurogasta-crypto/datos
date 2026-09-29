// ─────────────────────────────────────────────────────────────────────────────
// pruebas/herramientas/telefono.mjs — Banco de la limpieza de Descargas.
//
//   node pruebas/herramientas/telefono.mjs
//
// Sin dependencias y sin red. Arma carpetas de mentira en el temporal del
// sistema y corre el plan, lo aplica y lo deshace de verdad.
//
// Por qué contra archivos reales y no contra una lista: esto mueve cosas en
// el teléfono de Mauro. Lo que hay que probar no es que la cuenta dé bien,
// es que después de «deshacer» la carpeta quede EXACTAMENTE como estaba, y
// eso sólo se ve mirando el disco.
// ─────────────────────────────────────────────────────────────────────────────

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { planificar, aplicar, deshacer, lotes, vencidos, motivoBasura, esProtegido,
         tieneMarcaDeCopia, elegirQueQueda, PAPELERA } from "../../herramientas/telefono.mjs";

let pasadas = 0, fallidas = 0;
const prueba = (n, f) => {
  try { f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); }
};
const titulo = (t) => console.log("\n" + t);

const HACE_DIAS = (d) => Date.now() - d * 24 * 3600 * 1000;

/* Una carpeta de mentira. `arbol` es { "ruta/archivo": contenido | {c, dias} }. */
function armar(arbol) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "descargas-"));
  for (const [rel, v] of Object.entries(arbol)) {
    const abs = path.join(raiz, rel);
    if (rel.endsWith("/")) { fs.mkdirSync(abs, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    const c = typeof v === "string" ? v : v.c;
    fs.writeFileSync(abs, c);
    if (typeof v === "object" && v.dias != null) {
      const t = new Date(HACE_DIAS(v.dias));
      fs.utimesSync(abs, t, t);
    }
  }
  return raiz;
}

/* Foto del disco: cada ruta con su contenido, sin la papelera. Dos fotos
   iguales = la carpeta quedó como estaba. */
function foto(raiz) {
  const out = {};
  const ver = (rel) => {
    for (const e of fs.readdirSync(path.join(raiz, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (!rel && e.name === PAPELERA) continue;
      if (e.isDirectory()) { out[r + "/"] = ""; ver(r); }
      else out[r] = fs.readFileSync(path.join(raiz, r), "utf8");
    }
  };
  ver("");
  return out;
}

const rutas = (plan) => plan.mover.filter((m) => !m.viajaCon).map((m) => m.ruta).sort();

/* ── Las piezas sueltas ─────────────────────────────────────────────────── */
titulo("Qué es basura y qué está protegido");

prueba("una descarga a medias de ayer es basura; la de recién, no (puede estar bajando)", () => {
  assert.equal(motivoBasura("video.mp4.crdownload", 10, HACE_DIAS(2)), "descarga a medias");
  assert.equal(motivoBasura("video.mp4.crdownload", 10, Date.now()), null);
});

prueba("un archivo de 0 bytes es basura", () => {
  assert.equal(motivoBasura("nada.pdf", 0, Date.now()), "vacío (0 bytes)");
});

prueba("Thumbs.db es basura aunque termine en .db", () => {
  assert.equal(esProtegido("Thumbs.db"), false);
  assert.equal(motivoBasura("Thumbs.db", 100, Date.now()), "resto de otro sistema");
});

prueba("un .jks, un .db y un .sqlite están protegidos, en cualquier mayúscula", () => {
  for (const n of ["firma.jks", "sitd.db", "base.SQLITE", "sitd.db-wal", "llave.PEM"])
    assert.equal(esProtegido(n), true, n);
});

prueba("un .db vacío NO es basura: está protegido", () => {
  assert.equal(motivoBasura("sitd.db", 0, Date.now()), null);
});

titulo("Cuál de dos iguales se queda");

prueba("reconoce las marcas de copia de Android, Windows y Mac", () => {
  for (const n of ["foto (1).jpg", "foto (12).jpg", "Copia de foto.jpg", "foto - copia.jpg",
                   "foto - Copy (2).jpg", "foto copy.jpg", "Fotos (1)"])
    assert.equal(tieneMarcaDeCopia(n), true, n);
  for (const n of ["foto.jpg", "informe 2026.pdf", "copiadora.pdf", "(1) intro.txt"])
    assert.equal(tieneMarcaDeCopia(n), false, n);
});

prueba("se queda el que no tiene marca de copia, aunque sea el más nuevo", () => {
  const q = elegirQueQueda([{ ruta: "a (1).pdf", mtimeMs: 1 }, { ruta: "a.pdf", mtimeMs: 9 }]);
  assert.equal(q.ruta, "a.pdf");
});

prueba("entre dos sin marca, se queda el más viejo", () => {
  const q = elegirQueQueda([{ ruta: "b.pdf", mtimeMs: 9 }, { ruta: "a.pdf", mtimeMs: 1 }]);
  assert.equal(q.ruta, "a.pdf");
});

prueba("la elección no depende del orden en que llegan", () => {
  const xs = [{ ruta: "x/a.pdf", mtimeMs: 5 }, { ruta: "a.pdf", mtimeMs: 5 }, { ruta: "b.pdf", mtimeMs: 5 }];
  const a = elegirQueQueda(xs).ruta, b = elegirQueQueda(xs.slice().reverse()).ruta;
  assert.equal(a, b);
  assert.equal(a, "a.pdf");
});

/* ── El plan, sobre carpetas de verdad ──────────────────────────────────── */
titulo("El plan");

prueba("dos archivos iguales: sale la copia, queda el original", () => {
  const r = armar({ "factura.pdf": "AAA", "factura (1).pdf": "AAA", "otra.pdf": "BBB" });
  const p = planificar(r);
  assert.deepEqual(rutas(p), ["factura (1).pdf"]);
  assert.equal(p.mover[0].igualA, "factura.pdf");
});

prueba("mismo tamaño y distinto contenido NO son repetidos", () => {
  const r = armar({ "a.txt": "AAA", "b.txt": "BBB" });
  assert.deepEqual(rutas(planificar(r)), []);
});

prueba("una carpeta repetida sale entera, con otro nombre y todo", () => {
  const r = armar({
    "Fotos/uno.jpg": "1", "Fotos/sub/dos.jpg": "22",
    "Fotos (1)/uno.jpg": "1", "Fotos (1)/sub/dos.jpg": "22",
  });
  const p = planificar(r);
  assert.deepEqual(rutas(p), ["Fotos (1)"]);
  assert.equal(p.mover[0].tipo, "carpeta");
  // Lo de adentro no aparece dos veces.
  assert.equal(p.mover.filter((m) => m.ruta.startsWith("Fotos (1)/")).length, 0);
});

prueba("dos carpetas con los mismos archivos pero OTROS nombres adentro no son la misma", () => {
  const r = armar({ "A/uno.jpg": "1", "B/otro.jpg": "1" });
  const p = planificar(r);
  // Se detecta el archivo repetido, y NO como carpeta repetida. (La carpeta
  // que queda vacía después sí se va, pero por eso y no por ser copia.)
  assert.equal(p.mover.filter((m) => m.motivo === "carpeta repetida").length, 0);
  assert.ok(p.mover.some((m) => m.motivo === "repetido"));
});

prueba("una carpeta con un archivo de más no es copia de la otra", () => {
  const r = armar({ "A/uno.jpg": "1", "B/uno.jpg": "1", "B/extra.txt": "xyzw" });
  const p = planificar(r);
  assert.equal(p.mover.filter((m) => m.tipo === "carpeta").length, 0);
});

prueba("un .db repetido NO se mueve: se avisa", () => {
  const r = armar({ "sitd.db": "BASE", "sitd (1).db": "BASE" });
  const p = planificar(r);
  assert.deepEqual(rutas(p), []);
  assert.equal(p.avisos.length, 1);
  assert.equal(p.avisos[0].ruta, "sitd (1).db");
});

prueba("una carpeta repetida con una clave de firma adentro NO se mueve", () => {
  const r = armar({ "K/firma.jks": "JKS", "K (1)/firma.jks": "JKS" });
  const p = planificar(r);
  assert.deepEqual(rutas(p), []);
  assert.ok(p.avisos.some((a) => a.ruta === "K (1)"));
});

prueba("la papelera y las carpetas ocultas no se miran", () => {
  const r = armar({ "a.txt": "AAA", [`${PAPELERA}/x/a.txt`]: "AAA", ".thumbnails/a.txt": "AAA" });
  assert.deepEqual(rutas(planificar(r)), []);
});

prueba("una carpeta que queda vacía después de botar se va también, y lo de adentro viaja con ella", () => {
  const r = armar({ "a.pdf": "AAA", "Vieja/a (1).pdf": "AAA", "Vacia/": "" });
  const p = planificar(r);
  assert.deepEqual(rutas(p), ["Vacia", "Vieja"]);
  const adentro = p.mover.find((m) => m.ruta === "Vieja/a (1).pdf");
  assert.equal(adentro.viajaCon, "Vieja");
});

prueba("la carpeta que se queda nunca se marca vacía", () => {
  const r = armar({ "Fotos/uno.jpg": "1", "Fotos (1)/uno.jpg": "1" });
  assert.deepEqual(rutas(planificar(r)), ["Fotos (1)"]);
});

prueba("sin nada raro, el plan está vacío", () => {
  const r = armar({ "a.txt": "A", "b/c.txt": "CC" });
  const p = planificar(r);
  assert.equal(p.mover.length, 0);
  assert.equal(p.avisos.length, 0);
});

/* ── Aplicar y deshacer ─────────────────────────────────────────────────── */
titulo("Aplicar y deshacer: la carpeta vuelve EXACTAMENTE como estaba");

const MEZCLA = {
  "factura.pdf": "AAA", "factura (1).pdf": "AAA",
  "Fotos/uno.jpg": "1", "Fotos/sub/dos.jpg": "22",
  "Fotos (1)/uno.jpg": "1", "Fotos (1)/sub/dos.jpg": "22",
  "Vieja/factura (2).pdf": "AAA", "Vieja/Thumbs.db": "x",
  "bajando.zip.crdownload": { c: "zz", dias: 3 },
  "nada.txt": "",
  "sitd.db": "BASE", "sitd (1).db": "BASE",
  "Vacia/Mas vacia/": "",
};

prueba("aplicar saca todo lo del plan y deja lo protegido", () => {
  const r = armar(MEZCLA);
  const p = planificar(r);
  const res = aplicar(r, p, "20260929-120000");
  assert.equal(res.fallas.length, 0);
  const f = foto(r);
  assert.deepEqual(Object.keys(f).sort(),
    ["Fotos/", "Fotos/sub/", "Fotos/sub/dos.jpg", "Fotos/uno.jpg",
     "factura.pdf", "sitd (1).db", "sitd.db"]);
  assert.ok(fs.existsSync(path.join(r, PAPELERA, "20260929-120000", "lote.json")));
});

prueba("deshacer devuelve todo, byte por byte", () => {
  const r = armar(MEZCLA);
  const antes = foto(r);
  aplicar(r, planificar(r), "20260929-120000");
  const res = deshacer(r, "20260929-120000");
  assert.equal(res.fallas.length, 0, JSON.stringify(res.fallas));
  assert.deepEqual(foto(r), antes);
  assert.deepEqual(lotes(r), []);
});

prueba("correr el plan dos veces seguidas: la segunda no encuentra nada", () => {
  const r = armar(MEZCLA);
  aplicar(r, planificar(r), "20260929-120000");
  assert.equal(planificar(r).mover.length, 0);
});

prueba("si al deshacer ya hay otro con el mismo nombre, no se pisa", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  aplicar(r, planificar(r), "20260929-120000");
  fs.writeFileSync(path.join(r, "a (1).pdf"), "NUEVO");
  const res = deshacer(r, "20260929-120000");
  assert.equal(res.fallas.length, 0);
  assert.equal(fs.readFileSync(path.join(r, "a (1).pdf"), "utf8"), "NUEVO");
  assert.equal(fs.readFileSync(path.join(r, "a (1) (restaurado).pdf"), "utf8"), "AAA");
});

prueba("el lote.json dice de dónde salió cada cosa y por qué", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  aplicar(r, planificar(r), "20260929-120000");
  const reg = JSON.parse(fs.readFileSync(path.join(r, PAPELERA, "20260929-120000", "lote.json"), "utf8"));
  assert.equal(reg.movidos.length, 1);
  assert.equal(reg.movidos[0].ruta, "a (1).pdf");
  assert.equal(reg.movidos[0].motivo, "repetido");
  assert.equal(reg.movidos[0].igualA, "a.pdf");
});

/* ── Vaciar ─────────────────────────────────────────────────────────────── */
titulo("Vaciar: sólo lo viejo, contando desde que se botó");

prueba("un lote de hace 40 días vence a los 30; uno de hoy, no", () => {
  const r = armar({});
  const viejo = new Date(HACE_DIAS(40)).toISOString().replace(/\.\d+Z$/, "")
    .replace(/[-:]/g, "").replace("T", "-");
  for (const l of [viejo, "29991231-000000"]) {
    fs.mkdirSync(path.join(r, PAPELERA, l), { recursive: true });
    fs.writeFileSync(path.join(r, PAPELERA, l, "lote.json"), "{}");
  }
  assert.deepEqual(vencidos(r, 30), [viejo]);
});

prueba("un archivo viejo botado hoy NO vence hoy", () => {
  const r = armar({ "a.pdf": { c: "AAA", dias: 400 }, "a (1).pdf": { c: "AAA", dias: 400 } });
  const { lote } = aplicar(r, planificar(r));
  assert.ok(lotes(r).includes(lote));
  assert.deepEqual(vencidos(r, 30), []);
});

prueba("una carpeta que no es un lote no se toca", () => {
  const r = armar({ [`${PAPELERA}/20200101-000000/cosa.txt`]: "x" });
  assert.deepEqual(vencidos(r, 30), []);
});

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
