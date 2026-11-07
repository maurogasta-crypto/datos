/* ═══════════════════════════════════════════════════════════
   herramientas/invitados.mjs — los COLABORADORES de cada sitio, en el panel.
   Sello: invitados-1 (7-nov-2026)

   Mauro, 7-nov-2026: «un registro de usuarios con contraseña que gestionás tú
   con mi autorización para cada uno de los sitios, guardándose en mi base de
   datos (la del panel)» y «que quede bien claro en el panel quiénes son los
   usuarios que están participando en el desarrollo de cada uno».

   Cómo anda (reglas v9 de `reglas.txt`):
     1. El agente deja `invitaciones/<mail>` con los proyectos que abre. NO
        invita sin `--autorizado "<lo que dijo Mauro>"`, que queda escrito en
        la invitación: la invitación da acceso, y eso lo decide él.
     2. La persona entra a invitado.html, crea su cuenta con ese mail, lo
        confirma, y su ficha (`personas/<uid>`) se crea sola con esos proyectos
        y `claves: false`. La bóveda la abre sólo Mauro.
     3. `participantes` escribe en cada proyecto quiénes participan (nombre y
        rol, nunca el mail), para que se vea en el panel y en invitado.html.

   Uso:
     node herramientas/invitados.mjs lista
     node herramientas/invitados.mjs invitar <mail> --proyectos harmonia[,otro] [--nombre "Mariano"] --autorizado "<lo que dijo Mauro>"
     node herramientas/invitados.mjs quitar <mail> --autorizado "<lo que dijo Mauro>"
     node herramientas/invitados.mjs participantes
     node herramientas/invitados.mjs mensaje <mail>      (el texto para mandarle; lo manda una persona)
     node herramientas/invitados.mjs sitio <proyecto> <mail> --permisos a,b [--nombre "X"] --autorizado "<lo que dijo Mauro>"
       (invitados-2: la invitación en la base DEL SITIO —hoy CasaYourte—, siempre de colaborador)
   ═══════════════════════════════════════════════════════════ */
export const VERSION = "invitados-2";
export const LINK = "https://maurogasta-crypto.github.io/datos/invitado.html";

export const limpiarMail = (m) => String(m || "").trim().toLowerCase();
export const mailValido = (m) => /^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(limpiarMail(m));

/** Lo que está mal en una invitación; "" si sirve. */
export function validar({ mail, proyectos, autorizado }, existentes) {
  if (!mailValido(mail)) return "el mail no parece una dirección válida";
  if (!Array.isArray(proyectos) || !proyectos.length) return "falta --proyectos (al menos uno)";
  if (proyectos.length > 10) return "como mucho 10 proyectos (invitado.html los pide de a 10)";
  const falta = proyectos.filter((p) => !existentes.includes(p));
  if (falta.length) return "no existen en el panel: " + falta.join(", ");
  if (proyectos.includes("panel")) return "el panel no se comparte con un colaborador";
  if (!String(autorizado || "").trim()) return "falta --autorizado \"<lo que dijo Mauro>\": invitar da acceso, y eso lo decide él";
  return "";
}

/** Quiénes participan en cada proyecto: Mauro primero (dueño), después cada
    persona activa con ese proyecto (colaborador), y cuántas invitaciones
    esperan. Nombres y roles, nunca mails. */
export function participantesPor(proyectos, personas, invitaciones) {
  const reg = new Set(personas.map((p) => limpiarMail(p.mail)).filter(Boolean));
  const out = {};
  for (const id of proyectos) {
    const gente = [{ nombre: "Mauro", rol: "dueño" }];
    for (const p of personas) {
      if (p.activo === true && Array.isArray(p.proyectos) && p.proyectos.includes(id))
        gente.push({ nombre: String(p.nombre || "Sin nombre").slice(0, 60), rol: "colaborador" });
    }
    const esperan = invitaciones.filter((i) => Array.isArray(i.proyectos) && i.proyectos.includes(id) && !reg.has(limpiarMail(i.id))).length;
    out[id] = { gente, invitacionesSinUsar: esperan };
  }
  return out;
}

/** El mensaje para la persona invitada. Lo manda una persona, nunca la herramienta. */
export function mensaje(mail, nombresProyectos) {
  return `Hola! Te invitamos a seguir ${nombresProyectos.join(", ")} en el panel. `
    + `Entrá a ${LINK}, tocá «Crear mi cuenta» con este mail (${limpiarMail(mail)}) y una contraseña que elijas vos. `
    + `Te llega un mail para confirmar la dirección (si no lo ves, buscalo en Spam); tocá el enlace y volvé a entrar.`;
}

/* ── la línea de comandos ── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const { PROYECTOS, entrar, listar, escribir, borrar, fusionarRutas, invitarEnSitio } = await import("./firestore.mjs");
  const [, , cmd, arg] = process.argv;
  const opt = (n) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : undefined; };
  if (cmd === "sitio") {
    const cfgS = PROYECTOS[arg], mail = process.argv[4];
    if (!cfgS) { console.error("\n✖ no conozco el proyecto «" + arg + "»\n"); process.exit(1); }
    const r = await invitarEnSitio(cfgS, await entrar(cfgS), mail, { permisos: String(opt("permisos") || "").split(",").map((x) => x.trim()).filter(Boolean),
      nombre: opt("nombre") || "", autorizado: opt("autorizado") || "" });
    if (!r.ok) { console.error("\n✖ " + r.motivo + "\n"); process.exit(1); }
    console.log(r.nuevo ? `\n  ✓ invitación de colaborador en ${arg} para ${limpiarMail(mail)}\n` : `\n  · ya había una invitación en ${arg} para ese mail (no se tocó)\n`);
    process.exit(0);
  }
  const cfg = PROYECTOS.panel;
  const s = await entrar(cfg);
  const [proyectos, personas, invitaciones] = await Promise.all([
    listar(cfg, s, "proyectos"), listar(cfg, s, "personas"), listar(cfg, s, "invitaciones")]);
  const ids = proyectos.map((p) => p.id);
  const nombre = (id) => (proyectos.find((p) => p.id === id) || {}).nombre || id;

  if (cmd === "lista") {
    const reg = new Map(personas.map((p) => [limpiarMail(p.mail), p]));
    if (!invitaciones.length) console.log("\n  No hay invitaciones.\n");
    for (const i of invitaciones) {
      const p = reg.get(limpiarMail(i.id));
      console.log(`  ${i.id}  →  ${(i.proyectos || []).join(", ")}  ·  ${p ? "registrada como " + (p.nombre || "?") + (p.activo === true ? "" : " (pausada)") : "sin usar"}`);
    }
  } else if (cmd === "invitar") {
    const datos = { mail: limpiarMail(arg), proyectos: String(opt("proyectos") || "").split(",").map((x) => x.trim()).filter(Boolean),
      autorizado: opt("autorizado") };
    const falta = validar(datos, ids);
    if (falta) { console.error("\n✖ " + falta + "\n"); process.exit(1); }
    const doc = { proyectos: datos.proyectos, por: "Claude", autorizado: String(datos.autorizado).slice(0, 300),
      creadoEn: new Date().toISOString() };
    if (opt("nombre")) doc.nombre = String(opt("nombre")).slice(0, 80);
    await escribir(cfg, s, "invitaciones", datos.mail, doc);
    console.log(`\n  ✓ invitación para ${datos.mail}: ${datos.proyectos.map(nombre).join(", ")}\n\n  Mensaje para mandarle (lo manda una persona):\n  ${mensaje(datos.mail, datos.proyectos.map(nombre))}\n`);
  } else if (cmd === "quitar") {
    if (!String(opt("autorizado") || "").trim()) { console.error("\n✖ falta --autorizado\n"); process.exit(1); }
    await borrar(cfg, s, "invitaciones", limpiarMail(arg));
    console.log("\n  ✓ invitación quitada (la ficha, si ya se registró, la pausa Mauro en «Puerta»).\n");
  } else if (cmd === "mensaje") {
    const i = invitaciones.find((x) => x.id === limpiarMail(arg));
    if (!i) { console.error("\n✖ no hay invitación para ese mail\n"); process.exit(1); }
    console.log("\n  " + mensaje(i.id, (i.proyectos || []).map(nombre)) + "\n");
  } else if (cmd === "participantes") {
    const por = participantesPor(ids, personas, invitaciones);
    for (const id of ids) {
      if (id === "panel") continue;
      await fusionarRutas(cfg, s, "proyectos", id, [[["participantes"], por[id]]]);
      console.log(`  ✓ ${id}: ${por[id].gente.map((g) => g.nombre + " (" + g.rol + ")").join(", ")}${por[id].invitacionesSinUsar ? " · " + por[id].invitacionesSinUsar + " invitación(es) sin usar" : ""}`);
    }
  } else {
    console.error("\nuso: lista | invitar <mail> --proyectos a,b [--nombre X] --autorizado \"…\" | quitar <mail> --autorizado \"…\" | mensaje <mail> | participantes\n");
    process.exit(1);
  }
}
