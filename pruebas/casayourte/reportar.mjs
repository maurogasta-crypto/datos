/* ─────────────────────────────────────────────────────────────────────────────
   Banco del circuito «Reportar una falla» de CasaYourte (2026-09-15).

   Sin dependencias y sin red, como todo lo de esta carpeta: lee los archivos
   REALES de los tres repositorios y comprueba que digan lo mismo.

   POR QUÉ ESTE BANCO Y NO UNO DE INTERFAZ. Lo que se rompe acá no se ve: si el
   formulario manda un campo que la regla no espera —o deja de mandar uno que
   exige—, Firestore rechaza el reporte, la persona ve «no se pudo enviar» y
   nadie se entera de que el circuito está cortado. Un reporte que no llega es
   indistinguible de nadie que reporte. Por eso lo que se prueba es la
   COINCIDENCIA entre el código que escribe y la regla que admite.

   Es el mismo criterio que el banco de `esc.mjs`: no comprueba que una función
   haga lo que hace, comprueba que dos lugares que tienen que decir lo mismo lo
   digan.
   ───────────────────────────────────────────────────────────────────────────── */
import fs from "node:fs";

const REPOS = process.env.REPOS || new URL("../../../", import.meta.url).pathname;
const RAIZ  = new URL("../../", import.meta.url).pathname;

const nucleo  = fs.readFileSync(REPOS + "CasaYourte/nucleo.js", "utf8");
const reglas  = fs.readFileSync(REPOS + "CasaYourte/REGLAS.txt", "utf8");
const readme  = fs.readFileSync(REPOS + "CasaYourte/README.md", "utf8");
const sw      = fs.readFileSync(REPOS + "CasaYourte/sw.js", "utf8");
const herram  = fs.readFileSync(RAIZ + "herramientas/firestore.mjs", "utf8");

let fallos = 0;
const ok = (c, q) => { console.log((c ? "  ok   " : "  FALLA") + "  " + q); if (!c) fallos++; };

/* El bloque `reportes/{id}` de las reglas, para mirarlo aparte. */
const bloqueReportes = (() => {
  const cabecera = "match /reportes/{id}";
  const i = reglas.indexOf(cabecera);
  if (i < 0) return "";
  /* Se empieza a contar DESPUÉS de la cabecera: las llaves de `{id}` abren y
     cierran, así que contando desde el principio el bloque terminaba ahí
     mismo y quedaba vacío — el banco decía que faltaban cinco cosas que
     estaban escritas. Lo encontró él solo la primera vez que corrió. */
  let j = i + cabecera.length, prof = 0, visto = false;
  for (; j < reglas.length; j++) {
    if (reglas[j] === "{") { prof++; visto = true; }
    else if (reglas[j] === "}") { prof--; if (visto && prof === 0) { j++; break; } }
  }
  return reglas.slice(i, j);
})();

/* El objeto que el núcleo manda a `addDoc`, tal como está escrito. */
const loQueEscribe = (() => {
  const i = nucleo.indexOf("fb.collection(fb.db, 'reportes')");
  if (i < 0) return "";
  const j = nucleo.indexOf("});", i);
  return j < 0 ? "" : nucleo.slice(i, j);
})();

console.log("\n1 · el circuito existe de los dos lados");
ok(!!bloqueReportes, "las reglas declaran `reportes/{id}` — sin bloque, rige el deny por defecto");
ok(!!loQueEscribe, "y el núcleo escribe en `reportes` de ESTA base, no en el panel de Mauro");
ok(/CY\.reportar\s*=/.test(nucleo), "`CY.reportar` vive en el núcleo, no copiada en cada página");

console.log("\n2 · la regla y el código coinciden, que es lo que se rompe en silencio");
/* La regla exige que el reporte nazca con `estado: 'nuevo'`. Si el código
   mandara otra cosa —o nada—, Firestore lo rechaza y la persona ve un error
   que no dice por qué. */
ok(/request\.resource\.data\.estado\s*==\s*'nuevo'/.test(bloqueReportes),
   "la regla exige que nazca con estado 'nuevo'");
ok(/estado:\s*'nuevo'/.test(loQueEscribe), "y el código lo manda con ese valor exacto");

/* Y que el `uid` sea el de quien escribe. Un reporte que puede mentir de quién
   vino no sirve para volver a preguntarle qué vio. */
ok(/request\.resource\.data\.uid\s*==\s*request\.auth\.uid/.test(bloqueReportes),
   "la regla exige que el `uid` sea el de quien escribe");
ok(/uid:\s*u\.uid/.test(loQueEscribe), "y el código manda el uid de la sesión, no uno escrito a mano");

console.log("\n3 · quién puede escribir, y quién leer");
ok(/allow create:\s*if activo\(\)/.test(bloqueReportes),
   "escribe cualquiera con sesión activa: pedir un permiso para contar una falla es garantizar que no se cuente");
ok(/allow get, list:\s*if admin\(\)/.test(bloqueReportes),
   "leerlos es de admin: un reporte se escribe sin pensar en quién lo va a leer");
ok(/request\.resource\.data\.texto\s*==\s*resource\.data\.texto/.test(bloqueReportes),
   "y el texto no se puede reescribir: pisar lo que dijo una persona es perder el reporte");

console.log("\n4 · el agente lo lee, y no lo escribe");
const comodin = /allow read: if esAgente\(\) && !\(coleccion in \[([^\]]*)\]\)/.exec(reglas);
ok(!!comodin, "el bloque del agente sigue siendo un comodín con exclusiones");
ok(comodin && !/reportes/.test(comodin[1]),
   "`reportes` NO está excluida: si lo estuviera, el circuito no llegaría nunca al panel");
ok(!/allow write[^\n]*esAgente|esAgente\(\)[^\n]*write/.test(reglas),
   "y el agente no escribe en esta base por ningún lado");

/* Las dos listas que tienen que decir lo mismo: `selladas` de la herramienta y
   las exclusiones de la regla. El archivo da el mensaje claro, la regla da la
   garantía; si se separan, una de las dos miente. */
const bloqueCY = herram.slice(herram.indexOf("casayourte: {"), herram.indexOf("casaverde: {"));
const selladas = /selladas:\s*\[([^\]]*)\]/.exec(bloqueCY);
ok(!!selladas && !/reportes/.test(selladas[1]),
   "y `reportes` tampoco está sellada en `selladas` de firestore.mjs — las dos listas coinciden");
ok(/colecciones:[\s\S]{0,200}?"reportes"/.test(bloqueCY),
   "la colección está declarada en `colecciones`, así que el respaldo la baja");

console.log("\n5 · lo que sube con el cambio");
/* `nucleo.js` está en el SHELL del service worker: si cambia y la VERSION no
   sube, los teléfonos sirven una mezcla de viejo y nuevo — el peor de los dos
   mundos, porque parece que el despliegue no hizo nada. */
ok(/SHELL[\s\S]*?nucleo\.js[\s\S]*?\]/.test(sw), "`nucleo.js` está en el SHELL del service worker");
const sello = /CY\.VERSION = '([^']+)'/.exec(nucleo);
ok(!!sello && readme.includes("`" + sello[1] + "`"),
   "y el sello del archivo coincide con la tabla del README: manda el archivo, la tabla es derivada");
const ver = /const VERSION = '([^']+)'/.exec(sw);
ok(!!ver && readme.includes("`" + ver[1] + "`"), "ídem la VERSION del sw.js");

console.log("\n6 · la entrada está en un solo lugar");
ok(/id="cy-reportar"/.test(nucleo) && /CY\.renderNav = function/.test(nucleo),
   "la entrada la dibuja `CY.renderNav`, que es la única función que dibuja la navegación");
ok((nucleo.match(/id="cy-reportar"/g) || []).length === 1,
   "y una sola vez: dos entradas al mismo sitio se desincronizan");
ok(/getElementById\('cy-reportar'\)[\s\S]{0,200}CY\.reportar\(\)/.test(nucleo),
   "y el botón llama a `CY.reportar`");

console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nTodo en orden.\n");
process.exit(fallos ? 1 : 0);
