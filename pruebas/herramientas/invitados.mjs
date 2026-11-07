// pruebas/herramientas/invitados.mjs — los colaboradores por sitio, sin red.
import assert from "node:assert/strict";
import { validar, participantesPor, mensaje, limpiarMail, LINK } from "../../herramientas/invitados.mjs";
let ok = 0, mal = 0;
const t = (n, f) => { try { f(); ok++; console.log("  ✓ " + n); } catch (e) { mal++; console.log("  ✗ " + n + "\n      " + e.message); } };
const ids = ["harmonia", "casaverde", "panel"];
const bien = { mail: " Mariano@X.com ", proyectos: ["harmonia"], autorizado: "Mauro: invitalo a BandoMaps" };
t("una invitación completa sirve", () => assert.equal(validar({ ...bien, mail: limpiarMail(bien.mail) }, ids), ""));
t("sin autorización de Mauro no se invita", () => assert.match(validar({ ...bien, autorizado: " " }, ids), /autorizado/));
t("un proyecto que no existe no", () => assert.match(validar({ ...bien, proyectos: ["nada"] }, ids), /no existen/));
t("el panel no se comparte", () => assert.match(validar({ ...bien, proyectos: ["panel"] }, ids), /panel/));
t("sin proyectos no", () => assert.match(validar({ ...bien, proyectos: [] }, ids), /--proyectos/));
t("mail malo no", () => assert.match(validar({ ...bien, mail: "x" }, ids), /mail/));
t("participantes: Mauro primero, después los activos con ese proyecto", () => {
  const p = participantesPor(["harmonia", "casaverde"], [
    { mail: "m@x.com", nombre: "Mariano", activo: true, proyectos: ["harmonia"] },
    { mail: "f@x.com", nombre: "Flor", activo: true, proyectos: ["casaverde"] },
    { mail: "z@x.com", nombre: "Pausado", activo: false, proyectos: ["harmonia"] }], [
    { id: "m@x.com", proyectos: ["harmonia"] }, { id: "e@x.com", proyectos: ["harmonia"] }]);
  assert.deepEqual(p.harmonia.gente.map((g) => g.nombre), ["Mauro", "Mariano"]);
  assert.equal(p.harmonia.gente[0].rol, "dueño");
  assert.equal(p.harmonia.invitacionesSinUsar, 1);
  assert.deepEqual(p.casaverde.gente.map((g) => g.nombre), ["Mauro", "Flor"]);
});
t("participantes no lleva mails", () => {
  const p = participantesPor(["harmonia"], [{ mail: "m@x.com", nombre: "Mariano", activo: true, proyectos: ["harmonia"] }], []);
  assert.ok(!JSON.stringify(p).includes("@"));
});
t("el mensaje lleva el link, el mail y el aviso de Spam", () => {
  const m = mensaje("Mariano@X.com", ["BandoMaps"]);
  assert.ok(m.includes(LINK)); assert.ok(m.includes("mariano@x.com")); assert.match(m, /Spam/); assert.match(m, /BandoMaps/);
});
console.log(`\n${mal ? mal + " de " + (ok + mal) + " fallaron." : "Todo bien: " + ok + " casos."}`); process.exit(mal ? 1 : 0);
