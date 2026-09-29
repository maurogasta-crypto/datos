// ─────────────────────────────────────────────────────────────────────────────
// telefono-interfaz.mjs — La pantalla para decidir qué se hace con Descargas.
//
//   node herramientas/telefono.mjs interfaz
//
// Pedido de Mauro, 2026-09-29: «mostrando como paso previo un resumen del
// análisis del contenido y sugerencias que se puedan activar, modificar o
// desactivar desde la interfaz».
//
// ── POR QUÉ UN SERVIDOR Y NO UN ARCHIVO ──────────────────────────────────────
// Un .html abierto desde el almacenamiento no puede mover archivos: el
// navegador no lo deja, y está bien. Para que un botón haga algo, del otro
// lado tiene que haber alguien que lo escuche. Ese alguien es este archivo:
// un servidor chiquito que corre en Termux mientras la pantalla está abierta,
// y se apaga solo a la media hora sin uso.
//
// ── LAS TRES CERRADURAS ──────────────────────────────────────────────────────
// Un servidor que mueve archivos, en un teléfono con navegador, es algo que
// cualquier página web podría intentar llamar. Por eso:
//   1. Escucha SÓLO en 127.0.0.1: desde otro aparato de la red no se llega.
//   2. Cada vez que arranca inventa una llave de 32 letras al azar, y va en
//      la dirección. Sin la llave contesta 404. Una página de afuera no la
//      conoce.
//   3. Mira el `Host` y el `Origin`, y un POST exige JSON: es lo que corta
//      el truco de un sitio que apunta un nombre suyo a 127.0.0.1.
//
// Y lo que la pantalla puede pedir es lo mismo que la línea de comandos: se
// replanifica en el momento, y sólo se mueve lo que el plan de AHORA
// propone. Una ruta inventada que llegue por el pedido no está en el plan,
// y no se toca.
// ─────────────────────────────────────────────────────────────────────────────

import http from "node:http";
import crypto from "node:crypto";
import { REGLAS, TIPOS, planificar, aplicar, deshacer, lotes, leerAjustes, guardarAjustes,
         nombreDeLote } from "./telefono.mjs";

const MEDIA_HORA = 30 * 60 * 1000;
const TOPE_CUERPO = 1 << 20;

function leerCuerpo(req) {
  return new Promise((ok, mal) => {
    let n = 0; const partes = [];
    req.on("data", (c) => {
      n += c.length;
      if (n > TOPE_CUERPO) { mal(new Error("pedido demasiado grande")); req.destroy(); }
      else partes.push(c);
    });
    req.on("end", () => {
      try { ok(partes.length ? JSON.parse(Buffer.concat(partes).toString("utf8")) : {}); }
      catch { mal(new Error("no es JSON")); }
    });
    req.on("error", mal);
  });
}

function mismaLlave(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/* Arma el servidor. No lo pone a escuchar: eso lo hace quien llama, así el
   banco lo puede probar en un puerto cualquiera. */
function crearInterfaz({ carpeta, archivoAjustes, llave = crypto.randomBytes(16).toString("hex"),
                         alCerrar = () => {} }) {
  let puerto = 0;
  let reloj = null;
  const servidor = http.createServer(atender);
  const rearmar = () => {
    clearTimeout(reloj);
    reloj = setTimeout(() => servidor.close(), MEDIA_HORA);
    if (reloj.unref) reloj.unref();
  };
  servidor.on("listening", () => { puerto = servidor.address().port; rearmar(); });
  servidor.on("close", () => { clearTimeout(reloj); alCerrar(); });

  const estado = () => {
    const ajustes = leerAjustes(archivoAjustes);
    const plan = planificar(carpeta, Date.now(), ajustes);
    return { carpeta, ajustes, plan, lotes: lotes(carpeta).reverse(),
             reglas: REGLAS, tipos: Object.fromEntries(Object.entries(TIPOS).map(([k, t]) => [k, t.nombre])) };
  };

  async function atender(req, res) {
    const responder = (codigo, cuerpo, tipo = "application/json; charset=utf-8") => {
      res.writeHead(codigo, { "Content-Type": tipo, "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src data:" });
      res.end(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo));
    };
    try {
      if (req.headers.host !== `127.0.0.1:${puerto}`) return responder(404, { error: "no" });
      const [, k, ...resto] = (req.url || "").split("?")[0].split("/");
      if (!mismaLlave(k, llave)) return responder(404, { error: "no" });
      const ruta = "/" + resto.join("/");
      rearmar();

      if (req.method === "GET" && ruta === "/") return responder(200, PAGINA, "text/html; charset=utf-8");
      if (req.method === "GET" && ruta === "/estado") return responder(200, estado());

      if (req.method !== "POST") return responder(405, { error: "método" });
      const origen = req.headers.origin;
      if (origen && origen !== `http://127.0.0.1:${puerto}`) return responder(403, { error: "origen" });
      if (!String(req.headers["content-type"] || "").startsWith("application/json"))
        return responder(415, { error: "tiene que ser JSON" });
      const cuerpo = await leerCuerpo(req);

      if (ruta === "/ajustes") {
        guardarAjustes(cuerpo && cuerpo.ajustes, archivoAjustes);
        return responder(200, estado());
      }
      if (ruta === "/ignorar") {
        const a = leerAjustes(archivoAjustes);
        if (typeof cuerpo.ruta === "string") a.ignorar.push(cuerpo.ruta);
        guardarAjustes(a, archivoAjustes);
        return responder(200, estado());
      }
      if (ruta === "/aplicar") {
        const pedidas = new Set(Array.isArray(cuerpo.rutas) ? cuerpo.rutas.filter((r) => typeof r === "string") : []);
        // Se replanifica AHORA: lo que se mueve es lo que el plan de este
        // momento propone y además se tildó. Nada que venga sólo del pedido.
        const plan = planificar(carpeta, Date.now(), leerAjustes(archivoAjustes));
        const validas = new Set(plan.mover.map((m) => m.ruta).filter((r) => pedidas.has(r)));
        if (!validas.size) return responder(200, { resultado: { movidos: 0, fallas: [] }, ...estado() });
        const r = aplicar(carpeta, plan, nombreDeLote(), validas);
        return responder(200, { resultado: r, ...estado() });
      }
      if (ruta === "/deshacer") {
        if (!lotes(carpeta).includes(cuerpo.lote)) return responder(404, { error: "no hay ese lote" });
        return responder(200, { deshecho: deshacer(carpeta, cuerpo.lote), ...estado() });
      }
      if (ruta === "/salir") { responder(200, { ok: true }); setTimeout(() => servidor.close(), 50); return; }
      return responder(404, { error: "no" });
    } catch (e) {
      return responder(500, { error: e.message });
    }
  }

  return { servidor, llave, direccion: () => `http://127.0.0.1:${puerto}/${llave}/` };
}

/* ── La página ───────────────────────────────────────────────────────────────
   Una sola, sin nada de afuera. Todo lo que viene del disco —nombres de
   archivos y carpetas— se escribe con `textContent`, nunca con innerHTML:
   un archivo que se llame `<img onerror=…>` se ve como texto. */
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ordenar Descargas</title><style>
:root{--fondo:#f6f4ef;--papel:#fff;--tinta:#1d1d1b;--tenue:#6b6862;--linea:#e3dfd6;--acento:#2f6b4f;--mal:#a23b2a;--aviso:#8a5a00;--suave:#eef3ef}
@media (prefers-color-scheme:dark){:root{--fondo:#151513;--papel:#1f1f1c;--tinta:#ecebe6;--tenue:#9d9a92;--linea:#34332e;--acento:#7cc4a0;--mal:#ef8a78;--aviso:#e3b25a;--suave:#223029}}
*{box-sizing:border-box}body{margin:0;background:var(--fondo);color:var(--tinta);font:16px/1.45 system-ui,sans-serif}
main{max-width:680px;margin:0 auto;padding:16px 16px 110px}h1{font-size:1.45rem;margin:.1em 0}h2{font-size:1.08rem;margin:0 0 .5em}
section{background:var(--papel);border:1px solid var(--linea);border-radius:14px;padding:16px;margin:14px 0}
.tenue{color:var(--tenue);font-size:.9rem}.chips{display:flex;flex-wrap:wrap;gap:6px;margin:.4em 0}
.chip{background:var(--suave);border-radius:99px;padding:3px 10px;font-size:.85rem}
.regla{border-top:1px solid var(--linea);padding:12px 0}.regla:first-of-type{border-top:0}
.seg{display:flex;border:1px solid var(--linea);border-radius:10px;overflow:hidden;margin-top:8px}
.seg button{flex:1;border:0;background:transparent;color:var(--tinta);padding:9px 4px;font:inherit;font-size:.88rem}
.seg button[aria-pressed=true]{background:var(--acento);color:var(--papel);font-weight:600}
.campo{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:.9rem}
.campo input{flex:1;min-width:0;padding:7px 9px;border:1px solid var(--linea);border-radius:8px;background:var(--fondo);color:var(--tinta);font:inherit}
.campo input[type=number]{flex:0 0 80px}.campo label{flex:0 0 110px}
.item{display:flex;gap:10px;padding:9px 0;border-top:1px solid var(--linea);align-items:flex-start}
.item input{margin-top:4px;width:20px;height:20px;flex:0 0 auto}.item .txt{flex:1;min-width:0;overflow-wrap:anywhere}
.item.adentro{padding-left:26px;opacity:.7}.item b{font-weight:600}.item small{display:block;color:var(--tenue)}
.link{background:none;border:0;color:var(--acento);padding:0;font:inherit;font-size:.82rem;text-decoration:underline}
.grupo h3{font-size:.95rem;margin:14px 0 2px;display:flex;justify-content:space-between;gap:8px}
.aviso b{color:var(--aviso)}.mal{color:var(--mal)}
.barra{position:fixed;left:0;right:0;bottom:0;background:var(--papel);border-top:1px solid var(--linea);padding:12px 16px calc(12px + env(safe-area-inset-bottom))}
.barra div{max-width:680px;margin:0 auto;display:flex;gap:10px;align-items:center}
.boton{border:0;border-radius:12px;background:var(--acento);color:var(--papel);padding:12px 16px;font:inherit;font-weight:700}
.boton[disabled]{opacity:.45}.boton.sec{background:var(--suave);color:var(--tinta)}
.aviso-caja{background:var(--suave);border-radius:10px;padding:10px 12px;margin:10px 0}
</style></head><body><main>
<h1>Ordenar Descargas</h1><p class="tenue" id="donde">Mirando…</p>
<section><h2>Lo que hay</h2><div id="resumen" class="tenue">Mirando la carpeta…</div>
<p class="tenue">Se miran nombres, tamaños y fechas. Los archivos no se abren.</p></section>
<section><h2>Sugerencias</h2><div id="res"></div><div id="sug"></div></section>
<section><h2>Reglas</h2><p class="tenue"><b>Propone</b>: aparece arriba y se aplica si la tildás.
<b>Automática</b>: la rutina diaria la aplica sola, y se deshace igual. <b>Apagada</b>: no se propone.</p><div id="reglas"></div></section>
<section><h2>Lo que ya se hizo</h2><div id="lotes"></div></section>
<section><button class="boton sec" id="salir">Cerrar esta pantalla</button>
<p class="tenue">Se cierra sola a la media hora sin uso. Mientras está abierta, Termux tiene que seguir abierto.</p></section>
</main>
<div class="barra"><div><button class="boton" id="aplicar" disabled>Aplicar</button><span class="tenue" id="cuenta"></span></div></div>
<script>
const base = location.pathname.replace(/\\/?$/, "/");
let E = null; const marcadas = new Set();
const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...hijos) => { const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) if (k === "class") n.className = v; else if (k.startsWith("on")) n[k] = v; else n.setAttribute(k, v);
  for (const h of hijos) if (h != null) n.append(h); return n; };
const mb = (b) => b >= 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.ceil(Math.max(b, 0) / 1024) + " KB";
async function pedir(ruta, cuerpo) {
  const r = await fetch(base + ruta, cuerpo === undefined ? {} :
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error || r.status); return j;
}
const NOMBRE_TIPO = { documentos: "Documentos", imagenes: "Imágenes", videos: "Videos", audio: "Audio", comprimidos: "Comprimidos", instaladores: "Instaladores", otros: "Otros" };
function pintar(nuevo, conservar) {
  E = nuevo;
  const vigentes = new Set(E.plan.mover.map((m) => m.ruta));
  if (!conservar) { marcadas.clear(); for (const m of E.plan.mover) if (!m.viajaCon) marcadas.add(m.ruta); }
  else for (const r of [...marcadas]) if (!vigentes.has(r)) marcadas.delete(r);
  $("donde").textContent = E.carpeta;
  const R = E.plan.resumen;
  $("resumen").replaceChildren(
    el("p", {}, el("b", {}, E.plan.archivos + " archivos · " + mb(R.bytes)), " en " + E.plan.carpetas + " carpetas"),
    el("div", { class: "chips" }, ...Object.entries(R.porTipo).sort((a, b) => b[1].bytes - a[1].bytes)
      .map(([t, v]) => el("span", { class: "chip" }, (NOMBRE_TIPO[t] || t) + " · " + v.archivos + " · " + mb(v.bytes)))),
    R.pesados.length ? el("p", { class: "tenue" }, "Lo que más pesa:") : null,
    ...R.pesados.slice(0, 5).map((p) => el("div", { class: "tenue" }, "· " + p.ruta + " — " + mb(p.bytes) + " — " + p.fecha)));
  pintarSugerencias(); pintarReglas(); pintarLotes(); contar();
}
function pintarSugerencias() {
  const cont = $("sug"); cont.replaceChildren();
  if (!E.plan.mover.length) cont.append(el("p", {}, el("b", {}, "Nada que proponer. "), "Descargas está en orden según las reglas de abajo."));
  for (const r of E.reglas) {
    const items = E.plan.mover.filter((m) => m.regla === r.id); if (!items.length) continue;
    const todas = el("button", { class: "link", onclick: () => {
      const alguna = items.some((m) => !m.viajaCon && !marcadas.has(m.ruta));
      for (const m of items) if (!m.viajaCon) alguna ? marcadas.add(m.ruta) : marcadas.delete(m.ruta);
      pintarSugerencias(); contar(); } }, "todas / ninguna");
    const g = el("div", { class: "grupo" }, el("h3", {}, el("span", {}, r.titulo + " (" + items.filter((m) => !m.viajaCon).length + ")"), todas));
    for (const m of items) {
      // Lo de adentro de una carpeta tildada se va con ella. Destildada la
      // carpeta, lo de adentro se elige de a uno.
      const conPadre = !!m.viajaCon && marcadas.has(m.viajaCon);
      const cb = el("input", { type: "checkbox" }); cb.checked = marcadas.has(m.ruta) || conPadre;
      cb.disabled = conPadre;
      cb.onchange = () => { cb.checked ? marcadas.add(m.ruta) : marcadas.delete(m.ruta);
        if (m.tipo === "carpeta") pintarSugerencias(); contar(); };
      const nunca = el("button", { class: "link", onclick: async () => {
        if (!confirm("¿No volver a proponer «" + m.ruta + "»?")) return;
        pintar(await pedir("ignorar", { ruta: m.ruta }), true); } }, "no proponer más");
      g.append(el("label", { class: "item" + (m.viajaCon ? " adentro" : "") }, cb,
        el("span", { class: "txt" }, el("b", {}, (m.tipo === "carpeta" ? "📁 " : "") + m.ruta),
          el("small", {}, m.motivo + (m.igualA ? " — igual a " + m.igualA : "") + (conPadre ? " · se va con su carpeta" : " · " + mb(m.bytes))),
          conPadre ? null : nunca)));
    }
    cont.append(g);
  }
  if (E.plan.avisos.length) {
    const g = el("div", { class: "grupo" }, el("h3", {}, "No se tocan, pero conviene que los mires"));
    for (const a of E.plan.avisos) g.append(el("div", { class: "item aviso" }, el("span", { class: "txt" },
      el("b", {}, a.ruta), el("small", {}, a.motivo + (a.igualA ? " — " + a.igualA : "")))));
    cont.append(g);
  }
}
function pintarReglas() {
  const cont = $("reglas"); cont.replaceChildren();
  const A = JSON.parse(JSON.stringify(E.ajustes));
  const guardar = async () => { try { pintar(await pedir("ajustes", { ajustes: A }), true); } catch (e) { alert("No se guardó: " + e.message); } };
  for (const r of E.reglas) {
    const seg = el("div", { class: "seg" }, ...[["propone", "Propone"], ["automatica", "Automática"], ["apagada", "Apagada"]].map(([v, t]) =>
      el("button", { "aria-pressed": String(A.reglas[r.id].estado === v), onclick: () => {
        if (v === "automatica" && !confirm("«" + r.titulo + "» se va a aplicar sola en la rutina diaria. Se deshace igual desde «Lo que ya se hizo». ¿Seguro?")) return;
        A.reglas[r.id].estado = v; guardar(); } }, t)));
    const caja = el("div", { class: "regla" }, el("b", {}, r.titulo), el("div", { class: "tenue" }, r.detalle), seg);
    if (r.id === "apk-viejas") {
      const i = el("input", { type: "number", min: "1", max: "3650", value: String(A.diasApk) });
      i.onchange = () => { A.diasApk = Number(i.value); guardar(); };
      caja.append(el("div", { class: "campo" }, el("label", {}, "Más de"), i, el("span", {}, "días")));
    }
    if (r.id === "ordenar") for (const [t, nombre] of Object.entries(E.tipos)) {
      const i = el("input", { type: "text", value: A.destinos[t] || "", placeholder: "no ordenar", maxlength: "60" });
      i.onchange = () => { A.destinos[t] = i.value.trim(); guardar(); };
      caja.append(el("div", { class: "campo" }, el("label", {}, NOMBRE_TIPO[t] || nombre), i));
    }
    cont.append(caja);
  }
  if (A.ignorar.length) {
    const c = el("div", { class: "regla" }, el("b", {}, "No se proponen más (" + A.ignorar.length + ")"));
    for (const ruta of A.ignorar) c.append(el("div", { class: "item" }, el("span", { class: "txt" }, ruta),
      el("button", { class: "link", onclick: () => { A.ignorar = A.ignorar.filter((x) => x !== ruta); guardar(); } }, "volver a proponer")));
    cont.append(c);
  }
}
function pintarLotes() {
  const cont = $("lotes"); cont.replaceChildren();
  if (!E.lotes.length) { cont.append(el("p", { class: "tenue" }, "Todavía nada.")); return; }
  for (const l of E.lotes.slice(0, 10)) {
    const f = l.replace(/^(\\d{4})(\\d{2})(\\d{2})-(\\d{2})(\\d{2}).*/, "$3/$2/$1 $4:$5 UTC");
    cont.append(el("div", { class: "item" }, el("span", { class: "txt" }, el("b", {}, f), el("small", {}, "Download/_Papelera/" + l)),
      el("button", { class: "boton sec", onclick: async () => {
        if (!confirm("¿Devolver todo lo de ese lote a su lugar?")) return;
        const j = await pedir("deshacer", { lote: l });
        pintar(j); aviso("Devuelto: " + j.deshecho.hechos.length + (j.deshecho.fallas.length ? " · no se pudo: " + j.deshecho.fallas.length : "")); } }, "Deshacer")));
  }
  cont.append(el("p", { class: "tenue" }, "Lo de la papelera se borra de verdad sólo con «vaciar», a los 30 días."));
}
function contar() {
  const elegidas = E.plan.mover.filter((m) => marcadas.has(m.ruta) || (m.viajaCon && marcadas.has(m.viajaCon)));
  $("aplicar").disabled = !elegidas.length;
  // Lo que viaja adentro de una carpeta tildada no se cuenta aparte.
  const n = elegidas.filter((m) => !(m.viajaCon && marcadas.has(m.viajaCon))).length;
  $("aplicar").textContent = n ? "Aplicar " + n : "Aplicar";
  $("cuenta").textContent = elegidas.length ? mb(elegidas.reduce((s, m) => s + m.bytes, 0)) + " · se puede deshacer" : "Tildá lo que quieras aplicar";
}
function aviso(t) { $("res").replaceChildren(el("div", { class: "aviso-caja" }, t)); }
$("aplicar").onclick = async () => {
  const n = E.plan.mover.filter((m) => marcadas.has(m.ruta) && !(m.viajaCon && marcadas.has(m.viajaCon))).length;
  if (!confirm("¿Aplicar " + n + "? Lo que se bota va a la papelera y lo que se ordena, a su carpeta. Todo se puede deshacer.")) return;
  $("aplicar").disabled = true;
  try { const j = await pedir("aplicar", { rutas: [...marcadas] }); pintar(j);
    aviso("Hecho: " + j.resultado.movidos + (j.resultado.fallas.length ? " · no se pudo: " + j.resultado.fallas.map((f) => f.ruta).join(", ") : "") + ". Para volver atrás: «Lo que ya se hizo»."); }
  catch (e) { aviso("No se pudo: " + e.message); contar(); }
};
$("salir").onclick = async () => { await pedir("salir", {}); document.body.replaceChildren(el("main", {}, el("h1", {}, "Cerrado"), el("p", {}, "Podés volver a Termux."))); };
pedir("estado").then((j) => pintar(j)).catch((e) => { $("resumen").textContent = "No se pudo leer: " + e.message; });
</script></body></html>`;

export { crearInterfaz, PAGINA };
