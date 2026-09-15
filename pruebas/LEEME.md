# Los bancos de pruebas

Todos corren con **`node` a secas**, sin dependencias y sin red, salvo el del
panel —que necesita `jsdom` para tener un DOM de verdad— y trae su
`package.json`.

| Banco | Qué cubre |
|---|---|
| `reportes.mjs` | el circuito «Reportar una falla» en **los tres sitios**: que la regla de Firestore y el código que escribe digan lo mismo |
| `panel/banco.mjs` | el panel entero contra un DOM real y un Firestore de mentira |
| `herramientas/ronda.mjs` | las funciones puras de la ronda de apertura |
| `herramientas/firestore.mjs` | el guardia de la bóveda y la conversión de tipos |
| `casayourte/esc.mjs` | que las cuatro funciones de escape de los cuatro proyectos escapen igual |
| `casayourte/permisos.mjs` | el menú real de CasaYourte contra su modelo de permisos |

Y en la raíz, `pruebas-reglas.mjs`, que cuida la plantilla de reglas del panel.

## `reportes.mjs` — por qué es uno solo y no uno por sitio

Nació el 15-sep-2026 como `casayourte/reportar.mjs`, el día que el circuito
existía en un solo lugar. Con el segundo sitio, mantener un banco por sitio era
garantizar que se separaran — el error que este ecosistema ya cometió cuatro
veces con los sellos. **Ahora es una tabla: agregar un sitio es agregarle una
fila.**

**No prueba la interfaz.** Lo que se rompe en este circuito no se ve: si el
formulario manda un campo que la regla no espera —o deja de mandar uno que
exige—, Firestore rechaza el reporte, la persona ve «no se pudo enviar» y nadie
se entera de que está cortado. **Un reporte que no llega es indistinguible de
nadie que reporte.**

Lo que cruza, sitio por sitio: que `estado: 'nuevo'` y el `uid` de la sesión
estén en los dos lados; quién puede escribir y quién leer; que el `texto` no se
pueda reescribir; que `reportes` **no** esté ni en las exclusiones del agente ni
en `selladas` de `herramientas/firestore.mjs`; y que el núcleo esté en el
`SHELL` del service worker donde corresponda.

Dos errores que encontró **de sí mismo**, y quedan anotados porque el modo de
fallar más caro de un banco es decir que algo está mal cuando está bien —eso
enseña a no creerle—:

- contaba llaves desde `match /reportes/{id}`, y las de `{id}` abren y cierran,
  así que leía el bloque vacío y acusaba de cinco fallas a reglas bien escritas;
- exigía comillas simples en `estado: 'nuevo'`, y remate lo escribe con dobles.
  Las comillas no son una diferencia que importe; el valor sí.
