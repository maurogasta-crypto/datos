// El banco de herramientas/obras.mjs: qué baja y qué no. Sin red ni npm.
import assert from "node:assert/strict";
import { planDeRespaldo } from "../../herramientas/obras.mjs";
let n = 0;
const caso = (t, f) => { f(); n++; console.log("  ok  " + t); };
const obra = { obra: { items: {
  a: { titulo: "Foto del frente", imagen: "https://res.cloudinary.com/dnwfu8ffn/image/upload/v1/panel/a.jpg" },
  b: { titulo: "Ya respaldada", imagen: "https://res.cloudinary.com/dnwfu8ffn/image/upload/v1/panel/b.jpg", respaldo: "obras/x/archivos/b.jpg" },
  c: { titulo: "Imagen ajena", imagen: "https://evil.example/c.jpg" },
  d: { titulo: "Bosquejo", url: "https://claude.ai/code/artifact/x" },
  e: { titulo: "Nota sin nada" },
} } };
caso("baja sólo las imágenes de nuestra cuenta que no tienen respaldo", () => {
  assert.deepEqual(planDeRespaldo(obra).bajar.map((x) => x.id), ["a"]);
});
caso("un enlace de afuera no se baja: se dice que va a mano", () => {
  assert.deepEqual(planDeRespaldo(obra).aMano.map((x) => x.id), ["d"]);
});
caso("una obra vacía o rota no rompe", () => {
  assert.deepEqual(planDeRespaldo(null), { bajar: [], aMano: [] });
  assert.deepEqual(planDeRespaldo({ obra: {} }), { bajar: [], aMano: [] });
});
console.log(`\n  ${n} casos, todos bien.`);
