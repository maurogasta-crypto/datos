/* ═══════════════════════════════════════════════════════════
   firebase-init.js — EL ÚNICO CONTACTO CON EL SDK DE FIREBASE.
   Sello: init-1

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
  getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs,
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
export const db = getFirestore(app);

export {
  onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail,
  doc, getDoc, setDoc, deleteDoc, collection, getDocs, query, orderBy,
  serverTimestamp, writeBatch
};
