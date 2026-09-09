# Secretos — maurogasta-crypto/datos (el panel de datos)

Revisado directamente sobre el código del repositorio, 2026-09-09. Ver
`../PROTOCOLO-SECRETOS.md` para las reglas generales y
`../PROTOCOLO-GENERAL.md` § 5 para qué se presenta acá y cómo llega.

**Ojo con el nombre: hay dos repositorios llamados `datos` y no son el mismo.**
Éste —`maurogasta-crypto/datos`, **público**— es el panel: HTML, CSS y
JavaScript, ni un dato adentro. El otro —`casaverdecanas-blip/datos`,
**privado**— es éste, el de los protocolos y los índices. Confundirlos es subir
algo privado a un sitio público.

**Despliegue:** GitHub Pages, *Deploy from a branch* → `main` / `(root)`, en
https://maurogasta-crypto.github.io/datos/. **No hay funciones de servidor y no
hay workflows propios**, así que este proyecto no usa variables de entorno ni
consume ningún GitHub Secret. Si algún día se agrega el chat con un agente desde
el propio panel, eso cambia: sería el primer secreto real del proyecto y la
tabla de abajo se completa en la misma tanda.

**Por qué el repositorio es público, y tiene que serlo:** GitHub Pages no sirve
un sitio privado —en cuenta gratis no funciona desde un repo privado, y con Pro
el sitio publicado es público igual—. Y no hace falta: lo que hay ahí es un
cascarón. Lo que protege los datos son las reglas de Firestore y Authentication.

| Variable | Qué hace | Tipo | Dónde vive el valor real | Consumida por | Verificado |
|---|---|---|---|---|---|
| `firebaseConfig.*` (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) del proyecto `datos-830f8` | Identifican el proyecto Firebase ante la API web; **no dan permisos** — eso lo hacen las reglas | público por diseño | `firebase-init.js`, única copia en el código | todo el panel, vía `firebase-init.js` | leído del repo, 2026-09-09 |
| Contraseña de Mauro | Entrar al panel | dato en runtime | Firebase Authentication. Se cambia por «Olvidé la contraseña», que manda el mail de Firebase | `signInWithEmailAndPassword` en `nucleo.js` | leído del repo, 2026-09-09 |
| El UID de Mauro | **Es la credencial de las reglas**: la función `soyYo()` lo compara | dato de configuración | Publicado en las reglas de la consola de Firebase. El panel lo muestra en la solapa «La puerta» y arma el texto con él adentro | Firestore | leído del repo, 2026-09-09 |
| Contenido de `fichas/` | Titularidad de cuentas, contactos, números | **sensible** | Firestore, protegido por las reglas. **No sale del panel**: no hay exportación, y ningún agente lo lee nunca | sólo el panel, en pantalla | leído del repo, 2026-09-09 |
| Contenido de `proyectos/`, `pendientes/`, `tandas/` | El estado de desarrollo de los cinco proyectos | no sensible | Firestore. Viaja por el chat a propósito, y el panel lo exporta a pedido | el panel; lo genera un agente y lo aplica Mauro | leído del repo, 2026-09-09 |
| Reglas de Firestore de `datos-830f8` | Autoridad real de acceso | configuración de seguridad (copia en repo, autoridad en consola) | Consola de Firebase. La copia está en `reglas.txt` con el UID **sin** completar, a propósito | Firestore | publicadas y comprobadas por Mauro, 2026-09-09 |

Lo que NO está acá y no tiene que estar: el UID real de Mauro, su contraseña, y
cualquier contenido de `fichas/`.

## Las dos zonas

Es la regla de fondo del proyecto y la razón por la que existe:

| | Quién escribe | ¿Pasa por el chat? | Colecciones |
|---|---|---|---|
| **Estado de los proyectos** | lo genera un agente, lo aplica Mauro | **sí** — no es sensible | `proyectos/`, `pendientes/`, `tandas/` |
| **Fichas** | **sólo Mauro**, en el panel | **nunca** | `fichas/` |

Ningún agente tiene ni pide credenciales de `datos-830f8`. Genera un JSON, Mauro
lo carga por archivo, lo revisa y lo aplica. Ése es el mecanismo y es el motivo
por el que lo de `fichas/` está a salvo.

**Las contraseñas no van a las fichas.** Viven en el gestor de contraseñas de
Mauro y en ningún documento — la pantalla lo dice en un renglón destacado.

## La puerta, comprobada

La copia de las reglas en el repositorio se desactualiza en silencio, así que la
autoridad es lo publicado en la consola. El panel trae la única prueba que sirve:
la solapa «La puerta» intenta leer una colección que las reglas no declaran, y
**tiene que fallar**. Esa negativa es lo que demuestra que lo publicado es el
texto de Mauro y no el modo de prueba que deja Firebase al crear la base.

Comprobado el 2026-09-09: dio denegado.

## Titularidad de las cuentas

**Pendiente de completar por Mauro.** Falta anotar de quién es la consola de
Firebase del proyecto `datos-830f8` y la cuenta de GitHub `maurogasta-crypto`.
No es un secreto —la contraseña sí, y ésa no está en ningún documento— pero es
un dato de contacto y por eso vive acá y no en el repositorio público. Ningún
agente lo pide ni lo deduce: lo escribe Mauro.
