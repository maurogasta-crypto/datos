/* ═══════════════════════════════════════════════════════════
   pruebas-reglas.mjs — el banco de pruebas de «La puerta».
   Sello: pruebas-1

   Se corre con `node pruebas-reglas.mjs`, sin npm y sin navegador. Es el
   patrón que presta Harmonía (`npm run prueba`) y que remate ya usa en
   `pruebas/luces.mjs`; acá va en la raíz porque en este repo no se anidan
   carpetas, que se edita desde el teléfono.

   QUÉ PRUEBA, Y POR QUÉ ÉSTO Y NO OTRA COSA.

   Desde `panel-15` el texto de las reglas vive UNA sola vez, en `reglas.txt`,
   y el panel lo baja y le pone los UID adentro. Eso saca de encima el riesgo
   de que dos copias diverjan, pero deja uno nuevo: que alguien edite
   `reglas.txt` —a mano, desde el teléfono, con GitHub web— y sin querer le
   saque un marcador. El panel no tendría cómo avisar: mostraría un texto que
   PARECE bien y que en la consola abre o cierra lo que no corresponde.

   Así que esto no prueba la mecánica de reemplazar strings, que es trivial.
   Prueba que `reglas.txt`, tal como está hoy en el repositorio, produce
   reglas correctas — y que la bóveda sigue siendo de una sola persona.

   ⚠ NO SE COPIA EL CÓDIGO DEL PANEL ACÁ. Se extrae de `index.html` y se
   evalúa, porque una prueba que reimplementa lo que prueba no prueba nada.
   ═══════════════════════════════════════════════════════════ */

import { readFileSync } from "node:fs";

let ok = 0, mal = 0;
const caso = (nombre, fn) => {
  try { fn(); ok++; console.log("  ✓ " + nombre); }
  catch (e) { mal++; console.log("  ✗ " + nombre + "\n      " + e.message); }
};
const igual = (a, b, q) => {
  if (a !== b) throw new Error((q || "") + "\n      esperado: " + JSON.stringify(b)
    + "\n      obtenido: " + JSON.stringify(a));
};
const trae = (t, s, q) => { if (!t.includes(s)) throw new Error((q || "falta") + ": " + s); };
const noTrae = (t, s, q) => { if (t.includes(s)) throw new Error((q || "sobra") + ": " + s); };

/* ---------- el código real, sacado de index.html ---------- */
/* Del primer `const MARCA_MIA` hasta que cierra `sacarNotaDePlantilla`. Ese
   tramo es puro: no toca el DOM ni Firebase, así que se puede evaluar acá. */
const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const desde = html.indexOf("const MARCA_MIA");
const hasta = html.indexOf("\n}", html.indexOf("function sacarNotaDePlantilla"));
if (desde === -1 || hasta === -1) {
  console.log("✗ No se encontró el bloque de «La puerta» en index.html.");
  console.log("  Si lo moviste o lo renombraste, actualizá esta prueba en la misma tanda.");
  process.exit(1);
}
const fuente = html.slice(desde, hasta + 2);
const { MARCA_MIA, MARCA_AGENTE, SIN_AGENTE, INI_PLANTILLA, FIN_PLANTILLA, sacarNotaDePlantilla } =
  new Function(fuente + "\n return { MARCA_MIA, MARCA_AGENTE, SIN_AGENTE, INI_PLANTILLA,"
    + " FIN_PLANTILLA, sacarNotaDePlantilla };")();

const plantilla = readFileSync(new URL("./reglas.txt", import.meta.url), "utf8");

/* La misma línea que corre el panel. Es lo único que se repite, y a propósito:
   si se extrajera también `pintarReglas()` habría que fabricar un DOM entero. */
const armar = (uid, uidAgente) => sacarNotaDePlantilla(plantilla)
  .split(MARCA_MIA).join(uid)
  .split(MARCA_AGENTE).join(uidAgente || SIN_AGENTE);

/* UID de mentira, con la forma real: 28 caracteres alfanuméricos. Ninguno de
   los dos es de nadie — en este repositorio no entra un UID de verdad. */
const MIO = "a".repeat(28);
const AGENTE = "b".repeat(28);

console.log("\nreglas.txt, tal como está en el repositorio\n");

caso("trae los dos marcadores de UID", () => {
  trae(plantilla, MARCA_MIA);
  trae(plantilla, MARCA_AGENTE);
});

caso("NO trae ningún UID real (el repositorio es público)", () => {
  /* Cada comparación de uid tiene que ser contra un marcador y nada más. Es
     la prueba que impide que un descuido publique un UID en GitHub. */
  const comparaciones = [...plantilla.matchAll(/request\.auth\.uid\s*==\s*'([^']*)'/g)]
    .map((m) => m[1]);
  igual(comparaciones.length, 2, "tiene que haber exactamente dos comparaciones de uid");
  for (const v of comparaciones) {
    if (v !== MARCA_MIA && v !== MARCA_AGENTE) {
      throw new Error("hay un uid que no es un marcador: " + v);
    }
  }
});

caso("trae los marcadores de plantilla, y en orden", () => {
  const i = plantilla.indexOf(INI_PLANTILLA);
  const j = plantilla.indexOf(FIN_PLANTILLA);
  if (i === -1) throw new Error("falta el marcador de apertura");
  if (j === -1) throw new Error("falta el marcador de cierre");
  if (j < i) throw new Error("el cierre viene antes que la apertura");
});

console.log("\nlas reglas armadas, con los dos UID\n");
const r = armar(MIO, AGENTE);

caso("no queda ningún marcador sin reemplazar", () => {
  noTrae(r, MARCA_MIA, "quedó el marcador");
  noTrae(r, MARCA_AGENTE, "quedó el marcador");
  noTrae(r, "--8<--", "quedó un marcador de plantilla");
});

caso("los dos UID están adentro, cada uno una sola vez", () => {
  igual(r.split(MIO).length - 1, 1, "el UID propio");
  igual(r.split(AGENTE).length - 1, 1, "el UID del agente");
});

caso("el párrafo de plantilla se fue, y entró el que corresponde", () => {
  noTrae(r, "ESTE ARCHIVO ES LA PLANTILLA");
  noTrae(r, "NO SE PEGA TAL CUAL");
  trae(r, "ESTE TEXTO LO ARMÓ EL PANEL");
});

caso("es un archivo de reglas entero, no un pedazo", () => {
  trae(r, "rules_version");
  trae(r, "service cloud.firestore");
  trae(r, "match /databases/{database}/documents");
  trae(r, "match /{document=**} { allow read, write: if false; }");
});

caso("LA BÓVEDA sigue siendo de una sola persona", () => {
  /* La prueba que importa más que todas las otras juntas. Si un día alguien
     cambia `soyYo()` por `equipo()` en estas dos líneas, el agente pasa a leer
     contraseñas. Que falle acá, ruidosamente, y no en producción. */
  trae(r, "match /claves/{id}     { allow read, write: if soyYo(); }");
  trae(r, "match /fichas/{id}     { allow read, write: if soyYo(); }");
  for (const linea of r.split("\n")) {
    if (/match \/(claves|fichas)\//.test(linea) && !/if soyYo\(\);/.test(linea)) {
      throw new Error("la bóveda quedó abierta a alguien más: " + linea.trim());
    }
  }
});

caso("el equipo llega a las cuatro colecciones del estado, y a ninguna más", () => {
  for (const c of ["proyectos", "pendientes", "tandas", "protocolos"]) {
    trae(r, "match /" + c + "/{id}", "falta la colección");
  }
  const declaradas = [...r.matchAll(/match \/([a-z-]+)\/\{id\}/g)].map((m) => m[1]).sort();
  igual(declaradas.join(","), "claves,fichas,pendientes,protocolos,proyectos,tandas",
    "cambió la lista de colecciones: si entró una nueva, agregala acá y a las reglas");
});

console.log("\nlos casos límite, que son los que rompen de verdad\n");

caso("sin UID de agente: sale un valor que ningún usuario puede tener", () => {
  const s = armar(MIO, "");
  noTrae(s, MARCA_AGENTE, "quedó el marcador");
  trae(s, SIN_AGENTE);
  /* 28 alfanuméricos es la forma de un UID de Firebase. Éste tiene guiones y
     22 caracteres, así que `esAgente()` no da verdadera nunca. */
  if (/^[A-Za-z0-9]{28}$/.test(SIN_AGENTE)) {
    throw new Error("el relleno tiene forma de UID real, y podría chocar con uno");
  }
});

caso("sin UID de agente tampoco: la bóveda sigue cerrada", () => {
  const s = armar(MIO, "");
  trae(s, "match /claves/{id}     { allow read, write: if soyYo(); }");
  trae(s, "match /fichas/{id}     { allow read, write: if soyYo(); }");
});

caso("con espacios alrededor del UID: se usan igual (los limpia el panel)", () => {
  const s = armar(MIO, AGENTE);
  trae(s, "'" + AGENTE + "'");
});

caso("archivo sin marcadores de plantilla: sale entero, no se rompe", () => {
  const pelado = "rules_version = '2';\nmatch x { uid == 'TU-UID-ACA'; }";
  igual(sacarNotaDePlantilla(pelado), pelado);
});

caso("sólo el marcador de apertura: sale entero", () => {
  const a = INI_PLANTILLA + "\nhola\nchau";
  igual(sacarNotaDePlantilla(a), a);
});

caso("sólo el marcador de cierre: sale entero", () => {
  const a = "hola\n" + FIN_PLANTILLA + "\nchau";
  igual(sacarNotaDePlantilla(a), a);
});

caso("marcadores al revés: sale entero, no corta al medio", () => {
  const a = "uno\n" + FIN_PLANTILLA + "\ndos\n" + INI_PLANTILLA + "\ntres";
  igual(sacarNotaDePlantilla(a), a);
});

caso("archivo vacío: no explota", () => {
  igual(sacarNotaDePlantilla(""), "");
});

console.log("\n" + (mal === 0
  ? "Todo bien: " + ok + " casos."
  : mal + " de " + (ok + mal) + " fallaron."));
process.exit(mal === 0 ? 0 : 1);
