# Protocolo de interfaz — cómo se maneja la gente en los tres sitios

Este documento define **cómo se usan** `casaverdecanas`, `CasaYourte` y
`Rematetaller`. Es el par de `PROTOCOLO-DESARROLLO.md`, que define cómo se
construyen.

**El objetivo es concreto:** que alguien que aprendió a moverse en un panel
sepa moverse en los otros dos sin volver a aprender nada. No que se vean
iguales —cada sitio tiene su marca y su paleta— sino que **las mismas cosas
estén en el mismo lugar y se llamen igual**.

---

## 0. Las tres reglas que mandan sobre todas las demás

### 0.1 · El teléfono Android manda
El panel se usa sobre todo en un teléfono, con la PWA instalada desde Chrome.
Todo lo de abajo sale de ahí. El escritorio es el caso raro y se resuelve con un
`@media`, nunca al revés.

### 0.2 · Un acceso que no se ve no existe
`Rematetaller` lo pagó dos veces con la misma barra: la navegación scrolleaba
horizontal, en un teléfono entraban cinco ítems, y todo lo que pasaba del quinto
quedaba fuera de pantalla. Primero le pasó a **"Salir"**, después a
**"Documentos"**. La barra ahora envuelve en dos filas y se ven los siete.

### 0.3 · Nada se comunica solo con `:hover`
En un teléfono no existe. Si un estado o una acción solo se entiende pasando el
mouse por encima, en el dispositivo real no se entiende.

---

## 1. La estructura de una pantalla del panel

Es la misma en los tres, y este es el orden canónico:

```
┌─────────────────────────────────┐
│  cabecera mínima · marca · avatar│  ← lo mínimo, y se puede esconder al bajar
├─────────────────────────────────┤
│                                 │
│  <h1>Título de la pantalla</h1> ?│  ← el "?" abre la ayuda DE ESTA pantalla
│                                 │
│  el contenido                   │
│                                 │
├─────────────────────────────────┤
│  ▣  ▣  ▣  ▣  ▣                  │  ← barra de navegación ABAJO
└─────────────────────────────────┘
```

### 1.1 · La barra de navegación va abajo
Al alcance del pulgar. La arma el núcleo, no cada página. En pantalla ancha
(≥900px) la misma barra se acomoda arriba: **es un `@media`, no una segunda
barra**.

Estado real: `casaverdecanas` y `CasaYourte` la tienen abajo; `Rematetaller` la
tiene arriba, pegajosa y envolviendo. Es el punto de convergencia pendiente más
visible de los tres, y el que más cambia la sensación de "es el mismo sistema".

### 1.2 · La barra envuelve, no scrollea
Regla 0.2. Si no entran, van en dos filas.

### 1.3 · Los respiros de sistema son variables, nunca números a mano
La barra de gestos de abajo y la barra de estado de arriba tapan contenido, y
**un número escrito a mano queda viejo el día que la barra cambia de alto**. Van
como variables sobre `env(safe-area-inset-*)`, y todo lo que se pega a un borde
las usa:

- **piso** = alto de la barra de navegación + `env(safe-area-inset-bottom)`
- **techo** = alto de la cabecera + `env(safe-area-inset-top)`

Y un molde único para cualquier cosa pegada abajo que **no** sea la barra —el
compositor de un mensaje, un botón flotante, una barra de acciones— que quede
**por encima del contenido y por debajo de la barra**.

`casaverdecanas` lo resolvió así (`--cv-piso`, `--cv-techo`,
`.cv-pegado-abajo`) después de una tanda entera dedicada a "lo que la barra de
abajo tapaba". `CasaYourte` tiene lo equivalente (`--safe`, `--barra`).
`Rematetaller` no usa `safe-area-inset` en ningún lado.

### 1.4 · Los objetivos táctiles no bajan de 44px
Sin excepciones.

### 1.5 · Tirar hacia abajo NO recarga la aplicación
`overscroll-behavior-y: contain` en `html, body`. Sin eso, un gesto de scroll
un poco largo recarga la página y **se pierde lo que no estaba guardado**.

---

## 2. La cuenta vive en el avatar, no en la navegación `[Rematetaller]`

El avatar de la cabecera abre **la hoja de cuenta**, y ahí adentro está:

- **quién sos** (nombre, mail, y qué permisos tenés)
- **Cerrar sesión**
- **Reparar la app**

**"Salir" no es un ítem de la barra de navegación.** La barra es para ir a
lugares; salir no es un lugar, y además es lo primero que la barra se come
cuando no entra (regla 0.2).

**Cerrar sesión limpia la caché local.** La caché de Firestore es una por
navegador: sin limpiarla, la próxima persona que entre en ese teléfono abre el
panel con los datos de la anterior (`PROTOCOLO-DESARROLLO.md` § 5.4).

**"Reparar la app"** borra service workers, cachés y bases locales, y su texto de
confirmación **dice explícitamente que no se pierde ningún dato**. Sin esa
frase, nadie se anima a tocarlo — y es justo el botón que hace falta cuando la
app quedó sirviendo una mezcla vieja y no hay consola adentro de una PWA
instalada.

---

## 3. La ayuda de cada pantalla `[Rematetaller]`

**Un `?` junto al `<h1>` de cada pantalla del panel**, que abre un panel
explicando los estados y las acciones **de esa sección**: qué significa cada
estado, qué hace cada botón, qué NO hace.

La ayuda es de la pantalla, no del sistema. Un manual general se lee una vez y
nunca más; el `?` de la pantalla se toca en el momento en que hace falta.

Se autoinyecta desde el núcleo: no se toca la hoja de estilos para agregarlo.
Y una trampa concreta: si el `<h1>` se reescribe después de arrancar (un saludo,
un nombre cargado de la base), la ayuda **se llama después**, o el `?` se va con
el reemplazo.

Hoy solo `Rematetaller` la tiene, en ocho pantallas. Es lo mejor que tiene para
darles a los otros dos.

---

## 4. Las fotos

### 4.1 · Un solo visor, y nada abre una pestaña nueva `[Rematetaller]`
`mostrarFoto(urls, indice)`: overlay a pantalla completa, navegación `‹ ›` y
contador cuando hay varias, se cierra con `×` o tocando el fondo. Lo usan todas
las pantallas que muestran imágenes. **Abrir una foto en una pestaña nueva saca
a la persona de la app instalada y no la devuelve.**

### 4.2 · Toda imagen entra por la función del núcleo
Comprime del lado del cliente antes de subir (JPEG ~0.85), con un lado máximo
según el uso —chico para miniaturas de catálogo, grande para fotos que se miran
en serio—, y **se guarda siempre la copia propia en Cloudinary, nunca una URL
ajena**.

### 4.3 · Lo clicable adentro de un `<summary>` frena el toggle `[Rematetaller]`
Una foto adentro de una tarjeta colapsable necesita `e.preventDefault()` **y**
`e.stopPropagation()`. Sin los dos, tocar la foto abre o cierra la tarjeta en
vez de ampliar la imagen.

---

## 5. El botón Atrás de Android `[CasaYourte + casaverdecanas]`

Con la app instalada **no hay barra de direcciones**: si el Atrás no cierra la
capa abierta, expulsa de la aplicación y se pierde lo que se estaba cargando.

El patrón es una **pila de capas y UN solo listener de `popstate`**:

```js
const cerrar = capaAtras(() => panel.hidden = true);
// ... y se llama cerrar() desde el botón, desde el fondo, o al guardar
```

**Un listener por capa no sirve:** con eso, un solo Atrás cierra todas juntas.
Es el error concreto que este patrón viene a evitar.

Hoy lo tienen `CasaYourte` y `casaverdecanas`. `Rematetaller` no, y su panel ya
es instalable — así que la falta es real, no teórica.

---

## 6. Navegar entre fichas: el volver es un enlace `[casaverdecanas]`

Cuando una pantalla muestra una entidad que vive en otra (un pago que apunta a
una reserva, un cobro que apunta a una actividad), **enlaza**, y la pantalla de
destino ofrece un **botón de volver que es un enlace**, no `history.back()`.

El motivo: desde una ficha se puede editar, pagar o anular, y cada una de esas
acciones mueve el historial. **Para cuando se toca Atrás, el `back` ya no lleva a
donde uno cree.** El parámetro de vuelta lleva la dirección entera, no un dato
suelto del que haya que reconstruirla.

`casaverdecanas` llegó a esto contando: de 12 lugares donde el panel mostraba
una entidad ajena, **uno** enlazaba, y había cuatro mecanismos distintos de
"volver" con tres nombres de parámetro. La solución fue un vocabulario único en
el núcleo, donde **agregar un tipo lo habilita en las dos direcciones**.

---

## 7. Avisos y errores

### 7.1 · El aviso breve va abajo, por encima de la barra
Y desaparece solo. Los tres lo tienen.

### 7.2 · Un error muestra la causa, no el código
"Error 400" no se puede diagnosticar; "Upload preset not found" se resuelve en
un minuto. **Un mensaje de error sin código es un problema de dos minutos
convertido en tres días** (`casaverdecanas`). Y **un `catch` que traga un error
de permisos es un error invisible**.

### 7.3 · Una acción destructiva se confirma diciendo qué se pierde
No "¿Estás seguro?", sino qué desaparece exactamente y qué no. El caso modelo es
"Reparar la app", que se anima a decir que **no** se pierde nada — y por eso se
usa.

---

## 8. Permisos: la misma idea en los tres

Una cuenta `admin` que puede todo, y todos los demás con **permisos explícitos,
tildados uno por uno**, más **presets** para las combinaciones típicas
(`PROTOCOLO-DESARROLLO.md` § 3, § 4).

Del lado de la interfaz, lo que importa:

1. **Cada permiso tiene un `detalle` escrito en castellano**, que se ve en la
   pantalla de alta. No `inventario: bool`, sino *"Cargar y editar artículos con
   fotos, categorías y stock. SIN tocar precios ni moneda."* El límite del
   permiso se dice, no se deduce.
2. **Los presets existen para que dar de alta sea un toque y no cinco.** Hoy
   solo `Rematetaller` los tiene.
3. **Lo que la interfaz esconde, la regla lo prohíbe.** Ocultar un botón no es
   un permiso; el permiso lo aplica Firestore. La interfaz solo evita ofrecer
   algo que va a fallar.
4. **La persona puede ver sus propios permisos** en la hoja de cuenta. Si no
   puede hacer algo, tiene que poder saber por qué sin preguntarle a nadie.

---

## 9. La puerta: cómo entra quien no es del equipo

Los tres tienen un afuera y un adentro, y los tres resolvieron la puerta
distinto porque el problema es distinto. **No se unifica el mecanismo; se unifica
el trato.**

| | Quién entra | Con qué |
|---|---|---|
| `casaverdecanas` | huéspedes, a dejar un recuerdo | QR pegado en el alojamiento, con clave adentro |
| `CasaYourte` | cualquiera, a ver el catálogo | nada, es público; el panel pide cuenta |
| `Rematetaller` | compradores invitados | llave de 8 caracteres, con vencimiento |

Lo que sí es común y no se negocia:

### 9.1 · Al que no puede entrar se le dice qué hacer, no solo que no puede
`Rematetaller` es el modelo: si la llave venció o no existe, la pantalla explica
qué pasó **y ofrece un botón de WhatsApp con el mensaje precargado**, al
contacto que los administradores configuran desde el panel. Nadie queda frente a
un "acceso denegado" sin salida.

### 9.2 · Los textos de la puerta se editan desde el panel, no desde el código
Nombre de contacto, teléfono, mensaje de bienvenida, mensaje de vencido, mensaje
precargado. Cambiar a quién se le escribe no puede ser una tanda de desarrollo.

### 9.3 · Tener sesión no es permiso
Una sesión anónima se la abre cualquiera desde la consola del navegador, sin
haber pisado el lugar. Lo que autoriza es **la clave que viaja en el QR** o **la
llave del comprador**, y se verifica en las reglas del servidor
(`PROTOCOLO-DESARROLLO.md` § 4.2).

### 9.4 · La parte pública no se instala ni se cachea
`PROTOCOLO-DESARROLLO.md` § 5.1.

---

## 10. Iconos y tipografía

- **Material Icons** en los tres. El `<link>` va en el `<head>` **antes** de la
  hoja de estilos: falta un solo `<link>` y la página aparece con los nombres de
  los íconos escritos en texto.
- **Trampa conocida** (`CasaYourte`): una regla de contenedor tipo
  `.algo span { font-family: ... }` le gana en especificidad a `.material-icons`
  y el ícono sale escrito como palabra. Se blinda una vez, en la hoja común, con
  `span.material-icons, .material-icons { font-family:"Material Icons" !important }`.
- Los `<input>`, `<select>` y `<textarea>` van a **16px**. Menos que eso y iOS
  hace zoom al enfocarlos.

---

## 11. Un dato tiene la forma que lee una persona, no la que pide una API

**Regla:** un dato se **guarda y se muestra** como lo lee una persona. El formato
que pide un tercero —una URL, una API— se arma **en el momento de usarlo**, en
una función del núcleo y en un solo lugar. Al revés es dejar que el formato de
un tercero decida cómo se le habla a la gente.

**El caso que lo motivó**, el 2026-09-08 en `rematetaller`: el WhatsApp de
contacto se guardaba sin el `+` del código de país, porque `wa.me` lo quiere así.
Consecuencia: el panel le pedía a Mauro que escribiera `59899123456`, y así se lo
mostraba de vuelta. **`59899123456` no se lee como un número de teléfono: se lee
como un error.** El mismo dato aparecía sin `+` en el listado de llaves, donde lo
mira una persona para decidir a quién le escribe.

Cómo quedó, y es el patrón para cualquier dato con esta forma:

| | |
|---|---|
| **Se guarda** | `+59899123456` — con el `+`, tal como se dicta y se lee |
| **Se muestra** | igual, con `+`. En el formulario y en cualquier listado |
| **Se usa** | `urlWhatsapp(tel, texto)` saca el `+` y arma el enlace. **Es el único lugar donde el `+` desaparece** |
| **Lo ya guardado** | las funciones toleran las dos formas, con `+` y sin él. No hay migración: los números viejos se ven con `+` desde el primer día |

**Y de paso apareció lo que de verdad rompe.** Un número que empieza con `0`
—`098…` en Uruguay, el `0` del DDD en Brasil— es el error que la gente comete,
porque es como se dicta el número dentro del país. **Ningún código de país
empieza con `0`**, así que `wa.me` devuelve una página de error en vez del chat,
y desde el panel eso no se nota nunca: el botón está, el enlace existe, y lo que
falla es del otro lado. Por eso hay una comprobación que **avisa antes de
guardar**, con las tres cosas que no pueden ser: empieza con `0`, menos de 8
dígitos, más de 15 (el máximo del estándar E.164). No adivina el país: sólo dice
lo que es imposible.

Dónde vive: `interno/utils.js` en `rematetaller` (`soloDigitos`, `telVisible`,
`urlWhatsapp`, `avisoDeTelefono`) y `interno/nucleo.js` en `casaverdecanas`
(`CV2.` de los mismos cuatro). `CasaYourte` no lo necesita: su número está
escrito en un `href` y no se le muestra a nadie como texto.

**La excepción, escrita a propósito:** las tres páginas públicas de
`casaverdecanas` —`index.html`, `la-casa.html`, `opiniones.html`— siguen sacando
los no-dígitos por su cuenta. No importan `nucleo.js` deliberadamente (arrancaría
`verificarAuth` y mandaría al visitante al login), y ya toleraban las dos formas.
Una excepción que está escrita no es una duplicación olvidada.

---

## 12. Idioma

Rioplatense, voseo, en la interfaz y en la documentación. Los tres.

`CasaYourte` además es bilingüe español/francés, con el idioma en la dirección
(`?lang=fr`) para que exista para un buscador, y **se edita el idioma que se
está viendo**. Si otro de los tres necesitara un segundo idioma, ese es el
patrón: la dirección lleva el idioma, y el editor edita lo que muestra.

---

*Creado el 2026-09-07, a partir de la lectura directa de los tres sitios.
El § 11 se agregó el 2026-09-08.
Qué le falta a cada uno: `ESTADO-DE-LOS-TRES.md`.*
