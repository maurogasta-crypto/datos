# El teléfono como bodega

`herramientas/telefono.mjs`, desde el **29-sep-2026** (línea `L-telefono`).
Corre en **Termux**, en el Redmi 15. Hace dos cosas:

1. **Limpiar Descargas.** Encuentra archivos y carpetas repetidos, y también
   basura. Los mueve a una papelera de la que se pueden devolver.
2. **Guardar respaldos.** Baja al teléfono una copia al día de los seis
   repositorios del ecosistema, con **todas** sus ramas.

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
pkg install nodejs git
git clone https://github.com/maurogasta-crypto/datos
cd datos
```

Para tenerlo al día: `git pull` en esa carpeta.

## Limpiar Descargas

```
node herramientas/telefono.mjs descargas              # MUESTRA, no toca nada
node herramientas/telefono.mjs descargas --aplicar    # bota
node herramientas/telefono.mjs deshacer               # devuelve lo último que se botó
node herramientas/telefono.mjs vaciar --aplicar       # borra DE VERDAD lo de más de 30 días
```

**Sin `--aplicar` no se toca nada.** Siempre conviene mirar primero.

**Botar es mover, no borrar.** Todo va a `Download/_Papelera/<fecha-hora>/`.
Cada lote lleva un `lote.json` que anota de dónde salió cada cosa y por qué.
`deshacer` la devuelve a su lugar, y si mientras tanto apareció otro archivo
con el mismo nombre, no lo pisa: lo devuelto queda al lado, con
« (restaurado)». Borrar de verdad es `vaciar`, que sólo toca lotes de más de
30 días (`--dias N` para cambiarlo), contados desde el día en que se botaron.

### Qué bota

| Qué | Cómo lo reconoce |
|---|---|
| **Carpeta repetida** | adentro tiene exactamente lo mismo que otra: los mismos nombres y el mismo contenido. El nombre de la carpeta no importa: «Fotos (1)» es copia de «Fotos» |
| **Archivo repetido** | mismo contenido byte por byte (huella SHA-256). El nombre no importa |
| Descarga a medias | `.crdownload`, `.part`, `.tmp`… **con más de un día**: una de recién puede estar bajando ahora |
| Archivo vacío | 0 bytes |
| Restos de otros sistemas | `Thumbs.db`, `.DS_Store`, `desktop.ini`, `~$…` |
| Carpeta vacía | la que queda sin nada después de todo lo anterior |

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

## Guardar respaldos

```
node herramientas/telefono.mjs respaldar
```

Deja en `Almacenamiento interno/Respaldos/`:

| Archivo | Qué es |
|---|---|
| `repos/<nombre>.bundle` | el repositorio **entero, con todas sus ramas**, en un solo archivo. Se recupera con `git clone <nombre>.bundle` |
| `repos/<nombre>-main.zip` | los archivos de la rama principal, para abrirlos sin git |
| `ESTADO.txt` | cuándo se hizo, y de cada repositorio el último commit y cuántas ramas tiene |

Los seis repositorios son públicos, así que **el teléfono no guarda ninguna
credencial** para esto.

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
# y agregar esta línea, que respalda todos los días a las 4:17:
17 4 * * * cd ~/datos && git pull -q && node herramientas/telefono.mjs respaldar
```

Para que HyperOS no mate a Termux, Termux necesita lo mismo que la app de la
Hilux: Autostart encendido y batería «Sin restricciones».

## Lo que todavía no hace

- **Las bases de Firestore no se respaldan desde el teléfono.** Para eso
  Termux necesitaría la contraseña del usuario del agente, y eso es sumar un
  lugar más donde vive una credencial. Se decide aparte.
- **El chat no lee lo que pasa en el teléfono.** Si querés que opine sobre
  una limpieza, mandale lo que imprimió `descargas`.
- **El iPad no entra**: en iOS no hay forma de que algo corra solo sobre la
  carpeta Descargas.

## Banco

`node pruebas/herramientas/telefono.mjs`: 28 casos, sin red ni dependencias.
Arma carpetas de mentira, las limpia y las deshace de verdad, y compara el
disco antes y después byte por byte.
