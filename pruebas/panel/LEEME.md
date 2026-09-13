# Banco de pruebas del panel

Corre el código real del panel —`maurogasta-crypto/datos`— contra un DOM de
verdad (jsdom) y un Firestore de mentira. **No toca Firebase ni la red**: la
base es un objeto en memoria.

## Por qué vive acá, que hasta el 2026-09-13 era al revés

Vivía en el repo privado `casaverdecanas-blip/datos`, con este argumento: el
panel es un sitio estático sin `npm`, sin build y sin terminal —eso es lo que lo
hace editable desde el teléfono por la web de GitHub—, así que un `package.json`
le agregaría justo lo que no tiene que tener.

El argumento tenía una contra que se escribió al lado desde el primer día: **el
banco y el panel quedaban en repositorios distintos y podían divergir.** Cuando
el repo privado se borró, mantenerlo afuera dejó de ser una opción, y de paso
esa contra desapareció: ahora el banco y el código que prueba se mueven juntos,
en la misma tanda, y no hay dos historiales que sincronizar.

Lo que se paga por eso es un `package.json` y un `node_modules` en un rincón del
repositorio. Es aceptable, y es la única excepción de todo el repo: nadie lo
publica, el navegador no le pide nada, `node_modules` está en el `.gitignore` de
esta carpeta, y el sitio sigue sin build. La alternativa era perder doscientas
comprobaciones sobre el código que más se toca.

## Cómo se corre

```
cd pruebas/panel
npm install          # sólo la primera vez, por jsdom
node banco.mjs       # la raíz del panel sale de dónde está este archivo
```

Sale `Todo en orden.` y código 0, o la lista de fallas y código 1.

## Qué comprueba, y por qué esas cosas

Son 209 comprobaciones en veintidós grupos. Las que más valen no son las obvias:

> **Los números de grupo tienen huecos desde `panel-16`.** Faltan el 8, 9, 10,
> 14, 16, 18, 19, 25, 26, 28, 29 y 31: todos probaban la solapa «Parte», que se
> retiró. No se renumeraron los que quedan, porque sus números están citados en
> el README del panel y en el registro de tandas. Un hueco se explica; una cita
> que apunta a otro bloque, no.

- **Sacar un dato de una ficha lo saca de la base** (grupo 4). Se guarda sin
  `merge` a propósito; una ficha que no se puede achicar no sirve para datos
  sensibles.
- **Los `?v=` de las direcciones coinciden con los sellos escritos adentro de
  cada archivo, y la tabla del README con los cuatro** (grupos 11 y 12). Es el
  cuarto caso de «un dato en dos lugares diverge en silencio» del ecosistema, y
  el primero que falla solo. Ya había pasado de verdad: `estilos.css?v=1`
  mientras el archivo iba por `estilos-2`, y el teléfono servía el CSS viejo.
- **`index.html` y `nucleo.js` piden `firebase-init.js` por la misma dirección**
  (grupo 11). Dos direcciones distintas son dos módulos para el navegador, y eso
  es dos `initializeApp()`.
- **Una colección nueva entra con su regla** (grupo 17). Comprueba que cada
  colección que el panel usa tenga su bloque en `reglas.txt` **y** en el texto
  que el panel arma con él —que es el que realmente se pega—, y que el cierre
  `if false` siga negando el resto. La próxima colección que se agregue sin su
  regla falla acá y no en el teléfono.
- **El panel NO tiene una segunda copia de las reglas** (grupo 33). Desde
  `panel-15` el texto vive sólo en `reglas.txt` y el panel lo baja. Este grupo
  ya no compara dos copias: comprueba que la segunda no exista. Si alguien
  vuelve a escribir las reglas adentro de `index.html`, falla el mismo día y no
  seis meses después, cuando ya divergieron.
- **La ronda completa, de punta a punta** (grupo 13). Escribo una pregunta, el
  tablero la señala, Mauro la abre y contesta, y la respuesta y la marca
  `tocado` quedan en el documento — que es de donde la leo.

  Y lo que sigue es **lo más importante que este banco dice hoy**: se comprueba
  que, cuando el agente reescribe el pendiente, la marca se apaga sola **y la
  respuesta de Mauro se pierde si no la leyó antes**. Es así porque
  `escribir()` de `firestore.mjs` reemplaza el documento entero.

  Hasta `panel-15` eso lo cuidaba el «aplicar» del parte, que preservaba lo que
  el JSON no mencionaba. Hoy lo cuida la disciplina de leer antes de escribir, y
  **eso es un grado menos de garantía**. Está probado en las dos direcciones —el
  camino descuidado y el correcto— justamente para que no se olvide.

## Un error que tuvo el propio banco, y por qué queda anotado

El Firestore falso ignoraba `{merge:true}` y reemplazaba el documento entero.
Con eso, el banco «descubrió» que guardar una respuesta borraba el título del
pendiente — un error que en producción no existe. **Un doble que miente distinto
que el real no prueba nada**, y cuesta más que no tenerlo: manda a arreglar lo
que no está roto.

Ya van tres pruebas que fallaron por sí mismas y no por el panel: ésta, la que
buscaba la palabra «exportar» y se encontraba dentro del comentario que explica
por qué ese botón no existe, y la que leía la tabla equivocada del README.
Cuando una prueba falla, la primera pregunta es si prueba lo que dice probar.

- **La app instalable** (grupo 20). Que cada archivo de `SHELL` exista —uno que
  falta no rompe nada visible: simplemente nunca se guarda, y el hueco aparece el
  día sin señal—, que el manifest declare lo que Android necesita, y que `SHELL`
  **no** repita los `?v=`, porque sería la tercera copia del mismo número.

- **Las trabas se destraban solas** (grupo 23). Se cierra la que trababa y se
  comprueba que la traba desaparezca, que la otra deje de estar frenada y que el
  aviso se vaya. Es lo que demuestra que la traba es un derivado y no un dato que
  alguien tenga que acordarse de borrar.
- **El selector de app y los dos bloques** (grupos 21 y 22). Que lo que le toca a
  Mauro esté en SU bloque y no mezclado con lo de código: se comprueba por
  posición en el HTML, no por presencia.

## Lo que el banco NO prueba

No prueba las reglas de Firestore: la base es de mentira y le dice que sí a
todo. Eso lo prueba el botón «Probar» de la solapa «La puerta», contra la
consola de verdad, y **tiene que dar denegado**.
