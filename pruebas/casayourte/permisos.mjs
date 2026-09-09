/* Corre las funciones REALES de CasaYourte, extraídas del archivo tal cual
   está. No se copian acá: si el archivo cambia, esto cambia con él. */
import fs from "node:fs";
const src = fs.readFileSync("/home/user/CasaYourte/nucleo.js", "utf8");

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

// El menú real del archivo, no uno inventado.
const NAV = [...src.matchAll(/id:'([a-z]+)'[\s\S]{0,240}?permiso:'([a-z]+)'/g)]
  .map((m) => ({ id: m[1], permiso: m[2] }));

let fallos = 0;
const ok = (c, q) => { console.log((c ? "  ok   " : "  FALLA") + "  " + q); if (!c) fallos++; };

console.log("\nEl menú real usa `permiso` en:", NAV.map((x) => x.id + "→" + x.permiso).join(", "));
ok(NAV.length === 4, "los cuatro ítems se leen con el campo nuevo");

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
