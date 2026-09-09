/* ═══════════════════════════════════════════════════════════
   firebase-init.js — EL ÚNICO CONTACTO CON EL SDK DE FIREBASE.
   Sello: init-3

   Ninguna otra página importa nada de firebase directamente. Si mañana
   cambia la versión del SDK, o el proyecto, o hay que agregar una función,
   se toca acá y en ningún otro lado. Es la misma regla que en los otros
   tres proyectos (PROTOCOLO-DESARROLLO §2, repo `datos`).

   LA CONFIGURACIÓN NO ES UN SECRETO. Identifica el proyecto ante la API
   web; no da un solo permiso. Lo que da o niega acceso son las reglas de
   Firestore (`reglas.txt`) y Authentication. Está acá a la vista para que
   nadie la confunda con una credencial y la "proteja" rompiendo el panel.
   Ver PROTOCOLO-SECRETOS.md, «Identificadores públicos por diseño».

   ───────────────────────────────────────────────────────────
   EL SDK SE CARGA DIFERIDO, Y ÉSTE ES EL MOTIVO.

   Hasta el sello init-2 esto empezaba con tres `import` estáticos desde
   `gstatic.com`. Un `import` estático es una dependencia dura: si el CDN no
   contesta —un ascensor, un subte, una red que filtra, gstatic caído— el
   módulo no evalúa, y con él no evalúa `nucleo.js`, y con él no evalúa el
   `<script type="module">` del panel. **No falla la parte que usa Firebase:
   falla TODA la página, en blanco y sin un solo mensaje.**

   Y acá pegaba más fuerte que en cualquier otro lado, porque el panel es una
   app instalable: el `sw.js` guarda el cascarón, así que sin señal el HTML,
   el CSS y el JS abren perfecto... y la página quedaba igual en blanco,
   porque lo único que faltaba era lo que nunca se cachea. La instalación
   parecía rota.

   Ahora el SDK entra por `import()` dinámico, adentro de un `try`, cuando la
   pantalla lo pide. Si no llega, el panel abre igual y DICE qué falta.

   Cómo funciona sin obligar a cambiar quien lo usa: lo que se exporta son
   `let`, no `const`. Un `export let` es un **enlace vivo** — quien hizo
   `import { doc } from "./firebase-init.js"` ve el valor que tenga la
   variable en el momento de usarla, no el que tenía al importar. Así
   `cargarFirebase()` los rellena y los treinta y pico de lugares que
   escriben `doc(db, …)` siguen escribiéndolo igual.

   La contra, que hay que saber: **antes de `cargarFirebase()` todos valen
   `undefined`.** Nada que dependa de Firebase puede correr antes de que esa
   promesa resuelva. Por eso el arranque del panel la espera primero.
   ═══════════════════════════════════════════════════════════ */

const SDK = "https://www.gstatic.com/firebasejs/10.12.2/";

export const firebaseConfig = {
  apiKey: "AIzaSyAxWOM9ZEHt6CXh8Nf1qU6FvL2uh1wFbug",
  authDomain: "datos-830f8.firebaseapp.com",
  projectId: "datos-830f8",
  storageBucket: "datos-830f8.firebasestorage.app",
  messagingSenderId: "476415717519",
  appId: "1:476415717519:web:5f9c82d6e4352bad6000fa"
};

/* Enlaces vivos: `undefined` hasta que `cargarFirebase()` los rellena. */
export let app, auth, db;
export let onAuthStateChanged, signInWithEmailAndPassword, signOut,
           sendPasswordResetEmail;
export let doc, getDoc, setDoc, deleteDoc, collection, getDocs,
           query, orderBy, serverTimestamp, writeBatch;

/* `null` mientras no se intentó; `true` si anduvo. Lo mira el diagnóstico. */
export let cargado = false;

let _promesa = null;

/* Idempotente a propósito: si dos pantallas la llaman a la vez, el SDK se
   baja una sola vez. Y si falló, un llamado nuevo REINTENTA —por eso la
   promesa se borra en el catch—: el caso típico es que la señal vuelva. */
export function cargarFirebase() {
  if (_promesa) return _promesa;
  _promesa = (async () => {
    let modApp, modAuth, modFs;
    try {
      [modApp, modAuth, modFs] = await Promise.all([
        import(SDK + "firebase-app.js"),
        import(SDK + "firebase-auth.js"),
        import(SDK + "firebase-firestore.js")
      ]);
    } catch (e) {
      /* El error del navegador para un módulo que no baja es genérico
         («error loading dynamically imported module»). Se traduce acá, una
         sola vez, para que la pantalla no tenga que adivinar. */
      const err = new Error(
        "No se pudo cargar el SDK de Firebase desde gstatic.com. "
        + "Suele ser falta de señal o una red que bloquea ese dominio."
      );
      err.causa = e;
      err.codigo = "sdk-no-baja";
      _promesa = null;
      throw err;
    }

    app = modApp.initializeApp(firebaseConfig);
    auth = modAuth.getAuth(app);

    ({ onAuthStateChanged, signInWithEmailAndPassword, signOut,
       sendPasswordResetEmail } = modAuth);
    ({ doc, getDoc, setDoc, deleteDoc, collection, getDocs,
       query, orderBy, serverTimestamp, writeBatch } = modFs);

    /* LA CACHÉ PERSISTENTE. Es lo que hace que el panel instalado sirva de
       algo sin señal: sin ella el cascarón abre y no hay un solo dato
       adentro. Se la presta Casa Verde, que la tiene desde hace tiempo.

       El `try` no es adorno. `initializeFirestore` falla si algo ya llamó a
       `getFirestore(app)` antes, y el navegador puede negar el
       almacenamiento (modo incógnito, disco lleno, ajuste del usuario). En
       cualquiera de esos casos vale más un panel que anda sin caché que uno
       que no abre. */
    try {
      db = modFs.initializeFirestore(app, {
        localCache: modFs.persistentLocalCache({
          tabManager: modFs.persistentMultipleTabManager()
        })
      });
    } catch (e) {
      console.warn("Firestore sin caché persistente:", e && e.message);
      db = modFs.getFirestore(app);
    }

    cargado = true;
    return true;
  })();
  return _promesa;
}
