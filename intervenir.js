/* ═══════════════════════════════════════════════════════════
   intervenir.js — «🛠 Intervenir una sección»: la pantalla del invitado que
   baja el paquete de una sección, avisa con el semáforo que la está editando,
   y trae la respuesta de su chat para dejar los archivos listos para subir.
   Sello: intervenir-3 (12-nov-2026; intervenir-1 el 10-nov)

   Lo carga `invitado.html` DIFERIDO y con catch (igual que `ojos.js`): si no
   baja, o el sitio no tiene `secciones.json`, la página sigue como estaba.

   El camino, sin IA en el medio:
     1. elegir una sección (cada una muestra su semáforo);
     2. «Bajar el paquete y avisar»: arma el .md, deja el aviso y lo descarga;
     3. el chat de la persona trabaja con el paquete;
     4. «Traer la respuesta»: reparte las piezas a sus archivos, avisa si
        alguien tocó una pieza en el medio, deja los archivos completos para
        subir, levanta el aviso y deja el registro en el panel.

   `ctx` lo arma invitado.html: { pr, caja, P, F, yo, persona, leerTexto,
   crudo, descargar, dejarRegistro, comentarPendiente }.
   ═══════════════════════════════════════════════════════════ */
import * as K from "./paquete.js?v=paquete-3";
import * as S from "./semaforo.js?v=semaforo-1";

export const VERSION = "intervenir-3";
const MAX_RESPUESTA = 200000;

/** Las opciones de la lista: cada sección con su semáforo. (Pura: la prueba la corre en Node.) */
export function htmlOpciones(secciones, semaforos, ahoraMs, miUid, esc = (s) => s) {
  return secciones.map((s) => {
    const est = S.estadoDe(semaforos[s.id], ahoraMs, miUid);
    return `<option value="${esc(s.id)}">${esc(s.titulo)} · ${esc(S.textoDe(est))}</option>`;
  }).join("");
}

/** Lo que se le cuenta a la persona después de traer la respuesta. (Pura.) */
export function resumenDeVuelta(res, { liberado = false, repo = "", verificacion = "" } = {}) {
  const L = [];
  const n = res.cambiados.length;
  L.push(n ? `✔ ${n} archivo${n > 1 ? "s" : ""} listo${n > 1 ? "s" : ""} para subir: ${res.cambiados.map((c) => `${c.ruta} (${c.piezas.join(", ")})`).join("; ")}.`
           : "No quedó ningún archivo para subir.");
  res.rechazadas.forEach((r) => L.push(`✗ ${r.ruta ? r.ruta + " · " : ""}${r.nombre}: ${r.motivo}.`));
  res.avisos.forEach((a) => L.push(`⚠ ${a}`));
  res.conflictos.forEach((c) => L.push(`⛔ ${c.ruta} · ${c.nombre} CAMBIÓ en el repositorio desde que bajaste el paquete: alguien la tocó. Revisá antes de subir, porque tu versión la pisaría.`));
  if (n) L.push("🧪 Sólo se revisó que el código parsee, no que funcione." + (verificacion ? " Antes de pasar a producción hay que correr: " + verificacion + "." : " Probalo antes de pasar a producción."));
  if (liberado) L.push("🟢 El aviso de «en edición» quedó levantado.");
  else if (n) L.push("🟡 El aviso de «en edición» sigue puesto hasta que se resuelva lo de arriba.");
  return L;
}

/** La lista de archivos del repositorio, SIN leerlos: una sola consulta pública a GitHub (sin credencial). */
async function listarGitHub(repo, rama) {
  const r = await fetch(`https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(rama)}?recursive=1`, { headers: { Accept: "application/vnd.github+json" } });
  if (!r.ok) throw new Error("GitHub contestó " + r.status);
  const j = await r.json();
  return (j.tree || []).filter((x) => x.type === "blob").map((x) => ({ ruta: x.path, bytes: x.size || 0 }));
}

const bajarArchivo = (nombre, texto) => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([texto], { type: "text/plain;charset=utf-8" }));
  a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
};

export async function montar(ctx) {
  const { pr, caja, P, yo, persona, leerTexto, crudo, descargar, dejarRegistro, comentarPendiente } = ctx;
  const repo = pr.sitio && pr.sitio.repo;
  if (!caja || !repo) return false;
  let cfg;
  try { cfg = JSON.parse(await leerTexto(crudo(repo, "secciones.json"))); } catch (e) { return false; }   // sitio sin mapa de secciones: no se muestra nada
  const secciones = cfg.secciones || [];
  if (!secciones.length) return false;
  const leer = (ruta) => leerTexto(crudo(repo, ruta));
  const nombre = (persona && persona.nombre) || (yo && yo.email) || "";

  // las operaciones de Firestore que no trae la página, las pide al módulo de conexión
  let F = ctx.F;
  try { const M = await import("./firebase-init.js?v=init-6"); F = { ...ctx.F, deleteDoc: M.deleteDoc, serverTimestamp: M.serverTimestamp, Timestamp: M.Timestamp }; } catch (e) { /* abajo se avisa */ }
  const faltan = ["deleteDoc", "serverTimestamp", "Timestamp", "setDoc", "getDocs"].filter((n) => !F || !F[n]);

  caja.innerHTML = `<div class="rotulo">🛠 Intervenir una sección</div>
    <p class="gris" style="margin:.2rem 0">Para una modificación <b>pequeña y completa</b> de una parte del sitio. El panel te da un solo archivo con esa parte y todo lo que depende de ella; se lo das a tu chat, y lo que te devuelva se arma acá para subir. Mientras la tengas, queda marcada «en edición» para que nadie más la toque.</p>
    <select data-sec-sel style="width:100%;margin:.2rem 0"></select>
    <p class="gris" data-sec-info style="font-size:.85rem"></p>
    <div class="fila-btn">
      <button class="btn p" data-sec-bajar>⬇ Bajar el paquete y avisar que la edito</button>
      <button class="mini" data-sec-mirar>⬇ Sólo para mirar (no avisa)</button>
      <button class="mini" data-sec-soltar hidden>Soltar el aviso</button>
    </div>
    <textarea data-sec-resp rows="4" maxlength="${MAX_RESPUESTA}" placeholder="Pegá acá lo que te devolvió tu chat (las piezas completas)…" style="margin-top:.5rem"></textarea>
    <div class="fila-btn"><button class="btn" data-sec-traer>Traer la respuesta</button></div>
    <div data-sec-out></div>`;
  const $q = (s) => caja.querySelector(s);
  const sel = $q("[data-sec-sel]"), info = $q("[data-sec-info]"), out = $q("[data-sec-out]");
  const bBajar = $q("[data-sec-bajar]"), bMirar = $q("[data-sec-mirar]"), bSoltar = $q("[data-sec-soltar]"), bTraer = $q("[data-sec-traer]");
  let semaforos = {}, registro = null;
  if (faltan.length) { bBajar.disabled = true; info.textContent = "El aviso de edición no está disponible: a firebase-init.js le falta exportar " + faltan.join(", ") + ". Podés bajar el paquete sólo para mirar."; }

  const estado = () => S.estadoDe(semaforos[sel.value], Date.now(), yo.uid);
  const actualizar = () => {
    const el = estado(), s = secciones.find((x) => x.id === sel.value);
    if (!faltan.length) info.textContent = (s ? s.que + " " : "") + (el.estado === "ocupada" ? `Está tomada: pedile a ${el.quien} que la termine, o esperá a que venza.` : "");
    bBajar.disabled = faltan.length > 0 || el.estado === "ocupada";
    bSoltar.hidden = el.estado !== "mia";
  };
  const refrescar = async () => {
    if (!faltan.length) { try { semaforos = await S.listar(F, pr.id); } catch (e) { semaforos = {}; } }
    const actual = sel.value;
    sel.innerHTML = htmlOpciones(secciones, semaforos, Date.now(), yo.uid, P.esc);
    if (actual) sel.value = actual;
    actualizar();
  };
  sel.onchange = actualizar;

  const bajar = async (avisar) => {
    const id = sel.value, s = secciones.find((x) => x.id === id); if (!s) return;
    bBajar.disabled = bMirar.disabled = true;
    try {
      await refrescar();
      if (avisar && estado().estado === "ocupada") return P.aviso("Esa sección la está editando " + estado().quien + ".", "error");
      const horas = cfg.semaforoHoras || S.HORAS;
      const r = await K.construir(cfg, id, leer, { fecha: P.hoy(), semaforo: avisar ? { horas } : null, repo, listar: () => listarGitHub(repo, cfg.rama || "main") });
      if (avisar) {
        const t = await S.tomar(F, { proyecto: pr.id, seccion: id, uid: yo.uid, nombre, archivos: r.archivos, piezas: r.huellas, horas, paquete: K.VERSION });
        if (!t.ok) { await refrescar(); return P.aviso("La acaba de tomar " + (t.estado.quien || "otra persona") + ". Probá con otra o esperá.", "error"); }
      }
      descargar(`${pr.id}-${id}-paquete-${P.hoy()}.md`, r.md);
      if (r.avisos.length) P.aviso("El paquete salió con avisos: " + r.avisos[0], "error");
      else P.aviso(avisar ? "Paquete bajado. La sección quedó marcada a tu nombre." : "Paquete bajado, sin aviso.");
      await refrescar();
    } catch (e) { P.aviso("No se pudo armar el paquete: " + P.explicar(e), "error"); }
    finally { bMirar.disabled = false; actualizar(); }
  };
  bBajar.onclick = () => bajar(true);
  bMirar.onclick = () => bajar(false);

  bSoltar.onclick = async () => {
    try { await S.soltar(F, pr.id, sel.value); P.aviso("Aviso levantado."); await refrescar(); }
    catch (e) { P.aviso("No se pudo levantar el aviso: " + P.explicar(e), "error"); }
  };

  bTraer.onclick = async () => {
    const id = sel.value, texto = $q("[data-sec-resp]").value.trim();
    if (!texto) return P.aviso("Pegá primero la respuesta de tu chat.", "error");
    if (texto.length > MAX_RESPUESTA) return P.aviso("Es muy larga: pedile a tu chat que devuelva sólo las piezas.", "error");
    bTraer.disabled = true; out.innerHTML = '<p class="gris">Armando los archivos…</p>';
    try {
      await refrescar();
      const mio = estado().estado === "mia";
      const previas = mio ? (semaforos[id].piezas || {}) : {};
      const res = await K.aplicarSeccion(cfg, id, texto, leer, previas);
      let liberado = false;
      if (res.cambiados.length && !res.conflictos.length && mio) { try { await S.soltar(F, pr.id, id); liberado = true; } catch (e) { /* queda puesto: se ve en el resumen */ } }
      const lineas = resumenDeVuelta(res, { liberado, repo, verificacion: cfg.verificacion || "" });
      if (!mio) lineas.push("ℹ No tenías el aviso puesto, así que no se pudo comprobar si alguien tocó esas piezas desde que bajaste el paquete.");
      out.innerHTML = lineas.map((l) => `<p class="gris" style="margin:.2rem 0">${P.esc(l)}</p>`).join("")
        + res.cambiados.map((c, i) => {
          const dir = c.ruta.includes("/") ? c.ruta.replace(/\/[^/]*$/, "") : "";
          return `<div class="pend"><p style="margin:.1rem 0"><b>${P.esc(c.ruta)}</b> · ${c.piezas.map(P.esc).join(", ")}</p><div class="fila-btn">
            <button class="mini" data-sec-arch="${i}">⬇ Archivo completo</button>
            <button class="mini" data-sec-copiar="${i}">📋 Copiar</button>
            <a class="mini" style="text-decoration:none" target="_blank" rel="noopener" href="https://github.com/${P.esc(repo)}/edit/main/${P.esc(c.ruta)}">Abrir en GitHub para reemplazar</a>
            <a class="mini" style="text-decoration:none" target="_blank" rel="noopener" href="https://github.com/${P.esc(repo)}/upload/main/${P.esc(dir)}">Subir el archivo</a></div></div>`;
        }).join("")
        + (res.cambiados.length ? `<div class="fila-btn"><button class="btn p" data-sec-subido>✔ Ya lo subí a GitHub</button></div>
          <p class="gris" style="font-size:.85rem">GitHub tarda unos minutos en publicar y en mostrar lo último. No hace falta esperar para seguir.</p>` : "");
      out.querySelectorAll("[data-sec-arch]").forEach((b) => { b.onclick = () => { const c = res.cambiados[+b.dataset.secArch]; bajarArchivo(c.ruta.split("/").pop(), c.texto); }; });
      out.querySelectorAll("[data-sec-copiar]").forEach((b) => { b.onclick = async () => { try { await navigator.clipboard.writeText(res.cambiados[+b.dataset.secCopiar].texto); P.aviso("Copiado. Pegalo en GitHub reemplazando todo el contenido."); } catch (e) { P.aviso("No se pudo copiar: bajá el archivo.", "error"); } }; });
      if (res.cambiados.length) {
        try {
          const sec = secciones.find((x) => x.id === id);
          registro = await dejarRegistro({
            pid: pr.id, origen: "intervencion", de: "intervencion",
            titulo: `🛠 ${nombre || "Un invitado"} intervino «${sec ? sec.titulo : id}»`,
            resumen: lineas.join(" ").slice(0, 1900),
            historia: `${nombre || "Un invitado"} trajo la respuesta de su chat para la sección «${id}» (${res.cambiados.map((c) => c.ruta).join(", ")}).`,
            texto: `REGISTRO · sección ${id} · ${P.hoy()}\n${lineas.join("\n")}\n\n— RESPUESTA DEL CHAT —\n${texto}`,
          });
        } catch (e) { P.aviso("Los archivos están listos, pero no se pudo dejar el registro en el panel: " + P.explicar(e), "error"); }
        const bs = out.querySelector("[data-sec-subido]");
        if (bs) bs.onclick = async () => {
          bs.disabled = true;
          try { if (registro) await comentarPendiente(registro, `${nombre || "La persona"} subió los archivos a GitHub (${P.hoy()}).`); P.aviso("Anotado. Gracias."); bs.textContent = "✔ Anotado"; }
          catch (e) { bs.disabled = false; P.aviso("No se pudo anotar: " + P.explicar(e), "error"); }
        };
        $q("[data-sec-resp]").value = "";
      }
      await refrescar();
    } catch (e) { out.innerHTML = ""; P.aviso("No se pudo traer la respuesta: " + P.explicar(e), "error"); }
    finally { bTraer.disabled = false; }
  };

  await refrescar();
  return true;
}
