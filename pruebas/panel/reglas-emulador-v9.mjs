// pruebas/panel/reglas-emulador-v9.mjs — las reglas del panel (reglas.txt) contra el
// emulador de Firestore: lo que el banco de texto (pruebas-reglas.mjs) no puede
// probar, que es cómo DECIDEN. Desde la v9 (7-nov-2026): las invitaciones y la
// ficha que se crea sola, sin bóveda. Necesita Java y el emulador; no se agrega
// nada al sitio (no hay npm acá). Fuera del repositorio:
//   mkdir /tmp/emu && cd /tmp/emu && npm init -y
//   npm i firebase-tools@13 @firebase/rules-unit-testing@3 firebase@10
//   echo '{"emulators":{"firestore":{"port":8089}}}' > firebase.json
//   REGLAS=<ruta a reglas.txt> npx firebase emulators:exec --only firestore \
//     --project panel-prueba "node <ruta a este archivo>"
// Los marcadores se cambian por «mauro» y «agente». 23 casos.
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
import fs from "fs";
const reglas = fs.readFileSync(process.env.REGLAS || new URL("../../reglas.txt", import.meta.url), "utf8")
  .replaceAll("TU-UID-ACA", "mauro").replaceAll("UID-DEL-AGENTE", "agente");
const env = await initializeTestEnvironment({ projectId: "panel-prueba", firestore: { rules: reglas, host:"127.0.0.1", port:8089 } });
await env.clearFirestore();
await env.withSecurityRulesDisabled(async c => { const d=c.firestore();
  await setDoc(doc(d,"personas/flor"),{nombre:"Flor",activo:true,proyectos:["casaverde"]});
  await setDoc(doc(d,"invitaciones/mariano@x.com"),{proyectos:["harmonia"],por:"agente"});
  await setDoc(doc(d,"claves/acceso-casaverde-x"),{clave:"s"});
  await setDoc(doc(d,"claves/acceso-harmonia-x"),{clave:"s"});
  await setDoc(doc(d,"proyectos/harmonia"),{nombre:"BandoMaps"});
  await setDoc(doc(d,"proyectos/casaverde"),{nombre:"CV"});
});
const db=(uid,email,verif=true)=>env.authenticatedContext(uid,email?{email,email_verified:verif}:{}).firestore();
let ok=0,mal=0; const t=async(n,p)=>{ try{ await p; ok++; }catch(e){ mal++; console.log("✖",n,e.message.slice(0,140)); } };
const ficha={nombre:"Mariano",mail:"mariano@x.com",activo:true,proyectos:["harmonia"],claves:false,creadoEn:"2026-11-07"};
await t("agente crea invitación", assertSucceeds(setDoc(doc(db("agente"),"invitaciones/otro@x.com"),{proyectos:["remate"]})));
await t("Mauro crea invitación", assertSucceeds(setDoc(doc(db("mauro"),"invitaciones/otro2@x.com"),{proyectos:["remate"]})));
await t("un invitado no crea invitaciones", assertFails(setDoc(doc(db("flor","flor@x.com"),"invitaciones/z@x.com"),{proyectos:["casaverde"]})));
await t("la persona lee SU invitación", assertSucceeds(getDoc(doc(db("m1","Mariano@X.com"),"invitaciones/mariano@x.com"))));
await t("no lee la de otro", assertFails(getDoc(doc(db("m1","mariano@x.com"),"invitaciones/otro@x.com"))));
await t("no lista invitaciones", assertFails(getDocs(collection(db("m1","mariano@x.com"),"invitaciones"))));
await t("sin confirmar el mail no crea ficha", assertFails(setDoc(doc(db("m1","mariano@x.com",false),"personas/m1"),ficha)));
await t("con bóveda no", assertFails(setDoc(doc(db("m1","mariano@x.com"),"personas/m1"),{...ficha,claves:true})));
await t("con otros proyectos no", assertFails(setDoc(doc(db("m1","mariano@x.com"),"personas/m1"),{...ficha,proyectos:["harmonia","casaverde"]})));
await t("con edita no", assertFails(setDoc(doc(db("m1","mariano@x.com"),"personas/m1"),{...ficha,edita:["general-flores"]})));
await t("sin invitación no", assertFails(setDoc(doc(db("m2","nadie@x.com"),"personas/m2"),{...ficha,mail:"nadie@x.com"})));
await t("en la ficha de otro no", assertFails(setDoc(doc(db("m1","mariano@x.com"),"personas/otro"),ficha)));
await t("con invitación y mail confirmado, crea su ficha", assertSucceeds(setDoc(doc(db("m1","mariano@x.com"),"personas/m1"),ficha)));
await t("después no se cambia la ficha", assertFails(updateDoc(doc(db("m1","mariano@x.com"),"personas/m1"),{claves:true})));
await t("ya es invitado: lee su proyecto", assertSucceeds(getDoc(doc(db("m1","mariano@x.com"),"proyectos/harmonia"))));
await t("y no uno ajeno", assertFails(getDoc(doc(db("m1","mariano@x.com"),"proyectos/casaverde"))));
await t("no ve la bóveda de su proyecto (claves:false)", assertFails(getDoc(doc(db("m1","mariano@x.com"),"claves/acceso-harmonia-x"))));
await t("una ficha vieja (sin campo) la sigue viendo", assertSucceeds(getDoc(doc(db("flor","flor@x.com"),"claves/acceso-casaverde-x"))));
await t("el agente sigue sin bóveda", assertFails(getDoc(doc(db("agente"),"claves/acceso-harmonia-x"))));
await t("Mauro le abre la bóveda", assertSucceeds(updateDoc(doc(db("mauro"),"personas/m1"),{claves:true})));
await t("y ahí la ve", assertSucceeds(getDoc(doc(db("m1","mariano@x.com"),"claves/acceso-harmonia-x"))));
await t("el agente no le abre la bóveda", assertFails(updateDoc(doc(db("agente"),"personas/flor"),{claves:true})));
await t("colección inventada cerrada", assertFails(setDoc(doc(db("mauro"),"otra/x"),{a:1})));
console.log(`${ok} pasadas, ${mal} fallidas`); await env.cleanup(); process.exit(mal?1:0);
