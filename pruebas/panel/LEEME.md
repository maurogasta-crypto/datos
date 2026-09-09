# Banco de pruebas del panel

Corre el código real del panel —`maurogasta-crypto/datos`— contra un DOM de
verdad (jsdom) y un Firestore de mentira. **No toca Firebase ni la red**: la
base es un objeto en memoria.

## Por qué vive acá y no con el panel

El panel es un sitio estático sin `npm`, sin build y sin terminal, y esa
decisión lo hace editable desde el teléfono por la web de GitHub. Meterle un
`package.json` para las pruebas le agregaría justo lo que no tiene que tener.
Este repositorio, en cambio, es privado, no publica nada y no tiene esa
restricción.

La contra, que conviene saber: **el banco y el panel están en repositorios
distintos y pueden divergir.** Si una prueba falla por un archivo que no
existe, mirá primero si el panel cambió de forma.

## Cómo se corre

```
cd pruebas/panel
npm install          # sólo la primera vez
git clone https://github.com/maurogasta-crypto/datos /ruta/al/panel
node banco.mjs       # RAIZ apunta a /home/user/panel/ — ajustala si hace falta
```

Sale `Todo en orden.` y código 0, o la lista de fallas y código 1.

## Qué comprueba, y por qué esas cosas

Son 63 comprobaciones en catorce grupos. Las que más valen no son las obvias:

- **La vuelta del parte no pierde nada** (grupo 9). Se carga el parte real desde
  un archivo, se aplica, se saca el estado y **se vuelve a meter**: tiene que
  contestar «no hay nada nuevo». Es lo único que demuestra que exportar e
  importar son de verdad la misma cosa.
- **Ninguna ficha asoma en la exportación** (grupo 9). Se comprueba contra los
  ids reales de la base falsa, no buscando la palabra «fichas» en el texto: el
  parte tiene un pendiente que se llama así, y la primera versión de esta prueba
  se encontraba a sí misma.
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
- **La ronda completa, de punta a punta** (grupo 13). Se manda un parte con una
  pregunta, se aplica, el tablero la señala, Mauro la abre y contesta, la
  respuesta sale en la exportación listada en `tocados`, y **un parte que no la
  menciona no la borra**. Si esto falla, una pregunta se pierde entre tandas, que
  es justo lo que el canal viene a evitar.

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

## Lo que el banco NO prueba

No prueba las reglas de Firestore: la base es de mentira y le dice que sí a
todo. Eso lo prueba el botón «Probar» de la solapa «La puerta», contra la
consola de verdad, y **tiene que dar denegado**.
