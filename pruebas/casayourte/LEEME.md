# Pruebas de CasaYourte

## `permisos.mjs`

Comprueba quién ve cada ítem del menú. Corre las funciones **reales**
—`esAdmin`, `puede`, `puedeAlguno`, `verItem`— extraídas de
`CasaYourte/nucleo.js` tal como está, y las prueba contra el menú real del mismo
archivo. No hay copias acá: si el archivo cambia, la prueba cambia con él.

```
node permisos.mjs      # espera el repo en /home/user/CasaYourte
```

Diecisiete comprobaciones. Las que importan no son las obvias:

- **El alias y la negación se heredan dentro de una lista.** `CY.puedeAlguno` va
  por `CY.puede()` y no por `u.permisos` directo, así que «fotos» sigue valiendo
  como «albumes» y «usuarios» sigue negado también cuando se piden en lista. Si
  alguien la reescribiera mirando `u.permisos`, estas dos fallan.
- **Un admin desactivado no ve nada.** `activo !== true` corta antes que el rol.
- **Un ítem sin `permiso` lo ve cualquiera**, y eso es a propósito. Es también el
  motivo por el que el nombre del campo importaba tanto: con `perm` viejo y
  `permiso` nuevo conviviendo, `!it.permiso` daba verdadero y el ítem se mostraba
  a todos, sin error y sin aviso.

## Lo que NO prueba

Las reglas de Firestore. Esto es el espejo de la interfaz: oculta lo que no
corresponde. Lo que de verdad impide escribir son las reglas publicadas en la
consola.
