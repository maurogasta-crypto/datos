# El teléfono como bodega

`herramientas/telefono.mjs`, desde el **29-sep-2026** (línea `L-telefono`).
Corre en **Termux**, en el Redmi 15. Hace cuatro cosas y las cuenta todas en
una página, `Respaldos/informe.html`, que se abre sola al terminar:

1. **Limpiar Descargas.** Encuentra archivos y carpetas repetidos, y también
   basura. Los mueve a una papelera de la que se pueden devolver.
2. **Tener la última versión de cada app para instalar**, en
   `Respaldos/Instalar/`, con un nombre fijo por app.
3. **Guardar respaldos.** Baja al teléfono una copia al día de cada
   repositorio del ecosistema, con **todas** sus ramas.
4. **Un depósito**: `Respaldos/Deposito/`, donde lo que guardes no lo toca
   ninguna limpieza.

**La lista de proyectos sale del panel**, no está escrita en el código:
ver «Sincronizado con el panel», más abajo.

## Por qué en el teléfono y no desde el chat

Una sesión de Claude Code corre en la nube y **no puede entrar al teléfono**:
no hay una dirección a la que llamar. Por eso el que se mueve es el teléfono.
Él va a buscar las copias y él ordena su propia carpeta. El código lo escribe
y lo prueba un chat; lo corre Termux.

Y Descargas no la ve cualquier app: desde Android 11 el selector del sistema
no deja elegir la raíz de esa carpeta. Termux sí la ve, con
`termux-setup-storage`.

## Instalarlo, una sola vez

En Termux:

```
termux-setup-storage          # tocá «Permitir»
pkg upgrade                   # ANTES que nada: ver abajo
pkg install nodejs git
git clone https://github.com/maurogasta-crypto/datos
cd datos
```

Para tenerlo al día: `git pull` en esa carpeta.

**`pkg upgrade` no es opcional, y se aprendió el primer día** (29-sep-2026).
Instalar `nodejs` sin actualizar lo demás dejó al teléfono con un `node`
nuevo y una biblioteca de cifrado vieja, y `node` no arrancaba:
`CANNOT LINK EXECUTABLE "node": cannot locate symbol
"OSSL_PROVIDER_add_conf_parameter"`. Termux no admite actualizaciones a
medias. Si vuelve a aparecer ese mensaje, lo que se corre es `pkg upgrade`.

## Todo de una vez

```
node herramientas/telefono.mjs sincronizar
```

Respalda los repositorios, trae las apps que tengan versión nueva, mira
Descargas **sin tocar nada**, y abre el informe. Es lo que conviene correr
todos los días, y lo que corre solo si se programa (más abajo).

## Decidir desde una pantalla

```
node herramientas/telefono.mjs interfaz
```

Abre en el navegador del teléfono una pantalla con tres partes:

- **Lo que hay.** Cuántos archivos hay, cuánto pesan, cuántos de cada tipo
  y cuáles pesan más. Se miran nombres, tamaños y fechas: **los archivos
  no se abren**.
- **Sugerencias.** Lo que proponen las reglas, agrupado por regla, cada cosa
  con su casilla. Se destilda lo que no va, y con «no proponer más» no vuelve
  a aparecer. Se aplica con el botón de abajo, y **todo se puede deshacer**
  desde «Lo que ya se hizo».
- **Reglas.** Cada una tiene tres estados: **Propone** (aparece y se aplica
  si la tildás), **Automática** (la rutina diaria la aplica sola) y
  **Apagada**. Ahí también se cambian los días de «instaladores viejos» y el
  nombre de la carpeta de cada tipo. Todas empiezan en «Propone»: **nada
  anda solo hasta que lo pongas en Automática.**

Lo que elegís queda en `Respaldos/bodega-ajustes.json`, y la rutina lo lee
de ahí.

**Termux tiene que quedar abierto mientras la usás**, porque la pantalla le
habla a un servidor chiquito que corre ahí. Se cierra con el botón del
final, o sola a la media hora sin uso.

**Por qué es seguro que un servidor mueva archivos.** Hay tres cerraduras.
Escucha sólo adentro del teléfono (`127.0.0.1`). Cada vez que arranca
inventa una llave al azar, que va en la dirección, y sin ella no contesta.
Y rechaza los pedidos que vengan de otra página. Aparte de eso, lo que se
pide se cruza contra el plan del momento: una ruta que no esté propuesta no
se toca, venga de donde venga. El banco prueba las cuatro cosas.

## Pedidos al chat, desde la misma pantalla

En la pantalla hay una caja **«Pedidos al chat»**. Escribís lo que querés,
como se lo dirías a una persona («las facturas de UTE y Antel, a
Facturas/2026»), y tocás «Enviar al chat». El pedido viaja al depósito
privado (abajo) junto con la **lista** de lo que hay en Descargas: nombres,
tamaños y fechas, **no el contenido**.

Después le decís al chat **«mirá mis pedidos del teléfono»**. El chat los lee,
los traduce a reglas y te contesta. En la próxima sincronización, o al
volver a abrir la pantalla, las reglas aparecen en «Reglas» con la marca
«del chat» y en estado **Propone**, y la respuesta aparece debajo del pedido.
Nada se aplica sin que lo tildes, y que una regla ande sola lo decidís vos.

**Una regla del chat es un dato, no una orden**, y el teléfono la valida
antes de usarla, como si la hubiera escrito cualquiera:

- tiene sólo dos acciones: a la papelera, o mover a una carpeta de Descargas;
- el patrón es un comodín sobre el nombre (`*antel*.pdf`);
- el destino no puede salir de Descargas ni entrar a la papelera;
- lo protegido no se toca nunca.

Una regla que no cumple no aparece.

## El depósito del chat

Un repositorio **privado**, `maurogasta-crypto/bodega`, que usan los dos
lados:

| Qué | Quién lo escribe | Adónde llega |
|---|---|---|
| `bases/<proyecto>.json` | el chat, con `depositar` | `Respaldos/Deposito/chat/`, en cada sincronización |
| `pedidos/<fecha>.json` | el teléfono, con «Enviar al chat» | el chat, con `pedidos` |
| `reglas.json` | el chat: reglas y respuestas | la pantalla del teléfono |

Las copias de las bases llegan solas al teléfono. En el depósito queda
además el historial de cada una, así que una copia vieja se puede recuperar.
**No se depositan** lo sellado (las reglas de cada base ya se lo niegan al
agente) ni `recorridos` de la Hilux, que es dónde estuvo la camioneta punto
por punto: ya vive en su base y en el respaldo de la app, y un tercer lugar
sería un lugar más por donde filtrarse.

**La credencial del teléfono** es un token de GitHub **de grano fino**, con
acceso a ese repositorio y a ningún otro. Se pega una vez:

```
node herramientas/telefono.mjs token
```

Queda en `~/.config/bodega/token`, con permisos 600, en la carpeta privada
de Termux. No se escribe nunca en `.git/config` ni en la línea de comandos:
git lo recibe por variables de entorno en cada llamada. **No pasa por ningún
chat.**

**Desde una sesión**, con el repositorio agregado a la sesión:

```
git clone https://github.com/maurogasta-crypto/bodega /tmp/bodega
node herramientas/telefono.mjs depositar --bodega /tmp/bodega   # y commit + push
node herramientas/telefono.mjs pedidos   --bodega /tmp/bodega   # los que esperan respuesta
```

Para contestar un pedido, el chat edita `reglas.json` y hace commit y push.
Ese archivo tiene `reglas`, con las reglas en el formato que valida
`normalizarReglaChat`, y `respuestas`, que va de id del pedido a texto.

## Limpiar Descargas

```
node herramientas/telefono.mjs descargas              # MUESTRA, no toca nada
node herramientas/telefono.mjs descargas --aplicar    # bota
node herramientas/telefono.mjs deshacer               # devuelve lo último que se botó
node herramientas/telefono.mjs vaciar --aplicar       # borra DE VERDAD lo de más de 30 días
```

**Sin `--aplicar` no se toca nada.** Siempre conviene mirar primero: sin
`--aplicar`, `descargas` también escribe el informe y lo abre.

**Botar es mover, no borrar.** Todo va a `Download/_Papelera/<fecha-hora>/`.
Cada lote lleva un `lote.json` que anota de dónde salió cada cosa y por qué.
`deshacer` la devuelve a su lugar, y si mientras tanto apareció otro archivo
con el mismo nombre, no lo pisa: lo devuelto queda al lado, con
« (restaurado)». Borrar de verdad es `vaciar`, que sólo toca lotes de más de
30 días (`--dias N` para cambiarlo), contados desde el día en que se botaron.

### Qué propone, regla por regla

| Qué | Cómo lo reconoce |
|---|---|
| **Carpeta repetida** | adentro tiene exactamente lo mismo que otra: los mismos nombres y el mismo contenido. El nombre de la carpeta no importa: «Fotos (1)» es copia de «Fotos» |
| **Archivo repetido** | mismo contenido byte por byte (huella SHA-256). El nombre no importa |
| Descarga a medias | `.crdownload`, `.part`, `.tmp`… **con más de un día**: una de recién puede estar bajando ahora |
| Archivo vacío | 0 bytes |
| Restos de otros sistemas | `Thumbs.db`, `.DS_Store`, `desktop.ini`, `~$…` |
| Carpeta vacía | la que queda sin nada después de todo lo anterior |
| Instalador viejo | un `.apk` suelto con más de 30 días (se cambia en la pantalla). Las apps al día están en `Respaldos/Instalar/` |
| **Ordenar** (no bota) | cada archivo suelto en la raíz de Descargas va a una carpeta según su tipo: Documentos, Imágenes, Videos, Audio, Comprimidos, Instaladores. Lo que ya está adentro de una carpeta no se toca: alguien la armó así. Si en el destino ya hay uno con el mismo nombre, no se pisa, se avisa |

**Entre dos iguales, cuál se queda.** Primero el que no tiene marca de copia
(`(1)`, «Copia de», «- copia», «copy»). Si empatan, el más viejo; después, el
menos metido en subcarpetas. La regla es fija: dos corridas sobre la misma
carpeta eligen lo mismo.

### Qué NO toca nunca, aunque esté repetido

Claves de firma y llaves (`.jks`, `.keystore`, `.p12`, `.pem`, `.key`,
`.kdbx`…) y bases de datos (`.db`, `.sqlite`). Ésas se **avisan** al final,
con «NO SE TOCAN, pero conviene que los mires», y se borran a mano si hace
falta. El motivo: un `.jks` perdido es no poder volver a firmar una
actualización de la Hilux, y un `.db` de este ecosistema suele ser un
respaldo de la Hilux, con el recorrido. Una carpeta repetida que tenga
alguno de esos adentro tampoco se mueve.

Tampoco mira las carpetas ocultas (`.thumbnails` y parecidas, que son del
sistema) ni sigue enlaces que lleven afuera de Descargas.

## Lo último para instalar

En `Respaldos/Instalar/` queda un APK por app, con un nombre fijo:
`hilux.apk`, nunca «sitd-hilux (3).apk». Qué apps tienen APK **lo dice el
panel**, con el campo `descarga` de la ficha del sitio, que es el mismo que
dibuja el botón «Descargar». Una app nueva con su descarga cargada en el
panel aparece sola.

Para saber si hay versión nueva se le pregunta a la descarga misma, con un
`HEAD`, y no a la API de GitHub. La API deja 60 consultas por hora sin
cuenta y en la primera prueba contestó 403. La descarga dice su tamaño, su
fecha y su huella, y alcanza con eso. El nombre no sirve para saber nada,
porque el release `ultimo` de la Hilux se reemplaza entero con el mismo
nombre en cada tanda.

**La versión anterior no se tira**: pasa a `Instalar/anteriores/` con su
fecha, y quedan las dos últimas. Si una tanda sale mal, la de ayer está ahí.
Sin red, la que ya estaba se queda donde está y el informe lo dice.

Instalar un APK sigue siendo un toque tuyo: se abre `hilux.apk` desde el
administrador de archivos, o el botón «Instalar desde GitHub» del informe.

## Sincronizado con el panel

La lista de proyectos está en `herramientas/bodega.json`, que se genera
desde `proyectos/` del panel:

```
node herramientas/telefono.mjs manifiesto      # en una SESIÓN, no en el teléfono
```

Viaja al teléfono con el `git pull` de `datos`. **El teléfono no guarda
ninguna credencial del panel**, y es por eso que el camino da esa vuelta.
De cada proyecto viajan sólo cuatro campos de `sitio`: el repositorio, la
dirección del sitio, la descarga y el resumen, y todos ya son públicos. `app`,
`acceso` y `empaquetado` no viajan, y el banco lo comprueba.

**Cuándo se regenera:** en la misma tanda en que cambia `sitio` de un
proyecto, o se da uno de alta. Las VERSIONES de las apps no dependen de
esto: se preguntan en vivo en cada corrida.

## Guardar respaldos

```
node herramientas/telefono.mjs respaldar       # sólo esto; «sincronizar» ya lo incluye
```

Deja en `Almacenamiento interno/Respaldos/`:

| Archivo | Qué es |
|---|---|
| `repos/<nombre>.bundle` | el repositorio **entero, con todas sus ramas**, en un solo archivo. Se recupera con `git clone <nombre>.bundle` |
| `repos/<nombre>-main.zip` | los archivos de la rama principal, para abrirlos sin git |
| `ESTADO.txt` | cuándo se hizo, y de cada repositorio el último commit y cuántas ramas tiene |

Son los repositorios que el panel da de alta, cada uno una sola vez, aunque
lo compartan dos proyectos, como el panel y `datos`. Son públicos, así que
**el teléfono no guarda ninguna credencial** para esto. Uno que se vuelva
privado sale con ✖ en el informe y los demás siguen.

**Las ramas que se borran en GitHub siguen en el teléfono.** El espejo se
actualiza sin podar a propósito. Así se contesta la duda de `datos:R6`: antes
de borrar ramas, se corre esto y lo que tengan queda guardado.

**Git trabaja en la carpeta privada de Termux (`~/.respaldos`)**, y a la
memoria compartida sólo salen el `.bundle` y el `.zip`. El motivo: en la
memoria compartida de Android git falla, porque el sistema no deja cambiar
permisos. Cada archivo se escribe primero con otro nombre y recién al
terminar reemplaza al anterior: un respaldo cortado a la mitad nunca pisa al
bueno de ayer.

**Que corra solo, todos los días** (opcional):

```
pkg install cronie termux-services
sv-enable crond
crontab -e
# y agregar esta línea, que sincroniza todos los días a las 4:17:
17 4 * * * cd ~/datos && git pull -q && node herramientas/telefono.mjs sincronizar --sin-abrir

La rutina respalda, trae las apps nuevas, **aplica sólo las reglas que
pusiste en Automática** y deja el informe con lo demás propuesto. Lo que
aplicó queda en un lote y se deshace desde la pantalla.
```

Para que HyperOS no mate a Termux, Termux necesita lo mismo que la app de la
Hilux: Autostart encendido y batería «Sin restricciones».

## Lo que todavía no hace

- **Las bases no las baja el teléfono**: las deposita un chat, que es el que
  tiene la credencial del agente. Con eso, el teléfono sólo necesita un
  token que abre un solo repositorio.
- **El chat no lee lo que pasa en el teléfono.** Si querés que opine sobre
  una limpieza, mandale el informe o lo que imprimió `descargas`.
- **El informe de la rutina no tiene botones que ejecuten nada**: un archivo abierto en
  el navegador no puede mover archivos del teléfono, y está bien que no
  pueda. Para eso está `interfaz`, y el informe te lo dice.
- **El iPad no entra**: en iOS no hay forma de que algo corra solo sobre la
  carpeta Descargas.

## Banco

`node pruebas/herramientas/telefono.mjs`: 84 casos, sin red ni dependencias.
Arma carpetas de mentira, las limpia y las deshace de verdad, y compara el
disco antes y después byte por byte. También cubre que el manifiesto no
lleve nada de más, que una app se baje una sola vez por versión y que sin red
no se pierda la copia. Y que el informe muestre un nombre de archivo con
HTML adentro en vez de ejecutarlo.
