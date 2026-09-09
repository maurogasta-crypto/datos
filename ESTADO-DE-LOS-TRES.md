# Estado de los tres sitios contra el protocolo

Relevamiento hecho el **2026-09-07**, leyendo los tres repositorios en una sola
sesión (posible desde hoy, ver `PROTOCOLO-GENERAL.md` § 4). Es una foto: cuando
algo de acá se implemente, se actualiza esta tabla en la misma tanda.

**Para qué sirve este documento:** los tres proyectos resolvieron los mismos
problemas por separado, y cada uno resolvió bien algo que a los otros dos les
falta. Acá está quién tiene qué, y en qué orden conviene cruzarlo.

---

## 1. La matriz

Verificado por búsqueda directa en el código, no por lo que dice la
documentación de cada uno.

| Pieza | casaverdecanas | CasaYourte | Rematetaller |
|---|:---:|:---:|:---:|
| Catálogo `PERMISOS` con detalle escrito | ✅ | ✅ | ✅ |
| `PRESETS` de alta de usuario | ❌ | ❌ | ✅ |
| Reglas: deny por defecto, sin catch-all | ✅ | ✅ | ✅ |
| Reglas: exige `activo == true`, no solo sesión | ✅ | ✅ | ✅ |
| Copia de las reglas en el repositorio | ✅ | ✅ | ✅ |
| `firebase-init.js` como punto único del SDK | ✅ | ✅ | ⚠️ dentro de `utils.js` |
| Caché persistente de Firestore | ✅ | ✅ | ❌ `getFirestore` pelado |
| Ayuda `?` por pantalla | ❌ | ❌ | ✅ |
| Visor de fotos único | ❌ | ❌ | ✅ |
| Pila del botón Atrás | ✅ | ✅ | ❌ |
| `cerrarSesion` limpiando la caché local | ✅ | ❌ | ✅ |
| "Reparar la app" | ✅ | ❌ | ✅ |
| Sellos de versión visibles en la interfaz | ✅ | ✅ | ❌ |
| `env(safe-area-inset-*)` | ✅ | ✅ | ❌ |
| Barra de navegación abajo | ✅ | ✅ | ❌ arriba |
| PWA solo del panel, no de la parte pública | ✅ | ⚠️ por lista `SHELL` | ✅ |
| Iconos derivados de un `icon.svg` | ❌ | ❌ | ✅ |
| Página de diagnóstico de conexiones | ✅ | ✅ | ✅ |
| Diagnóstico que comprueba **las negativas** | ✅ | ✅ | ✅ |
| Diagnóstico independiente del núcleo | ✅ | ✅ | ✅ |
| Documentación técnica en el repositorio | ✅ | ❌ | ✅ |
| Estructura de tres libros | ✅ | ❌ | ✅ |
| `CLAUDE.md` en la raíz | ✅ | ✅ | ✅ |
| `.gitignore` con `.env*` | ✅ | ✅ | ✅ |
| Índice de secretos en `datos` | ✅ | ✅ | ✅ (nuevo) |

Versión del SDK de Firebase: **12.16.0** en `casaverdecanas` y `CasaYourte`,
**10.12.0** en `Rematetaller`.

🕐 = **hecho en una rama, todavía sin mergear a `main`.** No cuenta como
entregado hasta que esté en vivo (§ 7.4 de `PROTOCOLO-DESARROLLO.md`): se pasa a
✅ recién ahí.

*Al 2026-09-09 no queda ninguno.* Los cinco relojes que había se comprobaron
uno por uno contra `main` del repositorio correspondiente y los cinco estaban:
el `CLAUDE.md` y el `.gitignore` de CasaYourte y de Rematetaller, y
`firestore.rules` en la raíz de Rematetaller (8 KB, en `main`). Que la marca
sobreviva al hecho es justamente el error que esta leyenda existe para evitar.

---

## 2. Lo mejor de cada uno

### De `Rematetaller`, para los otros dos
1. **La ayuda `?` de cada pantalla.** Ocho pantallas con la explicación de sus
   propios estados y acciones, autoinyectada desde el núcleo. Es lo que más
   cambia la experiencia de alguien que no construyó el sistema.
2. **El visor de fotos único.** Overlay, `‹ ›`, contador, cierra tocando el
   fondo. Nada abre una pestaña nueva.
3. **Los `PRESETS` de alta.** Dar de alta a alguien es un toque, no cinco.
4. **`icon.svg` como fuente de los iconos**, con las tres reglas del maskable,
   los favicon simplificados y los colores del sistema de diseño.
5. **La puerta con salida:** al que no puede entrar se le explica y se le ofrece
   WhatsApp con el mensaje precargado, y los textos los editan los
   administradores desde el panel.
6. **La forma del puente a un tercero que exige firmar** (nuevo, 2026-09-09 ·
   `PROTOCOLO-DESARROLLO.md` § 4.9). El navegador manda un alias y su token de
   sesión; el servidor traduce, comprueba el permiso en `usuarios/{uid}` leyendo
   **con ese mismo token**, y firma. Sin contraseña compartida y sin credencial
   de servidor de la base. **A quién le sirve ya:** a `casaverdecanas`, que tiene
   funciones de Netlify con `GEMINI_API_KEY` y `CLOUDINARY_API_SECRET` — hoy
   quién puede llamarlas no está atado a `usuarios/{uid}`, y con esta forma lo
   estaría.
7. **El banco de pruebas que corre con `node` a secas** (nuevo, § 11.7). Sin
   npm, sin navegador, con los terceros simulados y firmando de verdad lo que
   hay que verificar. **A quién le sirve:** a los tres. La pantalla de
   diagnóstico prueba el sistema vivo; esto prueba lo que no se puede provocar a
   mano.

### De `casaverdecanas`, para los otros dos
1. **`--piso` y `--techo` sobre `env(safe-area-inset-*)`,** más el molde único
   para lo pegado abajo. Nunca más un número a mano para esquivar las barras.
2. **El volver como enlace, no `history.back()`,** con vocabulario único en el
   núcleo: agregar un tipo lo habilita en las dos direcciones.
3. **La estructura de tres libros y la disciplina de documentación**: la
   documentación entra en la misma tanda que el código, y no se registra como
   entregado nada que no se haya entregado.
4. **La caché persistente de Firestore para los datos**, con el service worker
   ocupándose solo de los archivos.

### De `CasaYourte`, para los otros dos
1. **La pila del botón Atrás** con un solo listener de `popstate`.
2. **Los sellos de versión visibles**, y el criterio de que ante un
   comportamiento raro lo primero que se mira es el sello.
3. **La prueba de que las reglas están vivas**: desactivarse a uno mismo y
   comprobar que el panel te echa. Un minuto, desde el teléfono, y prueba que
   las reglas publicadas son las que se creen publicadas.
4. **El blindaje de `.material-icons`** contra la regla de contenedor que le
   gana en especificidad.
5. **Un solo estado para el contenido.** La costura entre `contenido.json` y
   Firestore produjo más errores que ninguna otra parte del sistema; retirarla
   hizo desaparecer toda una clase de error.
6. **Corregir el original alcanza a todas sus versiones en el mismo acto.**
   *(nace el 2026-09-08, `traducir-14`)* Un sitio con varios idiomas tiene el
   mismo dato escrito N veces, y **corregir el original deja las otras N−1
   diciendo el texto viejo**. Pasó de verdad: una vuelta de traducción al
   inglés trajo 49 correcciones de español y dejó las 49 traducciones al
   francés desactualizadas. Detectarlo después no alcanza. Tres piezas, y las
   tres hacen falta:
   - lo que se manda a traducir **lleva lo que dicen hoy los demás idiomas**;
   - la respuesta **puede traer cualquier idioma**, no sólo el que se pidió;
   - y una traducción que **no cambia** se puede **confirmar** contra el
     original nuevo sin reescribirla. Sin esto último los otros dos no sirven:
     de las 49, **41 no necesitaban ningún cambio** —las correcciones eran
     ortográficas y la traducción ya decía lo correcto— y no había forma de
     decirlo: devolverlas iguales se descartaba como «no hay cambio» y
     quedaban marcadas como desactualizadas para siempre.

   **A quién le sirve:** a `casaverdecanas`, que tiene los textos del sitio en
   `pt`, `es` y `en` dentro de `config/sitio` y se editan a mano, uno por uno,
   sin nada que avise cuando uno se movió y los otros no.

---

## 3. Qué hacer, y en qué orden

Nada de esto está hecho: es la propuesta. **Ninguna de estas tandas se abre sin
que Mauro la apruebe** (`PROTOCOLO-DESARROLLO.md` § 2.14).

### Tanda A — lo que cierra riesgos reales (primero)

| # | Dónde | Qué | Por qué |
|---|---|---|---|
| ~~A1~~ | Rematetaller | ~~Subir `firestore.rules` al repositorio~~ | **Hecho el 2026-09-07** (en la rama). Mauro trajo el texto real de la consola; no se reconstruyó desde la documentación. **Hallazgo:** lo publicado es la **v0.6** y la documentación declaraba la v0.4 vigente — dos versiones sin documentar, y el archivo figuraba como entregado en una tanda de agosto sin haberlo sido |
| A2 | los tres | Correr la prueba de "desactivarse a uno mismo" | **Corrida y en verde en Rematetaller el 2026-09-08**, desde su pantalla de diagnóstico: *«denegado: la regla está publicada y viva»*. Con eso las reglas v0.6 quedan verificadas contra la consola y se cierra el pendiente más viejo del proyecto. **En los otros dos sigue sin correr**, y hasta D11 hay que hacerla a mano desde la consola |
| A3 | CasaYourte | `cerrarSesion()` que limpie la caché local | Sin eso, la próxima persona que use ese teléfono abre el panel con los datos de la anterior. **Es más grande de lo que parecía:** hoy no hay un `cerrarSesion()` — hay cinco salidas sueltas con su propio `signOut` (`admin.html` ×3, `calculo.html`, `diagnostico.html`, `usuarios.html`) y ninguna toca la caché. Arreglar una sola no sirve: primero suben al núcleo (§ 2.2), después se les agrega `terminate()` + `clearIndexedDbPersistence()` |
| ~~A4~~ | CasaYourte | ~~Corregir la tabla de sellos del `README.md`~~ | **Hecho el 2026-09-07** (en la rama). Eran cinco de siete mal, no cuatro. Se corrigió además el texto que invertía la autoridad entre tabla y archivo |
| ~~A5~~ | CasaYourte, Rematetaller | ~~`.gitignore` con `.env*`~~ | **Hecho** (en la rama, junto con el `CLAUDE.md` de cada uno) |

### Tanda B — lo que unifica el uso (lo que se nota)

| # | Dónde | Qué |
|---|---|---|
| B1 | casaverdecanas, CasaYourte | Ayuda `?` por pantalla, portada de Rematetaller |
| B2 | Rematetaller | Pila del botón Atrás, portada de CasaYourte. Su panel ya es instalable: la falta es real |
| B3 | Rematetaller | Barra de navegación abajo + `safe-area-inset` |
| B4 | CasaYourte | "Reparar la app" en la hoja de cuenta |
| B5 | casaverdecanas, CasaYourte | Visor de fotos único |
| B6 | casaverdecanas, CasaYourte | `PRESETS` de alta |
| B7 | los tres | La hoja de cuenta con quién sos, tus permisos, salir y reparar — igual en los tres |
| B8 | Rematetaller | Caché persistente de Firestore (`initializeFirestore` + `persistentLocalCache`). Hoy usa `getFirestore` pelado: el panel se instala pero **sin señal no muestra nada**, y una escritura con mala señal no se encola |

### Tanda C — lo que ordena el trabajo a futuro

| # | Dónde | Qué |
|---|---|---|
| C1 | CasaYourte | Su documentación técnica en el repositorio, con la estructura de tres libros. Hoy el código cita "Libro 1 §3.12" y **el Libro 1 no existe en el repo**. ⚠️ **Contradicción a resolver antes de empezar:** el `.gitignore` que se agregó en la rama ignora explícitamente `CASAYOURTE-DOCUMENTACION.md`, y el `README.md` la lista en "No subir acá". O entra al repo (y sale del `.gitignore`), o C1 no se hace — las dos no pueden quedar. Decisión de Mauro |
| C2 | Rematetaller | Sellos de versión visibles en las páginas HTML (su propia documentación lo tiene anotado como pendiente) |
| C3 | Rematetaller | Sacar el SDK de Firebase a un `firebase-init.js` propio, y evaluar subir de 10.12.0 |
| C4 | los tres | Que cada sistema de diseño declare qué variable suya cumple cada rol de `PROTOCOLO-DESARROLLO.md` § 3.1 |
| C5 | casaverdecanas | Confirmar si la variable global de CallMeBot sigue existiendo o ya se retiró (ver `secretos/casaverdecanas.md`) |


### Tanda D — el lenguaje, el procedimiento y el registro (relevamiento en § 5)

Es el eje que Mauro pidió unificar: **un mismo lenguaje, un mismo procedimiento y
un registro común de desarrollos y trabajos.** Va aparte de A/B/C porque no agrega
funciones a ningún sitio: ordena cómo se trabaja y cómo queda constancia. Se
ordena igual que las otras — primero lo que ya está roto, después lo que evita
que se rompa de nuevo.

| # | Dónde | Qué | Por qué |
|---|---|---|---|
| ~~D1~~ | Rematetaller | ~~Recuperar las tandas 13 a 19 al Libro 2~~ | **Hecho el 2026-09-07** (en la rama). Reconstruidas como v0.5.6 a v0.5.12, con la distinción explícita entre lo que es registro (el texto de la cabecera de `utils.js`, las fechas y archivos de los commits) y lo que es deducción (la correspondencia tanda-entrega, los números de versión, y sobre todo las tandas 14 y 18, que no tocaron el núcleo). La cabecera de `utils.js` deja de ser autoridad y lo dice |
| ~~D2~~ | `datos` | ~~Escribir la sección de registro que falta~~ | **Hecho el 2026-09-07.** Es el § 7.8 nuevo: qué es una entrada, sus cuatro partes, que el título dice hasta dónde llega, que el registro no vive en la cabecera de un archivo de código, y que un registro es la intención de quien lo escribió — la verificación es abrir la consola |
| ~~D3~~ | `datos` | ~~Subir al protocolo el § 7bis de Casa Verde~~ | **Hecho el 2026-09-07.** Es el § 8.1: el número sale de la `VERSION` del `sw.js`, con las dos fuentes de las que NO sale y qué hacer si el proyecto no tiene service worker |
| ~~D4~~ | `datos` | ~~Completar el § 8 con lo mejor del § 8 de Rematetaller~~ | **Hecho el 2026-09-07.** El § 8 quedó en cuatro partes. La de retirar una función salió de Casa Verde, que la tenía bastante mejor que Rematetaller |
| D5 | CasaYourte | **Darle un registro.** Es el único de los tres sin ninguno: su historia está solo en los commits | Va junto con C1 (su Libro 1), no antes: el registro sin el reglamento es media estructura |
| ~~D6~~ | `datos` | ~~Corregir el § 3 y sumarle los nombres compartidos~~ | **Hecho el 2026-09-07.** El canónico pasó al nombre de la mayoría (`subirImagen`, `toast`), y el § 3.2 nuevo mapea dieciséis conceptos más, verificados abriendo cada función. Encontró dos defectos reales: `verItem` lee `it.permiso` en Casa Verde e `it.perm` en CasaYourte, y `CY.esc` no escapa la comilla simple mientras los otros dos sí (hoy no rompe nada — verificado). Los dos quedan como D9 y D10 |
| D8 | Rematetaller | **Darle a su `sw.js` un contador que no se pueda saltear**, o aceptar por escrito que no lo tiene y que su registro es el único contador. Hoy su `CACHE_NAME` está clavado en `v1` desde que existe, y de paso está mal escrito: dice `ratetaller`, sin la «me» | Encontrado al verificar la regla del § 8.1 recién escrita contra los tres. Es el eslabón que faltaba: el único de los tres sin contador obligatorio es el único cuyo registro se detuvo. **Toca una PWA en vivo: decisión de Mauro antes de nada** (§ 2.14) |
| D14 | casaverdecanas | **Sumarle a su diagnóstico la comparación del shell**: la `VERSION` que declara `interno/sw.js` contra la caché activa | Ya la tienen Rematetaller y CasaYourte. Casa Verde es el que más se beneficia: su `VERSION` va por `cv2-shell-v105`, o sea que se mueve de verdad, así que ahí la prueba sí puede fallar y por lo tanto vale |
| D9 | casaverdecanas, CasaYourte | **Unificar el campo que lee `verItem`**: `it.permiso` en uno, `it.perm` en el otro. Va al nombre de la mayoría cuando haya mayoría; hoy es uno y uno, así que lo elige Mauro | Mismo nombre, misma idea, campo distinto: copiar un ítem de la barra de un proyecto al otro lo rompe en silencio. Es la divergencia que la tabla del § 3.2 vino a hacer visible |
| D10 | CasaYourte | **Que `CY.esc` escape también la comilla simple**, como el `esc` de Casa Verde y el `escapar` de Rematetaller | Dos funciones que se llaman igual tienen que hacer lo mismo. **Hoy no rompe nada** —verificado: no hay atributos con comillas simples armados con `esc()`— pero el día que se escriba `title='${esc(x)}'`, el apóstrofo de un nombre se sale del atributo. Arreglo de una línea |
| ~~D11~~ | casaverdecanas, CasaYourte | ~~Sumarles la comprobación de las negativas~~ | **Hecho el 2026-09-08.** CasaYourte suma tres (incluida la de desactivarse, que ahí sí es segura) y sube a `cy-shell-v26` porque su `diagnostico.html` está en el `SHELL`. Casa Verde suma tres y **no corre la cuarta a propósito** — ver A7 |
| ~~A7~~ | casaverdecanas | ~~Sus reglas dejan que un admin se desactive y se cambie el rol~~ | **Hecho el 2026-09-08** (T11.60, `cv2-shell-v107`, ya en `main`). El bloque de `usuarios` pasa a `allow update: if (esAdmin() && (no es tu propio uid \|\| rol y activo sin cambiar)) \|\| (...)`, y `delete` deja de alcanzar al propio documento. Era la **última diferencia real** entre las reglas de los tres. Con eso, la cuarta negativa del diagnóstico —desactivarte a vos mismo— **pasa a correrse**, con reversión en el acto por si las reglas publicadas todavía están viejas. Y apareció que el botón de desactivar **ya se escondía** en tu propia fila: la interfaz estaba bien y la regla no, que es exactamente lo que el § 4.3 previene. ⚠ **Falta que Mauro publique `interno/firestore.rules` en la consola** (§ 4.8): hasta entonces el archivo dice una cosa y la base hace otra, y el diagnóstico lo avisa |
| ~~D12~~ | Rematetaller | ~~Que su pantalla deje de depender del núcleo~~ | **Hecho el 2026-09-08** (Tanda 21, v2.0, ya en `main`). Carga el núcleo con `import()` dinámico dentro de un `try`, mira la sesión con `authStateReady()` sin redirigir, lleva sus propios estilos y las secciones 1 y 2 corren sin núcleo ni sesión. Suma además su propio sello visible — el primer HTML del proyecto que lo lleva, o sea el primer paso de C2 |
| ~~D13~~ | CasaYourte | ~~Que su pantalla no dependa del núcleo~~ | **Hecho el 2026-09-08** (`diagnostico-5`, `cy-shell-v27`, ya en `main`). Y al rehacerla apareció que **estaba rota desde que nació**: su prueba 1 usaba `firebaseConfig` sin importarlo, y sin aislamiento entre pruebas eso dejaba sin correr todas las siguientes — incluidas las negativas que D11 le había agregado el día anterior. De ahí salió el § 11.4 |
| A6 | Rematetaller | **Cargar `config/publico`**: Configuración → contacto y textos públicos. Hoy el documento no existe | **Encontrado por la pantalla de diagnóstico en su primera corrida.** Sin ese documento la puerta pública dice *«escribile por WhatsApp a Florencia»* y **oculta el botón de WhatsApp**, porque el teléfono viene vacío: quien llega con la llave vencida lee a quién escribirle y no tiene con qué. Es lo que el § 9.1 de `PROTOCOLO-INTERFAZ.md` prohíbe, en el proyecto que ese párrafo cita como el modelo. No es un bug —el código maneja bien la ausencia— es un dato que falta. Lo carga Mauro desde el panel, un minuto |
| ~~D7~~ | — | ~~Resolver `toast` y `avisar` en Casa Verde~~ | **Se retira: la premisa era falsa.** No son dos nombres para lo mismo (ver § 5.1, punto 2). No hay trabajo que hacer acá |

**El orden importa y no es negociable en un punto:** D1 antes que nada. Es la
única de las siete que repara algo ya roto; las demás evitan que se vuelva a
romper. D2, D3 y D4 son escritura en `datos` y se pueden hacer juntas.

**Dos decisiones para Mauro antes de abrir D6**, porque cambian qué se escribe:
si el canónico se corrige al nombre que ya usa la mayoría, o si se acepta que
esas filas converjan de a poco cuando alguien toque esos archivos por otro motivo.


---

## 4. Lo que se decidió NO unificar, y por qué

Vale escribirlo para que nadie lo "arregle" más adelante creyendo que es un
descuido:

- **El nombre del archivo núcleo** (`nucleo.js` / `utils.js`). Renombrarlo obliga
  a tocar el `import` de cada HTML de un sitio en vivo, desde el teléfono, a
  cambio de cero beneficio visible.
- **Los nombres de las variables de color.** Son parte de la marca de cada
  sitio. Lo que se unifica son los roles, no los nombres.
- **El namespace** (`CV2.` / `CY.` / exports sueltos). Mismo motivo.
- **El mecanismo de la puerta pública.** Tres problemas distintos: un QR pegado
  en una pared, un catálogo abierto, una llave que vence. Se unifica el trato a
  quien no puede entrar, no el mecanismo.
- **Que los tres compartan un repositorio de código común.** Serían tres
  proyectos con una dependencia que hay que versionar, sin build y sin npm para
  manejarla. Se comparte el protocolo, no el código.

---

## 5. Lenguaje, procedimiento y registro

Las secciones 1 a 4 miran **qué tiene cada sitio**. Esta mira otra cosa: si los
tres hablan el mismo idioma, trabajan del mismo modo y **dejan registro del mismo
modo**. Relevado el 2026-09-07 leyendo los tres núcleos y los tres documentos, no
lo que cada uno dice de sí mismo.

Es el eje que más importa a futuro, porque de los tres es el único que **se
degrada solo**: el código se rompe y se nota; un registro que se detiene no
avisa nunca.

### 5.1 · El lenguaje: la tabla del § 3 contra el código real

`PROTOCOLO-DESARROLLO.md` § 3 fija once nombres canónicos. Cumplimiento real:

| Concepto | Canónico | casaverdecanas | CasaYourte | Rematetaller |
|---|---|:---:|:---:|:---:|
| Catálogo de permisos | `PERMISOS` | ✅ | ✅ | ✅ |
| ¿Es administrador? | `esAdmin()` | ✅ | ✅ | ✅ |
| ¿Tiene este permiso? | `puede(id)` | ✅ | ✅ | ✅ |
| Capa del botón Atrás | `capaAtras()` | ✅ | ✅ | ❌ |
| Cerrar sesión | `cerrarSesion()` | ✅ | ❌ | ✅ |
| Reparar la app | `repararApp()` | ✅ | ❌ | ✅ |
| Combinaciones de alta | `PRESETS` | ❌ | ❌ | ✅ |
| Ver una foto en grande | `mostrarFoto()` | ❌ | ❌ | ✅ |
| Ayuda de la pantalla | `iniciarAyuda()` | ❌ | ❌ | ✅ |
| Subir una foto | `subirFoto()` → **`subirImagen()`** | ✅ `subirImagen` | ✅ `subirImagen` | ⚠️ `subirFoto` |
| Aviso breve | `aviso()` → **`toast()`** | ✅ `toast` | ⚠️ `aviso` | ✅ `toast` |

**Tres cosas que salen de acá y no se veían mirando un proyecto solo:**

1. **El nombre canónico perdió la votación dos veces.** `subirFoto` lo usa uno de
   tres —los otros dos dicen `subirImagen`— y `aviso` también uno de tres. Los dos
   canónicos salieron de Rematetaller. Y como el propio § 3 dice que lo que ya
   existe con otro nombre **solo se renombra si se está tocando ese archivo por
   otro motivo**, en la práctica esos dos canónicos no van a llegar nunca. O se
   cambia el canónico al nombre que ya usa la mayoría, o se acepta que esas dos
   filas son decorativas.
2. **Corregido el 2026-09-07, en el mismo día:** la primera versión de este
   relevamiento decía que `casaverdecanas` tenía dos nombres para la misma idea,
   `toast` y `avisar`. **Es falso.** `CV2.toast` es el aviso breve en pantalla;
   `CV2.avisar` manda notificaciones por mail y WhatsApp y devuelve un informe de
   qué se envió a quién. No se parecen en nada más que en el nombre. Se había
   deducido de una lista de nombres exportados sin abrir las funciones — el mismo
   error que estos protocolos le exigen a un agente no cometer, cometido acá
   mismo. **Se deja escrito porque el punto de este documento es que lo que se
   afirma salga de leer el código, no de que suene razonable.**
3. **La tabla cubre once conceptos y el vocabulario realmente compartido es mucho
   más grande.** Entre `casaverdecanas` y `CasaYourte` hay una veintena de nombres
   idénticos que el § 3 no menciona: `renderNav`, `verificarAuth`, `usuario`,
   `avatarHTML`, `inicialesDe`, `urlEntrega`, `esCloudinary`, `registrarSW`,
   `verItem`, `GRUPOS`, `NAV`, `ENTREGA`… Están unificados **de hecho**, por
   herencia, sin que ningún documento lo diga — así que nada los protege de
   divergir. Y ya empezaron: `verItem` es la misma función en los dos, pero lee
   `it.permiso` en Casa Verde y `it.perm` en CasaYourte.

Fuera de tabla y también divergentes: `esc` (CV, CY) vs `escapar` (Rematetaller),
`fmtMonto` (CV) vs `fmtMoneda` (Rematetaller).

### 5.2 · El procedimiento: dos flujos buenos, distintos, y ninguno compartido

| | casaverdecanas | CasaYourte | Rematetaller |
|---|---|---|---|
| ¿Tiene flujo de tandas escrito? | ✅ § 7 y § 7bis | ❌ ninguno | ✅ § 8 |
| ¿De dónde sale el número de tanda? | ✅ de la `VERSION` del `sw.js` | — | ❌ no dice |
| ¿Qué acción manual queda pendiente al entregar? | — | — | ✅ punto 3 |
| ¿Cómo se retira una función? | — | — | ✅ punto 8 |

Cada uno resolvió una mitad distinta y **el protocolo común no tiene ninguna de
las dos**. Su § 8 son siete pasos que no dicen ni de dónde sale el número de
tanda ni qué se declara al entregar.

Lo mejor de cada uno, para subir al protocolo:

- **De Casa Verde, el § 7bis:** el número de tanda sale de la `VERSION` del
  `sw.js`, porque es el único contador que avanza exactamente una vez por tanda y
  que nadie puede saltear. Nació de numerar mal dos veces seguidas con dos
  sesiones trabajando en paralelo — el problema exacto que este ecosistema tiene
  ahora que un chat puede abrir los cuatro repos.
- **De Rematetaller, el § 8:** no se mezclan asuntos entre tandas; al entregar se
  dice qué acción manual queda pendiente; cambiar un estado sin cambiar su ayuda
  `?` deja una explicación falsa adentro del sistema; y **un registro es la
  intención de quien lo escribió, la verificación es abrir la consola**.

### 5.3 · El registro: acá está la deuda grande

| | casaverdecanas | CasaYourte | Rematetaller |
|---|---|---|---|
| ¿Hay registro? | ✅ Libro 2 | ❌ **ninguno** | ⚠️ Libro 2, **detenido** |
| ¿Al día? | ✅ v5.70, T11.55–57 | — | ❌ **última entrada: Tanda 12** |
| Formato del título | `# v5.70 — … (T11.55 a T11.57)` | — | `## v0.5.5 — … (Tanda 12 · fecha)` |
| Numeración | `T<libro>.<n>` | — | `Tanda <n>` |

**El hallazgo que ordena todo lo demás:** el Libro 2 de Rematetaller termina en
la **Tanda 12**, y la cabecera de `interno/utils.js` registra las tandas **13, 15,
16, 17 y 19**. Hay siete tandas de trabajo real que nunca llegaron al registro
oficial, y mientras tanto **el changelog se mudó solo a la cabecera de un archivo
de código**: dos registros paralelos, que es exactamente lo que § 7.2 dice que no
se hace.

Y no quedó ahí. Todo lo que se encontró roto en Rematetaller el 2026-09-07 cuelga
de esto: el inventario § 6 decía `utils.js` 1.6 cuando iba por 1.11, decía
`firestore.rules` 0.4 cuando la consola tenía 0.6, y una tanda de agosto declaró
**entregado** un archivo que nunca existió. **Cuando el registro se detiene, el
inventario deriva y "entregado" deja de significar algo** — no son cuatro
problemas, es uno.

`CasaYourte`, mientras tanto, no tiene registro de ninguna clase: su historia vive
solo en los commits de git, y su código cita "Libro 1 §3.12" de un libro que no
está en el repositorio (C1).

**Y el protocolo común le dedica al registro una sola línea** (§ 7.3): dice que el
Libro 2 existe. No dice qué lleva una entrada, cómo se numera, ni cómo se
mantiene sincronizado con el inventario.

---

*Foto del 2026-09-07. Cada tanda que implemente algo de la sección 3 actualiza
la matriz de la sección 1 en la misma entrega.*

*Segunda pasada del mismo día: A4 y A5 hechos (en la rama, sin mergear); A1 y A2
de Rematetaller pasan a ser una sola tanda y se anota qué parte no puede hacer un
chat; A3 y C1 corregidos contra el código real, que en los dos casos era más de
lo que decía la ficha.*

*Tercera pasada: se suma el eje que faltaba —lenguaje, procedimiento y registro
(§ 5)— con su Tanda D. El hallazgo que la ordena: el registro de Rematetaller está
detenido en la Tanda 12 mientras el código va por la 19, y de esa parálisis
cuelgan el inventario desactualizado, las reglas dos versiones atrás y el archivo
declarado entregado sin existir. A1 cerrado; falta A2.*

*Cuarta pasada (8-sep): Rematetaller suma su pantalla de diagnóstico (su Tanda 20),
que era el único de los tres sin una. Al escribirla apareció que las tres pantallas
prueban cosas distintas: solo la nueva comprueba **las negativas** —que lo que las
reglas deben denegar efectivamente se niegue—, que es lo único que prueba que las
reglas están publicadas. Alinear las otras dos queda como D11.*

*Octava pasada (8-sep): la primera corrida real de la pantalla de CasaYourte
mostró una caché dos versiones atrás de la publicada **sin que la pantalla lo
señalara**. De ahí sale la prueba del shell —el nombre de caché que declara el
`sw.js` contra el que se sirve—, ya en Rematetaller y CasaYourte, pendiente en Casa
Verde (D14). Y dos convenciones más al § 11.2: el informe copiable va al final, y
una negativa esperada se reporta ⚠️ y no ❌.*

*Séptima pasada (8-sep): D13 hecho, y con él las tres pantallas quedan
independientes del núcleo y comprobando las negativas. El hallazgo: la de CasaYourte
estaba rota desde que nació —un `ReferenceError` sin aislar que mataba todas las
pruebas desde la segunda—, así que la entrega de D11 ahí había sido código muerto.
Verifiqué que parseara, no que corriera. De eso salen el § 11.4 (cada prueba
aislada) y el agregado al § 8.2 paso 4: parsear no es correr.*

*Sexta pasada (8-sep): D11 y D12 hechos. Las tres pantallas comprueban las
negativas, y la de Rematetaller se rehízo para no depender de lo que diagnostica —
un error mío de la tanda anterior, que Casa Verde ya tenía resuelto y escrito. Queda
CasaYourte como la única cuya pantalla depende del núcleo: es D13.*

*Quinta pasada (8-sep): la pantalla corrió por primera vez. **A2 cerrado en
Rematetaller** —las reglas v0.6 quedaron verificadas contra la consola— y apareció
A6, un defecto en vivo de la puerta pública que nadie había visto. De esa corrida
salió el § 11 del protocolo: el proceso de verificación, con la regla de que después
de dos intentos sobre el mismo problema el tercero no es un intento, es una medición.*

---

## 6. El sexto proyecto, y por qué no entra en la matriz

Sumado el **2026-09-09**. `toromboto/harmonia` — diccionario armónico,
improvisación y colores tonales, para tango, jazz, piano y bandoneón.

**No comparte la arquitectura de los tres.** React + Vite + Tailwind, con build
y con `npm`, desplegado en Vercel. No tiene Firestore, ni Auth, ni Cloudinary:
todo su estado vive en el `localStorage` del teléfono. Por eso **no se agrega
como cuarta columna** de la matriz del § 1: casi todas esas filas no le
aplicarían, y una columna llena de guiones no informa nada — sugiere una deuda
que no existe.

Lo que sí comparte, y por lo que está en el ecosistema:

| | |
|---|---|
| Reglas de secretos | índice en `secretos/harmonia.md`, `.gitignore` de la plantilla, valores sólo en Vercel y cargados a mano |
| Documentación | `CLAUDE.md` con la estructura de `PROTOCOLO-GENERAL.md` § 3 — **no lo tenía**, se le escribió en la misma tanda |
| Entrega | la documentación sube con el código, y no se declara entregado lo que no se entregó |
| El banco de pruebas sin dependencias | § 11.7, en las dos direcciones: lo estrenaron el mismo día `remate` y `harmonia` |

### Lo que le enseñó al resto

**La línea que importa no es «tiene build o no», es «se puede editar y verificar
desde el teléfono».** Harmonía cumple lo segundo por otro camino: la parte que
se toca seguido vive en `public/`, que Vite copia tal cual, sin compilar. Es
una tercera respuesta a la restricción del § 1 de `PROTOCOLO-DESARROLLO.md`, y
no se le había ocurrido a nadie porque los tres sitios nunca tuvieron build.

**Y una que se descubrió cargando la página en un navegador de verdad:** un
`import` estático desde un CDN es un punto único de falla para la página
entera. Si el CDN no contesta —un ascensor, un tren, una red que filtra— no
falla la parte que lo usa: **falla todo, en blanco y sin un mensaje**. La forma
correcta es carga diferida, en el momento en que hace falta, con el error
dicho. Aplica a cualquiera de los tres que cargue algo por CDN, que son los
tres.

### Lo que le falta, respecto de los otros

| | |
|---|---|
| Documentación técnica en el repositorio | ❌ — tiene `README.md`, `GESTOS.md` y `DESPLIEGUE.md`, pero no la estructura de tres libros |
| Un núcleo que no se duplica | ❌ — `src/App.jsx` es un monolito de 3268 líneas, y `src/theory/`, `src/audio/` y `src/components/` **existen pero no se importan**: están duplicados adentro, algunos por triplicado |
| Sellos de versión | ⚠️ — los tiene `public/gestos/`, no `src/` |
| Titularidad de las cuentas | ⚠️ — ver `secretos/harmonia.md`: se sabe la cuenta de GitHub, no la de Vercel |

Ese monolito es el equivalente de Harmonía a lo que en los tres sitios costó
caro: un estado paralelo que nadie retiró a tiempo (§ 2.2 y § 2.4 de
`PROTOCOLO-DESARROLLO.md`). No es urgente, pero está anotado acá para que la
próxima sesión que abra `src/theory/notes.js` sepa, antes de mejorarlo, que no
lo usa nadie.
