// ─────────────────────────────────────────────────────────────────────────────
// firestore.mjs — Leer y escribir Firestore desde una sesión de Claude Code.
//
//   node herramientas/firestore.mjs <proyecto> <comando> [argumentos]
//
// Sin dependencias: usa la API REST de Firebase con `fetch`, que ya viene en
// node. Es la misma decisión que el resto del ecosistema — un banco de pruebas
// que corre con `node` a secas (PROTOCOLO-DESARROLLO § 11.7).
//
// ── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
// Hasta el 2026-09-11 un agente no tocaba ninguna base: generaba un JSON, Mauro
// lo pegaba en el panel y lo aplicaba. Eso mantenía a salvo lo sensible, pero
// costaba un toque suyo por tanda y era la fricción que él pidió sacar (§ 0).
//
// Decisión de Mauro, 2026-09-11: el agente accede directo, con UNA restricción
// que él eligió mantener — **no maneja información de autenticación**. Las
// contraseñas las escribe él, en el panel, y el agente ni siquiera las lee.
//
// ── CÓMO SE SOSTIENE ESO ─────────────────────────────────────────────────────
// No con buena voluntad de este archivo: con las **reglas de Firestore**. El
// usuario del agente es un usuario común de Authentication, así que todo lo que
// hace pasa por las reglas publicadas en la consola. Lo sellado se le niega,
// de lectura y de escritura. Si este archivo tuviera un error y pidiera una
// clave, la base contestaría que no.
//
// El guardia de abajo es un cinturón de seguridad, no la cerradura.
//
// ── LAS CUATRO BASES ─────────────────────────────────────────────────────────
// Desde el 2026-09-11 hay cuatro proyectos, no uno: el panel y las tres bases
// de los sitios. El objetivo de Mauro es poder pedirle a un chat que revise si
// lo que está publicado en la base y lo que dice el código del sitio siguen
// contando la misma historia. Harmonía no aparece acá porque no tiene base:
// todo su estado vive en el `localStorage` del teléfono.
//
// El paso a paso para dar de alta al agente en una base nueva está en
// `herramientas/ACCESO-A-LAS-BASES.md`.
// ─────────────────────────────────────────────────────────────────────────────

import fs from "node:fs";
import path from "node:path";

/* El usuario del agente es UNO SOLO para las cuatro bases: el mismo mail y la
   misma contraseña, dados de alta a mano en cada proyecto de Authentication.

   Por eso alcanza con UN par de variables de entorno, y la herramienta acepta
   cualquiera de los nombres con los que ese par pudo haber quedado escrito.
   Preguntado por Mauro el 2026-09-11, y tenía razón: si el usuario es uno,
   pedirle que cargue el mismo valor dos veces es trabajo inventado.

   El orden es de lo más específico a lo más general:
     1. el par propio del proyecto   — para separar una base el día que haga falta
     2. FB_AGENTE_*                  — el nombre bueno, el que describe lo que es
     3. FB_PANEL_*                   — el primero que existió, cuando la única
                                       base era el panel. Sigue andando a
                                       propósito: nadie tiene que migrar nada. */
const MAIL_COMPARTIDO = "FB_AGENTE_MAIL";
const CLAVE_COMPARTIDA = "FB_AGENTE_CLAVE";
const MAIL_HEREDADO = "FB_PANEL_MAIL";
const CLAVE_HEREDADA = "FB_PANEL_CLAVE";

/* Los identificadores de abajo son PÚBLICOS POR DISEÑO: identifican el proyecto
   ante la API web y no dan un solo permiso — eso lo hacen las reglas. Están acá
   a la vista para que nadie los confunda con credenciales, y salieron de leer
   el código de cada sitio, no de una consola. Ver PROTOCOLO-SECRETOS.md,
   «Identificadores públicos por diseño».

   Lo que NO está acá, y nunca va a estar, es el mail y la contraseña del
   usuario del agente: viven en las variables de entorno del entorno de Claude
   Code, cargadas por Mauro en la web.

   `selladas` es lo que el agente no toca. Puede ser una colección entera
   («claves») o un documento suelto («config/integraciones»), porque a veces lo
   sensible es un documento adentro de una colección que sí sirve leer. */
const PROYECTOS = {
  panel: {
    projectId: "datos-830f8",
    apiKey: "AIzaSyAxWOM9ZEHt6CXh8Nf1qU6FvL2uh1wFbug",
    mail: "FB_PANEL_MAIL",
    clave: "FB_PANEL_CLAVE",
    colecciones: ["lineas", "proyectos", "pendientes", "protocolos", "tandas", "fichas"],
    /* `claves` es la bóveda, desde el día uno y para siempre: es lo que ABRE
       algo — contraseñas, códigos de recuperación, segundos factores.

       `fichas` estuvo sellada del 2026-09-11 al 2026-09-13 y volvió al equipo
       con las reglas v4. No es que se aflojara: cambió el criterio. La v3
       sellaba «la colección donde una credencial PUEDE aparecer», que suena
       prudente y es inaplicable —con eso cualquier colección termina sellada—
       y en nueve días dejó las fichas sin que nadie las mantuviera. La v4
       sella por PROPÓSITO: si abre algo va en `claves`, si no va en `fichas`.
       Esa pregunta se contesta sin pensar, y es lo único que de verdad evita
       que una contraseña caiga en el lugar equivocado. */
    selladas: ["claves"]
  },

  remate: {
    projectId: "remate-acbc9",
    apiKey: "AIzaSyB2ZT8nLzhcejyqdOA1Ipuwaipm3KTAaRU",
    mail: "FB_REMATE_MAIL",
    clave: "FB_REMATE_CLAVE",
    /* `reportes` entra el 2026-09-13, con las reglas v0.9 publicadas: es donde
       un administrador de remate deja una falla vista desde donde la vio. El
       agente la LEE y no la escribe —lo dice el CLAUDE.md del proyecto y lo
       aplica la regla—, y para saber qué reporte ya trajo se mira el campo
       `origen` del pendiente que creó en el panel. */
    colecciones: ["config", "categorias", "productos", "pedidos", "ventas",
                  "metodosPago", "lucesRegistro", "usuarios", "reportes"],
    /* `llaves`: el código ES la credencial del comprador — lo dice la regla.
       `documentos`: datos de terceros, que por decisión del proyecto no salen
       ni al catálogo público. */
    selladas: ["llaves", "documentos"]
  },

  casayourte: {
    projectId: "casayourte-mauro",
    apiKey: "AIzaSyDDD_xvpC4I_ec2OZymyDqVsm1K0ISTr4Q",
    mail: "FB_CASAYOURTE_MAIL",
    clave: "FB_CASAYOURTE_CLAVE",
    /* `reportes` entra el 2026-09-15 con el circuito de reportar una falla,
       molde de remate. El agente la LEE y no la escribe —lo dice el CLAUDE.md
       del proyecto y lo aplica la regla—, y para saber qué reporte ya trajo se
       mira el campo `origen` del pendiente que creó en el panel. */
    colecciones: ["sitio", "albums", "usuarios", "reportes"],
    /* `calculos`: datos de clientes y medidas de obra, y detrás costos,
       márgenes y tarifas — lo que el CLAUDE.md del proyecto prohíbe publicar.
       `invitaciones`: mails de gente que todavía no entró. */
    selladas: ["calculos", "invitaciones"]
  },

  casaverde: {
    projectId: "casaverde-20",
    apiKey: "AIzaSyDG12FsMYyGVzkodq07N1SSWQfMcTJ-3yM",
    mail: "FB_CASAVERDE_MAIL",
    clave: "FB_CASAVERDE_CLAVE",
    /* `reportes` entra el 2026-09-15 con el circuito de reportar una falla.
       El agente la LEE y no la escribe, igual que en los otros dos sitios. */
    colecciones: ["cabanas", "espacios_comunes", "disponibilidad", "actividades",
                  "grupos", "recuerdos", "usuarios", "reportes"],
    /* Tres familias, por el mismo motivo cada una:
       · credenciales — `claves_recuerdos` es la clave del QR del huésped, y
         `config/integraciones` guarda claves de terceros (lo dice la regla);
       · el libro del negocio — dinero, honorarios y el régimen impositivo;
       · gente — huéspedes, clientes, reservas y lo que se escriben entre
         ellos. Nada de eso hace falta para comparar la base con el código. */
    selladas: [
      "claves_recuerdos", "config/integraciones", "config/fiscal",
      "movimientos", "liquidaciones", "cierres", "pagos", "honorarios",
      "clientes", "huespedes", "reservas", "chequeos",
      "recuerdos_contactos", "avisos_contacto",
      "comunicaciones", "comunicaciones_lecturas"
    ]
  }
};

const ex = (m) => { console.error("\n✖ " + m + "\n"); process.exit(1); };

/* ── El guardia ──────────────────────────────────────────────────────────────
   Cinturón de seguridad, no cerradura: la cerradura son las reglas. Existe
   para que un error de tipeo falle acá, con un mensaje claro, en vez de irse
   a la red y volver con un 403 que hay que interpretar.

   Dos formas de alcanzar una ruta, y las dos hacen falta:
     · el sello es el principio de la ruta — «claves» sella `claves/x/sub/y`;
     · el sello vive ADENTRO de lo que se está por listar — «config/integraciones»
       sella el listado de `config`, porque listar la colección devolvería ese
       documento igual. Un documento suelto de `config` (config/sitio) pasa. */
function guardia(cfg, coleccion, id) {
  const partes = String(coleccion || "").split("/").filter(Boolean);
  if (id) partes.push(String(id));
  for (const sello of cfg.selladas) {
    const s = sello.split("/").filter(Boolean);
    const esPrefijo = s.every((x, i) => partes[i] === x);
    const estaAdentro = !id && partes.every((x, i) => s[i] === x);
    if (esPrefijo || estaAdentro) {
      ex(`«${sello}» está sellada y el agente no la toca.\n`
       + `  Ahí viven credenciales o datos de personas. Lo decidió Mauro el\n`
       + `  2026-09-11 y lo aplican las reglas de Firestore, no este archivo.\n`
       + `  Si hace falta un dato de ahí, se le pregunta a él.`);
    }
  }
}

/* ── Entrar ──────────────────────────────────────────────────────────────────
   Con mail y contraseña, como cualquier persona. NO con una cuenta de servicio:
   una cuenta de servicio saltea TODAS las reglas, y entonces la bóveda dejaría
   de estar sellada. Es la diferencia entre una puerta cerrada y no tener
   puerta. Ver la conversación del 2026-09-11 y remate/CLAUDE.md.

   Primero se mira la variable propia del proyecto; si no está, la compartida.
   El orden es ése para que un proyecto se pueda separar el día que lo necesite
   sin tocar a los otros tres. */
function credenciales(cfg) {
  return {
    mail: process.env[cfg.mail] || process.env[MAIL_COMPARTIDO] || process.env[MAIL_HEREDADO],
    clave: process.env[cfg.clave] || process.env[CLAVE_COMPARTIDA] || process.env[CLAVE_HEREDADA]
  };
}

async function entrar(cfg) {
  const { mail, clave } = credenciales(cfg);
  if (!mail || !clave) {
    ex(`faltan las credenciales del agente para este proyecto.\n`
     + `  Sirve CUALQUIERA de estos pares, y con uno alcanza para las cuatro bases:\n`
     + `    ${MAIL_COMPARTIDO} y ${CLAVE_COMPARTIDA}   (el nombre bueno)\n`
     + `    ${MAIL_HEREDADO} y ${CLAVE_HEREDADA}   (el primero que hubo, sigue andando)\n`
     + `    ${cfg.mail} y ${cfg.clave}   (sólo si algún día hay que separar esta base)\n`
     + `  Las carga Mauro en la configuración del entorno de Claude Code, en la web.\n`
     + `  Ningún chat pide ese valor ni lo escribe en ningún lado.`);
  }
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: mail, password: clave, returnSecureToken: true }) });
  const j = await r.json();
  if (!r.ok) {
    /* El mensaje de Firebase se repite tal cual PERO nunca el valor enviado. */
    const m = (j.error && j.error.message) || r.status;
    if (String(m).includes("INVALID_LOGIN_CREDENTIALS") || String(m).includes("EMAIL_NOT_FOUND")) {
      ex(`no se pudo entrar a «${cfg.projectId}»: ${m}\n`
       + `  El usuario del agente se da de alta EN CADA proyecto de Firebase, a mano.\n`
       + `  Que ande en una base no quiere decir que exista en esta.\n`
       + `  El paso a paso: herramientas/ACCESO-A-LAS-BASES.md`);
    }
    ex(`no se pudo entrar a «${cfg.projectId}»: ${m}`);
  }
  return { token: j.idToken, uid: j.localId, mail: j.email };
}

/* ── Traducir entre JSON común y el formato de Firestore ─────────────────────
   Firestore REST no acepta JSON a secas: cada valor va etiquetado con su tipo.
   Estas dos funciones son la única parte fea del archivo y están juntas a
   propósito, para que se lean como un par. */
function aFirestore(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number")
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(aFirestore) } };
  if (typeof v === "object") return { mapValue: { fields: campos(v) } };
  return { stringValue: String(v) };
}
const campos = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, aFirestore(v)]));

function deFirestore(v) {
  if (!v || typeof v !== "object") return null;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(deFirestore);
  if ("mapValue" in v) return objeto(v.mapValue.fields || {});
  return v.stringValue ?? null;
}
const objeto = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, deFirestore(v)]));

/* ── Hablar con Firestore ────────────────────────────────────────────────────*/
const RAIZ = (p) => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;

async function pedir(cfg, sesion, ruta, opciones = {}) {
  const r = await fetch(RAIZ(cfg.projectId) + ruta, {
    ...opciones,
    headers: { "Content-Type": "application/json",
               Authorization: "Bearer " + sesion.token, ...(opciones.headers || {}) }
  });
  if (r.status === 404 && (opciones.method || "GET") === "GET") return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const m = (j.error && j.error.message) || r.status;
    if (r.status === 403) {
      ex(`las reglas dijeron que no: ${m}\n`
       + `  No es un problema de este archivo. O la colección está sellada, o el\n`
       + `  usuario del agente todavía no está en las reglas publicadas de\n`
       + `  «${cfg.projectId}». Ver herramientas/ACCESO-A-LAS-BASES.md`);
    }
    ex(`Firestore contestó ${r.status}: ${m}`);
  }
  return j;
}

/* Lista una colección entera, paginando. Sin `orderBy`: se ordena en memoria,
   que es lo que hace el panel y evita pedir un índice por veinte documentos. */
async function listar(cfg, sesion, coleccion) {
  guardia(cfg, coleccion);
  const salida = [];
  let token = "";
  do {
    const q = "?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : "");
    const j = await pedir(cfg, sesion, "/" + coleccion + q);
    for (const d of (j && j.documents) || []) {
      salida.push({ id: d.name.split("/").pop(), ...objeto(d.fields || {}) });
    }
    token = (j && j.nextPageToken) || "";
  } while (token);
  return salida;
}

const leerUno = async (cfg, sesion, coleccion, id) => {
  guardia(cfg, coleccion, id);
  const d = await pedir(cfg, sesion, `/${coleccion}/${encodeURIComponent(id)}`);
  return d ? { id, ...objeto(d.fields || {}) } : null;
};

/* `escribir` REEMPLAZA el documento entero, como el `setDoc` sin merge del
   panel: si un campo se sacó, tiene que desaparecer de la base. Un documento
   que no se puede achicar no sirve. */
const escribir = async (cfg, sesion, coleccion, id, datos) => {
  guardia(cfg, coleccion, id);
  return pedir(cfg, sesion, `/${coleccion}/${encodeURIComponent(id)}`,
    { method: "PATCH", body: JSON.stringify({ fields: campos(datos) }) });
};

/* `fusionar` escribe SÓLO los campos que se le pasan y deja intacto el resto,
   como el `setDoc({merge:true})` del panel. Existe desde el 2026-09-14 por un
   footgun concreto: tomar una línea de trabajo es escribir UN campo, y hacerlo
   con `escribir` borraba el título, el porqué y la bitácora de esa línea. Un
   agente que se equivoca así no se entera hasta que alguien abre el panel.

   La diferencia con `escribir` es el `updateMask`: sin él, Firestore entiende
   que el documento es exactamente lo que le mandaste. */
const fusionar = async (cfg, sesion, coleccion, id, datos) => {
  guardia(cfg, coleccion, id);
  const mascara = Object.keys(datos)
    .map((k) => "updateMask.fieldPaths=" + encodeURIComponent(k)).join("&");
  return pedir(cfg, sesion,
    `/${coleccion}/${encodeURIComponent(id)}?${mascara}`,
    { method: "PATCH", body: JSON.stringify({ fields: campos(datos) }) });
};

const borrar = async (cfg, sesion, coleccion, id) => {
  guardia(cfg, coleccion, id);
  return pedir(cfg, sesion, `/${coleccion}/${encodeURIComponent(id)}`, { method: "DELETE" });
};

export { PROYECTOS, MAIL_COMPARTIDO, CLAVE_COMPARTIDA, MAIL_HEREDADO, CLAVE_HEREDADA, credenciales,
         entrar, listar, leerUno, escribir, fusionar, borrar, guardia, aFirestore, deFirestore };

/* ── La línea de comandos ────────────────────────────────────────────────────*/
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , proy, cmd, ...args] = process.argv;
  const cfg = PROYECTOS[proy];
  if (!cfg) ex(`proyecto desconocido: «${proy}». Conocidos: ${Object.keys(PROYECTOS).join(", ")}`);

  const sesion = await entrar(cfg);

  if (cmd === "quien") {
    /* Lo primero que hay que correr en una base nueva: imprime el UID del
       agente EN ESE PROYECTO, que es lo que falta para completar las reglas.
       El UID no se comparte entre proyectos aunque el mail sea el mismo. El
       mail sí se muestra —no es un secreto— y la contraseña no aparece por
       ningún lado. */
    console.log("\n  proyecto   : " + proy + "  (" + cfg.projectId + ")");
    console.log("  entró como : " + sesion.mail);
    console.log("  UID        : " + sesion.uid);
    console.log("  selladas   : " + cfg.selladas.join(", "));
    console.log("\n  Ese UID es el que va en las reglas de ESTE proyecto.\n");

  } else if (cmd === "bajar") {
    /* El respaldo. Se corre SIEMPRE antes de escribir: si algo sale mal, esto
       es lo que permite volver. Sin él, un error de un agente no se deshace.
       `respaldos/` está en el .gitignore: sale de la base tal cual, así que
       nunca entra al historial. */
    const cols = args.length ? args : cfg.colecciones;
    const todo = { proyecto: proy, bajadoEn: new Date().toISOString().slice(0, 10) };
    for (const c of cols) todo[c] = await listar(cfg, sesion, c);
    const destino = path.join("respaldos", `${todo.bajadoEn}-${proy}.json`);
    fs.mkdirSync("respaldos", { recursive: true });
    fs.writeFileSync(destino, JSON.stringify(todo, null, 2));
    console.log(`\n  ${destino}`);
    for (const c of cols) console.log(`  ${String(todo[c].length).padStart(4)} en ${c}`);
    console.log("");

  } else if (cmd === "leer") {
    const [coleccion, id] = args;
    if (!coleccion) ex("falta la colección");
    console.log(JSON.stringify(id ? await leerUno(cfg, sesion, coleccion, id)
                                  : await listar(cfg, sesion, coleccion), null, 2));

  } else if (cmd === "escribir" || cmd === "fusionar" || cmd === "borrar") {
    const [coleccion, id, archivo] = args;
    if (!coleccion || !id) ex("faltan la colección y el id");
    if (cmd === "borrar") { await borrar(cfg, sesion, coleccion, id); console.log(`  borrado ${coleccion}/${id}`); }
    else {
      if (!archivo) ex("falta el archivo .json con el contenido");
      const datos = JSON.parse(fs.readFileSync(archivo, "utf8"));
      /* `escribir` reemplaza el documento entero y `fusionar` sólo toca los
         campos que nombra. Para cambiar UN campo va `fusionar`, siempre: con
         `escribir` se borra en silencio todo lo que el archivo no traiga. */
      if (cmd === "fusionar") await fusionar(cfg, sesion, coleccion, id, datos);
      else await escribir(cfg, sesion, coleccion, id, datos);
      console.log(`  ${cmd === "fusionar" ? "fusionado" : "escrito"} ${coleccion}/${id}`);
    }

  } else {
    console.log(`
  node herramientas/firestore.mjs <proyecto> <comando>

    quien                          el UID del agente EN ESE PROYECTO — primero esto
    bajar [colecciones...]         respaldo a respaldos/<fecha>-<proyecto>.json
    leer <coleccion> [id]          a la salida estándar, como JSON
    escribir <coleccion> <id> <archivo.json>
    borrar <coleccion> <id>

  Proyectos: ${Object.keys(PROYECTOS).join(", ")}
  Alta en una base nueva: herramientas/ACCESO-A-LAS-BASES.md
`);
  }
}
