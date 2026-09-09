# Protocolo de desarrollo — el reglamento común a los tres sitios

Este documento define **cómo se construye** en `casaverdecanas`, `CasaYourte` y
`Rematetaller`. Es el par técnico de `PROTOCOLO-INTERFAZ.md`, que define cómo se
**usan**.

No nace de una teoría: nace de leer los tres repositorios el 2026-09-07 y
encontrar que ya resolvieron los mismos problemas por caminos distintos —y que
cada uno resolvió bien algo que a los otros dos les falta. El estado real de
cada uno, y qué le falta adoptar, está en `ESTADO-DE-LOS-TRES.md`.

> **Jerarquía.** Este documento manda sobre la documentación técnica de cada
> proyecto, y la de cada proyecto manda sobre su código. Si una implementación
> contradice a esto, la implementación está mal. Si una decisión nueva
> contradice a esto, **primero se actualiza este documento y después se escribe
> el código**. Esa regla ya existía en los reglamentos de `casaverdecanas` y de
> `Rematetaller` por separado; acá pasa a valer para los tres.

---

## 1. La forma común: qué son estos tres proyectos

Los tres son **la misma arquitectura**, y conviene decirlo explícito porque es
lo que hace que valga la pena unificarlos:

| | |
|---|---|
| Frontend | HTML/CSS/JS a mano, módulos ES, `template literals`, `?.`. **Sin build, sin npm, sin frameworks, sin `package.json`** |
| Despliegue | GitHub Pages, publicando directo de la raíz de `main`. Lo que se sube queda en vivo, sin etapa intermedia |
| Base de datos | Firestore. La seguridad la aplican las **Security Rules del servidor**, nunca la interfaz |
| Sesiones | Firebase Auth (mail + contraseña) |
| Fotos | Cloudinary, subida desde el navegador con **upload preset sin firma** |
| Backend | Ninguno, salvo `casaverdecanas`, que tiene funciones de Netlify subidas a mano por .zip |
| Dispositivo | **Teléfono Android.** El escritorio es el caso raro |
| Idioma | Rioplatense, voseo — en la interfaz y en la documentación |

**Las dos restricciones que explican casi todas las reglas de abajo:**

1. **Se trabaja desde el teléfono.** GitHub web, consola de Firebase, la propia
   interfaz. Si algo no se puede hacer desde el teléfono, no está terminado.
2. **No hay etapa intermedia.** Lo que se sube está en vivo para todo el mundo
   en el minuto siguiente. No hay `staging`, no hay revisión, no hay rollback
   más que volver a subir el archivo anterior.

**Nada de esto es accidental y no se cambia sin decisión explícita de Mauro.**
Agregar un build, un framework o un `package.json` a cualquiera de los tres
rompe la restricción 1 y no se hace por iniciativa de un agente.

---

## 2. Reglas de código

Cada una nació de un problema real en alguno de los tres. Se rompen bajo propio
riesgo. Las que llevan `[origen]` dicen en qué proyecto se pagó el precio.

### 2.1 · Archivos completos, nunca diffs `[Rematetaller]`
Toda modificación se entrega como **archivo completo listo para subir
sustituyendo al anterior**. Aplicar un parche a mano en una pantalla de 6
pulgadas es cómo se rompe un archivo que funcionaba.

### 2.2 · Un solo núcleo por proyecto, y no se duplica `[los tres]`
Firebase, sesión, navegación, permisos, subida de fotos, avisos y helpers viven
en **un** archivo por proyecto. Si una función se necesita en dos páginas, sube
al núcleo en la misma tanda; no se copia.

Hoy ese archivo se llama `nucleo.js` en `casaverdecanas` y en `CasaYourte`, y
`utils.js` en `Rematetaller`. **No se renombra.** Renombrarlo obliga a tocar el
`import` de cada HTML de un sitio en vivo, desde el teléfono, a cambio de cero
beneficio para quien lo usa. Lo que sí se unifica es **el vocabulario de
adentro** (§3).

### 2.3 · Un solo punto de contacto con el SDK de Firebase `[casaverdecanas → CasaYourte]`
Ninguna página importa de `gstatic` directamente: todo pasa por un módulo
`firebase-init.js` (o el bloque equivalente del núcleo). **La versión del SDK
vive en un solo lugar.**

Estado real hoy: `casaverdecanas` y `CasaYourte` usan **12.16.0** y tienen su
`firebase-init.js`; `Rematetaller` usa **10.12.0** desde adentro de `utils.js`.
Que dos proyectos corran versiones distintas del SDK no es un problema en sí
—no comparten código— pero sí lo es que cada uno lo descubra tarde. La versión
va escrita en la documentación de cada proyecto.

### 2.4 · Una sola fuente para cada dato `[Rematetaller]`
Ningún dato vive en dos lugares. Corolario duro: **los derivados no se
guardan**. El estado de pago de una venta se calcula al leer; el
disponible/agotado de un producto se deriva del stock. Guardar un derivado es
crear una mentira con fecha de vencimiento, y aparece justo cuando importa.

`CasaYourte` aprendió lo mismo por el otro lado: hasta agosto de 2026 el
contenido del sitio vivía a la vez en `contenido.json` y en Firestore, con una
exportación manual en el medio. **Esa costura entre dos estados produjo más
errores que ninguna otra parte del sistema.** Hoy hay un solo estado
—`sitio/publicado` en Firestore— y el JSON quedó como respaldo.

### 2.5 · IDs determinísticos para todo lo que genera el sistema `[Rematetaller]`
`pedidos/ped-<codigo>`, `ventas/venta-ped-<codigo>`. Con eso, hacer dos veces la
misma operación sobrescribe en vez de duplicar. **La idempotencia no es
elegancia: es la única defensa contra el doble toque en un teléfono con mala
señal.**

### 2.6 · Una escritura del sistema nunca borra el trabajo de una persona `[Rematetaller]`
Al re-generar un documento, los campos que cargó alguien **se preservan**; los
campos nuevos se inicializan solo si faltan.

### 2.7 · Retrocompatibilidad de datos `[Rematetaller]`
La base ya tiene datos cargados. Cambiar la forma de un documento nunca puede
dejar invisible lo viejo. Y la trampa concreta que costó caro: **no se usa
`orderBy` server-side sobre un campo que los documentos viejos no tienen** —
Firestore excluye del resultado los que no lo tienen, así que ordenar por
`nombre` hace desaparecer todo el inventario viejo **sin error**. Se ordena del
lado del cliente, con la función que resuelve el nombre viejo y el nuevo.

### 2.8 · Las fechas dentro de arrays van en milisegundos `[Rematetaller]`
`serverTimestamp()` no funciona dentro de un array. Adentro de un array,
`Date.now()`. Fuera, `serverTimestamp()` como siempre.

### 2.9 · Toda imagen entra por la función del núcleo `[los tres]`
Ninguna página arma su propia llamada a Cloudinary. La función del núcleo
comprime, sube y devuelve la URL. Se guarda siempre **la copia propia en
Cloudinary, nunca una URL ajena**.

### 2.10 · Los errores muestran la causa, no el código HTTP `[Rematetaller]`
Un "Error 400" no se puede diagnosticar; "Upload preset not found" se resuelve
en un minuto. La función que falla **devuelve al aviso el mensaje que manda el
servicio**. Esta regla, sola, destrabó el problema que tenía bloqueada la carga
de fotos en `Rematetaller`.

Corolario de `casaverdecanas`: **un `catch` que traga un error de permisos es un
error invisible**, y un mensaje de error sin código es un problema de dos
minutos convertido en tres días.

### 2.11 · Sintaxis validada antes de entregar `[Rematetaller]`
Antes de dar un archivo por entregado se valida que el JS parsea. **Un error de
sintaxis en un módulo ES no rompe una función: deja la página en blanco**, sin
nada visible que explique por qué.

### 2.12 · Lo que se puede arreglar en el sistema de diseño no se arregla página por página `[casaverdecanas]`
Si el mismo retoque hace falta en dos pantallas, va a la hoja común.

### 2.13 · Simple gana `[Rematetaller]`
Ante dos diseños que resuelven lo mismo, va el que tiene menos piezas. Se
prefiere **repetir un patrón que ya existe en el proyecto** antes que inventar
uno nuevo. Y ahora también: se prefiere **repetir un patrón que ya existe en
otro de los tres proyectos** antes que inventar uno propio.

### 2.14 · Decisión antes que código `[Rematetaller]`
Las decisiones estructurales se cierran con Mauro antes de escribir la primera
línea. Y el agente avisa —sin que se le pregunte— cuando una estructura se
volvió confusa y conviene simplificarla.

### 2.15 · Corregir el original alcanza a sus copias en el mismo acto `[CasaYourte]`
Cuando un dato existe **escrito más de una vez** —el mismo texto en tres
idiomas, un precio en dos pantallas—, corregir el original **deja a las copias
diciendo lo viejo**. La regla es que las dos cosas pasen en la misma tanda, no
que quede anotado para después.

**No alcanza con detectarlo.** El 2026-09-08, en `CasaYourte`, una vuelta de
traducción al inglés trajo 49 correcciones de español, y las 49 traducciones al
francés quedaron traduciendo el texto anterior. El sistema las detectó todas
—esa parte funcionaba— y aun así el sitio estuvo diciendo dos cosas distintas
hasta que a alguien le tocara mirar el francés.

Lo que hizo falta, y sirve para cualquier caso de esta forma:

1. **Lo que se manda a corregir lleva lo que dicen hoy las copias.** Si no están
   a la vista, no se pueden traer al día.
2. **La respuesta puede tocar cualquiera de ellas**, no sólo la que se pidió.
3. **Y una copia que NO cambia se puede confirmar sin reescribirla.** Sin esto
   los dos puntos anteriores no sirven: de aquellas 49, **41 no necesitaban
   ningún cambio** —las correcciones eran ortográficas y el francés ya decía lo
   correcto— y no había forma de decirlo. Devolverlas iguales se descartaba
   como «no hay cambio», y quedaban marcadas como desactualizadas para siempre.
   **«Sin cambio» y «revisado y está bien» no son lo mismo**, y un sistema que
   no puede distinguirlos obliga a reescribir texto que estaba bien sólo para
   sacarlo de la lista.

Y cuando aun así queda una copia afuera, **se dice antes de escribir**, con el
número: «esto deja N traducciones diciendo el texto anterior».

---

## 3. Vocabulario común

Esto es lo que sí se unifica, porque es lo que hace que Mauro pueda saltar de un
proyecto a otro sin recordar tres dialectos. **Nombre nuevo que se escriba en
cualquiera de los tres, se escribe así.** Lo que ya existe con otro nombre se
renombra solo si se está tocando ese archivo igual por otro motivo.

| Concepto | Nombre canónico | Notas |
|---|---|---|
| Catálogo de permisos | `PERMISOS` | array de `{ id, label, icono, detalle }` |
| ¿Es administrador? | `esAdmin()` | |
| ¿Tiene este permiso? | `puede(id)` | el admin siempre puede |
| Combinaciones de alta | `PRESETS` | array de `{ id, label, permisos:[ids] }` |
| Subir una foto | `subirImagen(archivo, maxLado)` | devuelve la URL de Cloudinary |
| Ver una foto en grande | `mostrarFoto(urls, indice)` | visor único, a pantalla completa |
| Ayuda de la pantalla | `iniciarAyuda(titulo, html)` | inyecta el `?` junto al `<h1>` |
| Aviso breve | `toast(texto, tipo)` | el aviso breve de abajo, que desaparece solo |
| Cerrar sesión | `cerrarSesion()` | limpia además la caché local (§5.4) |
| Borrar cachés y recargar | `repararApp()` | no toca el servidor |
| Capa sobre el botón Atrás | `capaAtras(cerrar)` | devuelve la función que la cierra |

> **Dos nombres canónicos se corrigieron el 2026-09-07, y por qué importa cómo.**
> Eran `subirFoto` y `aviso`, y los dos salían de `Rematetaller` — o sea que **los
> usaba un proyecto de tres**. Como la regla de arriba dice que un nombre existente
> solo se renombra si igual se está tocando ese archivo por otro motivo, esos dos
> canónicos no iban a llegar nunca: la tabla iba a decir durante años algo que dos
> de cada tres proyectos no cumplen.
>
> Pasaron a `subirImagen` y `toast`, que son los que ya usa la mayoría. **El
> criterio que queda: cuando un canónico y la realidad no coinciden, gana el que
> ya está escrito en más lugares, salvo que haya una razón concreta para lo
> contrario.** Un vocabulario común no se impone, se constata — si no, es una lista
> de deseos que envejece.

**El namespace se respeta como está:** `CV2.` en `casaverdecanas`, `CY.` en
`CasaYourte`, exports sueltos en `Rematetaller`. Lo que importa es que
`CV2.puede`, `CY.puede` y `puede` signifiquen exactamente lo mismo.

### 3.1 · Tokens de color

Los tres tienen sistema de diseño con variables CSS, y los tres las nombraron
distinto: `--verde`/`--tinta`/`--crema` en `casaverdecanas`,
`--c-primario`/`--c-texto`/`--c-fondo` en `Rematetaller`, `--ink`/`--wool`/`--blond`
en `CasaYourte`.

**No se unifican los nombres de la paleta.** Cada sitio tiene su marca y sus
nombres son parte de ella; renombrarlos toca cada declaración de cada hoja a
cambio de nada visible. **Lo que sí se unifica son los roles**, y todo sistema
de diseño de los tres tiene que poder responder cuál de sus variables cumple
cada uno:

`fondo` · `superficie` · `texto` · `texto-suave` · `línea` · `primario` ·
`primario-claro` · `ok` · `error` · `aviso` · `radio` · `sombra`

Y las tres constantes de layout, que sí llevan el mismo nombre porque no son de
marca: `--radio`, `--sombra`, y los respiros de sistema
`env(safe-area-inset-*)` (§ `PROTOCOLO-INTERFAZ.md`).

---


### 3.2 · Lo que ya está compartido de hecho, y por eso también es vocabulario

La tabla de arriba fija once conceptos. **El vocabulario realmente compartido es
más del doble**, sobre todo entre `casaverdecanas` y `CasaYourte`, que heredaron
uno del otro. Nada de eso estaba escrito — y **lo que está unificado sin estar
escrito no está protegido de divergir.**

Relevado el 2026-09-07 **abriendo cada función**, no listando nombres. El canónico
es, como en el § 3, el que ya usa la mayoría.

| Concepto | Canónico | casaverdecanas | CasaYourte | Rematetaller |
|---|---|:--|:--|:--|
| La sesión abierta | `usuario` | ✅ propiedad | ✅ propiedad | ⚠️ función `usuario()` |
| Arranque autenticado de una pantalla | `verificarAuth()` | ✅ | ⚠️ `arrancar()` | ✅ |
| Pintar la barra de navegación | `renderNav(actual)` | ✅ | ✅ | ✅ |
| El catálogo de secciones de la barra | `NAV` | ✅ | ✅ | ⚠️ `NAV_ITEMS` |
| Los grupos de esa barra | `GRUPOS` | ✅ | ✅ | — |
| ¿Se ve este ítem de la barra? | `verItem(item)` | ✅ | ✅ | ⚠️ `seccionesDisponibles()` |
| Escapar HTML | `esc(texto)` | ✅ | ⚠️ ver abajo | ⚠️ `escapar()` |
| Iniciales de un nombre | `inicialesDe(nombre)` | ✅ | ✅ | ✅ |
| El avatar como HTML | `avatarHTML(...)` | ✅ | ✅ | — |
| Registrar el service worker | `registrarSW()` | ✅ | ✅ | — |
| ¿Es una URL de nuestro Cloudinary? | `esCloudinary(url)` | ✅ | ✅ | — |
| La URL de entrega optimizada | `urlEntrega(url)` | ✅ | ✅ | — |
| Las transformaciones de entrega | `ENTREGA` | ✅ | ✅ | — |
| Achicar una imagen antes de subirla | `comprimirImagen(file, maxLado)` | ✅ | ⚠️ `reducir(file)`, el lado sale de `MAX_LADO` | ✅ |
| Fecha legible | `fmtFecha(...)` | ✅ | — | ✅ |
| El sello del archivo | `VERSION` | ✅ | ✅ | ⚠️ solo en un comentario |

**Tres cosas que este relevamiento encontró, y que son la razón de la tabla:**

1. **`verItem` ya divergió.** Es la misma función en los dos —decide si un ítem de
   la barra se muestra— pero **lee `it.permiso` en Casa Verde e `it.perm` en
   CasaYourte**. Mismo nombre, misma idea, campo distinto: llevar un ítem de un
   proyecto al otro lo rompe en silencio.
2. **`esc` tiene el mismo nombre y no hace lo mismo.** El de Casa Verde y el
   `escapar` de Rematetaller escapan la comilla simple; **el de CasaYourte no.**
   *Verificado el 2026-09-07: hoy no rompe nada*, porque en CasaYourte no hay
   ningún atributo con comillas simples armado con `esc()`. Pero el día que se
   escriba `title='${CY.esc(x)}'`, el apóstrofo de un nombre se sale del atributo.
   **Dos funciones que se llaman igual tienen que hacer lo mismo, o llamarse
   distinto.**
3. **`ENTREGA` es la misma cadena literal** (`f_auto,q_auto,w_2000`) copiada en los
   dos núcleos. Es el caso más claro de por qué esto se escribe: nadie sabía que
   estaba duplicado, así que nadie sabe que hay que cambiarlo en dos lados.

**Qué hacer con esto, y qué no.** Rige el § 3: **no se renombra nada de un sitio en
vivo solo para que coincida con otro.** Esta tabla no es una lista de tareas — es
el mapa de qué significa cada nombre y dónde no coincide, para que **la próxima vez
que alguien toque uno de esos archivos por otro motivo, sepa hacia dónde alinear**,
y para que nadie copie una función de un proyecto a otro creyendo que va a funcionar
igual. Los dos puntos de arriba que son defectos —el campo de `verItem` y la comilla
de `esc`— sí se arreglan, pero cada uno en su tanda y con su decisión.

---

## 4. Seguridad: las reglas de Firestore

Los tres usan el mismo modelo, y llegaron a él por separado. Queda como el
estándar.

### 4.1 · El modelo de acceso
**Una sola cuenta `admin`, y todos los demás con permisos explícitos.** El rol y
los permisos son **datos** que viven en `usuarios/{uid}`, no reglas: cambiarlos
se hace desde el panel, sin republicar nada.

```
usuarios/{uid} → { nombre, email, rol:'admin'|otro, activo:bool, permisos:{id:bool}, ... }
```

### 4.2 · Autenticado no es lo mismo que habilitado `[Rematetaller]`
Autorizar con `request.auth != null` y nada más significa que desactivar a
alguien le corta el panel **pero no los datos**: con su credencial viva puede
leer y escribir Firestore por fuera de la interfaz. Toda regla de
administración exige que **exista** la ficha en `usuarios/{uid}` y que
`activo == true`.

Corolario de `casaverdecanas`, que abrió login anónimo para el muro de
recuerdos: en cuanto existe una sesión sin ficha en `usuarios/`, "logueado" deja
de significar "es del equipo", y **toda** función de las reglas que asumía lo
contrario hay que revisarla. Tener sesión no es permiso.

### 4.3 · Nadie se puede dar permisos a sí mismo `[los tres]`
El admin no puede quitarse el rol ni desactivarse —es la forma más rápida de
quedarse afuera del propio panel sin manera de volver— y nadie que no sea admin
puede escribir su propio `rol` ni sus propios `permisos`. Esto es **una regla,
no un cuidado de la interfaz**.

### 4.4 · Deny por defecto, sin catch-all `[Rematetaller → casaverdecanas]`
No existe `match /{document=**} { allow read, write: if <algo> }` con algo
distinto de `false`. Una colección sin bloque propio queda inaccesible y **falla
a la vista, en la primera prueba**. Con catch-all quedaba abierta a cualquiera
con sesión y el problema aparecía mucho después.

### 4.5 · Una colección nueva entra con su regla, en la misma tanda `[los tres]`
No en la siguiente.

### 4.6 · Las reglas se editan completas, nunca por fragmentos `[Rematetaller]`
**Las reglas se suman: basta con que UN bloque permita para que el acceso quede
abierto.** Y reemplazar el archivo por unos pocos bloques deniega todo lo demás.
Se pega siempre el archivo entero.

### 4.7 · La copia de las reglas vive en el repositorio
Con el nombre del proyecto, pero siempre presente y siempre al lado de lo que
protege. Hoy: `interno/firestore.rules` en `casaverdecanas`, `REGLAS.txt` en la
raíz de `CasaYourte`, y **en `Rematetaller` no existe** — su documentación
declara un `/firestore.rules` en la raíz que no está en el repo. Es exactamente
la clase de "listo" no verificable que estas reglas vienen a evitar.

### 4.8 · Toda regla de seguridad necesita una prueba de que está viva `[CasaYourte]`
El archivo del repo es **una copia**; la autoridad es lo publicado en la consola
de Firebase, y pueden divergir sin aviso. `Rematetaller` ya pagó ese precio: el
briefing decía que las reglas v0.3 estaban publicadas cuando seguían las v0.2, y
con eso el comprador no podía ver el catálogo **sin que nada en la interfaz lo
dijera**.

La prueba de `CasaYourte` es el patrón, y vale para los tres: **desactivarse a
uno mismo como usuario y comprobar que el panel efectivamente lo echa.**

> **Desde el 2026-09-08 hay una forma mejor de correr esto: la pantalla de diagnóstico
> del proyecto (§11.3), que la hace sola y sin tocar la consola.** Lo de abajo sigue
> valiendo como el camino manual, para un proyecto que todavía no tenga su pantalla. Se hace
desde el teléfono, en un minuto, y prueba de una vez que las reglas publicadas
son las que se creen publicadas.

**Se hace desde la consola de Firebase, NUNCA desde el panel** — y esto no es un
detalle de comodidad. El § 4.3 prohíbe que alguien se desactive a sí mismo, así que
**intentarlo desde el panel tiene que fallar**: la regla que la prueba viene a
verificar es la misma que bloquea la prueba. Funciona desde la consola porque la
consola escribe directo, sin pasar por las reglas. Verificado el 2026-09-07 en los
dos proyectos que tienen el bloque escrito: `casaverdecanas`/`CasaYourte`
(`activo` y `rol` inmutables sobre uno mismo) y `Rematetaller` v0.6
(`request.resource.data.activo == true` obligatorio si `uid` es el propio).

**Sin esta aclaración la prueba se lee al revés.** Quien la intente desde el panel
va a ver un error de permisos y puede concluir que la prueba falló, o que el panel
tiene un bug — cuando es justamente la señal de que esa parte de las reglas sí
está publicada.

Los pasos, entonces:

1. Consola de Firebase → el proyecto → Firestore → `usuarios/{tu uid}`.
2. `activo` a **`false`**.
3. Recargar el panel: **tiene que echarte**, diciendo que el acceso está suspendido.
4. `activo` de vuelta a **`true`**.

**Si no te echa, las reglas no están publicadas y la base está abierta. No se sigue
con nada más hasta resolverlo.**

---

## 5. La app instalable (PWA)

### 5.1 · La PWA es del panel, no del sitio público `[Rematetaller]`
El `manifest` y el `sw.js` viven en la carpeta del panel y los registran solo
las páginas de ahí, con ruta relativa, para que el alcance del service worker no
toque las páginas públicas. Dos motivos, los dos buenos: a un visitante de paso
ofrecerle "instalar la app" no le sirve, y **una página pública cacheada es una
página que muestra datos que ya no existen**.

Las páginas públicas llevan favicon y `theme-color`, nada más.

> Excepción real: en `CasaYourte` el panel vive en la misma carpeta que el sitio
> (una sola carpeta, a propósito, porque subir carpetas anidadas desde el
> teléfono es innecesariamente molesto). Ahí la separación se hace por la lista
> `SHELL` del service worker, no por carpeta.

### 5.2 · Los datos no pasan por el service worker `[casaverdecanas → CasaYourte]`
Los datos van por la **caché persistente de Firestore** (`persistentLocalCache`,
IndexedDB): las lecturas repetidas salen del dispositivo, el panel abre sin
conexión mostrando lo último leído, y las escrituras se encolan y se sincronizan
solas al volver la señal. El service worker se ocupa **solo de los archivos**.

### 5.3 · Al cambiar cualquier archivo del shell, sube la `VERSION` `[CasaYourte]`
No es un trámite: al activarse, el service worker borra todas las cachés que no
sean la suya, y **es la única forma segura de que un teléfono deje de servir una
mezcla de archivos viejos y nuevos**.

### 5.4 · Cerrar sesión limpia la caché local `[Rematetaller]`
`terminate()` + `clearIndexedDbPersistence()`. La caché de Firestore es una por
navegador: sin limpiarla, **la próxima persona que entre en ese teléfono abre el
panel con los datos de la anterior**. Con un `Promise.race` de 3 segundos, para
que un IndexedDB trancado no deje a nadie encerrado adentro.

### 5.5 · "Reparar la app" no toca el servidor `[Rematetaller + casaverdecanas]`
Borra service workers, todas las cachés y las bases locales de Firebase. Nada
más. Existe porque **dentro de una PWA instalada no hay consola** ni forma cómoda
de borrar los datos del sitio, y el síntoma —una pantalla que sirve una mezcla
vieja— no se distingue de un bug. El texto de confirmación dice explícitamente
que no se pierde ningún dato: sin eso, nadie se anima a tocarlo.

### 5.6 · Los iconos salen de un `icon.svg` `[Rematetaller]`
Un SVG es la fuente de verdad; los PNG/WEBP derivados se regeneran desde ahí.
Tres detalles que no son opcionales: el **maskable va a sangre**, sin esquinas
redondeadas propias (las pone el sistema operativo; si las trae el archivo, con
máscara cuadrada quedan esquinas transparentes) y con el dibujo dentro del
círculo seguro del 80%; los **favicon de 16 y 32 usan una variante
simplificada**, porque el detalle fino se empasta a ese tamaño; y los colores
son los del sistema de diseño, no unos propios.

---

## 6. Los sellos de versión `[CasaYourte]`

**Cada archivo con lógica propia lleva su número de versión escrito adentro y
visible en la interfaz.**

Existe porque **un archivo viejo subido produce síntomas idénticos a un problema
de configuración**, y sin el sello no hay forma de saber qué código está
corriendo. Si algo se comporta raro sin motivo, **lo primero es el sello**, no la
configuración.

Reglas:

1. Se sube el sello **en la misma entrega** en la que cambia el archivo.
2. El sello se **ve en la interfaz**, no solo en la documentación. Un número que
   vive únicamente en un inventario está justo donde menos sirve para
   verificar.
3. La tabla de sellos de la documentación es **derivada, no autoridad**. Cuando
   discrepan, manda el archivo.

> **Y esta regla ya se rompió — corregido el 2026-09-07 (A4).** El `README.md` de
> `CasaYourte` publicaba `nucleo-10`, `cy-shell-v19`, `admin-11`, `editar-4` y
> `usuarios-2` mientras los archivos decían `nucleo-14`, `cy-shell-v25`,
> `admin-17`, `editar-6` y `usuarios-3`. **Eran cinco de siete, no cuatro:** el
> relevamiento original había mirado cuatro filas y dado por buenas las otras
> tres, que es la misma clase de error una capa más arriba.
>
> Es la prueba de por qué el punto 2 importa: una tabla que se copia a mano se
> desactualiza en silencio, y quien la lea para diagnosticar va a concluir
> exactamente lo contrario de lo que pasa. **La tabla en la documentación es
> opcional; el sello adentro del archivo y a la vista, no.**
>
> Y una lección que se agregó al corregirlo: no alcanza con poner los números
> bien, porque el texto que rodeaba la tabla decía que un número distinto
> significaba que el archivo no se había subido — **la conclusión invertida del
> punto 3**. Una tabla derivada tiene que decir que es derivada, o se lee como
> autoridad.

---

## 7. Documentación

### 7.1 · Un documento que vive solo en una conversación se pierde con la conversación
Es la lección que originó toda esta metodología, en `casaverdecanas`. La
documentación vive **en el repositorio**.

### 7.2 · Hay UN solo documento técnico por proyecto
Al subir una edición nueva se reemplaza la anterior. **Dos documentos casi
iguales conviviendo garantizan que alguien —persona o asistente— lea el viejo y
trabaje sobre un estado que ya no existe.**

### 7.3 · La estructura de tres libros
`casaverdecanas` y `Rematetaller` la comparten, y funciona:

- **Libro 1 · CONVENCIONES** — el reglamento técnico. El único que se lee entero
  alguna vez.
- **Libro 2 · REGISTRO DE TANDAS** — qué se hizo y por qué, de lo más nuevo a lo
  más viejo. Se consulta, no se lee. **Qué lleva una entrada: § 7.8.**
- **Libro 3 · GUÍA DE LA PARTE PÚBLICA** — el sitio, el SEO, los textos
  editables, el circuito de entrada de quien no es del equipo.

Arriba de todo, la tabla **"por dónde empezar, según lo que haya que hacer"**.

`CasaYourte` no tiene este documento: tiene un `README.md` bueno y una
`GUIA-ANDROID.md`, pero su reglamento técnico vive citado en comentarios del
código ("Libro 1 §3.12") **sin que el Libro 1 exista en el repositorio**. Es un
pendiente, no un estilo distinto.


### 7.4 · La documentación se sube en la misma tanda que el código que describe
Y no se registra como entregado nada que no se haya entregado en esa misma
tanda. `casaverdecanas` agregó esta regla después de que un briefing dijera
"listo" sobre algo que nadie podía abrir.

### 7.5 · La historia no se borra
Explica por qué el sistema es como es. Borrarla es cómo nacen los fósiles que
esta documentación viene a evitar. Si el registro molesta por tamaño, el corte
natural es sacar los registros viejos a un `HISTORIAL.md` aparte — no
eliminarlos.

### 7.6 · Los `.md` del repositorio son públicos
GitHub Pages los sirve **en texto plano** a cualquiera que sepa la dirección,
incluidos los de una carpeta llamada `interno/`. Todo lo que se escriba ahí se
escribe sabiendo eso. Los valores de credenciales no entran nunca (ver
`PROTOCOLO-SECRETOS.md`); los costos, márgenes, tarifas y proveedores tampoco.

### 7.7 · Cada repo lleva su `CLAUDE.md`
Con la estructura de `PROTOCOLO-GENERAL.md` § 3. Es lo primero que lee cualquier
agente que abra el proyecto.

---

### 7.8 · El registro de tandas: qué lleva una entrada

Hasta el 2026-09-07 este protocolo decía que el Libro 2 existe y nada más. Por eso
cada proyecto inventó su formato, uno se quedó sin registro y otro lo dejó parado
un mes sin que nadie lo notara. **Un registro sin formato fijado no es un
estándar: es una costumbre, y las costumbres se pierden.**

**Qué es y qué no es.** El registro dice **qué se entregó, cuándo y por qué**. No
es documentación de cómo funciona el sistema —eso es el Libro 1— ni un resumen de
commits. Existe porque explica **por qué el sistema es como es**, que es lo único
que no se puede deducir leyendo el código.

**Una entrada lleva, siempre:**

1. **Un título que se pueda leer solo**, con cuatro datos: versión del documento,
   qué pasó en una frase, número de tanda y fecha.
   `## v0.5.10 — Las libretas viejas dicen "no hay número" de varias maneras (Tanda 17 · 15-ago-2026)`
2. **Un bloque de entrega** arriba de todo: qué archivo es nuevo, cuál reemplaza a
   cuál, y **qué acción manual queda pendiente** (republicar reglas, crear un
   índice, cargar un dato en una consola). Una tanda con acción manual pendiente
   **no está entregada hasta que esa acción se hizo**, y el registro tiene que
   poder decir cuál era.
3. **El cuerpo: qué cambió y por qué.** El *por qué* no es adorno — es la mitad que
   sirve dentro de seis meses. Un registro que solo enumera archivos es un `git log`
   escrito a mano.
4. **Las correcciones dentro de una misma tanda van con sufijo** (`v1.8.1`), en la
   misma entrada, no en una nueva.

**El documento sube una versión menor por tanda** (`v0.5.1` → `v0.5.2`), y **la
fecha y la versión de la cabecera del documento se suben en la misma tanda que el
registro.** Un documento que se presenta con la fecha de hace un mes avisa mal
desde el primer renglón: quien lo abre asume que lo que falta es de un mes, no de
un día.

**El título de un registro dice hasta dónde llega `[casaverdecanas]`.** Si agrupa
varias tandas, el rango del título tiene que cubrir la última que contiene. El
briefing de Casa Verde llegó a titular *"T11.18 a T11.23"* un registro que cubría
hasta la **T11.44**: quien miraba el índice concluía que el documento terminaba
veinte tandas antes de donde termina. **Un título que no dice hasta dónde llega
hace que el documento mienta desde el índice**, que es donde más se lo consulta.

**El registro no vive en la cabecera de un archivo de código `[Rematetaller]`.**
Anotar los cambios arriba del núcleo es cómodo y por eso pasa solo. En Rematetaller
el Libro 2 quedó en la tanda 12 mientras la cabecera de `utils.js` seguía hasta la
19: dos registros paralelos, que es lo que § 7.2 evita. Y no quedó ahí — mientras el
registro estuvo parado, el inventario derivó, las reglas quedaron dos versiones
atrás de la consola y una tanda declaró entregado un archivo que nunca existió.
**No fueron cuatro problemas: fue uno.** La cabecera de un archivo describe el
archivo; el registro registra. Si un cambio se anota en los dos lados, se anota en
la misma tanda.

**Y lo que un registro no prueba `[los dos]`.** Al leer una entrada vieja, **lo que
dice "listo" no está probado que lo esté**. Casa Verde daba por creados una guía que
no existía, un preset de Cloudinary que nunca se creó y un `<link>` que faltaba en
varias páginas; Rematetaller dio por publicadas unas reglas que no lo estaban y por
entregado un archivo que no existía. **Un registro es la intención de quien lo
escribió; la verificación es abrir la consola o el archivo.**

**Un registro que se detiene no avisa.** Es la razón por la que esta sección existe
y no es una formalidad: el código se rompe y se nota; un registro parado se ve
igual que uno al día, y lo que se rompe después no parece tener nada que ver.

## 8. Cómo se entrega una tanda

### 8.1 · De dónde sale el número de tanda `[casaverdecanas]`

**Sale de la `VERSION` del `sw.js` que se está por entregar.** Es el único
contador que avanza exactamente una vez por tanda y que **nadie puede saltear**,
porque sin tocarlo la entrega no llega a los teléfonos (§5.3). Si el `sw.js` va a
la v96, la tanda es la que sigue a la que dejó la v95.

**De dónde NO sale**, y las dos veces que se numeró mal fue por esto:

- **No del último commit del repositorio:** puede haber trabajo en curso sin subir.
- **No del briefing que uno tenga a mano:** esa copia se queda atrás. La de Casa
  Verde terminaba en la T11.23 con veintisiete tandas de diferencia.

**Cuando hay dos sesiones trabajando a la vez, el orden real lo dicta la `VERSION`
del service worker, no el número que cada una se puso.** Casa Verde numeró mal dos
veces seguidas en agosto de 2026 —primero 11.46–11.48, después 11.51–11.53, los dos
rangos ya usados por otra sesión en paralelo— y las dos veces el número se había
deducido de una fuente que no era el `sw.js`.

> **Y esto ya no es un caso raro.** Desde que un chat puede abrir los cuatro
> repositorios a la vez (`PROTOCOLO-GENERAL.md` § 4), dos sesiones en paralelo sobre
> el mismo proyecto dejaron de ser la excepción. La regla nació antes de que hiciera
> falta y ahora hace falta.
>
> **Si el proyecto no tiene `sw.js`** —o el cambio no toca el shell— el contador es
> el mismo de siempre: la última tanda registrada en el Libro 2 más uno. Por eso el
> registro tiene que estar al día (§7.8); si está parado, no hay de dónde contar.

**Un service worker no alcanza: tiene que tener un contador que nadie pueda
saltear.** Lo que hace incontorneable a la `VERSION` de Casa Verde y de CasaYourte
es la lista `SHELL` con su `addAll`: es todo o nada, así que **sin subir la
`VERSION` la entrega no llega** (§5.3). Un service worker que cachea al vuelo lo que
se va visitando, sin `SHELL`, no obliga a nada — su nombre de caché se puede quedar
en `v1` para siempre y nada se rompe.

> **Y ahí está el eslabón que faltaba.** El `sw.js` de `Rematetaller` es de los
> segundos: network-first, sin `SHELL`, con su `CACHE_NAME` clavado en `v1` desde
> que existe. **No tenía ningún contador que nadie pudiera saltear — y es
> justamente el proyecto cuyo registro se detuvo un mes sin que nadie lo notara.**
> No es coincidencia: sin un número que la entrega obligue a mover, numerar la tanda
> pasa a depender de que alguien se acuerde, y acordarse no es un mecanismo.
>
> Que un proyecto no tenga ese contador **no es motivo para inventarle una `SHELL`
> que no necesita**. Es motivo para saber que ahí el registro al día (§7.8) no es
> una prolijidad: es el único contador que le queda.

### 8.2 · Los pasos

1. **Se cierra la decisión con Mauro** antes de escribir código (§2.14).
2. **Una tanda es un asunto.** No se mezclan asuntos entre tandas: las tandas
   agrupadas existen para poder **probar una cosa a la vez** `[Rematetaller]`.
3. Se escribe el código y **la regla nueva o el bloque de Firestore que necesite,
   en la misma tanda** (§4.5).
4. Se **valida que el JS parsea** (§2.11). Ojo con el falso positivo: `node --check`
   sobre un `.js` con módulos ES puede dar OK sin haberlo parseado como módulo.
   **Y parsear no es correr:** un `ReferenceError` a una variable que nadie importó
   pasa el análisis de sintaxis y revienta en el primer uso. Lo que prueba que algo
   anda es abrirlo (§11), no que compile.
5. Se **suben los sellos** de los archivos que cambiaron, y la `VERSION` del service
   worker si cambió algo del shell (§6, §5.3). Un cambio que **solo toca comentarios
   no sube el sello**: el sello dice qué código está corriendo, y el código no cambió.
6. **Cuando cambia un flujo, se revisan todas las pantallas y textos que lo
   mencionan** `[los dos]` — **incluida la ayuda `?` de la pantalla**. Cambiar un
   estado sin cambiar su ayuda deja una explicación falsa **adentro del propio
   sistema**, que es el peor lugar donde puede estar.
7. Se actualiza la documentación del proyecto **en la misma tanda** (§7.4), y el
   registro con su entrada completa (§7.8).
8. Se entrega como **archivos completos** (§2.1).
9. **Se verifica, y el resultado va al registro** (§11). Si la tanda dejó una acción
   manual pendiente, tocó reglas, o entregó algo cuyo funcionamiento no se ve a simple
   vista, **no está entregada hasta acá**.
10. Si la tanda dejó una convención nueva o corrigió una vieja, **se anota acá o en
   `PROTOCOLO-INTERFAZ.md`**, no solo en el registro del proyecto. Una convención que
   se queda en un solo repositorio deja de ser un estándar de los tres al día
   siguiente.

### 8.3 · Qué se declara al entregar `[Rematetaller]`

Tres cosas, siempre: **qué archivo es nuevo, cuál reemplaza a cuál, y qué acción
manual queda pendiente** — republicar las reglas, cerrar y reabrir la app, cargar un
dato en una consola.

**Una tanda con una acción manual pendiente no está entregada hasta que esa acción
se hizo.** Y la que queda pendiente se escribe en el registro, no solo en el chat:
las reglas v0.3 de Rematetaller estaban "publicadas" en el registro y no lo estaban
en la consola, y con eso el comprador no podía ver el catálogo **sin que nada en la
interfaz lo dijera**.

### 8.4 · Cómo se retira una función `[casaverdecanas]`

Sacar algo tiene tantos lugares como ponerlo, y uno más: los datos que quedaron.

1. **El orden es código y manual primero, datos después.** Al revés, entre que se
   borran los datos y sube el código hay una ventana en la que alguien abre la
   función y ve un error o una lista vacía. Con este orden los datos quedan unas
   horas huérfanos y a nadie le molesta.
2. **Los datos se borran antes de cerrar la regla.** Firestore niega por defecto:
   apenas se saca el bloque, esos documentos quedan inalcanzables desde la
   aplicación —invisibles, ocupando lugar y sin manera cómoda de llegar a ellos—.
   Desde la consola se puede igual, pero **lo que no se borra a tiempo no se borra
   nunca**.
3. **Ojo con las subcolecciones:** borrar el documento padre **no** se lleva a los
   hijos. Si lo retirado colgaba del documento de cada persona, hay que ir una por
   una.
4. **En el archivo de reglas queda el hueco documentado, no el silencio:** qué
   había, cuándo se fue y cuál era el bloque. El día que alguien se pregunte por qué
   no se puede escribir ahí, la respuesta está en el mismo lugar donde va a mirar.
5. **La colección no se borra del modelo de datos: se marca RETIRADA con el motivo.**
   Un dato viejo en la base sin explicación es una trampa para el que venga después.
6. Y no se retira nada **porque "parece que no se usa"** (§9): la decisión es previa.

---

## 9. Lo que no se hace por iniciativa de un agente

- Agregar build, framework, `package.json` o dependencias (§1).
- Renombrar archivos o variables de un sitio en vivo solo para que coincidan con
  otro (§2.2, §3.1).
- Publicar o pushear sin que Mauro lo haya pedido en esa conversación.
- Reescribir historial de git (ver `PROTOCOLO-GENERAL.md` § 2).
- Pedir, cargar o escribir el valor de una credencial, por ningún medio (ver
  `PROTOCOLO-SECRETOS.md`).
- Retirar una función porque "parece que no se usa". La decisión es previa; el
  procedimiento, § 8.4.

## 10. Una app nueva en el ecosistema

Las secciones de arriba nacieron de leer tres proyectos que ya existían: son
**descriptivas**, y cada regla dice en cuál se pagó el precio. Esta sección es lo
contrario — es **prescriptiva**, y existe para que la cuarta app no vuelva a
descubrir por su cuenta lo que ya costó caro tres veces.

**Y va a seguir cambiando.** Es la única sección escrita antes de que exista el
caso que describe, así que la primera app que se sume la va a corregir en cosas que
hoy no se pueden prever. Eso no la invalida: la vuelve un punto de partida en vez de
una hoja en blanco. Lo que se corrija se corrige acá, con el motivo, como todo lo
demás.

### 10.1 · Lo que hereda el día uno, y no se discute

No porque sí: cada una de estas es una regla de arriba que, si falta al empezar,
después cuesta diez veces más agregarla.

| | Por qué no es negociable |
|---|---|
| **Deny por defecto en la base, sin catch-all** (§ 4.4) | Agregarlo después obliga a auditar cada colección que ya vive del catch-all, y a descubrirlas de a una cuando algo se rompe |
| **`activo == true`, no solo sesión** (§ 4.2) | Sin esto, desactivar a alguien le corta el panel pero no los datos |
| **Nadie se da permisos a sí mismo** (§ 4.3) | Es la diferencia entre un panel y un panel con un agujero |
| **La copia de las reglas en el repo, y la prueba de que están vivas** (§ 4.7, § 4.8) | Un archivo sin la prueba es una copia sin autoridad. Los dos, o ninguno |
| **Un solo núcleo, y una sola fuente por dato** (§ 2.2, § 2.4) | Deduplicar código y retirar un estado paralelo son las dos refactorizaciones más caras que hizo este ecosistema |
| **Sellos de versión visibles en la interfaz** (§ 6) | Sin sello, un archivo viejo subido se diagnostica como problema de configuración. Se pierde más tiempo buscándolo que el que cuesta ponerlo |
| **Errores que muestran la causa** (§ 2.10) | Un problema de dos minutos convertido en tres días |
| **`CLAUDE.md` con la estructura de `PROTOCOLO-GENERAL.md` § 3** | Es lo primero que lee cualquier agente. Sin él, cada sesión reconstruye el proyecto de cero y adivina |
| **`.gitignore` de la plantilla, e índice en `datos/secretos/<proyecto>.md` con su tabla de titularidad** | Barato el primer día. Después es un incidente |
| **Una pantalla de diagnóstico** (§11.2) | Se escribe una vez y sirve para siempre. Escribirla el día que hace falta es escribirla tarde, y sin ella el tercer intento a ciegas se paga en horas |
| **Rioplatense, voseo, interfaz y documentación** | |

### 10.2 · Lo que cada app decide por su cuenta

Y que nadie tiene que "arreglar" para que se parezca a las otras (§ 4 de
`ESTADO-DE-LOS-TRES.md`):

- **Los nombres de la paleta y el namespace.** Se unifican los *roles* (§ 3.1),
  no los nombres.
- **El nombre del archivo núcleo.**
- **El mecanismo de la puerta pública.** Se unifica el trato a quien no puede
  entrar, no el mecanismo (`PROTOCOLO-INTERFAZ.md` § 9).
- **Si es bilingüe, y si tiene PWA.** Si la tiene, es del panel (§ 5.1).
- **La estructura de carpetas.** Todo en la raíz es una decisión válida si se
  edita desde el teléfono.

### 10.3 · Lo que no se decide sin Mauro, nunca por iniciativa de un agente

Además de lo del § 9: **agregar build, framework, `npm` o backend a un proyecto
que no lo tiene** (§ 1), y **compartir cualquier cosa entre dos apps** — que es
lo del § 10.4.

### 10.4 · Qué se comparte entre apps y qué nunca

La regla de fondo: **se comparte el protocolo y los patrones; no se comparte la
infraestructura.**

| | Se comparte | Por qué |
|---|---|---|
| Protocolos, vocabulario, patrones | ✅ **sí, siempre** | Es todo el punto de estos documentos |
| Código, como dependencia versionada | ❌ **no** | Serían tres proyectos con una dependencia que hay que versionar, sin build y sin `npm` para manejarla |
| **Proyecto de Firestore / la base** | ❌ **nunca** | Un solo juego de reglas gobernando modelos de datos distintos vuelve impracticable el deny por defecto, y una regla mal escrita en un sitio abre los datos de otro. **Una app, una base** |
| Cuenta de Cloudinary | ⚠️ por defecto **no** | Cuota, presets y el `api_secret` pasarían a ser uno solo para todo. Las carpetas separan el contenido igual de bien sin acoplar nada |
| **Titularidad de las consolas** | ⚠️ **puede convenir** — ver 10.5 | |

### 10.5 · La titularidad es una decisión de arquitectura, no un detalle

Compartir *cuentas* y compartir *proyectos* son cosas distintas, y conviene no
confundirlas porque tienen riesgos opuestos.

**La convención que este ecosistema ya tiene, sin haberla escrito nunca:** una
cuenta de Google por proyecto, dueña de **todos** los servicios de ese proyecto.
`rematetaller@gmail.com` es titular de la consola de Firebase y de la de
Cloudinary de Rematetaller; `casayourte@gmail.com` lo es de las de CasaYourte.
Dos de tres ya funcionan así. **Casa Verde es el único sin resolver**, y ahí el
titular todavía no está registrado.

Que la convención existiera y nadie la hubiera escrito es el punto: **el problema
nunca fue el reparto de cuentas, fue que uno de los tres no estaba anotado.** Un
proyecto cuyo titular nadie recuerda no es un compartimento estanco, es un camino
de recuperación perdido — y eso se arregla documentando, no consolidando.

**La regla, entonces:**

1. **Una cuenta por proyecto, dueña de todos sus servicios.** Es lo que ya se
   hace, funciona, y mantiene el radio de daño de un compromiso acotado a un
   sitio. Un proyecto nuevo abre la suya.
2. **Esa cuenta se documenta el día uno** en `secretos/<proyecto>.md`
   (`PROTOCOLO-SECRETOS.md` § "Titularidad"), con 2FA y su camino de recuperación.
   Sin eso, la separación es una fantasía prolija.
3. **Los proyectos de base de datos no se unifican nunca** — es el ❌ del cuadro
   de 10.4, y no tiene ninguna de las ventajas de compartir cuenta y todo el radio
   de daño.

> **Nota de por qué esta sección dice esto y no lo contrario.** La primera versión
> recomendaba unificar todo en una cuenta madre, razonando que el riesgo vivo del
> ecosistema no era el compromiso sino el olvido. El razonamiento era correcto; la
> conclusión, no. Al completar las tres fichas apareció que dos de los tres
> proyectos ya tenían su cuenta propia y ordenada: lo que faltaba era el registro,
> no la consolidación. **Se deja escrito el cambio de opinión, y no solo la
> conclusión, porque el dato que lo dio vuelta —mirar las tres fichas completas—
> es el mismo que va a hacer falta la próxima vez.**

### 10.6 · En qué orden converge una app que se suma

No hace falta que llegue con todo. El orden es el mismo que el de
`ESTADO-DE-LOS-TRES.md` § 3, y por el mismo motivo:

1. **Lo que cierra riesgos** — reglas, titularidad, `.gitignore`, `CLAUDE.md`.
   Antes de la primera persona real usando el sistema.
2. **Lo que unifica el uso** — la ayuda `?`, la barra abajo, la hoja de cuenta,
   el visor de fotos. Cuando ya hay alguien que la usa y hay qué unificar.
3. **Lo que ordena el trabajo a futuro** — documentación de tres libros, sellos,
   roles de color declarados.

Empezar por 2 o 3 es la forma conocida de tener un sistema prolijo con un agujero
adentro.

## 11. La verificación: cuándo se deja de arreglar y se pasa a medir

**Arreglar y verificar son dos cosas distintas.** Arreglar es cambiar algo esperando
que el síntoma desaparezca. Verificar es **medir el estado real** y comparar contra lo
que se cree que es. Este ecosistema perdió más tiempo arreglando sin medir que en
cualquier otra cosa, y siempre por el mismo motivo: **los síntomas de un problema de
configuración, de un archivo viejo cacheado y de un bug de código son idénticos.**

### 11.1 · Los dos momentos en que la verificación es obligatoria

**a) Al cerrar un desarrollo, cuando se pide verificación.** Si una tanda deja una
acción manual pendiente, toca reglas, o entrega algo cuyo funcionamiento no se puede
ver a simple vista, **no está entregada hasta que se verificó** (§8.3). El resultado de
esa verificación **entra al registro de la tanda** (§7.8): un "listo" sin medición es
la intención de quien lo escribió, no un hecho.

**b) Después de dos intentos consecutivos sobre el mismo problema.** Esta es la regla
que más cuesta cumplir y la que más rinde:

> **El tercer intento no es un intento: es una medición.**
>
> Si dos cambios seguidos no resolvieron el mismo síntoma, la hipótesis está mal —no la
> implementación—. Un tercer arreglo a ciegas tiene la misma probabilidad que los dos
> anteriores y suma una variable más al problema. **Se para, se mide, y recién con el
> dato se vuelve a tocar.**
>
> **Y si el instrumento para medir no existe, construirlo ES el tercer intento.** No es
> un desvío del problema: es la forma más corta de resolverlo. Una pantalla de
> diagnóstico se escribe una vez y sirve para siempre; el tercer parche a ciegas se tira
> a la basura junto con los dos anteriores.

**Cómo se cuentan los dos intentos:** son dos entregas o dos cambios sobre **el mismo
síntoma**, aunque hayan tocado archivos distintos y aunque cada uno pareciera una causa
razonable. Que la explicación suene convincente no cuenta como haberla verificado.

### 11.2 · El instrumento: cada proyecto tiene su pantalla de diagnóstico

**No es opcional y no se improvisa cuando hace falta** — cuando hace falta, hace falta
ya. Es una página del panel, fuera de la barra de navegación, que se abre escribiendo su
dirección.

Tiene que probar, como mínimo, estos seis bloques, que son **las conexiones reales** del
sistema y no su lógica:

1. **Navegador y app** — conexión, si corre instalada o en pestaña, el service worker y
   su alcance, qué cachés hay, y **el nombre de caché que declara el `sw.js` del servidor
   contra el que se está sirviendo**. Si no coinciden, ese teléfono está mezclando
   archivos viejos y nuevos (§5.3) — el síntoma que §6 dice mirar primero ante cualquier
   rareza, y el que más veces se confundió con un problema de configuración.
2. **Archivos en el servidor** — que cada archivo responda, y **el sello que de verdad
   está sirviendo el servidor** (§6). Es lo que distingue "código nuevo con un bug" de
   "código viejo cacheado", que a simple vista son lo mismo.
3. **Sesión y permisos** — quién sos, tu ficha de la base, tu `activo`, tu `rol`, y qué
   permisos **resuelve la función**, no cuáles debería resolver.
4. **Lectura de cada colección** — una por una, **con plazo** (ver 11.4).
5. **Que las reglas estén vivas** — ver 11.3. Es el bloque que justifica la pantalla.
6. **Los servicios de terceros** — que respondan, y con qué configuración.

**Y la regla que manda sobre todas las de arriba `[casaverdecanas]`: la pantalla de
diagnóstico no puede depender de lo que diagnostica.** No importa el núcleo, no arranca
con la comprobación de sesión, no vive de la caché del service worker. Si lo hiciera,
**se apagaría justo en los dos casos que más importan**: cuando el núcleo está roto y
cuando no se puede entrar. Casa Verde lo tiene escrito en la cabecera de su página desde
que la escribió: *"si esa comprobación fuera el problema, una página que la use para
arrancar no puede diagnosticarla"*.

> **Se aprendió por las malas el 2026-09-08, y se corrigió el mismo día.** La primera
> pantalla que se le escribió a `Rematetaller` arrancaba con `verificarAuth` e importaba
> el núcleo de forma estática: se copió la estructura de la de Casa Verde sin leer el
> fundamento que esa misma página tenía escrito arriba de todo. Funcionaba mientras todo
> funcionara, que es exactamente cuando no hace falta.
>
> **Cómo se resuelve en la práctica** (es lo que hacen hoy Casa Verde y Rematetaller):
> el núcleo se carga con `await import('./nucleo.js?d=' + Date.now())` **dentro de un
> `try`, ya empezada la pantalla**. Si falla, la pantalla lo dice con el mensaje del
> error y sigue. El `?d=` fuerza traerlo de la red, que es la única forma de detectar un
> núcleo viejo, y **no duplica la app de Firebase**: `initializeApp` con la misma config
> devuelve la que ya existe, así que la sesión se conserva. Para la sesión se usa
> `authStateReady()` y se **mira** `currentUser` — nunca la función del proyecto que
> redirige al login.

Y dos cosas sobre la forma, que salieron de tener tres pantallas distintas y comparar:

- **Un checklist ✅ / ⚠️ / ❌ arriba**, para leerlo de un vistazo en un teléfono.
- **Un informe de texto copiable al final, con su botón de copiar al lado**, para pegarlo
  en un chat. Es lo que convierte un "no me anda" en un diagnóstico. **No lleva ningún
  valor de credencial**: solo identificadores públicos y resultados.
  **Va al final y no arriba**: arriba compite con el botón de «Probar todo», que es lo
  primero que se toca, y el informe solo sirve cuando la corrida terminó.
- **Una negativa esperada se reporta ⚠️, no ❌.** Sin sesión, toda escritura va a dar
  `permission-denied` — eso es la regla funcionando, no una falla. La pantalla tiene que
  saber qué espera del estado en que está y decirlo, o asusta con rojos que no lo son.

> **Y una prueba que no puede fallar es peor que no tenerla.** Si el dato contra el que
> se compara nunca cambia —un contador que nadie sube, un archivo que nadie toca— el ✅
> es el estado por defecto y no una garantía. En ese caso la prueba **dice que no
> prueba**: sale en ⚠️ y remite al pendiente que lo explica. Un verde inmerecido es peor
> que un amarillo honesto, porque se le cree.

### 11.3 · Las negativas: el único bloque donde lo bueno es que falle

Que una lectura funcione prueba que **esa** lectura está permitida. **No prueba que lo
prohibido esté prohibido** — y eso es justamente lo que hay que probar, porque el
archivo de reglas del repositorio es una copia y la autoridad es la consola (§4.8).

Entonces la pantalla **intenta a propósito lo que las reglas deben negar** y reporta ✅
cuando la negativa llega:

- Leer un documento de una colección que **no tiene bloque propio** (prueba que el deny
  por defecto está vivo y que no hay catch-all, §4.4).
- Escribir en esa misma colección.
- **Desactivarse a uno mismo** (§4.3). Es la prueba del §4.8, y de esta forma **no
  necesita la consola de Firebase**.

**Si alguna de esas pasa, las reglas que están corriendo no son las que se creen.**

> **La prueba que escribe sobre la propia cuenta va en su propio botón, con su aviso.**
> El aviso dice qué hace y qué no se pierde (`PROTOCOLO-INTERFAZ.md` §7.3), y el código
> **revierte en el acto** si la escritura pasa, avisa en rojo, y si tampoco pudiera
> revertir da el uid para arreglarlo a mano. Una prueba de seguridad que puede dejar a
> alguien afuera de su propio panel no se corre sola al abrir la pantalla.

### 11.4 · Cada prueba, aislada `[CasaYourte]`

**Una prueba que falla no puede llevarse puestas a las que siguen.** Cada una va en su
propio `try`, y una que reviente se reporta como reventada — no interrumpe la corrida.

> **Por qué es una regla y no una prolijidad.** La pantalla de `CasaYourte` usaba
> `firebaseConfig` sin haberlo importado, en su prueba número 1 y fuera de todo `try`.
> Tiraba `ReferenceError`, y como no había aislamiento **de la prueba 2 en adelante no
> corría ninguna, desde el día que la página existe**. No se veía como un error: se veía
> como una pantalla que se quedaba pensando. Una herramienta de diagnóstico rota en
> silencio es peor que no tenerla, porque **se le cree**.

### 11.5 · Dos trampas que hacen que una verificación mienta

1. **Sin red, una lectura de Firestore no falla: espera.** Sin un plazo, la sección queda
   en blanco y parece que el botón no anda. **Toda medición contra la red va con plazo**
   (8 segundos alcanza), y "no contestó" se reporta distinto de "denegado": una es un
   problema de conexión y la otra de permisos, y confundirlas manda a buscar al lado
   equivocado.
2. **Una negativa esperada no es una falla.** Que a alguien que no es admin le nieguen
   listar `usuarios` es la regla haciendo su trabajo. La pantalla tiene que saber qué
   espera de **este** usuario y reportarlo ✅, o va a asustar con un ❌ que no lo es.

### 11.6 · Qué se hace con el resultado

**Va al registro de la tanda** (§7.8), aunque haya salido todo verde — sobre todo si
salió todo verde, porque es la única forma de que dentro de seis meses se pueda saber
qué estaba funcionando en esa fecha. Y **lo que salga ⚠️ o ❌ y no se arregle en esa
misma tanda se anota como pendiente**, con lo que la pantalla dijo, textual.

> **El caso que originó esta sección (2026-09-08).** Rematetaller era el único de los
> tres sin pantalla de diagnóstico. Se le escribió una, y en su **primera corrida**
> encontró en diez segundos algo que estaba en vivo y que nadie había visto: el documento
> `config/publico` no existía, así que la puerta pública mostraba *"escribile por
> WhatsApp a Florencia"* **con el botón de WhatsApp oculto**, porque el teléfono venía
> vacío. Un comprador con la llave vencida leía a quién escribirle y no tenía con qué —
> exactamente lo que el §9.1 de `PROTOCOLO-INTERFAZ.md` prohíbe, en el proyecto que ese
> mismo párrafo cita **como el modelo**.
>
> No fue un bug: el código maneja bien la ausencia. Fue un dato que faltaba, **invisible
> desde adentro del panel y visible en un renglón desde una pantalla que mide.** Ninguna
> cantidad de intentos a ciegas lo hubiera encontrado.

---
*Creado el 2026-09-07, a partir de la lectura directa de los cuatro repositorios
en una sola sesión. Estado de cada proyecto contra este protocolo:
`ESTADO-DE-LOS-TRES.md`.*

*Tercera pasada (8-sep): se suma el § 11, el proceso de verificación —cuándo se deja
de arreglar y se pasa a medir— con la regla de los dos intentos y el estándar de la
pantalla de diagnóstico. Nació de que la primera corrida de la pantalla de
Rematetaller encontró en diez segundos un defecto que estaba en vivo.*

*Segunda pasada del 7-sep (Tanda D): se suma el § 7.8, que fija qué lleva una
entrada del registro —hasta ahora el protocolo decía que el Libro 2 existe y nada
más, y por eso cada proyecto inventó el suyo—; y el § 8 se reescribe con lo mejor de
los dos flujos que ya existían: de dónde sale el número de tanda (Casa Verde), qué
se declara al entregar y cómo se retira una función.*
