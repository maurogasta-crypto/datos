// ─────────────────────────────────────────────────────────────────────────────
// ronda.mjs — Junta en una sola pantalla lo que hay que mirar al abrir una
// tanda: lo que Mauro tocó en el panel, lo que está esperando respuesta, y las
// fallas que la gente reportó desde cada sitio.
//
//   node herramientas/ronda.mjs abrir [--json]
//   node herramientas/ronda.mjs reservar <repo> [rutas...]
//   node herramientas/ronda.mjs soltar <repo>
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

import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PROYECTOS, entrar, entrarSuave, deFirestore, escribir, borrar } from "./firestore.mjs";

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

/* Qué cuenta como PEDIDO y no como falla. Está acá arriba, con nombre y
   exportado, para que se pueda probar: vive adentro de la rutina que corre
   sola una vez por día, y una que se equivoca en silencio no se entera nadie.

   La ausencia de `tipo` se lee como FALLA, nunca como «desconocido»: los
   reportes anteriores al 21-sep-2026 no tienen el campo y en esa época sólo
   existían fallas. Tratarlos como desconocidos sería inventar una categoría
   que nunca tuvo nada adentro. */
const esPedido = (r) => !!r && r.tipo === "pedido";

/* ── QUÉ CAMBIÓ ─────────────────────────────────────────────────────────────
   La otra mitad del problema, y la que Mauro puso primero: que una sesión
   nueva no tenga que recorrer el código para enterarse de lo que hizo otra.

   Sale de `git log` y NO de algo que alguien escriba. Es el mismo criterio que
   el estado de las reglas: un dato que hay que acordarse de anotar es un dato
   que va a quedar viejo. Acá lo que hay que saber ya está escrito en el
   repositorio, sólo que nadie lo estaba mirando al abrir.

   Mira los repositorios HERMANOS —las carpetas al lado de `datos`— y no una
   lista escrita a mano. Esto último es a propósito: una lista sería un cuarto
   lugar donde dar de alta un proyecto, y la regla del panel es justamente que
   un sitio nuevo no se agrega en ningún lado de este camino.

   Y NO PUEDE ROMPER LA RONDA. Si no hay git, si la carpeta no es un
   repositorio, si el comando tarda: se saltea en silencio y la ronda sigue.
   Esto informa; no mide. */
const DIAS_CAMBIOS = 2;

/* La carpeta donde viven los repositorios hermanos: la que contiene a `datos`.
   Estaba calculada adentro de `queCambio`; sale acá porque QUÉ TOCAR AHORA
   necesita lo mismo, y el día que cambie la estructura tiene que cambiar en un
   solo lugar. */
const raizDeLosRepos = () =>
  dirname(dirname(dirname(fileURLToPath(import.meta.url))));

function queCambio(dias = DIAS_CAMBIOS) {
  const raiz = raizDeLosRepos();
  let carpetas = [];
  try { carpetas = readdirSync(raiz, { withFileTypes: true })
          .filter((d) => d.isDirectory() && existsSync(join(raiz, d.name, ".git")))
          .map((d) => d.name).sort(); } catch (e) { return []; }

  const salida = [];
  for (const nombre of carpetas) {
    try {
      const txt = execFileSync("git",
        ["log", `--since=${dias} days ago`, "--format=%x00%h %s", "--name-only"],
        { cwd: join(raiz, nombre), encoding: "utf8", timeout: 8000, stdio: ["ignore", "pipe", "ignore"] });
      const commits = txt.split("\u0000").map((b) => b.trim()).filter(Boolean).map((b) => {
        const [cab, ...resto] = b.split("\n");
        const corte = cab.indexOf(" ");
        return { sha: cab.slice(0, corte), titulo: cab.slice(corte + 1),
                 archivos: resto.map((x) => x.trim()).filter(Boolean) };
      });
      if (commits.length) salida.push({ repo: nombre, commits });
    } catch (e) { /* sin git, sin repo, o tardó: no es asunto de la ronda */ }
  }
  return salida;
}

/* Qué archivo tocó qué commit, que es lo que de verdad sirve para no releer:
   un archivo que aparece dos veces es un archivo donde dos trabajos se
   cruzaron. */
function archivosTocados(cambios) {
  const m = new Map();
  for (const r of cambios || []) {
    for (const c of r.commits || []) {
      for (const a of c.archivos || []) {
        const k = r.repo + "/" + a;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(c.titulo);
      }
    }
  }
  return m;
}

/* ── EL SEMÁFORO ────────────────────────────────────────────────────────────
   Una RESERVA dice qué repositorio está tocando un chat, y hasta cuándo. Es
   distinta de una LÍNEA, que dice por qué se trabaja, y las dos hacen falta.

   EL CASO QUE LA TRAJO, del 2026-09-22: dos chats con líneas distintas y las
   dos legítimas —una de casayourte, otra de hilux— editaron el mismo día
   `herramientas/ronda.mjs`. Terminó en un rebase con conflicto y en releer los
   cinco commits del otro. Una línea reserva un PROPÓSITO; no reserva una
   SUPERFICIE, y por eso el choque no se vio hasta el push.

   POR REPOSITORIO Y NO POR ARCHIVO, al menos para empezar. Por archivo es más
   preciso y pide algo que un chat no siempre tiene: saber de antemano qué va a
   tocar. `rutas` existe para afinar cuando sí se sabe, pero lo que decide el
   choque es `repo` — y el choque de ese día habría quedado evitado entero con
   una reserva de repositorio.

   VENCE, y eso es lo que a `lineas.tomada` le falta. Un chat que muere sin
   soltar deja la línea trabada para siempre; con un plazo, se libera sola. El
   plazo se renueva volviendo a reservar, así que una sesión larga no se queda
   sin él. Noventa minutos: más corto molesta, más largo deja trabado a un
   muerto. */
const MINUTOS_RESERVA = 90;

/* Viva = no vencida. Se DERIVA de la fecha y no de un campo `activa`, por lo
   mismo que el estado de las reglas se deriva: un campo que alguien tiene que
   acordarse de apagar es un campo que va a quedar encendido. Una reserva sin
   `vence`, o con una fecha que no se entiende, se trata como VENCIDA — el
   semáforo se rompe hacia el verde, porque un semáforo roto en rojo traba el
   ecosistema entero y eso es peor que un choque. */
const reservaViva = (r, ahora = Date.now()) => {
  if (!r || !r.repo) return false;
  const t = Date.parse(r.vence || "");
  return Number.isFinite(t) && t > ahora;
};

/* Las vivas de un repo, sacando la del propio chat: reservarse contra uno
   mismo no es un choque, es renovar. */
const reservasDe = (reservas, repo, sesion, ahora = Date.now()) =>
  (reservas || []).filter((r) => reservaViva(r, ahora) && r.repo === repo
                                && (!sesion || r.sesion !== sesion));

/* `Math.max(0, NaN)` es NaN, no 0: una fecha ilegible imprimiría «quedan NaN
   min», que es de las cosas que hacen dudar de todo el resto de la pantalla.
   Se comprueba que el número EXISTE antes de compararlo. */
const minutosQueQuedan = (r, ahora = Date.now()) => {
  const t = Date.parse((r && r.vence) || "");
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.round((t - ahora) / 60000));
};

/* ── QUÉ TOCAR AHORA ─────────────────────────────────────────────────────────
   Lo pidió Mauro el 2026-09-22, después del semáforo: «una forma de
   intervención más inteligente que optimice el recurso en base a la
   incorporación nueva del semáforo… tomar la decisión más acertada, más justa
   y correcta».

   EL PROBLEMA NO ERA LA FALTA DE DATOS, ERA QUE NADIE LOS CRUZABA. La ronda ya
   imprimía las líneas, el semáforo y los abiertos — en tres listas separadas.
   El cruce lo hacía el chat en su cabeza, con un criterio escrito en prosa
   repartida entre el § 9, el prompt de la rutina y cinco `CLAUDE.md`. O sea:
   cada sesión decidía distinto, y ninguna podía equivocarse de forma
   reproducible. Es el mismo error que este ecosistema ya pagó con los seis
   hertz de la rueda y con el prompt que contradecía al § 2.1 ter: **una regla
   escrita en prosa en varios lugares diverge.**

   Así que el criterio se calcula acá, una vez, y la ronda lo imprime. Es la
   doctrina que el encabezado de este archivo ya declaraba: cada dato que se
   puede juntar con código determinado es un dato que el modelo no tiene que
   leer. Elegir el pendiente ES uno de esos datos.

   EL ORDEN DE LOS TRES TÉRMINOS NO ES ARBITRARIO:

     1. LA PRIORIDAD DE MAURO, siempre arriba. El § 9 es explícito: la propone
        el agente y la corrige él, porque él sabe qué le urge. Un orden que lo
        contradice es un orden que va a dejar de mirar.
     2. CUÁNTO DESTRABA, a igual prioridad. Es la parte «justa» del pedido:
        mira el tablero entero y no el ítem más ruidoso. Se deduce de `esperaA`
        y no se guarda.
     3. SI EL REPOSITORIO YA ESTÁ RESERVADO POR ESTE CHAT, al final. Es la
        parte «que optimiza el recurso», y es la única medida de costo que se
        puede tomar sin inventar nada: seguir en el repositorio que ya se tiene
        reservado ahorra la reserva, el `CLAUDE.md` del otro y su banco.

   Y NO HAY UN TÉRMINO DE «COSTO» ADEMÁS DE ÉSE, a propósito. Haría falta un
   campo que alguien tendría que estimar a mano en cada pendiente, y un campo
   que nadie llena no queda vacío: llega `undefined` y el orden miente en
   silencio. Es la misma trampa que las máscaras del § 2.1 septies.

   ESTO NO ESCRIBE NADA Y NO DECIDE SOLO. Imprime un candidato y los motivos de
   cada descarte. Lo que no puede hacer —y por eso el modelo sigue haciendo
   falta— es saber si el pendiente TODAVÍA ES CIERTO: el 2026-09-22 `hilux:R3`
   decía que unas reglas no estaban publicadas y hacía días que lo estaban. */

/* Dónde está el repositorio de cada proyecto. **No es un mapa nuevo:** sale de
   `sitio.repo` de `proyectos/`, que ya estaba escrito en los nueve documentos
   desde antes de que esto existiera — nadie lo estaba leyendo. La carpeta es
   el último tramo de `owner/repo`, y coincide con la carpeta hermana.

   DOS PROYECTOS PUEDEN COMPARTIR REPOSITORIO, y hoy pasa: `panel` y `datos`
   son dos entradas del tablero y un solo repositorio. Por eso la carpeta no se
   deduce del id del proyecto — deducirla habría dado dos carpetas, y una de
   ellas no existe. */
function repoDeCadaProyecto(proyectos) {
  const m = new Map();
  for (const p of proyectos || []) {
    const r = p && p.sitio && p.sitio.repo;
    if (!r) continue;
    const carpeta = String(r).split("/").filter(Boolean).pop();
    if (carpeta) m.set(p.id, carpeta);
  }
  return m;
}

/* Las trabas que SIGUEN vivas. Una `esperaA` que apunta a algo ya hecho no es
   una traba: el § 9 lo dice con todas las letras —«cuando la que trababa se
   marca hecha, la traba desaparece sola»— porque es un derivado.

   Hasta el 2026-09-22 la ronda imprimía la flecha igual, sin mirar si el otro
   seguía abierto, y ese día mostraba `casayourte:T2 ⟵ espera casayourte:T1`
   con T1 hecho desde hacía días: un pendiente que ya se podía empezar,
   figurando frenado. Es exactamente lo que el § 9 avisa que hay que revisar al
   cerrar una tanda, sólo que acá se deduce y no hace falta acordarse. */
const trabasVivas = (p, abiertosIds) =>
  ((p && p.esperaA) || []).filter((id) => (abiertosIds || new Set()).has(id));

/* Cuántos pendientes ABIERTOS se destraban si éste se hace. Es la única parte
   del orden que mira el tablero entero en vez del ítem. */
const desbloquea = (p, abiertos) => (abiertos || [])
  .filter((x) => x && x.id !== p.id && ((x.esperaA || []).includes(p.id))).length;

/* QUÉ HACE FALTA PARA PODER VERIFICAR, por repositorio. No es una lista de
   dependencias: es la respuesta a «¿puedo ENTREGAR esto desde acá?».

   Existe porque el 2026-09-22 esta sesión perdió el SDK de Dart al reiniciarse
   el contenedor, y cualquier pendiente de `sitd-hilux` que pidiera `flutter
   test` sólo podía terminar de dos maneras, las dos desperdicio: sin entregar,
   o entregado sin verificar. Eso hay que saberlo ANTES de elegirlo, no después
   de leerse el pendiente entero — y ahí está el recurso que se ahorra.

   LA MARCA ES UN ARCHIVO DEL PROPIO REPOSITORIO y no un dato declarado: un
   `pubspec.yaml` ES un proyecto de Dart, y eso no se desactualiza. Los repos
   de JavaScript no necesitan entrada acá: `node` está siempre, y una entrada
   de más sería una condición que puede quedar vieja. */
const HERRAMIENTA_QUE_PIDE = [
  { marca: "pubspec.yaml", manda: "dart", queEs: "el SDK de Dart/Flutter" },
];

/* Si un comando está en el PATH, sin lanzar un proceso: la ronda la corre una
   routine desatendida y un `spawn` que se cuelga la voltea entera. */
const hayComando = (cmd, path = process.env.PATH || "") =>
  String(path).split(":").filter(Boolean).some((d) => {
    try { return existsSync(join(d, cmd)); } catch (e) { return false; }
  });

/* Las tres consultas al disco van detrás de `io` para que el banco las pueda
   sustituir: el resultado depende de qué tiene puesto ESTE contenedor, y una
   prueba que dependa de eso mide el contenedor y no el código. */
const ioPorDefecto = () => {
  const raiz = raizDeLosRepos();
  return {
    adjunto: (carpeta) => {
      try { return existsSync(join(raiz, carpeta)); } catch (e) { return false; }
    },
    hayArchivo: (carpeta, marca) => {
      try { return existsSync(join(raiz, carpeta, marca)); } catch (e) { return false; }
    },
    hayComando,
  };
};

function herramientaQueFalta(carpeta, io) {
  const { hayArchivo, hayComando: hc } = io || ioPorDefecto();
  for (const h of HERRAMIENTA_QUE_PIDE)
    if (hayArchivo(carpeta, h.marca) && !hc(h.manda)) return h;
  return null;
}

/* Por qué NO se toca este pendiente, o `null` si se puede.

   EL ORDEN DE LOS CHEQUEOS ES EL DEL MOTIVO QUE SE IMPRIME, así que va del más
   general al más circunstancial: de quién es, si está frenado, si te está
   esperando, y recién después las tres razones que dependen de dónde y cuándo
   se está corriendo esto. Un pendiente de Mauro que además está trabado se
   descarta por ser de Mauro, que es lo que hay que decir. */
function porQueNoSeToca(p, ctx) {
  const c = ctx || {};
  if (!p) return { codigo: "vacio", texto: "no es un pendiente" };

  /* § 9: lo que necesita una consola, una cuenta, una decisión o una
     contraseña lo hace él, y ningún orden lo cambia. */
  if (p.quien !== "claude")
    return { codigo: "de-mauro",
             texto: `es de Mauro (quien: ${p.quien || "sin declarar"})` };

  const trabas = trabasVivas(p, c.abiertosIds);
  if (trabas.length)
    return { codigo: "trabado", texto: `espera a ${trabas.join(", ")}` };

  /* § 9: si una pregunta sigue sin responder, empezar antes es trabajo que
     quizás haya que tirar. */
  if (p.pregunta && !p.respuesta)
    return { codigo: "sin-respuesta",
             texto: "le dejaste una pregunta a Mauro y todavía no la contestó" };

  const carpeta = (c.repoDe || new Map()).get(p.proyecto);
  if (!carpeta) return null;          // sin repo declarado: pasa, con aviso

  const otra = reservasDe(c.reservas, carpeta, c.sesion, c.ahora)[0];
  if (otra)
    return { codigo: "repo-ocupado",
             texto: `el repositorio «${carpeta}» lo tiene ` +
                    `${otra.chat || otra.sesion || "otro chat"}` +
                    `, quedan ${minutosQueQuedan(otra, c.ahora)} min` };

  /* § 4.1: el alcance de repositorios se fija al abrir la sesión. Uno que no
     está adjunto no se clona — eso es lo que el modo automático no deja
     ejecutar, y es la razón por la que la rutina existe. */
  if (c.adjunto && !c.adjunto(carpeta))
    return { codigo: "no-adjunto",
             texto: `«${carpeta}» no está adjunto a esta sesión` };

  const falta = c.faltaHerramienta ? c.faltaHerramienta(carpeta) : null;
  if (falta)
    return { codigo: "sin-herramienta",
             texto: `no se puede verificar acá: falta ${falta.queEs} ` +
                    `(«${falta.manda}» no está en el PATH)` };

  return null;
}

/* El cruce entero. Devuelve los elegibles YA ORDENADOS y los descartados con
   su motivo — los dos, porque una lista de candidatos sin los motivos del
   resto no se puede auditar, y ésta es la tercera vez que este ecosistema
   aprende que un contador sin la razón al lado no diagnostica nada. */
function queTocarAhora(abiertos, ctx) {
  const c = ctx || {};
  const lista = abiertos || [];
  const io = c.io || ioPorDefecto();
  const ctx2 = {
    abiertosIds: c.abiertosIds || new Set(lista.map((p) => p && p.id)),
    repoDe: c.repoDe || new Map(),
    reservas: c.reservas || [],
    sesion: c.sesion,
    ahora: c.ahora,
    adjunto: c.adjunto || io.adjunto,
    faltaHerramienta: c.faltaHerramienta || ((carpeta) => herramientaQueFalta(carpeta, io)),
  };

  const elegibles = [];
  const descartados = [];
  for (const p of lista) {
    const no = porQueNoSeToca(p, ctx2);
    if (no) { descartados.push({ p, ...no }); continue; }
    const carpeta = ctx2.repoDe.get(p.proyecto) || null;
    const mio = carpeta
      ? (c.reservas || []).some((r) => reservaViva(r, c.ahora) && r.repo === carpeta
                                       && c.sesion && r.sesion === c.sesion)
      : false;
    elegibles.push({
      p, carpeta, yaReservado: mio, destraba: desbloquea(p, lista),
      aviso: carpeta ? null
        : `el proyecto «${p.proyecto}» no declara sitio.repo: no se pudo ` +
          `cruzar con el semáforo — mirá el SEMÁFORO a mano antes de editar`,
    });
  }

  elegibles.sort((a, b) =>
    pesoDe(a.p) - pesoDe(b.p) ||
    b.destraba - a.destraba ||
    (b.yaReservado ? 1 : 0) - (a.yaReservado ? 1 : 0) ||
    String(a.p.id).localeCompare(String(b.p.id)));

  return { elegibles, descartados };
}

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
         vivaL, diasTomada, lineasVivas, tieneCircuito, esPedido,
         MINUTOS_RESERVA, reservaViva, reservasDe, minutosQueQuedan,
         queCambio, archivosTocados, DIAS_CAMBIOS, raizDeLosRepos,
         repoDeCadaProyecto, trabasVivas, desbloquea, hayComando,
         HERRAMIENTA_QUE_PIDE, herramientaQueFalta, porQueNoSeToca, queTocarAhora,
         CAMPOS_PENDIENTE, CAMPOS_LINEA, CAMPOS_PROYECTO, SOLO_NOMBRES };

/* ── Lo que sí toca la red ───────────────────────────────────────────────────
   `firestore.mjs` corta el proceso ante un 403, que es lo correcto cuando una
   persona pidió una colección y la base dijo que no. Acá no sirve: una ronda
   que se muere porque UNA base todavía no publicó sus reglas deja de contar lo
   que sí pudo leer, y en una corrida automática nadie lo ve. Se lee tolerante
   y el motivo sale en FUENTES. */
const RAIZ = (p) => `https://firestore.googleapis.com/v1/projects/${p}/databases/(default)/documents`;
const objeto = (f) => Object.fromEntries(
  Object.entries(f || {}).map(([k, v]) => [k, deFirestore(v)]));

/* LOS CAMPOS QUE LA RONDA MIRA DE UN PENDIENTE, y ninguno más.
   Medido el 2026-09-22: traer los pendientes enteros son 492 KiB y 1,1 s; con
   esta máscara son 92 KiB y 0,2 s. La diferencia son `detalle`, `historia` y
   `porQue` — los tres largos, y los tres que la ronda NO lee nunca: imprime
   títulos y preguntas, no el cuerpo.

   La lista salió de leer QUÉ campo toca cada función (`cruzar`, `tocados`,
   `sinResponder`, `ordenarAbiertos`, `porProyecto`, `pesoDe`, `letrasEnUso`) y
   NO de adivinar, porque una máscara a la que le falta un campo no rompe: ese
   campo llega `undefined` y la ronda miente en silencio. El banco compara esta
   lista contra los accesos reales del archivo y falla si se separan.

   `id` no va: sale del nombre del documento y llega siempre. */
const CAMPOS_PENDIENTE = ["clave", "esperaA", "estado", "linea", "origen",
  "pregunta", "prioridad", "proyecto", "quien", "respuesta", "titulo", "tocado"];

/* Lo mismo para las otras dos del panel, y por el mismo motivo medido.

   De una LÍNEA se deja afuera `bitacora`, que son 23 de sus 26 KiB y la ronda
   no imprime nunca: es el registro que se lee ENTERO cuando se toma la línea,
   con `firestore.mjs panel leer lineas <id>`, no en el resumen de apertura.
   `porQue` sí se trae aunque tampoco se imprima hoy: son 3 KiB y es lo que el
   § 2.1 quinquies llama «la especificación» — el día que la ronda lo muestre,
   ya está.

   De un PROYECTO se dejan afuera `tecnica` y `empaquetado`: 14 KiB que son
   para las pantallas del panel, no para esto. La ronda mira `acceso` —de ahí
   sale si las reglas están sin publicar—, `reportes` y el orden.

   `sitio` ENTERO tampoco entra, pero sí `sitio.repo`, y la diferencia es el
   punto: Firestore acepta máscaras de SUBCAMPO, así que se piden treinta bytes
   —`maurogasta-crypto/sitd-hilux`— en vez de los varios KiB del resumen, la
   url y el readme. De ahí sale la carpeta de cada proyecto, que es lo que
   permite cruzar el semáforo con los pendientes (QUÉ TOCAR AHORA). Sin eso el
   cruce habría necesitado un campo nuevo, o sea un cuarto lugar donde dar de
   alta un proyecto: justo lo que el CLAUDE.md prohíbe. */
const CAMPOS_LINEA = ["titulo", "alcance", "objetivo", "proyectos", "estado",
  "tomada", "porQue", "abierta"];
const CAMPOS_PROYECTO = ["acceso", "reportes", "orden", "nombre", "sitio.repo"];

/* Para una colección que sólo hay que CONTAR. Pedir un campo que no existe
   devuelve los documentos sin cuerpo: los nombres alcanzan para contarlos.
   Medido: los `reportes` de hilux pasan de 461 KiB a 1 KiB. */
const SOLO_NOMBRES = ["__name__"];

async function listarSuave(cfg, sesion, coleccion, campos) {
  const salida = [];
  let token = "";
  const mascara = (campos || []).map((c) => "&mask.fieldPaths=" + encodeURIComponent(c)).join("");
  try {
    do {
      const q = "?pageSize=300" + mascara + (token ? "&pageToken=" + encodeURIComponent(token) : "");
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

/* ── ACOTAR EL RANGO ─────────────────────────────────────────────────────────
   `abrir --sitio casayourte` hace que la ronda hable con UNA base de sitio en
   vez de las cuatro. Lo pidió Mauro el 2026-09-22: «si yo quiero intervenir
   sobre un solo sitio tiene que haber un mapa que permita reducir el rango».

   QUÉ SE ACOTA Y QUÉ NO, y la diferencia importa:

   · SE ACOTA el ida y vuelta con las bases de los SITIOS. Es lo caro: cada una
     es un login más un listado.
   · NO SE ACOTA el panel. Los pendientes, las líneas, las reservas y los
     proyectos se traen siempre y enteros, porque son justamente lo que dice si
     OTRO chat está tocando algo — y un semáforo que sólo mira el repositorio
     propio no es un semáforo. Acotar eso sería ahorrar en lo único que no se
     puede ahorrar.

   El nombre que se pasa es el del proyecto en `PROYECTOS`, que es la misma
   lista de siempre: no hay un mapa nuevo que mantener. Uno que no existe se
   rechaza con la lista al lado, en vez de correr en silencio contra nada. */
/* QUIÉN SOY, y lo usan `abrir` y `reservar` igual. Está acá arriba porque si
   cada comando lo calculara a su manera pasaría lo peor: `abrir` leería MI
   propia reserva como si fuera de otro y me descartaría mis propios
   pendientes, que es exactamente el «un chat se bloquea a sí mismo» que el
   § 2.1 sexies ya nombra. */
function quienSoy(args) {
  const i = (args || []).indexOf("--chat");
  const nombre = process.env.CLAUDE_CHAT || (i >= 0 ? args[i + 1] : "") || "";
  return process.env.CLAUDE_SESSION || nombre || null;
}

function acotar(args) {
  const i = args.indexOf("--sitio");
  if (i < 0) return null;
  const s = args[i + 1];
  if (!s || !PROYECTOS[s] || s === "panel") {
    console.error(`\n✖ «${s || ""}» no es un sitio conocido.`
      + `\n  Son: ${CON_REPORTES.join(", ")}\n`);
    process.exit(1);
  }
  return s;
}

async function juntar(soloSitio) {
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
  const pend = await listarSuave(cfgPanel, sesionPanel, "pendientes", CAMPOS_PENDIENTE);
  const proy = await listarSuave(cfgPanel, sesionPanel, "proyectos", CAMPOS_PROYECTO);
  const lin = await listarSuave(cfgPanel, sesionPanel, "lineas", CAMPOS_LINEA);
  fuentes.push({ base: "panel", coleccion: "lineas", ok: lin.ok, motivo: lin.motivo,
                 cuantos: lin.docs.length });
  const res = await listarSuave(cfgPanel, sesionPanel, "reservas");
  /* Se cuentan las VIVAS y no las guardadas: una reserva vencida es ruido, y
     el renglón de FUENTES tiene que decir lo que importa. */
  fuentes.push({ base: "panel", coleccion: "reservas", ok: res.ok, motivo: res.motivo,
                 cuantos: res.ok ? res.docs.filter((r) => reservaViva(r)).length : 0 });
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
    /* El acote: las demás bases no se tocan. No se las pone en FUENTES como
       caídas —no fallaron, no se les preguntó—, y la ronda lo dice arriba para
       que nadie lea un listado corto como «no hay nada». */
    if (soloSitio && nombre !== soloSitio) continue;
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
    /* Si lo que guarda no son fallas, la ronda sólo la CUENTA para FUENTES:
       no cruza nada contra los pendientes. Bajarse el contenido entero para
       tirarlo era el segundo gasto más grande de la corrida — los viajes de
       hilux traen vectores de vibración. */
    const r = await listarSuave(cfg, e.sesion, "reportes",
                                guarda === "fallas" ? null : SOLO_NOMBRES);
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
    soloSitio: soloSitio || null,
    lineas: lin.ok ? lin.docs : [],
    reservas: res.ok ? res.docs : [],
    cambios: queCambio(),
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
  /* FALLAS Y PEDIDOS SE SEPARAN, y no es cosmético — 21-sep-2026.
     Desde `nucleo-20` de CasaYourte la misma hoja escribe dos cosas en
     `reportes/`: una FALLA («esto está roto») y un PEDIDO («quiero que esto
     cambie»). Van a la misma colección a propósito, para que esta corrida los
     traiga juntos, pero mezclados en una sola lista se leen mal: un pedido
     listado bajo «fallas» se atiende como una urgencia que no es, y una falla
     perdida entre pedidos espera su turno cuando no debería.

     Un reporte sin `tipo` es de antes de ese cambio, y entonces sólo había
     fallas: la ausencia se lee como 'falla' y no como «desconocido». */
  const fallas = nuevos.filter((r) => !esPedido(r));
  const pedidos = nuevos.filter(esPedido);

  const abiertos = ordenarAbiertos(d.pendientes);
  const idsAbiertos = new Set(abiertos.map((p) => p.id));
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
  L.push(`  ${ti.length} tocados · ${sr.length} sin responder · ${fallas.length} fallas nuevas · ${pedidos.length} pedidos · ` +
         `${reglas.length} con las reglas sin publicar`);
  L.push(`  (${cerrados + retirados} cerrados y fuera de la cuenta: ` +
         `${cerrados} hechos, ${retirados} retirados)`);
  /* QUE SE VEA QUE ESTÁ ACOTADA. Un listado corto sin este renglón se lee como
     «no hay nada pendiente», que es la conclusión opuesta a la verdadera. */
  if (d.soloSitio) {
    L.push(`  ⌖ ACOTADA A «${d.soloSitio}» — las otras bases NO se consultaron.`);
    L.push(`    El panel sí se trajo entero: si otro chat está tocando algo, se ve igual.`);
    L.push(`    Sin el acote: node herramientas/ronda.mjs abrir`);
  }
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

  /* EL SEMÁFORO va pegado a las líneas y no en una sección numerada, porque no
     es trabajo: es la condición para empezar. Una línea dice por qué; una
     reserva dice qué repositorio está ocupado y hasta cuándo. */
  const vivasR = (d.reservas || []).filter((r) => reservaViva(r));
  L.push(`\n  SEMÁFORO — qué repositorio está tocando alguien ahora mismo`);
  if (!vivasR.length) {
    L.push(`      (ninguno · todos libres)`);
  } else {
    for (const r of vivasR.slice().sort((a, b) => String(a.repo).localeCompare(String(b.repo)))) {
      L.push(`      ${r.repo}${r.rutas && r.rutas.length ? "  [" + r.rutas.join(", ") + "]" : ""}`);
      const quien = r.chat || r.quien || "?";
      L.push(`          lo tiene : ${quien}${r.sesion && r.sesion !== quien ? " (" + r.sesion + ")" : ""}`);
      L.push(`          quedan   : ${minutosQueQuedan(r)} min${r.linea ? "  ·  línea " + r.linea : ""}`);
    }
  }
  L.push(`\n      Antes de editar un repositorio: reservalo.`);
  L.push(`          node herramientas/ronda.mjs reservar <repo> [rutas...]`);
  L.push(`      Si figura arriba con otro chat, NO lo toques — decíselo a Mauro.`);
  L.push(`      Vence solo a los ${MINUTOS_RESERVA} min, así que un chat que muere no traba a nadie;`);
  L.push(`      volver a reservar lo renueva. Al cerrar: soltar <repo>.`);

  /* QUÉ CAMBIÓ: para no releer lo que otro ya hizo. Sale de git, no de que
     alguien se haya acordado de anotarlo. */
  const cambios = d.cambios || [];
  L.push(`\n  QUÉ CAMBIÓ — commits de los últimos ${DIAS_CAMBIOS} días, para no releer de cero`);
  if (!cambios.length) {
    L.push(`      (nada, o no se pudo mirar el git desde acá)`);
  } else {
    for (const r of cambios) {
      L.push(`      ${r.repo} · ${r.commits.length} commit${r.commits.length === 1 ? "" : "s"}`);
      for (const c of r.commits.slice(0, 6)) L.push(`          ${c.sha}  ${corto(c.titulo, 78)}`);
      if (r.commits.length > 6) L.push(`          … y ${r.commits.length - 6} más`);
    }
    /* Un archivo que aparece en varios commits es donde dos trabajos se
       cruzaron. Es lo primero que hay que mirar antes de editarlo. */
    const calientes = [...archivosTocados(cambios)]
      .filter(([, t]) => t.length > 1)
      .sort((a, b) => b[1].length - a[1].length).slice(0, 8);
    if (calientes.length) {
      L.push(`\n      CALIENTES — tocados por más de un commit. Mirá esto antes de editarlos:`);
      for (const [a, t] of calientes) L.push(`          ${t.length}×  ${a}`);
    }
  }

  /* QUÉ TOCAR AHORA va acá: sin número, con el semáforo y las líneas, porque
     es de la misma familia —la condición para empezar, no el trabajo— y porque
     numerarlo correría las cinco secciones que el § 8 cita por número.

     Y va ANTES de las listas y no después, aunque sea la conclusión: quien lee
     esto de arriba abajo tiene el candidato antes de recorrer cien pendientes,
     y ése es el recurso que se ahorra. */
  const cruce = queTocarAhora(abiertos, {
    abiertosIds: idsAbiertos,
    repoDe: repoDeCadaProyecto(d.proyectos),
    reservas: d.reservas || [],
    sesion: d.yo || null,
  });
  L.push(`\n  QUÉ TOCAR AHORA — el semáforo cruzado con los pendientes míos (§ 2.1 octies)`);
  if (!d.yo) {
    L.push(`      ⚠ no sé quién sos, así que tu propia reserva cuenta como ajena.`);
    L.push(`        Pasá  --chat "de qué trata"  igual que en reservar.`);
  }
  if (!cruce.elegibles.length) {
    /* NUNCA UNA LISTA VACÍA A SECAS. Es la tercera vez que este ecosistema
       aprende lo mismo: un contador sin la razón al lado no diagnostica nada,
       y «no hay nada que hacer» y «hay cuatro cosas y las cuatro están
       frenadas» son estados opuestos que se ven idénticos. */
    const mios = cruce.descartados.filter((x) => x.codigo !== "de-mauro");
    L.push(mios.length
      ? `      NINGUNO se puede empezar ahora, y ${mios.length === 1 ? "el motivo es" : "los motivos son"}:`
      : `      Ninguno: los ${cruce.descartados.length} abiertos son de Mauro.`);
    for (const x of mios) L.push(`          ${x.p.id}  ·  ${x.texto}`);
    if (mios.length) {
      L.push(`\n      NO INVENTES trabajo para llenar la corrida. Decílo y cerrá:`);
      L.push(`      eso es una ronda que hizo lo suyo, no una ronda vacía.`);
    }
  } else {
    const [uno, ...otros] = cruce.elegibles;
    L.push(`      → ${uno.p.id}  [${uno.p.prioridad || "sin prioridad"}]  ${corto(uno.p.titulo, 60)}`);
    L.push(`            repo     : ${uno.carpeta || "sin declarar"}` +
           `${uno.yaReservado ? "  (ya reservado por vos)" : ""}`);
    L.push(`            destraba : ${uno.destraba}`);
    if (uno.p.linea) L.push(`            línea    : ${uno.p.linea}`);
    if (uno.aviso) L.push(`            ⚠ ${uno.aviso}`);
    for (const o of otros.slice(0, 3))
      L.push(`        ${o.p.id}  [${o.p.prioridad || "—"}]  destraba ${o.destraba}  ·  ${corto(o.p.titulo, 44)}`);
    if (otros.length > 3) L.push(`        … y ${otros.length - 3} más`);
    const mios = cruce.descartados.filter((x) => x.codigo !== "de-mauro");
    if (mios.length) {
      L.push(`\n      Míos pero descartados, con el motivo:`);
      for (const x of mios) L.push(`          ${x.p.id}  ·  ${x.texto}`);
    }
    const suyos = cruce.descartados.length - mios.length;
    if (suyos) L.push(`      (${suyos} son de Mauro y están abajo, en el 4)`);
  }
  L.push(`\n      El orden es: TU prioridad, después cuánto destraba, después si el`);
  L.push(`      repositorio ya está reservado por este chat. Lo calcula la ronda y`);
  L.push(`      no el chat, para que dos sesiones distintas elijan lo mismo.`);
  L.push(`      Lo que SÍ le toca al que lee: comprobar que el pendiente TODAVÍA`);
  L.push(`      sea cierto antes de trabajarlo. Esto ordena; no verifica.`);

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

  const renglones = (r, primera) => {
    // Una falla tiene `gravedad` y un pedido tiene `urgencia`: son campos
    // distintos porque son cosas distintas. Se muestra el que traiga.
    const marca = r.gravedad || r.urgencia || "sin marca";
    L.push(`      ${r._proy}:reportes/${r.id}  [${marca}]  ${r.pagina || "?"}`);
    L.push(`          ${primera} : ${corto(r.texto, 140)}`);
    if (r.esperaba) L.push(`          ${esPedido(r) ? "para qué" : "esperaba"} : ${corto(r.esperaba, 140)}`);
    /* Desde `nucleo-21` un reporte puede traer una imagen: una captura de la
       falla, o una referencia de lo que se está pidiendo. Se imprime el
       identificador de Cloudinary y no una URL armada acá, porque el nombre de
       la cuenta es de cada proyecto y esta función no lo conoce — inventarle un
       cuarto lugar donde vive ese dato es justo lo que este repo evita. */
    if (r.imagen) L.push(`          imagen   : ${r.imagen}`);
    L.push(`          origen   : ${origenDe(r._proy, r.id)}`);
  };

  L.push(`\n  3 · REPORTES NUEVOS — fallas de un sitio sin pendiente que las traiga`);
  if (!fallas.length) L.push(`      (ninguna)`);
  for (const r of fallas) renglones(r, "qué pasó");

  L.push(`\n  3 bis · PEDIDOS NUEVOS — cambios que pidió alguien del equipo`);
  if (!pedidos.length) L.push(`      (ninguno)`);
  for (const r of pedidos) renglones(r, "qué pide");

  L.push(`\n  4 · ABIERTOS — por proyecto, por prioridad, las trabas al final`);
  for (const g of porProyecto(abiertos, d.proyectos)) {
    L.push(`      ── ${g.proyecto}`);
    for (const p of ordenarAbiertos(g.items)) {
      /* SÓLO LAS TRABAS VIVAS. Una `esperaA` que apunta a algo ya hecho
         no traba nada (§ 9: «la traba desaparece sola», es un derivado), y
         hasta el 2026-09-22 acá salía igual: ese día `casayourte:T2` figuraba
         esperando a `casayourte:T1`, que estaba hecho hacía días. Un pendiente
         que ya se podía empezar, apagado en la pantalla. */
      const vivasT = trabasVivas(p, idsAbiertos);
      const traba = vivasT.length ? `  ⟵ espera ${vivasT.join(", ")}` : "";
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
    const d = await juntar(acotar(args));
    /* QUIÉN SOY entra en `d` y no en `imprimir`, para que salga también con
       `--json`: sin esto, mi propia reserva me descartaría mis pendientes. */
    d.yo = quienSoy(args);
    if (d.fatal) {
      console.error(`\n✖ ${d.fatal}\n`);
      process.exit(1);
    }
    console.log(args.includes("--json") ? JSON.stringify(d, null, 2) : imprimir(d));

  } else if (cmd === "reservar" || cmd === "soltar") {
    /* EL IDENTIFICADOR ES EL REPOSITORIO, y eso es lo que hace de esto un
       semáforo y no una lista de deseos: dos chats que reservan el mismo repo
       escriben el MISMO documento, así que el segundo ve al primero. Si cada
       reserva tuviera un id propio, habría dos y ninguna tendría razón.

       No es un candado atómico —Firestore podría darlo con una transacción—
       y no hace falta: acá el riesgo no es que dos chats reserven en el mismo
       milisegundo, es que uno no mire. Lo que resuelve eso es que la ronda lo
       ponga arriba, no una primitiva más fuerte. */
    const repo = args[0];
    if (!repo) { console.error("\n✖ falta el repositorio. Ej: reservar datos --chat \"de qué trata\"\n"); process.exit(1); }

    /* QUIÉN SOS, y es obligatorio. Sin identidad pasan las dos cosas que
       vacían el semáforo: no se puede RENOVAR —el chat se bloquea a sí mismo a
       los 90 minutos— y la pantalla dice «chat sin nombre», así que Mauro no
       sabe a quién preguntarle. Las dos rompen justo lo que esto existe para
       dar. El entorno no define `CLAUDE_SESSION` en esta plataforma
       —comprobado—, así que se pide a mano y se usa para las dos cosas. */
    const iChat = args.indexOf("--chat");
    const nombre = process.env.CLAUDE_CHAT
      || (iChat >= 0 ? args[iChat + 1] : "")
      || "";
    const mias = process.env.CLAUDE_SESSION || nombre;
    if (cmd === "reservar" && !mias) {
      console.error(`\n✖ falta decir quién sos, y no es trámite.`
        + `\n  Sin nombre no se puede renovar —te bloqueás a vos mismo a los ${MINUTOS_RESERVA} min—`
        + `\n  y el semáforo no le dice a Mauro a quién preguntarle.`
        + `\n\n  node herramientas/ronda.mjs reservar ${repo} --chat "de qué trata este chat"\n`);
      process.exit(1);
    }
    const rutas = (iChat >= 0 ? args.slice(1, iChat) : args.slice(1));
    const cfg = PROYECTOS.panel;
    const sesion = await entrar(cfg);

    if (cmd === "soltar") {
      await borrar(cfg, sesion, "reservas", repo);
      console.log(`\n  soltado ${repo}. Queda libre para el que venga.\n`);
    } else {
      /* Antes de pisar, mirar: si la tiene otro y sigue viva, no se reserva.
         Volver a reservar lo propio es RENOVAR, y por eso no choca consigo.

         CON `listarSuave`, que es el que decodifica un DOCUMENTO. El primer
         intento usó `listar` + `deFirestore` y `deFirestore` decodifica un
         VALOR, no un documento: devolvía `null` para cada reserva, `ajenas`
         quedaba siempre vacía y el semáforo NUNCA bloqueaba. Un farol clavado
         en verde, que es peor que no tenerlo — porque se confía. */
      const leidas = await listarSuave(cfg, sesion, "reservas");
      /* Y si no se pueden leer, NO se reserva. Reservar a ciegas es decirle al
         que viene que el repo es suyo sin haber mirado si ya lo era de otro:
         justo el choque que esto existe para evitar. */
      if (!leidas.ok) {
        console.error(`\n✖ no se pudieron leer las reservas: ${leidas.motivo}`
          + `\n  NO se reservó nada. Sin poder mirar, reservar es peor que no hacerlo.\n`);
        process.exit(1);
      }
      const ajenas = reservasDe(leidas.docs, repo, mias);
      if (ajenas.length) {
        const o = ajenas[0];
        console.error(`\n✖ «${repo}» lo está tocando ${o.chat || o.quien || "otro chat"}`
          + `${o.sesion && o.sesion !== (o.chat || o.quien) ? " (" + o.sesion + ")" : ""}`
          + `, y le quedan ${minutosQueQuedan(o)} min.`
          + `\n  NO lo toques. Decíselo a Mauro con el nombre del repositorio y de quién lo tiene.`
          + `\n  Si ese chat ya terminó, se libera solo al vencer.\n`);
        process.exit(1);
      }
      const ahora = Date.now();
      await escribir(cfg, sesion, "reservas", repo, {
        repo,
        rutas,
        chat: nombre || mias,
        sesion: mias,
        desde: new Date(ahora).toISOString(),
        vence: new Date(ahora + MINUTOS_RESERVA * 60000).toISOString()
      });
      console.log(`\n  reservado ${repo}${rutas.length ? "  [" + rutas.join(", ") + "]" : ""}`
        + ` por ${MINUTOS_RESERVA} min.`
        + `\n  Volvé a correr esto para renovar. Al terminar: soltar ${repo}.\n`);
    }

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
  node herramientas/ronda.mjs abrir [--json] [--sitio <id>] [--chat "quién sos"]
      Junta el panel y los reportes de los sitios, los cruza y los ordena
      como pide el § 8 del PROTOCOLO-GENERAL. No escribe nada.

      Con --sitio habla con UNA base de sitio en vez de las cuatro, para
      cuando se va a intervenir sobre uno solo. El panel se trae SIEMPRE
      entero: es lo que dice si otro chat está tocando algo.

  node herramientas/ronda.mjs claves <proyecto>
      Las letras de clave en uso en ese proyecto y la próxima libre de cada
      una, para escribir un pendiente nuevo sin pisar otro.

  node herramientas/ronda.mjs reservar <repo> [rutas...] --chat "quién sos"
      EL SEMÁFORO. Dice que estás tocando ese repositorio, por ${MINUTOS_RESERVA}
      minutos. Falla si lo tiene otro chat vivo. Volver a correrlo RENUEVA.

  node herramientas/ronda.mjs soltar <repo>
      Lo libera. Si no se hace, vence solo — un chat que muere no traba a nadie.

  Lo que se hace con esto: RUTINA-AUTOMATICA.md
`);
  }
}
