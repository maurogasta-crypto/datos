// ─────────────────────────────────────────────────────────────────────────────
// ronda.mjs — Junta en una sola pantalla lo que hay que mirar al abrir una
// tanda: lo que Mauro tocó en el panel, lo que está esperando respuesta, y las
// fallas que la gente reportó desde cada sitio.
//
//   node herramientas/ronda.mjs abrir [--json]
//   node herramientas/ronda.mjs claves <proyecto>
//
// ── POR QUÉ EXISTE ───────────────────────────────────────────────────────────
// `REPORTES.md` de remate lo dejó escrito en «Lo que falta»: que una sesión lea
// `reportes/` de las bases y abra el pendiente, y que eso entre en la rutina de
// apertura del § 8 del PROTOCOLO-GENERAL. Hasta hoy había que pedírselo.
//
// La otra mitad del motivo es de plata: desde el 2026-09-14 esto lo corre una
// **routine** de Claude Code, que gasta de la suscripción y tiene un tope de
// corridas por día (`RUTINA-AUTOMATICA.md`). Cada dato que se puede juntar con
// código determinado es un dato que el modelo no tiene que leer, y el modelo
// queda para lo único que no se puede automatizar: entender qué dijo la persona
// que reportó la falla, y escribirlo como pendiente.
//
// Por eso esta herramienta **no escribe nada**. Junta, cruza y ordena; el que
// decide sigue siendo quien lee.
//
// ── EL ORDEN NO ES DECORACIÓN ────────────────────────────────────────────────
// Arriba de todo, SIN número, va EN QUÉ ESTAMOS: las líneas de trabajo y quién
// las tiene. Entra el 2026-09-14 y no es una cola de tareas — es el contexto de
// todo lo que viene abajo, y la única forma de que dos chats no hagan lo mismo.
// Sin número a propósito: numerarlo correría las cinco secciones que el § 8 del
// PROTOCOLO-GENERAL cita por número.
//
// Y después, del § 8 «Al abrir» y del § 6 «El apretón de manos», en ese orden:
//   1. TOCADOS            — lo que Mauro editó desde el último parte. § 6: es lo
//                           primero que mira un agente, y compararlo a ojo es
//                           el trabajo que se olvida hacer.
//   2. SIN RESPONDER      — preguntas que lo están esperando a él. § 6: una
//                           pregunta sin responder cuenta como pendiente
//                           abierto, aunque el pendiente esté marcado hecho.
//   3. REPORTES NUEVOS    — fallas reportadas desde un sitio que todavía no
//                           tienen pendiente en el panel.
//   4. ABIERTOS           — el resto, por proyecto (§ 9: Mauro trabaja en un
//                           proyecto por vez) y por prioridad.
//   5. REGLAS SIN PUBLICAR — las bases cuyo archivo de reglas no coincide con lo
//                           último que Mauro confirmó haber publicado. Entra el
//                           2026-09-14: el panel lo encabeza desde `panel-15` y
//                           la ronda no lo miraba, así que una corrida
//                           automática podía dar todo por bien mientras una base
//                           seguía con las reglas viejas. Sale de
//                           `acceso.estado`, que el panel calcula y guarda: acá
//                           NO se vuelve a derivar.
//   6. FUENTES            — qué base contestó y qué no. Va último porque es
//                           diagnóstico, pero **no es opcional**: el § 6 del
//                           CLAUDE.md de los cuatro proyectos dice que un
//                           `permission-denied` es un bloqueo y se avisa.
// ─────────────────────────────────────────────────────────────────────────────

import { PROYECTOS, entrar, entrarSuave, deFirestore } from "./firestore.mjs";

/* Las bases de sitio donde puede haber FALLAS reportadas: todas las que la
   herramienta conoce, menos el panel —que es donde se cruzan— y menos las que
   declaren que su `reportes` es otra cosa.

   Hasta el 2026-09-14 esto era una lista escrita a mano —`["remate",
   "casayourte", "casaverde"]`— y era el último lugar del circuito donde dar de
   alta un sitio nuevo pedía acordarse de algo. Mauro lo pidió con esas
   palabras: «que al momento de agregar un sitio nuevo al panel todo esto siga
   funcionando». Ahora un proyecto que entre en `PROYECTOS` de `firestore.mjs`
   entra acá solo.

   No hace falta que la colección exista: Firestore contesta 200 con cero
   documentos, y si las reglas la niegan sale en FUENTES, que es donde tiene
   que salir. Harmonía no aparece porque no tiene base —no está en `PROYECTOS`—
   y todo su estado vive en el localStorage del teléfono.

   **El 2026-09-21 hubo que distinguir QUÉ guarda cada `reportes`, y el motivo
   importa más que el arreglo.** `hilux` entró a `PROYECTOS` el 19 y entró acá
   solo, que era la gracia — pero su `reportes` no guarda fallas: guarda **un
   viaje por documento**, subido por la aplicación al terminarlo. La ronda los
   traía como «reportes nuevos» sin título y sin qué pasó, y habrían sido dos
   pendientes vacíos por día.

   **Y el primer arreglo de esa mañana se quedó corto, que es lo que Mauro
   marcó.** Decía `reportesSonFallas: false` y con eso sacaba a `hilux` de la
   vuelta ENTERA: no se entraba a esa base, así que dejaba de aparecer en
   FUENTES — y una base que se cae en silencio es justo lo que el § 6 no
   permite. Además una negación no dice qué ES la colección, sólo qué no es.

   Ahora la base declara **qué guarda** (`reportesSon: "viajes"`), se la lee
   igual y se la cuenta en FUENTES con su nombre. Lo único que cambia es que
   un registro de viajes NO se cruza contra los pendientes ni entra en
   «reportes nuevos»: nadie reportó nada. El que no declara nada guarda
   fallas, que es lo que vale para los tres sitios, y sigue entrando solo. */
const QUE_GUARDA = (p) => (PROYECTOS[p] && PROYECTOS[p].reportesSon) || "fallas";
const BASES_CON_REPORTES = Object.keys(PROYECTOS).filter((p) => p !== "panel");
const CON_REPORTES = BASES_CON_REPORTES.filter((p) => QUE_GUARDA(p) === "fallas");

/* Cómo se llama en pantalla lo que guarda cada colección. Sale de acá y no de
   un `if` en el que imprime: agregar una clase nueva es agregar un renglón. */
const NOMBRE_DE_LO_QUE_GUARDA = { fallas: "reportes", viajes: "viajes" };

/* Cómo se escribe de dónde salió un pendiente. Lo fijó REPORTES.md y es lo
   único que evita traer dos veces el mismo reporte: el agente no escribe en la
   base del sitio, así que no puede marcarlo allá. Se mira de este lado. */
const origenDe = (proyecto, id) => `${proyecto}:reportes/${id}`;

/* ── Las funciones puras ─────────────────────────────────────────────────────
   Separadas a propósito de todo lo que toca la red, para que el banco de
   pruebas (`pruebas/herramientas/ronda.mjs`) las corra sin credenciales y sin
   internet. Es la misma decisión del resto del ecosistema: node a secas. */

/* Un reporte es «nuevo» mientras ningún pendiente del panel declare haberlo
   traído. No se mira el estado del pendiente: uno cerrado también lo trajo. */
function cruzar(proyecto, reportes, pendientes) {
  const traidos = new Set(
    (pendientes || []).map((p) => p && p.origen).filter(Boolean)
  );
  const nuevos = [];
  const yaTraidos = [];
  for (const r of reportes || []) {
    (traidos.has(origenDe(proyecto, r.id)) ? yaTraidos : nuevos).push(r);
  }
  return { nuevos, yaTraidos };
}

/* Las claves de un proyecto son una letra y un número (`L5`, `A7`, `T3`). La
   letra es temática y no se deduce —en remate conviven `A`, `D` y `L`—, así
   que esto NO inventa una: devuelve las que ya existen con su número más alto,
   y quien escribe el pendiente elige. Adivinar la letra sería inventar un
   tema, que es peor que preguntar. */
function letrasEnUso(pendientes, proyecto) {
  const mapa = new Map();
  for (const p of pendientes || []) {
    if (p.proyecto !== proyecto) continue;
    const m = /^([A-Za-z]+)(\d+)$/.exec(String(p.clave || ""));
    if (!m) continue;                       // claves con nombre («reportes-2»)
    const letra = m[1].toUpperCase();
    const n = Number(m[2]);
    mapa.set(letra, Math.max(mapa.get(letra) || 0, n));
  }
  return [...mapa.entries()]
    .map(([letra, alto]) => ({ letra, alto, proxima: letra + (alto + 1) }))
    .sort((a, b) => a.letra.localeCompare(b.letra));
}

/* El orden de los abiertos. Primero la prioridad declarada; a igual prioridad,
   lo que espera a otro pendiente va DESPUÉS, porque no se puede empezar
   (§ 9, «Las trabas»). Un pendiente sin prioridad cae al fondo del grupo, no
   al tope: no declarar prioridad no es declararla alta. */
const PESO = { alta: 0, media: 1, baja: 2 };
const pesoDe = (p) => (p && p.prioridad in PESO ? PESO[p.prioridad] : 3);

function ordenarAbiertos(pendientes) {
  return (pendientes || [])
    .filter((p) => p.estado !== "hecho" && p.estado !== "retirado")
    .slice()
    .sort((a, b) =>
      pesoDe(a) - pesoDe(b) ||
      ((a.esperaA || []).length ? 1 : 0) - ((b.esperaA || []).length ? 1 : 0) ||
      String(a.id).localeCompare(String(b.id))
    );
}

/* Las bases cuyas reglas no están publicadas. Sale de `acceso.estado` de
   `proyectos/`, y NO se vuelve a derivar acá: desde `panel-21` ese campo es la
   salida guardada del cálculo del panel —comparar la huella del archivo del
   repositorio contra la de lo último que Mauro confirmó haber publicado—, con
   un solo escritor. Escribir la regla otra vez en este archivo sería el mismo
   error que todo esto vino a cerrar: el mismo hecho calculado en dos lugares.

   Va en la ronda porque es lo único de la lista que deja una base con las
   reglas viejas mientras espera, y porque sólo Mauro puede hacerlo: publicar
   es entrar a la consola de Firebase con su cuenta. */
const reglasSinPublicar = (proyectos) => (proyectos || [])
  .filter((p) => p && p.acceso && p.acceso.estado
    && /pendiente|falta|sin publicar/i.test(p.acceso.estado));

/* ── LAS LÍNEAS DE TRABAJO ───────────────────────────────────────────────
   Entran el 2026-09-14 con la colección `lineas/` del panel, y son lo PRIMERO
   que imprime la ronda: antes de mirar qué hay que hacer, hay que saber en qué
   se está y quién lo tiene. Ése fue el agujero que costó el día — dos chats
   trabajando en paralelo sin enterarse.

   ACÁ SÓLO SE IMPRIME EL ESTADO, NO SE DERIVA NINGÚN AVISO. El panel sí calcula
   los choques —dos dueños distintos sobre el mismo proyecto—, y esta
   herramienta no repite ese cálculo a propósito: sería la misma regla escrita
   dos veces, en dos lenguajes que no se pueden importar entre sí, y ya sabemos
   cómo termina eso acá. Para un agente alcanza con ver qué está tomado y por
   quién: una línea con dueño no se toca, y se pregunta. */
const vivaL = (l) => l && l.estado !== "cerrada";

const diasTomada = (l, hoy = Date.now()) => {
  const t = (l && l.tomada) || null;
  if (!t || !t.desde) return 0;
  const d = new Date(t.desde + "T00:00:00");
  return isNaN(d) ? 0 : Math.floor((hoy - d.getTime()) / 86400000);
};

/* Las vivas, con lo tomado arriba: es lo que condiciona lo que puede hacer
   quien está leyendo. */
function lineasVivas(lineas) {
  const peso = { curso: 0, abierta: 1, pausada: 2 };
  return (lineas || []).filter(vivaL).slice().sort((a, b) =>
    ((a.tomada && a.tomada.desde) ? 0 : 1) - ((b.tomada && b.tomada.desde) ? 0 : 1) ||
    (peso[a.estado] ?? 1) - (peso[b.estado] ?? 1) ||
    String(a.titulo || a.id).localeCompare(String(b.titulo || b.id)));
}

/* ── «CONTESTÓ 0» NO SIEMPRE QUIERE DECIR «NO HAY NADA» ───────────────────
   El 2026-09-15 Mauro preguntó si el circuito de reportes había quedado
   funcionando en CasaYourte y en Casa Verde. La ronda venía imprimiendo
   `✓ casayourte/reportes 0`, que se lee como «está bien y todavía nadie
   reportó». Era falso: en esos dos sitios el circuito NO EXISTE — ni
   formulario, ni bloque `reportes/` en sus reglas, ni colección.

   Contesta 0 porque el acceso del agente en los tres sitios es un comodín con
   exclusiones (`match /{coleccion}/{resto=**}`), así que **listar una colección
   que ninguna regla declara devuelve vacío en vez de negar**. Es la misma
   trampa que quedó escrita el 13-sep al verificar las reglas publicadas, y acá
   mordió de nuevo — esta vez haciendo que el panel pareciera decir que algo
   estaba hecho.

   Lo que distingue un caso del otro no se puede averiguar desde la base, así
   que sale de un dato declarado: `proyectos/{id}.reportes`. Con `true`, el
   sitio tiene el circuito y un 0 significa «nadie reportó»; sin él, significa
   «todavía no existe», y se dice con esas palabras. */
const tieneCircuito = (p) => !!(p && p.reportes === true);

const tocados = (p) => (p || []).filter((x) => x.tocado);
const sinResponder = (p) => (p || []).filter((x) => x.pregunta && !x.respuesta);

/* Agrupa por proyecto y devuelve los grupos ordenados por el `orden` que el
   panel guarda en `proyectos/`, para que la lista salga como sale en su
   pantalla. Un proyecto sin ficha va al final, alfabético. */
function porProyecto(pendientes, fichas) {
  const orden = new Map((fichas || []).map((f) => [f.id, f.orden ?? 99]));
  const g = new Map();
  for (const p of pendientes || []) {
    if (!g.has(p.proyecto)) g.set(p.proyecto, []);
    g.get(p.proyecto).push(p);
  }
  return [...g.entries()]
    .map(([proyecto, items]) => ({ proyecto, items }))
    .sort((a, b) =>
      (orden.get(a.proyecto) ?? 99) - (orden.get(b.proyecto) ?? 99) ||
      a.proyecto.localeCompare(b.proyecto)
    );
}

export { CON_REPORTES, BASES_CON_REPORTES, QUE_GUARDA, origenDe, cruzar, letrasEnUso, ordenarAbiertos,
         tocados, sinResponder, porProyecto, pesoDe, reglasSinPublicar,
         vivaL, diasTomada, lineasVivas, tieneCircuito };

/* ── Lo que sí toca la red ───────────────────────────────────────────────────
   `firestore.mjs` corta el proceso ante un 403, que es lo correcto cuando una
   persona pidió una colección y la base dijo que no. Acá no sirve: una ronda
   que se muere porque UNA base todavía no publicó sus reglas deja de contar lo
   que sí pudo leer, y en una corrida automática nadie lo ve. Se lee tolerante
   y el motivo sale en FUENTES. */
const RAIZ = (p) => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
const objeto = (f) => Object.fromEntries(
  Object.entries(f || {}).map(([k, v]) => [k, deFirestore(v)]));

async function listarSuave(cfg, sesion, coleccion) {
  const salida = [];
  let token = "";
  try {
    do {
      const q = "?pageSize=300" + (token ? "&pageToken=" + encodeURIComponent(token) : "");
      const r = await fetch(RAIZ(cfg.projectId) + "/" + coleccion + q,
        { headers: { Authorization: "Bearer " + sesion.token } });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const m = (j.error && j.error.message) || String(r.status);
        return { ok: false, motivo: r.status === 403 ? "las reglas dijeron que no: " + m : m, docs: [] };
      }
      for (const d of j.documents || []) salida.push({ id: d.name.split("/").pop(), ...objeto(d.fields) });
      token = j.nextPageToken || "";
    } while (token);
  } catch (e) {
    return { ok: false, motivo: "no se pudo llegar a la base: " + (e && e.message ? e.message : e), docs: [] };
  }
  return { ok: true, motivo: "", docs: salida };
}

async function juntar() {
  const fuentes = [];

  const cfgPanel = PROYECTOS.panel;
  /* Suave también acá: si el panel no deja entrar, esto tiene que salir por el
     camino de `fatal` —con FUENTES adentro, que es lo que se mira— y no como un
     `process.exit` que no dice qué llegó a contestar. */
  const ePanel = await entrarSuave(cfgPanel);
  if (!ePanel.ok) {
    fuentes.push({ base: "panel", coleccion: "pendientes", ok: false,
                   motivo: ePanel.motivo, cuantos: 0 });
    return { fatal: "el panel no dejó entrar — " + ePanel.motivo, fuentes };
  }
  const sesionPanel = ePanel.sesion;
  const pend = await listarSuave(cfgPanel, sesionPanel, "pendientes");
  const proy = await listarSuave(cfgPanel, sesionPanel, "proyectos");
  const lin = await listarSuave(cfgPanel, sesionPanel, "lineas");
  fuentes.push({ base: "panel", coleccion: "lineas", ok: lin.ok, motivo: lin.motivo,
                 cuantos: lin.docs.length });
  fuentes.push({ base: "panel", coleccion: "pendientes", ...pend, docs: undefined, cuantos: pend.docs.length });

  /* Si el panel no contesta, no hay ronda: todo lo demás se cruza contra él.
     Se dice y se corta, que es lo que pide el § 6 del CLAUDE.md de los cuatro
     proyectos — trabajar a ciegas sobre la mitad de lo que dijo Mauro es peor
     que no trabajar. */
  if (!pend.ok) return { fatal: "el panel no contestó — " + pend.motivo, fuentes };

  const pendientes = pend.docs;
  const fichas = proy.ok ? proy.docs : [];
  const reportes = [];
  /* Se recorren TODAS las bases y no sólo las de fallas: una que se caiga
     tiene que salir en FUENTES aunque lo que guarde no se cruce con nada. */
  for (const nombre of BASES_CON_REPORTES) {
    const cfg = PROYECTOS[nombre];
    if (!cfg) continue;
    /* `entrarSuave` y no `entrar`: el try/catch que había acá NO servía, porque
       `entrar` terminaba en un `process.exit` y el catch nunca corría. Una base
       recién dada de alta —sin el usuario del agente todavía— volteaba la ronda
       ENTERA en vez de salir como un renglón de FUENTES. Pasó con `hilux`. */
    const guarda = QUE_GUARDA(nombre);
    const comoSeLlama = NOMBRE_DE_LO_QUE_GUARDA[guarda] || guarda;
    const e = await entrarSuave(cfg);
    if (!e.ok) {
      fuentes.push({ base: nombre, coleccion: comoSeLlama, ok: false,
                     motivo: "no se pudo entrar: " + e.motivo.split("\n")[0], cuantos: 0 });
      continue;
    }
    const r = await listarSuave(cfg, e.sesion, "reportes");
    fuentes.push({ base: nombre, coleccion: comoSeLlama, ok: r.ok, motivo: r.motivo,
                   cuantos: r.docs.length,
                   /* El 0 que no quiere decir lo que parece sólo aplica a las
                      fallas: un sitio sin formulario de reporte contesta 0 y
                      eso no es «todo bien». Un registro de viajes con 0 es un
                      0 de verdad — todavía no se anduvo. */
                   circuito: guarda === "fallas"
                     ? tieneCircuito(fichas.find((f) => f.id === nombre))
                     : true });
    if (!r.ok) continue;
    /* Un viaje no lo reportó nadie: no se cruza contra los pendientes y no
       entra en «reportes nuevos». Se contó arriba, que es lo que hacía falta. */
    if (guarda !== "fallas") continue;
    const { nuevos, yaTraidos } = cruzar(nombre, r.docs, pendientes);
    reportes.push({ proyecto: nombre, nuevos, yaTraidos });
  }

  return {
    fecha: new Date().toISOString().slice(0, 10),
    pendientes,
    lineas: lin.ok ? lin.docs : [],
    proyectos: proy.ok ? proy.docs : [],
    reportes,
    fuentes
  };
}

/* ── La pantalla ─────────────────────────────────────────────────────────────*/
const corto = (t, n = 96) => {
  const s = String(t || "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
};

function imprimir(d) {
  const L = [];
  const ti = tocados(d.pendientes);
  const sr = sinResponder(d.pendientes);
  const nuevos = d.reportes.flatMap((r) => r.nuevos.map((x) => ({ ...x, _proy: r.proyecto })));
  const abiertos = ordenarAbiertos(d.pendientes);
  const reglas = reglasSinPublicar(d.proyectos);

  /* EL ENCABEZADO LIDERA CON LO QUE HAY QUE HACER, no con el tamaño del
     archivo. Hasta el 2026-09-20 el primer número era el total de pendientes
     —95 ese día— y Mauro lo dijo con todas las letras: «95 pendientes en el
     panel es mucho para mí». Y tenía razón en sentirlo y no en el número: de
     esos 95, setenta y cuatro estaban cerrados. Lo que quedaba eran 21, y de
     ésos sólo 13 lo esperaban a él.

     Un contador que mezcla el trabajo con el archivo no informa: desmoraliza.
     Los cerrados siguen contándose —son la memoria del proyecto y no se
     borran— pero van al final y entre paréntesis, que es el lugar que les
     corresponde. */
  const mios = abiertos.filter((p) => p.quien === "claude").length;
  const suyos = abiertos.length - mios;
  const cerrados = (d.pendientes || []).filter((p) => p.estado === "hecho").length;
  const retirados = (d.pendientes || []).filter((p) => p.estado === "retirado").length;

  L.push(`\n  RONDA · ${d.fecha}`);
  L.push(`  ${abiertos.length} ABIERTOS — ${suyos} te esperan a vos, ${mios} son míos`);
  L.push(`  ${ti.length} tocados · ${sr.length} sin responder · ${nuevos.length} reportes nuevos · ` +
         `${reglas.length} con las reglas sin publicar`);
  L.push(`  (${cerrados + retirados} cerrados y fuera de la cuenta: ` +
         `${cerrados} hechos, ${retirados} retirados)`);
  L.push(`  ${lineasVivas(d.lineas).length} líneas abiertas · ` +
         `${lineasVivas(d.lineas).filter((l) => l.tomada && l.tomada.desde).length} tomadas`);

  /* Va antes del 1 y SIN número: no es una cola de trabajo, es el contexto de
     todo lo que viene abajo. Numerarlo habría corrido las cinco secciones que
     el § 8 del PROTOCOLO-GENERAL cita por número. */
  L.push(`\n  EN QUÉ ESTAMOS — las líneas de trabajo, y quién las tiene`);
  const vivas = lineasVivas(d.lineas);
  if (!vivas.length) {
    L.push(`      (ninguna abierta — si vas a tocar código, abrí una primero)`);
  }
  for (const l of vivas) {
    const t = l.tomada && l.tomada.desde ? l.tomada : null;
    const dias = diasTomada(l);
    L.push(`      ${l.id}  [${l.estado || "abierta"}/${l.alcance || "sitio"}]  ${corto(l.titulo, 64)}`);
    if ((l.proyectos || []).length) L.push(`          toca    : ${l.proyectos.join(", ")}`);
    if (l.objetivo) L.push(`          termina : ${corto(l.objetivo, 110)}`);
    L.push(t
      ? `          TOMADA  : ${t.chat || t.quien || "?"}${t.sesion ? " (" + t.sesion + ")" : ""}` +
        `  desde el ${t.desde}${dias > 2 ? `  ⚠ hace ${dias} días` : ""}`
      : `          libre   : nadie la tomó`);
  }
  L.push(`\n      Antes de tocar código: tomá una línea o abrila. Si ya está tomada`);
  L.push(`      por otro, NO la toques — preguntá. Es todo el punto de esta sección.`);

  L.push(`\n  1 · TOCADOS — Mauro los editó desde el último parte`);
  if (!ti.length) L.push(`      (ninguno)`);
  for (const p of ti) {
    L.push(`      ${p.id}  [${p.estado}]  ${corto(p.titulo)}`);
    if (p.respuesta) L.push(`          respondió: ${corto(p.respuesta, 140)}`);
  }

  L.push(`\n  2 · SIN RESPONDER — lo están esperando a él`);
  if (!sr.length) L.push(`      (ninguna)`);
  for (const p of sr) {
    L.push(`      ${p.id}  [${p.estado}]  ${corto(p.titulo)}`);
    L.push(`          pregunta: ${corto(p.pregunta, 140)}`);
  }

  L.push(`\n  3 · REPORTES NUEVOS — fallas de un sitio sin pendiente que las traiga`);
  if (!nuevos.length) L.push(`      (ninguno)`);
  for (const r of nuevos) {
    L.push(`      ${r._proy}:reportes/${r.id}  [${r.gravedad || "sin gravedad"}]  ${r.pagina || "?"}`);
    L.push(`          qué pasó : ${corto(r.texto, 140)}`);
    if (r.esperaba) L.push(`          esperaba : ${corto(r.esperaba, 140)}`);
    L.push(`          origen   : ${origenDe(r._proy, r.id)}`);
  }

  L.push(`\n  4 · ABIERTOS — por proyecto, por prioridad, las trabas al final`);
  for (const g of porProyecto(abiertos, d.proyectos)) {
    L.push(`      ── ${g.proyecto}`);
    for (const p of ordenarAbiertos(g.items)) {
      const traba = (p.esperaA || []).length ? `  ⟵ espera ${p.esperaA.join(", ")}` : "";
      L.push(`      ${p.id}  [${p.prioridad || "sin prioridad"}/${p.quien || "?"}]  ${corto(p.titulo, 70)}${traba}`);
    }
  }

  L.push(`\n  5 · REGLAS SIN PUBLICAR — sólo las puede publicar él`);
  if (!reglas.length) L.push(`      (ninguna)`);
  for (const p of reglas) {
    const a = p.acceso || {};
    L.push(`      ${p.id}  ${a.base || "?"}  ${a.reglas || ""}`);
    if (a.publicado && a.publicado.fecha) {
      L.push(`          publicó el ${a.publicado.fecha}: ${a.publicado.lineas} renglones` +
             (a.repo ? `  ·  el archivo de ahora: ${a.repo.lineas}` : ""));
    } else {
      L.push(`          sin registro de publicación — el panel todavía no comparó`);
    }
    if (a.reglasUrl) L.push(`          ${a.reglasUrl}`);
  }

  L.push(`\n  6 · FUENTES`);
  for (const f of d.fuentes) {
    /* Un 0 de una colección que el sitio todavía no tiene no se muestra como
       un tilde: se dice qué significa. Ver `tieneCircuito` arriba. */
    const sinCircuito = f.coleccion === "reportes" && f.ok && !f.circuito;
    L.push(`      ${!f.ok ? "✖" : sinCircuito ? "·" : "✓"} ${f.base}/${f.coleccion}` +
           (!f.ok ? `  ${f.motivo}`
            : sinCircuito ? `  el sitio todavía no tiene el circuito de reportes`
            : `  ${f.cuantos}`));
  }
  const caidas = d.fuentes.filter((f) => !f.ok);
  if (caidas.length) {
    L.push(`\n      ⚠ ${caidas.length} fuente(s) no contestaron. Eso es un bloqueo y se dice:`);
    L.push(`        la ronda salió con menos de lo que hay.`);
  }
  L.push("");
  return L.join("\n");
}

/* ── La línea de comandos ────────────────────────────────────────────────────*/
if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cmd, ...args] = process.argv;

  if (cmd === "abrir") {
    const d = await juntar();
    if (d.fatal) {
      console.error(`\n✖ ${d.fatal}\n`);
      process.exit(1);
    }
    console.log(args.includes("--json") ? JSON.stringify(d, null, 2) : imprimir(d));

  } else if (cmd === "claves") {
    const proyecto = args[0];
    if (!proyecto) { console.error("\n✖ falta el proyecto\n"); process.exit(1); }
    const cfg = PROYECTOS.panel;
    const sesion = await entrar(cfg);
    const r = await listarSuave(cfg, sesion, "pendientes");
    if (!r.ok) { console.error(`\n✖ ${r.motivo}\n`); process.exit(1); }
    const letras = letrasEnUso(r.docs, proyecto);
    if (!letras.length) {
      console.log(`\n  ${proyecto}: no hay claves con forma letra+número todavía.\n`);
    } else {
      console.log(`\n  ${proyecto} — letras en uso y la próxima libre de cada una:`);
      for (const l of letras) console.log(`      ${l.letra}  hasta ${l.letra}${l.alto}  →  ${l.proxima}`);
      console.log(`\n  La letra es temática y no se deduce: elegila mirando de qué trata.\n`);
    }

  } else {
    console.log(`
  node herramientas/ronda.mjs abrir [--json]
      Junta el panel y los reportes de los sitios, los cruza y los ordena
      como pide el § 8 del PROTOCOLO-GENERAL. No escribe nada.

  node herramientas/ronda.mjs claves <proyecto>
      Las letras de clave en uso en ese proyecto y la próxima libre de cada
      una, para escribir un pendiente nuevo sin pisar otro.

  Lo que se hace con esto: RUTINA-AUTOMATICA.md
`);
  }
}
