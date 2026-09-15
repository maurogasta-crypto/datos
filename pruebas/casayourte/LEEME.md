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

## `reportar.mjs` — el circuito de reportar una falla (2026-09-15)

21 comprobaciones, sin dependencias y sin red. **No prueba la interfaz: prueba
que la regla y el código digan lo mismo.** Es lo que se rompe en silencio — si
el formulario manda un campo que la regla no espera, o deja de mandar uno que
exige, Firestore rechaza el reporte, la persona ve «no se pudo enviar» y nadie
se entera de que el circuito está cortado. **Un reporte que no llega es
indistinguible de nadie que reporte.**

Lo que cruza:

- que `estado: 'nuevo'` y el `uid` de la sesión estén en los dos lados;
- que escribir sea de cualquiera con sesión activa y leer sea de admin;
- que el `texto` no se pueda reescribir;
- que `reportes` **no** esté en las exclusiones del agente ni en `selladas` de
  `herramientas/firestore.mjs` — las dos listas que tienen que coincidir;
- que el sello de `nucleo.js` y la `VERSION` del `sw.js` coincidan con la tabla
  del README, porque `nucleo.js` está en el SHELL;
- que la entrada esté **una sola vez**, en `CY.renderNav`.

La primera corrida encontró un error del propio banco: contaba llaves desde
`match /reportes/{id}`, y las de `{id}` abren y cierran, así que el bloque salía
vacío y daba cinco fallas de cosas que estaban bien escritas. Queda anotado
porque es el modo de fallar más caro de un banco: **decir que algo está mal
cuando está bien** enseña a no creerle.
