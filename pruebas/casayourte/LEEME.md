# Pruebas de CasaYourte

Dos bancos. El segundo no es sólo de CasaYourte: compara los cuatro proyectos.

## `permisos.mjs`

Comprueba quién ve cada ítem del menú. Corre las funciones **reales**
—`esAdmin`, `puede`, `puedeAlguno`, `verItem`— extraídas de
`CasaYourte/nucleo.js` tal como está, y las prueba contra el menú real del mismo
archivo. No hay copias acá: si el archivo cambia, la prueba cambia con él.

```
node permisos.mjs      # espera los clones uno al lado del otro; REPOS lo cambia
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


## `esc.mjs` — compara los CUATRO proyectos

```
node esc.mjs
```

Extrae la función que escapa HTML de cada uno de los cuatro archivos —`CV2.esc`,
`CY.esc`, `escapar` de Rematetaller, `P.esc` del panel— y comprueba que las
cuatro devuelvan **lo mismo** para los cinco caracteres peligrosos y para un caso
real con apóstrofo.

**Por qué existe.** La primera auditoría (2026-09-09) encontró que `CY.esc`
escapaba cuatro caracteres y las otras tres cinco: le faltaba la comilla simple.
Sin ella, un apóstrofo dentro de un atributo con comillas simples —«Cañada
d'Oro»— se sale del atributo. El agujero estaba latente, pero **el código se
copia entre estos cuatro proyectos todo el tiempo**, y un agujero latente viaja
con la copia.

Ahora las cuatro coinciden. Si mañana una se separa, esto falla — que es la
única forma de que «dos funciones que se llaman igual hacen lo mismo» sea una
regla y no un deseo.

**Ojo con el nombre.** Rematetaller la llama `escapar` y los otros tres `esc`.
Hacen lo mismo, pero el nombre distinto es la próxima trampa de la misma familia:
quien busque `esc` en Rematetaller no la encuentra y escribe otra.

> **`reportar.mjs` se mudó el 2026-09-15.** Nació acá el mismo día, cuando el
> circuito de reportes existía en un solo sitio. Con el segundo, mantener un
> banco por sitio era garantizar que se separaran — el error que este ecosistema
> ya cometió cuatro veces con los sellos. Ahora es **`pruebas/reportes.mjs`**,
> una sola tabla con los tres: agregar un sitio es agregarle una fila.
