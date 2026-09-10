# gestos — la incubadora, alojada acá mientras no tenga repo propio

**Qué es.** El instrumento que se toca con las manos frente a la cámara. Vive
en `toromboto/harmonia`, en `public/gestos.html` y `public/gestos/`. Esta es una
**copia publicada**, para poder probarlo desde el teléfono.

**Por qué está adentro del panel y no en su propio repositorio.** Por dos cosas
que se cruzaron el 2026-09-10:

1. `harmonia:H1` — nadie sabe con qué cuenta de Vercel se despliega Harmonía, y
   Mauro es *colaborador* de ese repositorio, no dueño, así que no puede
   averiguarlo. De ahí salió la decisión de la **incubadora**: este tipo de app
   se desarrolla en un repositorio de la cuenta `maurogasta@gmail.com`.
2. Un agente **no puede crear un repositorio en `maurogasta-crypto`**: la sesión
   se autentica como `casaverdecanas-blip`, y `maurogasta-crypto` es una cuenta
   de usuario, no una organización. Crear el repo lo tiene que hacer Mauro.

Mientras tanto, este repositorio **ya tiene Pages andando** —por Actions, con
`path: .`, o sea que publica la raíz entera— así que dejar la copia acá da un
enlace en vivo **sin que Mauro toque nada**. Que era el punto.

**El enlace:** https://maurogasta-crypto.github.io/datos/gestos/gestos.html

## La regla mientras esto dure

**La fuente es `toromboto/harmonia`. Esto es una copia y se sincroniza entera.**
Los archivos son **byte por byte idénticos** a los de allá, a propósito: así
sincronizar es copiar, no comparar. Si un día divergen, es el caso que
`general:un-dato-dos-lugares` describe — un dato en dos lugares diverge en
silencio— y por eso conviene que esto dure poco.

**No se edita acá.** Se edita en Harmonía y se copia. Al revés se pierde.

## Cómo se muda a su repositorio propio

1. Mauro crea `maurogasta-crypto/gestos` (30 segundos, desde la web de GitHub).
2. Se copian estos mismos archivos a la raíz.
3. Settings → Pages → Deploy from a branch → `main` / `(root)`.
4. Se borra esta carpeta y se corrige el enlace en el panel.

Las rutas de `gestos.html` son **relativas** desde el 2026-09-10 justamente para
que los cuatro pasos no requieran tocar el código.

## Qué necesita para andar

| | |
|---|---|
| **https** | `getUserMedia` no existe en http salvo `localhost`. Pages lo da solo |
| **Internet en la primera carga** | dos CDN: el bundle y el `wasm` de MediaPipe (`cdn.jsdelivr.net`) y el modelo de manos (`storage.googleapis.com`). Se bajan **al encender la cámara**, no al abrir |
| **Un toque** | el navegador no deja abrir cámara ni sonar audio sin gesto del usuario. Para eso está «Encender la cámara» |

**No necesita el build de Harmonía.** Son HTML y módulos ES servidos tal cual:
no importan nada de `src/`, no usan JSX, no dependen de `npm`.

## Ojo con el service worker del panel

El `sw.js` del panel se registra en `/datos/` y por lo tanto **también controla
esta carpeta**. La estrategia es red primero, así que en línea es transparente.
Sin señal, una navegación acá cae en el `index.html` del panel — no es un error,
es el respaldo del panel haciendo lo suyo sobre una página que no es suya. Es
otra razón para que esto tenga repositorio propio.
