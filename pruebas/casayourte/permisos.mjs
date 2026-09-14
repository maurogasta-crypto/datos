/* Corre las funciones REALES de CasaYourte, extraídas del archivo tal cual
   está. No se copian acá: si el archivo cambia, esto cambia con él. */
import fs from "node:fs";
/* Ver la nota de `esc.mjs`: la carpeta de los clones sale de dónde está este
   archivo, no de una ruta absoluta escrita a mano. */
const REPOS = process.env.REPOS || new URL("../../../", import.meta.url).pathname;
const src = fs.readFileSync(REPOS + "CasaYourte/nucleo.js", "utf8");

const trozo = (nombre) => {
  const i = src.indexOf("CY." + nombre + " =");
  if (i < 0) throw new Error("no encontré CY." + nombre);
  let j = i, prof = 0, visto = false;
  for (; j < src.length; j++) {
    if (src[j] === "{") { prof++; visto = true; }
    else if (src[j] === "}") { prof--; if (visto && prof === 0) { j++; break; } }
  }
  while (src[j] === ";" || src[j] === "\n") j++;
  return src.slice(i, j);
};
const codigo = ["esAdmin", "puede", "puedeAlguno", "verItem"].map(trozo).join("\n");
const CY = {};
new Function("CY", codigo)(CY);

/* El menú real del archivo, no uno inventado.

   Ojo con la forma del campo: `permiso` acepta UN TEXTO o UNA LISTA
   (`permiso: ['a','b']` = alcanza con tener uno). Hasta el 2026-09-14 acá
   sólo se leía la forma de texto, y eso hizo que la prueba fallara el día que
   el ítem «Editar el sitio» estrenó la lista —`['contenido','taller']`, con
   el taller—: el ítem dejó de contarse y el número no dio. Falló por el
   motivo equivocado, pero falló, que es lo que se le pide a un banco.

   Se busca desde cada `id:` hasta el `permiso:` que le sigue, sin ventana de
   caracteres: la de 240 también se rompía sola cuando alguien agregaba un
   comentario largo arriba del campo, que es exactamente lo que pasó. */
const NAV = [...src.matchAll(/id:'([a-z]+)'(?:(?!\n *\{)[\s\S])*?permiso: *(\[[^\]]*\]|'[a-z]+')/g)]
  .map((m) => ({
    id: m[1],
    permiso: m[2].startsWith("[")
      ? m[2].slice(1, -1).split(",").map((s) => s.trim().replace(/'/g, "")).filter(Boolean)
      : m[2].replace(/'/g, "")
  }));

let fallos = 0;
const ok = (c, q) => { console.log((c ? "  ok   " : "  FALLA") + "  " + q); if (!c) fallos++; };

console.log("\nEl menú real usa `permiso` en:",
  NAV.map((x) => x.id + "→" + (Array.isArray(x.permiso) ? x.permiso.join("|") : x.permiso)).join(", "));

/* No se compara contra un número fijo: el menú crece, y una prueba que hay
   que actualizar cada vez que se agrega un ítem se termina actualizando sin
   pensar. Lo que importa es que NINGÚN ítem haya vuelto al campo viejo
   `perm`, que es lo que rompía en silencio al copiar un ítem desde Casa
   Verde: el ítem no aparecía, o aparecía para quien no debía. */
ok(NAV.length > 0, "se leyó el menú real (" + NAV.length + " ítems con permiso)");
ok(!/\bperm *:/.test(src), "no quedó ningún `perm:`, el campo viejo que rompía sin dar error");
ok(NAV.some((x) => Array.isArray(x.permiso)),
   "hay al menos un ítem con LISTA de permisos, y se lee bien");

const admin  = { activo: true, rol: "admin" };
const conAlb = { activo: true, rol: "editor", permisos: { albumes: true } };
const conCal = { activo: true, rol: "editor", permisos: { calculo: true } };
const inactivo = { activo: false, rol: "admin" };

console.log("\nUn permiso solo");
CY.usuario = conAlb;
ok(CY.verItem({ permiso: "albumes" }) === true,  "ve Álbumes quien tiene albumes");
ok(CY.verItem({ permiso: "calculo" }) === false, "NO ve Cálculo quien no lo tiene");
ok(CY.verItem({}) === true, "un ítem sin permiso lo ve cualquiera");
ok(CY.verItem({ soloAdmin: true }) === false, "soloAdmin sigue siendo sólo del admin");

console.log("\nLa lista, que antes no existía");
ok(CY.verItem({ permiso: ["calculo", "albumes"] }) === true, "alcanza con tener UNO de la lista");
ok(CY.verItem({ permiso: ["calculo", "contenido"] }) === false, "sin ninguno de la lista, no");
CY.usuario = conCal;
ok(CY.verItem({ permiso: ["calculo", "albumes"] }) === true, "y funciona con el otro de la lista");

console.log("\nLas dos excepciones que hereda de CY.puede");
CY.usuario = conAlb;
ok(CY.verItem({ permiso: "fotos" }) === true, "«fotos» sigue valiendo como «albumes» (alias)");
ok(CY.verItem({ permiso: ["fotos"] }) === true, "y también dentro de una lista");
ok(CY.verItem({ permiso: "usuarios" }) === false, "«usuarios» nunca, aunque esté tildado");
CY.usuario = { activo: true, rol: "editor", permisos: { usuarios: true } };
ok(CY.verItem({ permiso: ["usuarios"] }) === false, "tampoco dentro de una lista");

console.log("\nEl admin y el inactivo");
CY.usuario = admin;
ok(NAV.every((it) => CY.verItem(it)), "el admin ve los cuatro ítems del menú real");
ok(CY.verItem({ permiso: ["lo", "que", "sea"] }) === true, "y cualquier lista");
CY.usuario = inactivo;
ok(NAV.every((it) => CY.verItem(it) === false), "un admin desactivado no ve ninguno");
ok(CY.verItem({ permiso: ["albumes"] }) === false, "ni por lista");
CY.usuario = null;
ok(CY.verItem({ permiso: "albumes" }) === false, "sin sesión, tampoco");

console.log(fallos ? "\n" + fallos + " FALLAS\n" : "\nTodo en orden.\n");
process.exit(fallos ? 1 : 0);
