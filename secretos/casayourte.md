# Secretos — casayourte/CasaYourte

Revisado por una sesión con el repo real delante (2026-09-07), rama
`claude/casayourte-secrets-protocol-rwdxs5`. Ver `../PROTOCOLO-SECRETOS.md`
para las reglas generales.

**Forma del proyecto: sitio estático puro.** HTML/CSS/JS servido tal cual,
sin build, sin npm, sin funciones desplegadas, editado desde el celular por
la web de GitHub (restricción de diseño explícita). Despliegue: GitHub
Pages, *Deploy from a branch* → `main`/`(root)`, dominio propio por `CNAME`.
**Cero variables de entorno, cero workflows propios** (no hay carpeta
`.github/`; el único workflow es el `pages-build-deployment` que GitHub
genera solo) — así que ningún secreto de GitHub Actions es consumido por
nada acá. Terceros: Firebase (Auth + Firestore) y Cloudinary, accedidos
directo desde el navegador, sin backend intermedio.

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|
| `firebaseConfig.apiKey` | Identifica el proyecto Firebase ante la API web; no da permisos, eso lo hacen las Firestore Rules | público por diseño | Canónica: `firebase-init.js:26`. Copias (sin build, no hay forma de importarla): `index.html:1337`, `album.html:197` | Todo el panel vía `firebase-init.js`; portada y álbumes por REST a Firestore | `firebase-init.js:26`, 2026-09-07 |
| `firebaseConfig.authDomain` | Dominio de Firebase Authentication | público por diseño | `firebase-init.js:27` | `firebase-init.js` → paneles | `firebase-init.js:27`, 2026-09-07 |
| `firebaseConfig.projectId` | ID del proyecto Firestore | público por diseño | Canónica: `firebase-init.js:28`. Copia en la URL REST: `index.html:1335`, `album.html` | Todas las páginas del panel + lectura pública de álbumes | `firebase-init.js:28`, 2026-09-07 |
| `firebaseConfig.storageBucket` / `messagingSenderId` / `appId` | Resto de la config del proyecto Firebase | público por diseño | `firebase-init.js:29-31` | `admin.html`, `editar.html`, `calculo.html`, `usuarios.html`, `diagnostico.html`, `traducir.html`, `sw.js` | `firebase-init.js:29-31`, 2026-09-07 |
| `CY.CLOUDINARY.cloud` | Cloud name de Cloudinary: arma URLs de entrega y subida | público por diseño | Canónica: `nucleo.js:135`. Copias: `index.html:1338`, `album.html:200` | `nucleo.js`, `admin.html`, `diagnostico.html`, `index.html`, `album.html` | `nucleo.js:135`, 2026-09-07 |
| `CY.CLOUDINARY.preset` | Upload preset **unsigned**, permite subir desde el navegador sin firma | público por diseño | `nucleo.js:135`; se define en Cloudinary → Settings → Upload → Upload presets | `CY.subir()` en `nucleo.js`, usado por `admin.html` y `diagnostico.html` | `nucleo.js:135`, 2026-09-07 |
| `api_secret` de Cloudinary | Firmaría borrados y operaciones privilegiadas | **ausente por diseño** | No existe en este proyecto — solo en la consola de Cloudinary. Consecuencia: el panel no borra de Cloudinary, "quitar una foto" la manda a papelera | Nadie | Ausencia confirmada en `admin.html:1374`, 2026-09-07 |
| Contraseña de cada persona del panel | Login a `admin.html`/`editar.html`/`calculo.html` | dato en runtime | Firebase Authentication — alta por invitación, reseteo por mail, nadie maneja contraseñas ajenas | `signInWithEmailAndPassword`/`sendPasswordResetEmail` en `firebase-init.js` | `firebase-init.js`, 2026-09-07 |
| `usuarios/{uid}` → `rol`, `activo`, `permisos` | Quién entra y qué puede hacer | dato en runtime | Firestore, protegido por `REGLAS.txt` (nadie puede darse admin a sí mismo) | `usuarios.html`, `nucleo.js`, todos los paneles | `REGLAS.txt`, 2026-09-07 |
| `invitaciones/{mail}` → `rol`, `permisos` | Rol/permisos que recibe quien se registre con ese mail | dato en runtime | Firestore, protegido por `REGLAS.txt` | `usuarios.html`, alta por invitación en `admin.html` | `REGLAS.txt`, 2026-09-07 |
| `calculos/{id}` | Cálculos de taller: datos de clientes y medidas de obra, no públicos | dato en runtime | Firestore, solo con permiso `calculo` según `REGLAS.txt` | `calculo.html` | `REGLAS.txt`, 2026-09-07 |
| `REGLAS.txt` (reglas de Firestore) | Autoridad de acceso a todas las colecciones | **configuración de seguridad (copia en repo, autoridad en consola)** | La autoridad real es lo publicado en la consola de Firebase; el archivo del repo es la copia de referencia — pueden divergir sin aviso | Firestore | declarado por Mauro — pendiente, ver nota abajo |
| Login de GitHub | Subir archivos, configurar Pages | credencial de cuenta | Gestor de contraseñas personal de Mauro | Nadie — uso manual en la web | ausencia de la credencial en el repo confirmada, 2026-09-07 |
| Login de Firebase console | Reglas, Authentication, dominios autorizados | credencial de cuenta | Gestor de contraseñas personal de Mauro | Nadie — uso manual en la consola | ausencia confirmada, 2026-09-07 |
| Login de Cloudinary | Upload presets, borrado de archivos | credencial de cuenta | Gestor de contraseñas personal de Mauro | Nadie — uso manual en la consola | ausencia confirmada, 2026-09-07 |
| Secretos en GitHub Actions | — | — | No aplica: este repo no tiene workflows propios | — | no verificable / no aplica |

**Nota sobre `REGLAS.txt`:** solo Mauro puede confirmar que el archivo del
repo coincide con lo publicado en la consola de Firebase. La prueba rápida
ya existe y es buena — `GUIA-ANDROID.md` paso E4: desactivarse a uno mismo
como usuario y comprobar que el panel efectivamente lo echa. Vale como
patrón para los tres proyectos: toda regla de seguridad necesita una prueba
de que está viva, no solo un archivo que dice estarlo.

**Aclaración sobre el incidente de la clave de Cloudinary** (ver
`../PROTOCOLO-GENERAL.md` § 1): esa clave real que se filtró **no
pertenece a CasaYourte** — este proyecto no usa ninguna credencial firmada
de Cloudinary, solo el upload preset sin firma de la tabla de arriba. El
contenido que la mencionaba junto a "CasaYourte" no se verificó nunca contra
este repo, y la revisión real lo confirma: acá ni siquiera hay lugar para
una API key de Cloudinary.

**Ya hecho en el repo:** `CLAUDE.md` en la raíz (proyecto, Secretos,
Protocolos) y `.gitignore` con `.env*`, en la rama
`claude/casayourte-secrets-protocol-rwdxs5` — pendiente de que Mauro la
revise y mergee.

## Pendientes

1. Confirmar que `REGLAS.txt` coincide con las reglas publicadas en la
   consola de Firebase (solo Mauro, con la prueba de `GUIA-ANDROID.md` E4).
2. Mergear la rama `claude/casayourte-secrets-protocol-rwdxs5`.
