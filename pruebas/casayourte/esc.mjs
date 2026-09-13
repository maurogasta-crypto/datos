/* Comprueba que las funciones de escape de los cuatro proyectos hagan LO MISMO.
   Dos funciones que se llaman igual y escapan distinto son una trampa: el
   código se copia de un proyecto al otro y el agujero viaja con él. */
import fs from "node:fs";

/* Los cuatro repositorios, clonados uno al lado del otro. Este banco vive en
   `pruebas/casayourte/` del repo del panel desde el 2026-09-13, así que la
   carpeta que los contiene a todos sale de dónde está ESTE archivo: tres
   niveles arriba. Antes eran cuatro rutas absolutas escritas a mano, y la del
   panel ya apuntaba a `/home/user/panel/`, que hace días no existe.
   `REPOS` se puede forzar para correrlo contra otro juego de clones. */
const REPOS = process.env.REPOS || new URL("../../../", import.meta.url).pathname;

const PROY = [
  ["Casa Verde",  REPOS + "casaverdecanas/interno/nucleo.js", "CV2.esc ="],
  ["CasaYourte",  REPOS + "CasaYourte/nucleo.js",             "CY.esc ="],
  ["remate",      REPOS + "remate/interno/utils.js",          "function escapar"],
  ["el panel",    REPOS + "datos/nucleo.js",                  "P.esc ="]
];

const PELIGROSOS = [["&","&amp;"], ["<","&lt;"], [">","&gt;"], ['"',"&quot;"], ["'","&#39;"]];
let fallos = 0;
const ok = (c, q) => { console.log((c ? "  ok   " : "  FALLA") + "  " + q); if (!c) fallos++; };

for (const [nombre, ruta, marca] of PROY) {
  const src = fs.readFileSync(ruta, "utf8");
  /* Se recorta por RENGLONES desde el que declara la función hasta el que
     cierra la cadena de .replace. Buscar el próximo «;» por posición encuentra
     el de cualquier otra línea del archivo que también escape algo. */
  const lineas = src.split("\n");
  const desde = lineas.findIndex((l) => l.includes(marca));
  /* Dos formas distintas y hay que respetarlas: una flecha termina en el
     primer «;»; una `function` termina cuando se cierran sus llaves, y su
     cuerpo tiene renglones que también terminan en «;». */
  let hasta = desde;
  if (marca.startsWith("function")) {
    let prof = 0, visto = false;
    for (; hasta < lineas.length; hasta++) {
      for (const c of lineas[hasta]) {
        if (c === "{") { prof++; visto = true; }
        else if (c === "}") prof--;
      }
      if (visto && prof === 0) break;
    }
  } else {
    while (hasta < lineas.length && !/;\s*$/.test(lineas[hasta])) hasta++;
  }
  let cuerpo = lineas.slice(desde, hasta + 1).join("\n");
  let fn;
  if (marca.startsWith("function")) {
    fn = new Function(cuerpo.replace(/^export\s+/, "") + "\nreturn escapar;")();
  } else {
    const obj = {};
    new Function(marca.split(".")[0].trim(), cuerpo)(obj);
    fn = obj.esc;
  }
  console.log("\n" + nombre + " · " + marca);
  for (const [ch, esperado] of PELIGROSOS)
    ok(fn(ch) === esperado, JSON.stringify(ch) + " → " + fn(ch) + (fn(ch) === esperado ? "" : "  (esperaba " + esperado + ")"));
  const real = "Cañada d'Oro <b>x</b> & \"y\"";
  const salida = fn(real);
  const limpio = salida.replace(/&(amp|lt|gt|quot|#39);/g, "");
  ok(!/[<>"'&]/.test(limpio), "no queda nada peligroso en «" + real + "»");
}
console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nLos cuatro escapan igual.\n");
process.exit(fallos ? 1 : 0);
