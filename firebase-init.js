/* ═══════════════════════════════════════════════════════════
   firebase-init.js — EL ÚNICO CONTACTO CON EL SDK DE FIREBASE.
   Sello: init-2

   Ninguna otra página importa nada de firebase directamente. Si mañana
   cambia la versión del SDK, o el proyecto, o hay que agregar una función,
   se toca acá y en ningún otro lado. Es la misma regla que en los otros
   tres proyectos (PROTOCOLO-DESARROLLO §2, repo `datos`).

   LA CONFIGURACIÓN NO ES UN SECRETO. Identifica el proyecto ante la API
   web; no da un solo permiso. Lo que da o niega acceso son las reglas de
   Firestore (`reglas.txt`) y Authentication. Está acá a la vista para que
   nadie la confunda con una credencial y la "proteja" rompiendo el panel.
   Ver PROTOCOLO-SECRETOS.md, «Identificadores públicos por diseño».
   ═══════════════════════════════════════════════════════════ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, initializeFirestore, persistentLocalCache,
  persistentMultipleTabManager,
  doc, getDoc, setDoc, deleteDoc, collection, getDocs,
  query, orderBy, serverTimestamp, writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAxWOM9ZEHt6CXh8Nf1qU6FvL2uh1wFbug",
  authDomain: "datos-830f8.firebaseapp.com",
  projectId: "datos-830f8",
  storageBucket: "datos-830f8.firebasestorage.app",
  messagingSenderId: "476415717519",
  appId: "1:476415717519:web:5f9c82d6e4352bad6000fa"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
/* LA CACHÉ PERSISTENTE. Es lo que hace que el panel instalado sirva de algo
   sin señal: sin ella el cascarón abre y no hay un solo dato adentro. Se la
   presta Casa Verde, que la tiene desde hace tiempo.

   El `try` no es adorno. `initializeFirestore` falla si algo ya llamó a
   `getFirestore(app)` antes, y el navegador puede negar el almacenamiento
   (modo incógnito, disco lleno, ajuste del usuario). En cualquiera de esos
   casos vale más un panel que anda sin caché que uno que no abre. */
let _db;
try {
  _db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.warn("Firestore sin caché persistente:", e && e.message);
  _db = getFirestore(app);
}
export const db = _db;

export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy,
  serverTimestamp, writeBatch
};
