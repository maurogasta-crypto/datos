/* ─────────────────────────────────────────────────────────────────────────────
   Banco del circuito «Reportar una falla», en los TRES sitios que lo tienen.

     node pruebas/reportes.mjs

   Sin dependencias y sin red: lee los archivos reales de los repositorios
   vecinos y comprueba que digan lo mismo.

   POR QUÉ ESTE BANCO Y NO UNO DE INTERFAZ. Lo que se rompe acá no se ve: si el
   formulario manda un campo que la regla no espera —o deja de mandar uno que
   exige—, Firestore rechaza el reporte, la persona ve «no se pudo enviar» y
   nadie se entera de que el circuito está cortado. **Un reporte que no llega es
   indistinguible de nadie que reporte.** Por eso lo que se prueba es la
   COINCIDENCIA entre el código que escribe y la regla que admite.

   POR QUÉ UNO SOLO Y NO UNO POR SITIO. Nació el 15-sep como
   `pruebas/casayourte/reportar.mjs`, el día que el circuito existía en un solo
   lugar. Con el segundo sitio, mantenerlo así era garantizar que los dos
   bancos se separaran — el error que este ecosistema ya cometió cuatro veces
   con los sellos. Ahora es UNA tabla: agregar un sitio es agregarle una fila,
   y el que se olvide de la regla o del sello lo dice acá.
   ───────────────────────────────────────────────────────────────────────────── */
import fs from "node:fs";

const REPOS = process.env.REPOS || new URL("../../", import.meta.url).pathname;
const RAIZ  = new URL("../", import.meta.url).pathname;

/* Un sitio por fila. Lo único que cambia entre ellos es dónde viven los
   archivos y cómo se llaman las cosas: el núcleo (`CY.` o `CV2.`), el ayudante
   de las reglas que exige sesión de verdad, y el sello del service worker. */
const SITIOS = [
  /* `enShell` NO es un detalle: dice si ese sitio guarda su núcleo en el
     service worker. Los dos que lo guardan tienen que subir la VERSION al
     tocarlo, o los teléfonos sirven una mezcla de viejo y nuevo. remate no:
     su service worker cachea por demanda con un `CACHE_NAME` y sin lista. */
  { id: "remate", repo: "remate",
    nucleo: "interno/utils.js", reglas: "firestore.rules",
    sw: "interno/sw.js", enShell: false,
    escribe: 'collection(db, "reportes")', quienEscribe: "activo()", quienLee: "esAdmin()" },
  { id: "casayourte", repo: "CasaYourte",
    nucleo: "nucleo.js", reglas: "REGLAS.txt",
    sw: "sw.js", enShell: true,
    escribe: "fb.collection(fb.db, 'reportes')", quienEscribe: "activo()", quienLee: "admin()" },
  { id: "casaverde", repo: "casaverdecanas",
    nucleo: "interno/nucleo.js", reglas: "interno/firestore.rules",
    sw: "interno/sw.js", enShell: true,
    escribe: "collection(db, 'reportes')", quienEscribe: "activo()", quienLee: "esAdmin()" }
];

const herram = fs.readFileSync(RAIZ + "herramientas/firestore.mjs", "utf8");

let fallos = 0;
const ok = (c, q) => { console.log((c ? "  ok   " : "  FALLA") + "  " + q); if (!c) fallos++; };

/* El bloque `reportes/{id}` de un archivo de reglas.
   Se empieza a contar DESPUÉS de la cabecera: las llaves de `{id}` abren y
   cierran, así que contando desde el principio el bloque salía vacío y el banco
   acusaba de fallas a cosas bien escritas. Lo encontró él solo la primera vez
   que corrió, y queda anotado porque ése es el modo de fallar más caro de un
   banco: decir que algo está mal cuando está bien enseña a no creerle. */
function bloqueReportes(reglas) {
  const cabecera = "match /reportes/{id}";
  const i = reglas.indexOf(cabecera);
  if (i < 0) return "";
  let j = i + cabecera.length, prof = 0, visto = false;
  for (; j < reglas.length; j++) {
    if (reglas[j] === "{") { prof++; visto = true; }
    else if (reglas[j] === "}") { prof--; if (visto && prof === 0) { j++; break; } }
  }
  return reglas.slice(i, j);
}

/* El objeto que el núcleo le manda a `addDoc`, tal como está escrito. */
function loQueEscribe(nucleo, marca) {
  const i = nucleo.indexOf(marca);
  if (i < 0) return "";
  const j = nucleo.indexOf("});", i);
  return j < 0 ? "" : nucleo.slice(i, j);
}

for (const s of SITIOS) {
  console.log("\n══ " + s.id);
  const base = REPOS + s.repo + "/";
  let nucleo, reglas, sw;
  try {
    nucleo = fs.readFileSync(base + s.nucleo, "utf8");
    reglas = fs.readFileSync(base + s.reglas, "utf8");
    sw     = fs.readFileSync(base + s.sw, "utf8");
  } catch (e) {
    ok(false, "se pueden leer los archivos de " + s.repo + " — " + e.message);
    continue;
  }

  const bloque = bloqueReportes(reglas);
  const escribe = loQueEscribe(nucleo, s.escribe);

  ok(!!bloque, "las reglas declaran `reportes/{id}` — sin bloque rige el deny por defecto");
  ok(!!escribe, "y el núcleo escribe en `reportes` de ESTA base, no en el panel de Mauro");

  /* Las dos que rechazan el reporte en silencio si no coinciden. */
  ok(/request\.resource\.data\.estado\s*==\s*'nuevo'/.test(bloque)
     /* Las comillas cambian entre proyectos —remate escribe con dobles, los
        otros dos con simples— y eso no es una diferencia que importe. Lo que
        importa es el VALOR. La primera corrida acusó a remate por esto, y era
        el banco el que estaba mal. */
     && /estado:\s*['"]nuevo['"]/.test(escribe),
     "la regla exige `estado: 'nuevo'` y el código lo manda con ese valor exacto");
  ok(/request\.resource\.data\.uid\s*==\s*request\.auth\.uid/.test(bloque)
     && /uid:\s*(u\.uid|_usuario\.uid)/.test(escribe),
     "la regla exige el `uid` de quien escribe y el código manda el de la sesión");

  /* Quién puede. `activo()` en los tres significa «tiene ficha y está activo»
     —no basta con estar logueado—, y en Casa Verde eso es lo que deja afuera a
     las sesiones anónimas del muro de recuerdos. */
  ok(new RegExp("allow create:\\s*if " + s.quienEscribe.replace("(", "\\(").replace(")", "\\)"))
       .test(bloque),
     "escribe quien tiene ficha activa: pedir un permiso para contar una falla es garantizar que no se cuente");
  ok(new RegExp("allow get, list:\\s*if " + s.quienLee.replace("(", "\\(").replace(")", "\\)"))
       .test(bloque),
     "leerlos es de admin: un reporte se escribe sin pensar en quién lo va a leer");
  ok(/request\.resource\.data\.texto\s*==\s*resource\.data\.texto/.test(bloque),
     "y el texto no se puede reescribir: pisar lo que dijo una persona es perder el reporte");

  /* El agente: lo lee por el comodín, y `reportes` no puede estar excluida. */
  const comodin = /allow read: if esAgente\(\) && !\(coleccion in \[([\s\S]*?)\]\)/.exec(reglas);
  ok(!!comodin, "el bloque del agente sigue siendo un comodín con exclusiones");
  ok(comodin && !/reportes/.test(comodin[1]),
     "`reportes` NO está excluida: si lo estuviera, el circuito no llegaría nunca al panel");

  /* Las dos listas que tienen que decir lo mismo: la exclusión de la regla y
     `selladas` de la herramienta. El archivo da el mensaje claro, la regla da
     la garantía; si se separan, una de las dos miente. */
  const i = herram.indexOf(s.id + ": {");
  const bloqueTool = i < 0 ? "" : herram.slice(i, herram.indexOf("\n  },", i));
  const selladas = /selladas:\s*\[([\s\S]*?)\]/.exec(bloqueTool);
  ok(!!selladas && !/reportes/.test(selladas[1]),
     "y tampoco está sellada en `selladas` de firestore.mjs — las dos listas coinciden");
  ok(/colecciones:[\s\S]{0,400}?"reportes"/.test(bloqueTool),
     "la colección está declarada en `colecciones`, así que el respaldo la baja");

  /* El núcleo está en el SHELL del service worker: si cambia y la VERSION no
     sube, los teléfonos sirven una mezcla de viejo y nuevo — el peor de los dos
     mundos, porque parece que el despliegue no hizo nada. */
  const nombreNucleo = s.nucleo.split("/").pop();
  if (s.enShell) {
    ok(new RegExp("SHELL[\\s\\S]*?" + nombreNucleo.replace(".", "\\.") + "[\\s\\S]*?\\]").test(sw),
       "`" + nombreNucleo + "` está en el SHELL del service worker, así que tocarlo obliga a subir la VERSION");
  } else {
    ok(!/SHELL/.test(sw),
       "su service worker no guarda una lista: cachea por demanda, así que el núcleo no queda pegado a una VERSION");
  }
}

console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nTodo en orden: los tres sitios dicen lo mismo.\n");
process.exit(fallos ? 1 : 0);
