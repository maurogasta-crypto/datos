/* ═══════════════════════════════════════════════════════════
   ojos.js — EL OJO DE LAS CONTRASEÑAS, para todo el ecosistema.
   Sello: ojos-1

   Mauro, 11-oct-2026: «un ojo para poder ver la contraseña cuando se tipea, en
   todos los sitios». Pone un botón 👁 adentro de cada campo de contraseña de la
   página —también de los que aparecen después, por eso el MutationObserver—
   que alterna entre ver y ocultar. Corre solo al cargar este archivo.

   Desde el 29-oct-2026 (`general:C7`, el primer paso del módulo común) vive
   ACÁ y en ningún otro lado. Hasta ese día eran cinco copias idénticas —en
   Tiempos, Casa Verde, CasaYourte, remate y el panel— con la regla «si cambia
   en uno, cambia en los cinco». Ahora cada sitio lo pide así:

       import("https://maurogasta-crypto.github.io/datos/ojos.js").catch(() => {});

   **Diferido y con `catch`, nunca un `import` estático**: es la lección de
   `init-2` (14-sep-2026): un import estático que no llega deja la página en
   blanco. Si este archivo no baja, el campo sigue siendo una contraseña común,
   sin ojo — se pierde una comodidad, no el login. Por eso mismo el ojo NO es
   una dependencia de nada: ninguna página puede llamar a una función de acá.

   **Cuidado al cambiarlo: cambia en los cinco sitios a la vez**, sin que
   ninguno suba su sello. Antes de subir: `node pruebas/ojos.mjs`.
   Y la Pizarra lo tiene en Kotlin: si cambia lo que se ve, cambia allá.

   Los estilos van en línea a propósito: así no depende de la hoja de cada
   sitio, y le gana a las reglas generales de «button» (ancho, fondo, borde).
   ═══════════════════════════════════════════════════════════ */

export const VERSION = "ojos-1";

export function ojosEnClaves(raiz) {
  raiz = raiz || document;
  const poner = (inp) => {
    if (inp.dataset.ojo) return;
    inp.dataset.ojo = "1";
    // La caja ocupa el renglón y el campo la llena: en un teléfono los campos
    // de entrada van a lo ancho, y con una caja «en línea» el de la
    // contraseña quedaba más angosto que el del mail.
    const caja = document.createElement("span");
    caja.style.cssText = "position:relative;display:block";
    inp.parentNode.insertBefore(caja, inp);
    caja.appendChild(inp);
    inp.style.width = "100%";
    inp.style.boxSizing = "border-box";
    inp.style.paddingRight = "2.6em";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "ojo-clave";
    b.style.cssText = "position:absolute;right:.25em;top:50%;transform:translateY(-50%);"
      + "background:none;border:0;box-shadow:none;padding:.2em .35em;margin:0;width:auto;"
      + "min-width:0;height:auto;cursor:pointer;font-size:1.1em;line-height:1;color:inherit;opacity:.75";
    const pintar = () => {
      const viendo = inp.type === "text";
      b.textContent = viendo ? "🙈" : "👁";
      b.setAttribute("aria-label", viendo ? "Ocultar la contraseña" : "Mostrar la contraseña");
      b.title = b.getAttribute("aria-label");
    };
    b.onclick = () => { inp.type = inp.type === "password" ? "text" : "password"; pintar(); inp.focus(); };
    pintar();
    caja.appendChild(b);
  };
  const todos = () => raiz.querySelectorAll('input[type="password"]:not([data-ojo])').forEach(poner);
  todos();
  new MutationObserver(todos).observe(raiz.body || raiz, { childList: true, subtree: true });
}

// Una sola vez por página, aunque dos módulos lo pidan.
if (typeof document !== "undefined" && typeof MutationObserver !== "undefined" && !globalThis.__ojosEnClaves) {
  globalThis.__ojosEnClaves = true;
  ojosEnClaves();
}
