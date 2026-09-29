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
import http from "node:http";
import { crearInterfaz } from "../../herramientas/telefono-interfaz.mjs";
import { planificar, aplicar, normalizarAjustes, tipoDe, destinoValido, deshacer, lotes, vencidos, motivoBasura, esProtegido,
         tieneMarcaDeCopia, elegirQueQueda, PAPELERA,
         manifiestoDesde, leerManifiesto, hayQueBajar, rotar, actualizarApks, informeHtml
       } from "../../herramientas/telefono.mjs";

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

/* Los casos de limpieza se miran SIN ordenar, que es otra regla y tiene sus
   propios casos más abajo: si no, cada archivo suelto aparecería dos veces. */
const SIN_ORDENAR = { reglas: { ordenar: { estado: "apagada" } } };
const planSolo = (r) => planificar(r, Date.now(), SIN_ORDENAR);

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
  const p = planSolo(r);
  assert.deepEqual(rutas(p), ["factura (1).pdf"]);
  assert.equal(p.mover[0].igualA, "factura.pdf");
});

prueba("mismo tamaño y distinto contenido NO son repetidos", () => {
  const r = armar({ "a.txt": "AAA", "b.txt": "BBB" });
  assert.deepEqual(rutas(planSolo(r)), []);
});

prueba("una carpeta repetida sale entera, con otro nombre y todo", () => {
  const r = armar({
    "Fotos/uno.jpg": "1", "Fotos/sub/dos.jpg": "22",
    "Fotos (1)/uno.jpg": "1", "Fotos (1)/sub/dos.jpg": "22",
  });
  const p = planSolo(r);
  assert.deepEqual(rutas(p), ["Fotos (1)"]);
  assert.equal(p.mover[0].tipo, "carpeta");
  // Lo de adentro no aparece dos veces.
  assert.equal(p.mover.filter((m) => m.ruta.startsWith("Fotos (1)/")).length, 0);
});

prueba("dos carpetas con los mismos archivos pero OTROS nombres adentro no son la misma", () => {
  const r = armar({ "A/uno.jpg": "1", "B/otro.jpg": "1" });
  const p = planSolo(r);
  // Se detecta el archivo repetido, y NO como carpeta repetida. (La carpeta
  // que queda vacía después sí se va, pero por eso y no por ser copia.)
  assert.equal(p.mover.filter((m) => m.motivo === "carpeta repetida").length, 0);
  assert.ok(p.mover.some((m) => m.motivo === "repetido"));
});

prueba("una carpeta con un archivo de más no es copia de la otra", () => {
  const r = armar({ "A/uno.jpg": "1", "B/uno.jpg": "1", "B/extra.txt": "xyzw" });
  const p = planSolo(r);
  assert.equal(p.mover.filter((m) => m.tipo === "carpeta").length, 0);
});

prueba("un .db repetido NO se mueve: se avisa", () => {
  const r = armar({ "sitd.db": "BASE", "sitd (1).db": "BASE" });
  const p = planSolo(r);
  assert.deepEqual(rutas(p), []);
  assert.equal(p.avisos.length, 1);
  assert.equal(p.avisos[0].ruta, "sitd (1).db");
});

prueba("una carpeta repetida con una clave de firma adentro NO se mueve", () => {
  const r = armar({ "K/firma.jks": "JKS", "K (1)/firma.jks": "JKS" });
  const p = planSolo(r);
  assert.deepEqual(rutas(p), []);
  assert.ok(p.avisos.some((a) => a.ruta === "K (1)"));
});

prueba("la papelera y las carpetas ocultas no se miran", () => {
  const r = armar({ "a.txt": "AAA", [`${PAPELERA}/x/a.txt`]: "AAA", ".thumbnails/a.txt": "AAA" });
  assert.deepEqual(rutas(planSolo(r)), []);
});

prueba("una carpeta que queda vacía después de botar se va también, y lo de adentro viaja con ella", () => {
  const r = armar({ "a.pdf": "AAA", "Vieja/a (1).pdf": "AAA", "Vacia/": "" });
  const p = planSolo(r);
  assert.deepEqual(rutas(p), ["Vacia", "Vieja"]);
  const adentro = p.mover.find((m) => m.ruta === "Vieja/a (1).pdf");
  assert.equal(adentro.viajaCon, "Vieja");
});

prueba("la carpeta que se queda nunca se marca vacía", () => {
  const r = armar({ "Fotos/uno.jpg": "1", "Fotos (1)/uno.jpg": "1" });
  assert.deepEqual(rutas(planSolo(r)), ["Fotos (1)"]);
});

prueba("sin nada raro, el plan está vacío", () => {
  const r = armar({ "a.txt": "A", "b/c.txt": "CC" });
  const p = planSolo(r);
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
  const p = planSolo(r);
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
  aplicar(r, planSolo(r), "20260929-120000");
  const res = deshacer(r, "20260929-120000");
  assert.equal(res.fallas.length, 0, JSON.stringify(res.fallas));
  assert.deepEqual(foto(r), antes);
  assert.deepEqual(lotes(r), []);
});

prueba("correr el plan dos veces seguidas: la segunda no encuentra nada", () => {
  const r = armar(MEZCLA);
  aplicar(r, planSolo(r), "20260929-120000");
  assert.equal(planSolo(r).mover.length, 0);
});

prueba("si al deshacer ya hay otro con el mismo nombre, no se pisa", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  aplicar(r, planSolo(r), "20260929-120000");
  fs.writeFileSync(path.join(r, "a (1).pdf"), "NUEVO");
  const res = deshacer(r, "20260929-120000");
  assert.equal(res.fallas.length, 0);
  assert.equal(fs.readFileSync(path.join(r, "a (1).pdf"), "utf8"), "NUEVO");
  assert.equal(fs.readFileSync(path.join(r, "a (1) (restaurado).pdf"), "utf8"), "AAA");
});

prueba("el lote.json dice de dónde salió cada cosa y por qué", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  aplicar(r, planSolo(r), "20260929-120000");
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
  const { lote } = aplicar(r, planSolo(r));
  assert.ok(lotes(r).includes(lote));
  assert.deepEqual(vencidos(r, 30), []);
});

prueba("una carpeta que no es un lote no se toca", () => {
  const r = armar({ [`${PAPELERA}/20200101-000000/cosa.txt`]: "x" });
  assert.deepEqual(vencidos(r, 30), []);
});

/* ── El manifiesto: lo que el panel dice que hay que tener ──────────────── */
titulo("El manifiesto sale del panel y no lleva nada de más");

const PANEL = [
  { id: "hilux", nombre: "SITD-Hilux", app: { apiKey: "X", mail: "m@x" }, acceso: { base: "b" },
    empaquetado: { secretos: ["FIRMA_JKS"] },
    sitio: { repo: "maurogasta-crypto/sitd-hilux",
             url: "https://github.com/maurogasta-crypto/sitd-hilux/releases/tag/ultimo",
             descarga: "https://github.com/maurogasta-crypto/sitd-hilux/releases/download/ultimo/sitd-hilux.apk",
             resumen: "app" } },
  { id: "panel", nombre: "Panel", sitio: { repo: "maurogasta-crypto/datos", url: "https://x.github.io/datos/" } },
  { id: "datos", nombre: "datos", sitio: { repo: "maurogasta-crypto/datos" } },
  { id: "raro", sitio: { repo: "no es un repo; rm -rf", url: "javascript:alert(1)", descarga: "http://x/a.apk" } },
  { id: "nada" },
];

prueba("sólo viajan los campos públicos: ni app, ni acceso, ni empaquetado", () => {
  const texto = JSON.stringify(manifiestoDesde(PANEL));
  for (const x of ["apiKey", "m@x", "acceso", "FIRMA_JKS", "empaquetado"]) assert.ok(!texto.includes(x), x);
});

prueba("cada proyecto trae sólo las claves conocidas", () => {
  for (const p of manifiestoDesde(PANEL).proyectos)
    assert.deepEqual(Object.keys(p).sort(), ["apk", "id", "nombre", "repo", "respaldar", "resumen", "url"]);
});

prueba("un repositorio compartido (panel y datos) se respalda UNA vez", () => {
  const m = manifiestoDesde(PANEL).proyectos.filter((p) => p.repo === "maurogasta-crypto/datos");
  assert.equal(m.length, 2);
  assert.equal(m.filter((p) => p.respaldar).length, 1);
});

prueba("lo que no es un repo, una dirección https o un .apk https no entra", () => {
  const m = manifiestoDesde(PANEL).proyectos;
  assert.ok(!m.some((p) => p.id === "raro"));
  assert.ok(!m.some((p) => p.id === "nada"));
});

prueba("una app cuya dirección es la página del release no figura como sitio", () => {
  const h = manifiestoDesde(PANEL).proyectos.find((p) => p.id === "hilux");
  assert.equal(h.url, null);
  assert.ok(h.apk.endsWith(".apk"));
});

prueba("el bodega.json del repositorio se lee y cumple la misma forma", () => {
  const m = leerManifiesto();
  assert.ok(m.proyectos.length > 0);
  for (const p of m.proyectos)
    assert.deepEqual(Object.keys(p).sort(), ["apk", "id", "nombre", "repo", "respaldar", "resumen", "url"]);
});

/* ── APK al día ─────────────────────────────────────────────────────────── */
titulo("Lo último para instalar");

const REM = { url: "https://x/a.apk", bytes: 10, fecha: "2026-09-28T00:00:00.000Z", huella: "e1" };

prueba("sin copia de acá, se baja", () => assert.equal(hayQueBajar(REM, REM, null), true));
prueba("igual que la última vez, no se baja", () =>
  assert.equal(hayQueBajar(REM, REM, { bytes: 10 }), false));
prueba("mismo nombre pero otra huella —el release «ultimo» reemplazado—, se baja", () =>
  assert.equal(hayQueBajar(REM, { ...REM, huella: "e2" }, { bytes: 10 }), true));
prueba("una bajada cortada (otro tamaño acá), se vuelve a bajar", () =>
  assert.equal(hayQueBajar(REM, REM, { bytes: 4 }), true));

prueba("rotar deja las DOS anteriores más nuevas y nunca toca la de otro proyecto", () => {
  const r = armar({ "anteriores/hilux-2026-09-01.apk": "1", "anteriores/hilux-2026-09-10.apk": "2",
                    "anteriores/otra-2020-01-01.apk": "z", "hilux.apk": "3" });
  rotar(r, "hilux", { fecha: "2026-09-20T00:00:00Z" });
  assert.deepEqual(fs.readdirSync(path.join(r, "anteriores")).sort(),
    ["hilux-2026-09-10.apk", "hilux-2026-09-20.apk", "otra-2020-01-01.apk"]);
  assert.equal(fs.existsSync(path.join(r, "hilux.apk")), false);
});

const MAN = { generado: "hoy", proyectos: [
  { id: "hilux", nombre: "Hilux", repo: "a/b", respaldar: true, url: null, apk: "https://x/a.apk", resumen: "" },
  { id: "sitio", nombre: "Sitio", repo: "a/c", respaldar: true, url: "https://s/", apk: null, resumen: "" } ] };

async function correrApks(dest, remoto, contenido = "APK") {
  let bajadas = 0;
  const filas = await actualizarApks(MAN, dest, {
    consultar: async () => { if (remoto instanceof Error) throw remoto; return remoto; },
    bajar: async (u, d) => { bajadas++; fs.writeFileSync(d, contenido); return contenido.length; } });
  return { filas, bajadas };
}

const pruebasAsync = [];
const pruebaA = (n, f) => pruebasAsync.push([n, f]);

pruebaA("la primera vez baja; la segunda, igual, no; con versión nueva baja y guarda la anterior", async () => {
  const d = armar({});
  const r1 = { ...REM, bytes: 3 };
  let x = await correrApks(d, r1);
  assert.equal(x.bajadas, 1); assert.equal(x.filas.length, 1); assert.equal(x.filas[0].nueva, true);
  x = await correrApks(d, r1);
  assert.equal(x.bajadas, 0); assert.equal(x.filas[0].nueva, false);
  x = await correrApks(d, { ...r1, huella: "nueva" }, "NEW");
  assert.equal(x.bajadas, 1);
  assert.equal(fs.readFileSync(path.join(d, "Instalar", "hilux.apk"), "utf8"), "NEW");
  assert.equal(fs.readdirSync(path.join(d, "Instalar", "anteriores")).length, 1);
});

pruebaA("sin red, la copia que ya estaba NO se borra y se dice", async () => {
  const d = armar({});
  await correrApks(d, { ...REM, bytes: 3 });
  const x = await correrApks(d, new Error("sin red"));
  assert.equal(x.filas[0].error, "sin red");
  assert.equal(x.filas[0].tieneCopia, true);
  assert.equal(fs.readFileSync(path.join(d, "Instalar", "hilux.apk"), "utf8"), "APK");
});

pruebaA("un sitio sin descarga no pregunta nada", async () => {
  const d = armar({});
  const x = await correrApks(d, REM);
  assert.ok(!x.filas.some((f) => f.id === "sitio"));
});

/* ── El informe ─────────────────────────────────────────────────────────── */
titulo("El informe");

prueba("un nombre de archivo con HTML adentro se muestra, no se ejecuta", () => {
  const h = informeHtml({ fecha: "hoy", man: MAN, apks: [], repos: [], deposito: { archivos: 0, bytes: 0 },
    plan: { archivos: 1, carpetas: 0, avisos: [],
            mover: [{ ruta: "<img src=x onerror=alert(1)>.pdf", tipo: "archivo", motivo: "repetido", bytes: 1 }] } });
  assert.ok(!h.includes("<img src=x"));
  assert.ok(h.includes("&lt;img src=x"));
});

prueba("no pide nada de afuera: ni scripts ni letras", () => {
  const h = informeHtml({ fecha: "hoy", man: MAN, apks: [], repos: [], plan: null, deposito: { archivos: 0, bytes: 0 } });
  assert.ok(!/<script|<link/i.test(h));
});

prueba("dice que todavía no se movió nada, y cómo hacerlo", () => {
  const h = informeHtml({ fecha: "hoy", man: MAN, apks: [], repos: [], deposito: { archivos: 0, bytes: 0 },
    plan: { archivos: 2, carpetas: 0, avisos: [], mover: [{ ruta: "a (1).pdf", tipo: "archivo", motivo: "repetido", bytes: 1 }] } });
  assert.ok(h.includes("no se movió nada"));
  assert.ok(h.includes("telefono.mjs interfaz"));
});

/* ── Reglas que se prenden, se apagan y se cambian ──────────────────────── */
titulo("Las reglas");

prueba("todas empiezan en «propone»: nada anda solo hasta que alguien lo diga", () => {
  const a = normalizarAjustes(null);
  for (const e of Object.values(a.reglas)) assert.equal(e.estado, "propone");
});

prueba("un estado inventado vuelve a «propone», nunca a «automatica»", () => {
  const a = normalizarAjustes({ reglas: { basura: { estado: "borrar-todo" } } });
  assert.equal(a.reglas.basura.estado, "propone");
});

prueba("un destino que saldría de Descargas o entraría a la papelera no se acepta", () => {
  for (const d of ["../fuera", "a/b", "_Papelera", ".oculta", "..", "", "   "])
    assert.equal(destinoValido(d), false, JSON.stringify(d));
  assert.equal(destinoValido("Mis facturas"), true);
  const a = normalizarAjustes({ destinos: { documentos: "../../sdcard" } });
  assert.equal(a.destinos.documentos, "Documentos");
});

prueba("una regla apagada no propone nada", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  const p = planificar(r, Date.now(), { reglas: { repetidos: { estado: "apagada" }, ordenar: { estado: "apagada" } } });
  assert.equal(p.mover.length, 0);
});

prueba("lo que se pidió no volver a proponer, no vuelve", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA", "Fotos/x": "1", "Fotos (1)/x": "1" });
  const p = planificar(r, Date.now(), { ...SIN_ORDENAR, ignorar: ["a (1).pdf", "Fotos (1)"] });
  assert.equal(p.mover.length, 0);
});

prueba("ordenar pone lo suelto de la raíz en la carpeta de su tipo, y no toca lo de adentro de carpetas", () => {
  const r = armar({ "factura.pdf": "A", "foto.JPG": "BB", "Viaje/otra.pdf": "CCC", "raro.xyz": "DDDD", "sitd.db": "E" });
  const p = planificar(r);
  const o = Object.fromEntries(p.mover.filter((m) => m.regla === "ordenar").map((m) => [m.ruta, m.hacia]));
  assert.deepEqual(o, { "factura.pdf": "Documentos/factura.pdf", "foto.JPG": "Imágenes/foto.JPG" });
});

prueba("un tipo con la carpeta en blanco se queda donde está", () => {
  const r = armar({ "factura.pdf": "A" });
  const p = planificar(r, Date.now(), { destinos: { documentos: "" } });
  assert.equal(p.mover.length, 0);
});

prueba("si ya hay uno con ese nombre en la carpeta de destino, no se pisa: se avisa", () => {
  const r = armar({ "factura.pdf": "A", "Documentos/factura.pdf": "OTRO" });
  const p = planificar(r);
  assert.equal(p.mover.filter((m) => m.regla === "ordenar").length, 0);
  assert.ok(p.avisos.some((a) => a.ruta === "factura.pdf"));
});

prueba("un instalador viejo se propone; uno nuevo, no", () => {
  const r = armar({ "vieja.apk": { c: "A", dias: 60 }, "nueva.apk": { c: "BB", dias: 2 } });
  const p = planificar(r, Date.now(), SIN_ORDENAR);
  assert.deepEqual(p.mover.map((m) => m.ruta), ["vieja.apk"]);
  assert.equal(p.mover[0].regla, "apk-viejas");
});

prueba("el tipo sale de la extensión, en cualquier mayúscula", () => {
  assert.equal(tipoDe("a.PDF"), "documentos");
  assert.equal(tipoDe("b.heic"), "imagenes");
  assert.equal(tipoDe("c.apk"), "instaladores");
  assert.equal(tipoDe("d"), "otros");
});

prueba("el resumen cuenta por tipo y dice cuánto pesa todo", () => {
  const r = armar({ "a.pdf": "AAAA", "b.jpg": "BB", "Sub/c.jpg": "C" });
  const p = planificar(r);
  assert.equal(p.resumen.bytes, 7);
  assert.equal(p.resumen.porTipo.imagenes.archivos, 2);
  assert.equal(p.resumen.pesados[0].ruta, "a.pdf");
});

titulo("Aplicar lo tildado");

prueba("sólo se mueve lo tildado", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA", "b.txt": "", "c.txt": "" });
  const p = planSolo(r);
  aplicar(r, p, "20260929-120000", new Set(["a (1).pdf"]));
  const f = foto(r);
  assert.ok(!("a (1).pdf" in f));
  assert.ok("b.txt" in f && "c.txt" in f);
});

prueba("tildar una «carpeta vacía» se la lleva con lo de adentro, que ya estaba propuesto", () => {
  const r = armar({ "a.pdf": "AAA", "Vieja/a (1).pdf": "AAA" });
  const p = planSolo(r);
  aplicar(r, p, "20260929-120000", new Set(["Vieja"]));
  assert.equal(fs.existsSync(path.join(r, "Vieja")), false);
  const res = deshacer(r, "20260929-120000");
  assert.equal(res.fallas.length, 0);
  assert.equal(fs.readFileSync(path.join(r, "Vieja/a (1).pdf"), "utf8"), "AAA");
});

prueba("con la carpeta destildada, se puede botar sólo lo de adentro", () => {
  const r = armar({ "a.pdf": "AAA", "Vieja/a (1).pdf": "AAA" });
  aplicar(r, planSolo(r), "20260929-120000", new Set(["Vieja/a (1).pdf"]));
  assert.equal(fs.existsSync(path.join(r, "Vieja/a (1).pdf")), false);
  assert.equal(fs.existsSync(path.join(r, "Vieja")), true);
});

prueba("ordenar y botar en el mismo lote, y deshacer lo devuelve todo byte por byte", () => {
  const r = armar({ ...MEZCLA, "suelto.pdf": "S", "cancion.mp3": "M" });
  const antes = foto(r);
  const p = planificar(r);
  assert.ok(p.mover.some((m) => m.regla === "ordenar"));
  aplicar(r, p, "20260929-120000");
  assert.equal(fs.readFileSync(path.join(r, "Documentos/suelto.pdf"), "utf8"), "S");
  const res = deshacer(r, "20260929-120000");
  assert.equal(res.fallas.length, 0, JSON.stringify(res.fallas));
  // Las carpetas de destino quedan creadas y vacías: es lo único que sobra.
  const despues = foto(r);
  for (const k of Object.keys(despues)) if (!(k in antes)) assert.ok(k.endsWith("/"), k);
  for (const [k, v] of Object.entries(antes)) assert.equal(despues[k], v, k);
});

prueba("con nada tildado no queda un lote vacío en la papelera", () => {
  const r = armar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  aplicar(r, planSolo(r), "20260929-120000", new Set());
  assert.deepEqual(lotes(r), []);
});

/* ── La interfaz: un servidor que mueve archivos tiene que estar cerrado ── */
titulo("La interfaz y sus cerraduras");

function levantar(arbol) {
  const raiz = armar(arbol);
  const aj = path.join(armar({}), "ajustes.json");
  const i = crearInterfaz({ carpeta: raiz, archivoAjustes: aj });
  return new Promise((ok) => i.servidor.listen(0, "127.0.0.1", () => ok({ ...i, raiz, aj,
    puerto: i.servidor.address().port })));
}

function pedirA(i, { ruta = "/estado", llave = i.llave, metodo = "GET", cuerpo, host, origen,
                      tipo = "application/json" } = {}) {
  return new Promise((ok, mal) => {
    const headers = { Host: host || `127.0.0.1:${i.puerto}` };
    if (cuerpo !== undefined) headers["Content-Type"] = tipo;
    if (origen) headers.Origin = origen;
    const req = http.request({ host: "127.0.0.1", port: i.puerto, path: `/${llave}${ruta}`, method: metodo, headers },
      (res) => { let b = ""; res.on("data", (c) => (b += c)); res.on("end", () => {
        let j = null; try { j = JSON.parse(b); } catch {}
        ok({ status: res.statusCode, json: j, texto: b }); }); });
    req.on("error", mal);
    if (cuerpo !== undefined) req.write(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo));
    req.end();
  });
}

pruebaA("con la llave, contesta la página y el estado", async () => {
  const i = await levantar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  try {
    const pag = await pedirA(i, { ruta: "/" });
    assert.equal(pag.status, 200);
    assert.ok(pag.texto.includes("Ordenar Descargas"));
    const e = await pedirA(i);
    assert.equal(e.status, 200);
    assert.ok(e.json.plan.mover.some((m) => m.ruta === "a (1).pdf"));
  } finally { i.servidor.close(); }
});

pruebaA("sin la llave, o con otra, 404", async () => {
  const i = await levantar({});
  try {
    assert.equal((await pedirA(i, { llave: "otra" })).status, 404);
    assert.equal((await pedirA(i, { llave: "" })).status, 404);
  } finally { i.servidor.close(); }
});

pruebaA("con otro Host (el truco de apuntar un nombre a 127.0.0.1), 404", async () => {
  const i = await levantar({});
  try { assert.equal((await pedirA(i, { host: "malo.com" })).status, 404); }
  finally { i.servidor.close(); }
});

pruebaA("un POST desde otra página (otro Origin), 403; y sin JSON, 415", async () => {
  const i = await levantar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  try {
    assert.equal((await pedirA(i, { ruta: "/aplicar", metodo: "POST", cuerpo: { rutas: ["a (1).pdf"] },
      origen: "https://malo.com" })).status, 403);
    assert.equal((await pedirA(i, { ruta: "/aplicar", metodo: "POST", cuerpo: "rutas=x",
      tipo: "text/plain" })).status, 415);
    assert.ok(fs.existsSync(path.join(i.raiz, "a (1).pdf")));
  } finally { i.servidor.close(); }
});

pruebaA("aplicar mueve SÓLO lo que el plan de ahora propone: una ruta inventada no se toca", async () => {
  const i = await levantar({ "a.pdf": "AAA", "a (1).pdf": "AAA", "importante.xyz": "NO" });
  try {
    const r = await pedirA(i, { ruta: "/aplicar", metodo: "POST",
      cuerpo: { rutas: ["a (1).pdf", "importante.xyz", "../../fuera"] } });
    assert.equal(r.status, 200);
    assert.ok(!fs.existsSync(path.join(i.raiz, "a (1).pdf")));
    assert.equal(fs.readFileSync(path.join(i.raiz, "importante.xyz"), "utf8"), "NO");
  } finally { i.servidor.close(); }
});

pruebaA("apagar una regla desde la interfaz la saca del plan, y queda guardado", async () => {
  const i = await levantar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  try {
    const e = (await pedirA(i)).json;
    e.ajustes.reglas.repetidos.estado = "apagada";
    const r = await pedirA(i, { ruta: "/ajustes", metodo: "POST", cuerpo: { ajustes: e.ajustes } });
    assert.ok(!r.json.plan.mover.some((m) => m.regla === "repetidos"));
    assert.equal(JSON.parse(fs.readFileSync(i.aj, "utf8")).reglas.repetidos.estado, "apagada");
  } finally { i.servidor.close(); }
});

pruebaA("deshacer desde la interfaz devuelve el lote", async () => {
  const i = await levantar({ "a.pdf": "AAA", "a (1).pdf": "AAA" });
  try {
    const r = await pedirA(i, { ruta: "/aplicar", metodo: "POST", cuerpo: { rutas: ["a (1).pdf"] } });
    const lote = r.json.resultado.lote;
    const d = await pedirA(i, { ruta: "/deshacer", metodo: "POST", cuerpo: { lote } });
    assert.equal(d.status, 200);
    assert.equal(fs.readFileSync(path.join(i.raiz, "a (1).pdf"), "utf8"), "AAA");
    assert.equal((await pedirA(i, { ruta: "/deshacer", metodo: "POST", cuerpo: { lote: "../../x" } })).status, 404);
  } finally { i.servidor.close(); }
});

pruebaA("el script de la página parsea, y escribe lo del disco como texto", async () => {
  const { PAGINA } = await import("../../herramientas/telefono-interfaz.mjs");
  const js = PAGINA.match(/<script>([\s\S]*)<\/script>/)[1];
  new Function(js);
  assert.ok(!/innerHTML/.test(js));
});

for (const [n, f] of pruebasAsync) {
  try { await f(); pasadas++; console.log("  ✓ " + n); }
  catch (e) { fallidas++; console.log("  ✗ " + n + "\n      " + e.message); }
}

console.log(`\n  ${pasadas} pasadas, ${fallidas} fallidas\n`);
process.exit(fallidas ? 1 : 0);
