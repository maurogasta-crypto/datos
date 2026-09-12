# Dar de alta al agente en una base — paso a paso

Para que un chat de Claude Code pueda leer una base de Firestore y compararla
con el código publicado del sitio. Escrito para hacerse **desde el teléfono**,
en la consola de Firebase.

Estado al 2026-09-11, al cierre del día: **los cuatro usuarios están creados y
los cuatro entran.** Lo único que falta es pegar las reglas en la consola de
cada proyecto — hasta que eso pase, el agente entra pero no lee nada, que es
exactamente lo que tiene que hacer el deny por defecto.

| Proyecto de la herramienta | Firebase | Para qué sirve que el agente lo lea |
|---|---|---|
| `panel` | `datos-830f8` | ✅ lee y escribe. Falta sacarle `fichas` en las reglas |
| `remate` | `remate-acbc9` | catálogo, categorías, métodos de pago vs. lo que dice el código |
| `casayourte` | `casayourte-mauro` | `sitio/publicado` vs. `contenido.json` y los textos de `index.html` |
| `casaverde` | `casaverde-20` | cabañas, espacios y actividades vs. lo que muestra el sitio |

**Los cuatro UID**, que es lo que va en cada regla. No son secretos: un UID sin
contraseña no abre nada, y de hecho tienen que estar escritos en las reglas
publicadas para servir de algo.

| Proyecto | Cómo se averigua su UID |
|---|---|
| `panel` | `node herramientas/firestore.mjs panel quien` |
| `remate` | `node herramientas/firestore.mjs remate quien` |
| `casayourte` | `node herramientas/firestore.mjs casayourte quien` |
| `casaverde` | `node herramientas/firestore.mjs casaverde quien` |

**Los valores no están escritos acá, a propósito.** Un UID sin contraseña no
abre nada, pero este documento vive en un repositorio público y el del panel no
está publicado en ningún otro lado — los de los otros tres sí, en las reglas de
su propio repo. El comando los imprime en un segundo, y así tampoco queda una
segunda copia que se desactualice el día que una cuenta se rehaga.

Cuatro UID distintos para **la misma cuenta**: es la prueba concreta de que el
UID es por proyecto.

Harmonía no está porque no tiene base: su estado vive en el `localStorage` del
teléfono.

---

## Lo primero, porque cambia todo lo demás

**El UID no se comparte entre proyectos.** Aunque uses el mismo mail y la misma
contraseña, Firebase le da a esa cuenta un **UID distinto en cada proyecto**:
son cuatro cuentas separadas que casualmente se llaman igual.

Consecuencias prácticas:

1. El alta hay que hacerla **una vez por proyecto**. No se copia.
2. El UID que ya tenés del panel **no sirve**
   en las otras tres. Cada una da el suyo, y el paso 3 es justamente averiguarlo.
3. La contraseña sí puede ser la misma, y conviene que lo sea: así alcanza con
   un par de variables de entorno para las cuatro.

---

## Paso 0 · Las variables de entorno — **con UN par alcanza**

Si el usuario es uno solo, cargar el mismo valor dos veces es trabajo
inventado. Así que la herramienta acepta cualquiera de estos nombres, y con
**un solo par** entra a las cuatro bases:

| Par | Cuándo |
|---|---|
| `FB_AGENTE_MAIL` · `FB_AGENTE_CLAVE` | el nombre bueno: dice lo que es |
| `FB_PANEL_MAIL` · `FB_PANEL_CLAVE` | el primero que hubo, de cuando la única base era el panel. **Sigue andando**, no hay que migrar nada |
| `FB_REMATE_MAIL` · `FB_REMATE_CLAVE`, etc. | sólo si algún día hay que separar una base del resto |

Busca en ese orden, de lo más específico a lo más general, y usa el primero que
encuentra.

Se cargan en la web de Claude Code, en la configuración del entorno. **Las
cargás vos. Ningún chat pide ese valor ni lo escribe en ningún lado.**

> **Ojo con una cosa que confunde:** una variable que agregás hoy **no aparece
> en una sesión que ya estaba abierta**. El entorno se arma cuando arranca la
> sesión. Si cargaste algo y el chat dice que no lo ve, no está equivocado:
> hay que abrir una sesión nueva.

---

## Paso 1 · Crear el usuario en el proyecto

Consola de Firebase → elegí el proyecto → **Authentication** → **Users** →
**Add user**.

- Mail: el mismo del panel.
- Contraseña: la misma del panel.

Si el botón no aparece, es que falta habilitar **Sign-in method → Email/Password**
en ese proyecto. En los tres sitios ya está habilitado, porque así entran los
administradores.

**No le crees una ficha en `usuarios/`.** El agente no es del equipo: no tiene
rol, no tiene permisos y no tiene que aparecer en la pantalla de usuarios del
panel. Su acceso va a salir de una regla propia, en el paso 4.

---

## Paso 2 · Avisarle a la herramienta (ya está hecho)

Los cuatro proyectos ya están escritos en `herramientas/firestore.mjs`, con su
`projectId`, su `apiKey` —los dos públicos por diseño, salieron de leer el
código de cada sitio— y su lista de colecciones selladas.

No hay nada que tocar acá salvo que quieras cambiar qué se sella.

---

## Paso 3 · Averiguar el UID de ese proyecto

Pedile al chat que corra:

```
node herramientas/firestore.mjs remate quien
```

(o `casayourte`, o `casaverde`). Contesta algo así:

```
  proyecto   : remate  (remate-acbc9)
  entró como : el.mail.del.agente@…
  UID        : ██████████████████████████████
  selladas   : llaves, documentos
```

**Ese UID es el del paso 4.** Si en vez de eso dice
`INVALID_LOGIN_CREDENTIALS`, el usuario no quedó creado en *ese* proyecto:
volvé al paso 1 y fijate que estabas parado en el proyecto correcto.

Los cuatro UID de hoy están en la tabla del principio. Este paso se repite
igual el día que haya una base nueva.

---

## Paso 4 · Las reglas, que son la parte que importa

Hasta acá el agente puede entrar, pero no leer nada: rige el deny por defecto.
Eso no es un error, es el sistema funcionando.

**Las reglas de los tres sitios ya están escritas, completas y con el UID
adentro**, en el repositorio de cada proyecto. Se copian enteras y se pegan
enteras en **Firestore Database → Rules → Publicar**. Nunca por fragmentos: en
Firestore los permisos se SUMAN, y editar un pedazo suelto es la manera
clásica de dejar abierto lo que se creía cerrado.

| Proyecto | De dónde se copia | Qué queda afuera del agente |
|---|---|---|
| `remate` | `rematetaller/remate` → `firestore.rules` (**v0.8**) | `llaves`, `documentos` |
| `casayourte` | `casayourte/CasaYourte` → `REGLAS.txt` | `calculos`, `invitaciones` |
| `casaverde` | `casaverdecanas-blip/casaverdecanas` → `interno/firestore.rules` | credenciales, dinero y gente — 15 entradas |

En los tres el bloque es el mismo de forma: una función `esAgente()` con el UID
de ese proyecto, y **un solo** `match` con la lista de lo que no alcanza. Una
línea por colección sería más largo y más fácil de romper.

### Por qué el UID y no el mail

Se puede escribir la regla comparando el mail, y tiene una ventaja real: el
texto queda idéntico en los cuatro proyectos y no hay que copiar nada. **No lo
hagas.** Firebase deja que cualquiera se registre solo con mail y contraseña, y
una regla que le abre la base "a quien tenga tal mail" se la abre a quien
consiga registrar ese mail primero. El UID no se puede elegir ni adivinar: lo
asigna Firebase. Copiar veinte caracteres una vez por proyecto es barato.

### Por qué `config` entero queda afuera en casaverde

Adentro vive `config/integraciones`, que guarda claves de terceros — lo dice su
propia regla. Y `config/sitio`, que es lo único de ahí que sirve comparar con
el sitio, **ya es de lectura pública**: el agente lo lee sin que haya que
abrirle nada.

### panel — `datos-830f8` (esta es la que falta, y es tuya)

Las reglas del panel viven sólo en la consola, no en ningún repositorio, así
que el texto exacto lo tenés vos. Lo que hay que cambiar es **una cosa**: donde
hoy dice que el agente no toca `claves`, tiene que decir que tampoco toca
`fichas`.

**Pegá el texto actual de esas reglas en el chat y te lo devuelvo completo y
listo para reemplazar.** Es el camino correcto: editarlas a ojo por fragmentos
es justamente lo que no se hace.

**Por qué `fichas`:** nació como fichas técnicas de cada proyecto, pero ahí
guardás usuarios y contraseñas de servicios, y dijiste que vas a seguir
haciéndolo. Una colección donde puede aparecer una credencial es una bóveda, se
llame como se llame.

---

## Paso 5 · Comprobar que quedó bien

Pedile al chat las tres cosas, en este orden:

```
node herramientas/firestore.mjs remate leer categorias      → tiene que TRAER datos
node herramientas/firestore.mjs remate leer llaves          → tiene que FRENARSE
```

La segunda se frena en el guardia de la herramienta, que corta antes de salir a
la red. Para comprobar que **las reglas** también dicen que no —que es lo único
que de verdad protege— pedile que pida `llaves` salteando el guardia e imprima
sólo el código de estado: tiene que ser **403**.

Las dos capas tienen que estar. El guardia da un mensaje claro; las reglas dan
la garantía.

---

## Lo que queda afuera a propósito

**Escritura.** Estos bloques dan lectura y nada más. En el panel el agente
escribe porque ése es su trabajo; en los tres sitios, por ahora, mira. El día
que haga falta que escriba algo concreto —un campo de `sitio/publicado`, por
ejemplo— se abre ese camino y nada más, en la misma tanda que el código que lo
usa.

**Lo sellado, revisado con calma.** La lista de arriba la propuso un chat
leyendo las reglas de cada proyecto, no vos. Está pensada para pecar de
cerrada. Si algo que hace falta quedó afuera, se saca de la lista; si algo
sensible quedó adentro, se agrega **a los dos lados**: a `selladas` en
`herramientas/firestore.mjs` y a la regla publicada. Los dos, siempre. El
archivo da el mensaje claro y la regla da la garantía.
