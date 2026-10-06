/* ═══════════════════════════════════════════════════════════
   reglas-emulador.mjs — las reglas v6 contra el EMULADOR de Firestore.
   Sello: emulador-1 (panel:U2, 6-oct-2026)

   pruebas-reglas.mjs lee el TEXTO de las reglas; esto las CORRE, en el
   emulador oficial, con un invitado (Mariano), uno pausado, un extraño, el
   agente y Mauro. Es lo que demuestra que un invitado no ve nada fuera de su
   proyecto y que el agente sigue sin ver la bóveda. No toca la base real.

   No entra al banco de siempre porque necesita Java y el emulador (cientos de
   MB). Se corre a mano cuando se tocan las reglas:

     cd pruebas/panel
     npm i --no-save firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
     sed "s/TU-UID-ACA/mauro/; s/UID-DEL-AGENTE/agente/" ../../reglas.txt > /tmp/reglas.rules
     printf '{"firestore":{"rules":"/tmp/reglas.rules"},"emulators":{"firestore":{"port":8085},"ui":{"enabled":false}}}' > firebase.json
     npx firebase emulators:exec --only firestore --project datos-prueba "node reglas-emulador.mjs"
     rm firebase.json

   El 6-oct-2026: 35 bien, 0 mal.
   ═══════════════════════════════════════════════════════════ */
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from "firebase/firestore";
const env = await initializeTestEnvironment({ projectId: "datos-prueba",
  firestore: { rules: readFileSync("/tmp/reglas.rules", "utf8"), host: "127.0.0.1", port: 8085 } });
await env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, "personas/mariano"), { nombre: "Mariano", proyectos: ["harmonia"], activo: true });
  await setDoc(doc(db, "personas/baja"), { nombre: "Baja", proyectos: ["harmonia"], activo: false });
  await setDoc(doc(db, "proyectos/harmonia"), { nombre: "Harmonía" });
  await setDoc(doc(db, "proyectos/casaverde"), { nombre: "Casa Verde" });
  await setDoc(doc(db, "pendientes/harmonia:H7"), { proyecto: "harmonia", titulo: "x" });
  await setDoc(doc(db, "pendientes/casaverde:R1"), { proyecto: "casaverde", titulo: "y" });
  await setDoc(doc(db, "claves/acceso-harmonia-vercel"), { clave: "s" });
  await setDoc(doc(db, "claves/acceso-casaverde-netlify"), { clave: "s" });
  await setDoc(doc(db, "claves/app-harmonia"), { clave: "s" });
  await setDoc(doc(db, "fichas/f1"), { proyecto: "harmonia" });
  await setDoc(doc(db, "fichas/f2"), { proyecto: "casaverde" });
  await setDoc(doc(db, "lineas/L1"), { a: 1 });
});
const M = env.authenticatedContext("mariano").firestore();
const B = env.authenticatedContext("baja").firestore();
const A = env.authenticatedContext("agente").firestore();
const Y = env.authenticatedContext("mauro").firestore();
const X = env.authenticatedContext("extraño").firestore();
let ok = 0, mal = 0;
const c = async (n, p) => { try { await p; ok++; console.log("  ✓", n); } catch (e) { mal++; console.log("  ✗", n, "—", e.message.slice(0, 160)); } };
const ped = (o = {}) => ({ proyecto: "harmonia", autor: "mariano", tipo: "pedido", estado: "abierto", quien: "claude",
  titulo: "El botón no anda", porQue: "Toco y nada", imagen: "", creadoEn: "2026-10-06", ...o });
await c("Mariano lee su proyecto", assertSucceeds(getDoc(doc(M, "proyectos/harmonia"))));
await c("Mariano NO lee otro proyecto", assertFails(getDoc(doc(M, "proyectos/casaverde"))));
await c("Mariano lista SUS pendientes (consulta con proyecto in)", assertSucceeds(getDocs(query(collection(M, "pendientes"), where("proyecto", "in", ["harmonia"])))));
await c("Mariano NO lista todos los pendientes", assertFails(getDocs(collection(M, "pendientes"))));
await c("Mariano NO lee un pendiente ajeno", assertFails(getDoc(doc(M, "pendientes/casaverde:R1"))));
await c("Mariano crea un pedido en Harmonía", assertSucceeds(setDoc(doc(M, "pendientes/harmonia:I1"), ped())));
await c("NO crea un pedido en Casa Verde", assertFails(setDoc(doc(M, "pendientes/casaverde:I2"), ped({ proyecto: "casaverde" }))));
await c("NO firma por otro", assertFails(setDoc(doc(M, "pendientes/harmonia:I3"), ped({ autor: "mauro" }))));
await c("NO crea algo que no sea pedido abierto para Claude", assertFails(setDoc(doc(M, "pendientes/harmonia:I4"), ped({ estado: "hecho" }))));
await c("NO mete campos de más (plan, riesgo)", assertFails(setDoc(doc(M, "pendientes/harmonia:I5"), ped({ plan: "x", riesgo: "bajo" }))));
await c("Una captura de nuestra cuenta de Cloudinary, sí", assertSucceeds(setDoc(doc(M, "pendientes/harmonia:I6"), ped({ imagen: "https://res.cloudinary.com/dnwfu8ffn/image/upload/v1/panel/a.jpg" }))));
await c("NO una dirección cualquiera en la imagen", assertFails(setDoc(doc(M, "pendientes/harmonia:I7"), ped({ imagen: "javascript:alert(1)" }))));
await c("Comenta un pendiente suyo", assertSucceeds(updateDoc(doc(M, "pendientes/harmonia:H7"), { comentarios: [{ por: "mariano", texto: "ok" }] })));
await c("NO cambia el estado de un pendiente", assertFails(updateDoc(doc(M, "pendientes/harmonia:H7"), { estado: "hecho" })));
await c("NO borra pendientes", assertFails(deleteDoc(doc(M, "pendientes/harmonia:H7"))));
await c("VE la clave de su proyecto", assertSucceeds(getDoc(doc(M, "claves/acceso-harmonia-vercel"))));
await c("VE la clave app-harmonia", assertSucceeds(getDoc(doc(M, "claves/app-harmonia"))));
await c("NO ve la clave de otro proyecto", assertFails(getDoc(doc(M, "claves/acceso-casaverde-netlify"))));
await c("NO lista la bóveda", assertFails(getDocs(collection(M, "claves"))));
await c("NO escribe la bóveda", assertFails(setDoc(doc(M, "claves/acceso-harmonia-vercel"), { clave: "otra" })));
await c("EL AGENTE sigue sin ver la bóveda", assertFails(getDoc(doc(A, "claves/acceso-harmonia-vercel"))));
await c("Mauro ve la bóveda", assertSucceeds(getDoc(doc(Y, "claves/acceso-casaverde-netlify"))));
await c("Lee las fichas de su proyecto", assertSucceeds(getDoc(doc(M, "fichas/f1"))));
await c("NO lee fichas ajenas", assertFails(getDoc(doc(M, "fichas/f2"))));
await c("NO lee líneas de trabajo", assertFails(getDoc(doc(M, "lineas/L1"))));
await c("Lee su ficha de persona", assertSucceeds(getDoc(doc(M, "personas/mariano"))));
await c("NO se agrega proyectos", assertFails(updateDoc(doc(M, "personas/mariano"), { proyectos: ["harmonia", "casaverde"] })));
await c("EL AGENTE no puede crear una persona", assertFails(setDoc(doc(A, "personas/agente"), { proyectos: ["harmonia"], activo: true })));
await c("Mauro crea una persona", assertSucceeds(setDoc(doc(Y, "personas/nuevo"), { proyectos: ["harmonia"], activo: true })));
await c("Una ficha INACTIVA no ve nada", assertFails(getDoc(doc(B, "proyectos/harmonia"))));
await c("Un extraño no ve nada", assertFails(getDoc(doc(X, "proyectos/harmonia"))));
await c("Un extraño deja su solicitud", assertSucceeds(setDoc(doc(X, "solicitudes/extraño"), { nombre: "Ana", mail: "a@b.c", mensaje: "hola", creadoEn: "x" })));
await c("NO deja solicitud a nombre de otro", assertFails(setDoc(doc(X, "solicitudes/otro"), { nombre: "Ana", mail: "", mensaje: "", creadoEn: "x" })));
await c("El agente lee personas (para el cupo)", assertSucceeds(getDocs(collection(A, "personas"))));
await c("El equipo sigue igual: el agente lee todos los pendientes", assertSucceeds(getDocs(collection(A, "pendientes"))));
console.log(`\n${ok} bien, ${mal} mal`);
await env.cleanup(); process.exit(mal ? 1 : 0);
