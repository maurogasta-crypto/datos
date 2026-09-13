# plantillas — repos listos para crear, cuando un agente no puede crearlos

> **Se mudó acá el 2026-09-13**, desde el repo privado `casaverdecanas-blip/datos`,
> que Mauro borra. Y con la mudanza cambió una cosa concreta: el paso 1 de abajo
> ya no existe, porque este repositorio es público y se lee sin credenciales.

Un agente **no puede crear repositorios en `maurogasta-crypto`**: la sesión se
autentica como `casaverdecanas-blip`, y esa es una cuenta de usuario, no una
organización.

Y aunque Mauro cree el repositorio, **la sesión que ya está abierta no puede
empujar ahí**. El motivo NO es un permiso: el alcance de repositorios se fija al
crear la sesión, y uno creado después no se puede agregar. Ver
`PROTOCOLO-GENERAL.md` § 4.1.

> **No mandes a Mauro a revisar permisos.** El 2026-09-10 lo hice y fue un
> desvío: la app de GitHub de Claude en su cuenta ya tenía **«All
> repositories»** desde días antes. Los mensajes de error —«necesitás acceso de
> push», «no está configurado para esta sesión»— suenan a permiso faltante y no
> lo son. El camino es un chat nuevo, y es de un minuto.

Mientras tanto, el árbol completo se prepara acá. En cuanto haya acceso, subirlo
es una copia — no hay que volver a escribir nada ni recordar qué llevaba.

Es el § 0 aplicado: **llegar hasta el borde antes de parar.**

## Qué hay

| Carpeta | Para | Estado al 2026-09-10 |
|---|---|---|
| `gestos/` | `maurogasta-crypto/gestos` — el instrumento de manos, la incubadora | repositorio **creado por Mauro el 2026-09-10**, vacío. Falta subir esto, desde un chat abierto con él habilitado |

---

## `gestos/` · qué tiene que hacer el chat nuevo

**Esto es el traspaso.** Un chat abierto sobre `maurogasta-crypto/gestos` lo va
a encontrar vacío y sin `CLAUDE.md`, así que no tiene de dónde deducir nada. Lo
que sigue es todo lo que necesita.

### 1 · Agregar los dos repositorios a la sesión

`maurogasta-crypto/datos` (donde está esto) y `toromboto/harmonia` (de donde
sale el instrumento). Los dos son públicos: se leen sin credenciales.

### 2 · Copiar el árbol, que sale de DOS lugares

A la **raíz** de `maurogasta-crypto/gestos`:

| Qué | De dónde |
|---|---|
| `index.html` | `public/gestos.html` de **harmonia**, renombrado — acá es la portada |
| `gestos/audio.js` · `instrumento.js` · `manos.js` · `musica.js` · `pagina.js` | `public/gestos/` de **harmonia**, tal cual |
| `README.md` · `CLAUDE.md` · `.gitignore` · `.github/workflows/pages.yml` | `plantillas/gestos/` de **acá** |

**Nada de esto se reescribe ni se «mejora» al copiarlo.**

> **Y por eso los seis archivos del instrumento NO están en esta carpeta.**
> Hasta el 2026-09-13 sí estaban, byte por byte idénticos a los de harmonia, y
> se comprobó que lo eran antes de sacarlos. Pero una copia que hay que
> acordarse de sincronizar a mano es exactamente el error que este ecosistema ya
> cometió cuatro veces con los sellos y una con el texto de las reglas. La
> fuente es harmonia, y ahora la plantilla lo dice en vez de tener un duplicado
> que envejece solo.

### 3 · Empujar a `main`

Directo, sin rama (§ 2.1 ter). Antes: `node --check` en los cinco módulos.

### 4 · Decirle a Mauro el único paso que le queda

**Settings → Pages → Source: GitHub Actions.** No se puede automatizar. Y sin
él no hay sitio.

> **Y el workflow no se saca.** GitHub no dispara la compilación vieja de Pages
> («Deploy from a branch») para los push hechos por una app, y todos los push de
> un agente son de esa clase. Sin `pages.yml`, una tanda se sube y no llega
> nunca al teléfono: parece que el despliegue no hizo nada. Se descubrió tarde
> en el panel; acá viene puesto el día uno. Es `general:llevar-no-reinventar`.

Cuando esté: **https://maurogasta-crypto.github.io/gestos/**

### 5 · Cerrar las dos puntas

- Borrar `gestos/` de `maurogasta-crypto/datos` (la copia provisoria) y su
  `LEEME.md`.
- Corregir el enlace en la ficha técnica de Harmonía, en el panel: hoy apunta a
  la copia provisoria.
- Cerrar `general:incubadora` en el panel, y escribir la tanda.
  (Decía «avisar en el parte»; el parte se retiró en `panel-16`.)

### Lo que NO hay que hacer

- **No desplegar `gestos` en Vercel.** Es un sitio estático sin build y sin
  funciones: Pages ya lo cubre y el workflow ya está. Un segundo camino de
  despliegue para lo mismo es superficie de más, y el ecosistema ya pagó por eso
  (dos puentes a Tuya, `harmonia:H3`).
- **No editar el instrumento acá.** La fuente es `toromboto/harmonia`. Lo que se
  toque en la incubadora y no allá, diverge en silencio.

## El mensaje para pegar al abrir el chat

Que quede corto, porque Mauro lo escribe desde el teléfono:

> Agregá `maurogasta-crypto/datos` y `toromboto/harmonia` a la sesión y seguí
> `plantillas/LEEME.md`, sección «gestos». Empujá a `main` directo en todos los
> repos, sin rama ni merge (§ 2.1 ter).

La segunda frase es la respuesta anticipada a la pregunta de apertura del § 6.0,
para que el chat no tenga que preguntarla.
