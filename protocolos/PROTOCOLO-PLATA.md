# PROTOCOLO-PLATA — cómo entra la información de plata y cómo se va afinando

Desde el **11-oct-2026**, línea `L-tiempos`, pendientes `tiempos:V11` a `V14`
del panel. Lo pidió Mauro así:

> «Vamos a seguir afinando con los futuros datos de historial o presente:
> todo lo que llega a la IA debe ser evaluado e incorporado, evitando repetir
> información y siempre completando el registro existente para agregar
> precisión. Dejá este concepto y procedimiento bien documentado.»

Este documento es **el criterio**. Las cuentas viven en el código
—`tiempos/nucleo.js`, `herramientas/extractos.mjs` y `herramientas/analisis.mjs`,
cada uno con su banco de pruebas—, porque una regla que sólo vive en la memoria
de un chat no es una regla. Lo que no se puede comprobar con código —cuándo un
dato completa a otro, a quién se le pregunta, qué pesa más cuando dos fuentes
no coinciden— está acá.

**Y este archivo es público**, como todo `datos`: acá va el criterio y nunca
un dato. Ni un monto, ni un comercio de la familia, ni un número de cuenta;
los ejemplos son genéricos a propósito.

---

## 1 · El concepto, en cuatro frases

1. **La plata de la familia es UNA y vive en UN lugar: Tiempos.** Casa Verde
   (Brasil) lleva su propio libro y Tiempos lo LEE; no se copia. Todo lo
   demás —Prex, BTG, boletas, lo que se dicta, lo que se dice en un chat—
   termina en Tiempos.
2. **Nada entra dos veces.** Cada dato tiene una identidad que sale de él
   mismo, y antes de agregar se busca si ya está.
3. **Lo que llega COMPLETA lo que había; no lo pisa ni lo duplica.** Un dato
   nuevo mejora la precisión de uno viejo, le agrega lo que le faltaba (la
   cuenta, para quién, la temporada), o reemplaza una estimación por un
   número real.
4. **Cada cifra dice de dónde salió.** Una estimación se marca como tal
   («≈ por verificar») hasta que un dato real la confirme o la corrija, y
   cada cambio lleva su porqué en la nota.

Mauro no clasifica a mano (11-oct: «no quiero hacer un trabajo manual»).
**Lo dudoso lo resuelve el agente con el mejor criterio disponible**, deja
escrita la razón, y lo marca para que se pueda revisar si alguien quiere. No
se frena todo esperando una respuesta.

---

## 2 · Las piezas

| Pieza | Dónde | Qué guarda |
|---|---|---|
| **Movimientos** | `movimientos/` de Tiempos | lo registrado: cada gasto o entrada, con categoría, `cuenta` (el proyecto) y `para` (persona o chico). Lo escribe SIEMPRE una persona |
| **Extractos** | `extractos/` de Tiempos (reglas v14) | lo que dijo el banco, línea por línea, clasificado. Lo carga el agente; registrarlo es de una persona |
| **El Año** | `familia/presupuesto` → `conceptos` | lo que cuesta funcionar un año: conceptos propios (la luz, la patente) y conceptos `base` (una categoría entera, sacada de los datos) |
| **Las cuentas** | `familia/cuentas` | los proyectos: General Flores, Santa Fe, Dgo Aramburú, Hilux, Pisquito, Casa Verde, y sus partes |
| **El libro de Casa Verde** | `movimientos/` de `casaverde-20` | lo que cobra y gasta el negocio. Se lee, no se copia |

Y las vistas que lo muestran, en Tiempos → Plata: **Proyectos** (a qué destino
va cada cosa), **Análisis** (lo estimado contra lo real), **Extractos**,
**Año** (con «Lo que costó vivir un año» arriba) y **Trimestre**.

---

## 3 · Por dónde llega cada cosa, y qué se hace

| Llega… | Quién la incorpora | Cómo |
|---|---|---|
| **Capturas o archivo de un banco** (Prex, BTG…) | el agente | se pasan a un JSON **fuera de todo repositorio**, se clasifican (§ 4) y `node herramientas/extractos.mjs cargar <json> --aplicar` crea SÓLO las líneas que faltan |
| **Una boleta con foto** | la persona, en Plata → Día a día | la IA lee la foto, propone categoría y **cuenta** (`cuentaSugerida`), la persona revisa y guarda |
| **Algo dictado o escrito en el cuadro de la IA** | la persona | el plan lo arma la IA; el gasto lo escribe la persona al tocar «Hacer lo marcado» |
| **Un dato dicho en el chat** («el seguro lo estimamos en tanto», «ese pago era de un vehículo que ya no está») | el agente | corrige el concepto del Año o la línea del extracto que corresponda, con la frase de Mauro en la nota |
| **Un sistema viejo o una base anterior** | el agente | se lee (nunca se escribe allá), se traduce al modelo de hoy y se carga como extractos, cruzando contra lo que ya está |

**El agente no escribe movimientos**: los propone (`propuestas`) o los carga
como extractos. Lo que sí escribe es lo que no es plata movida: clasificar una
línea pendiente, el Año (`familia/`), las cuentas.

---

## 4 · Antes de incorporar: el control de lo repetido

En este orden, y en todos los casos:

1. **¿Ya está la misma línea?** El id de un extracto sale de la línea:
   medio, fecha, moneda, monto, sentido y orden en el día (`idExtracto`).
   Cargar dos veces lo mismo no crea nada. **Si cambia esa forma, cambian los
   ids y todo se duplica**: no se toca sin migrar.
2. **¿Es la misma compra anotada de otra forma?** Pasó con el Prex viejo: cada
   compra figuraba en dólares y otra vez como conversión a pesos, a veces con
   un día de diferencia. Se cruza **mismo medio, mismo día ±1, monto
   equivalente**, y gana la versión más completa. Ante la duda, no se carga y
   se dice.
3. **¿Ya está en el libro de Casa Verde?** Una seña de un huésped que entró a
   Prex es plata de Casa Verde: va con clase `negocio`, no se cuenta dos
   veces. Se cruza contra `movimientos` de Casa Verde por cuenta, fecha y
   monto.
4. **¿Ya es un movimiento registrado?** Lo registrado lleva `extracto: <id>` y
   su id es `x-<id de la línea>`: las vistas y el análisis cuentan la línea O
   el movimiento, nunca los dos.
5. **¿Es plata propia que se mueve?** Cargas, cambios de moneda,
   transferencias entre cuentas de uno: clase `interno`, no es gasto.
6. **¿Se compró y se devolvió?** Clase `devuelto`: neto cero.

Lo que pasa estos seis controles entra. Lo que no, se anota en el panel con la
razón, para que no vuelva a evaluarse de cero.

---

## 5 · Al incorporar: completar, no pisar

**Qué manda cuando dos fuentes no coinciden**, de más a menos:

1. **Lo que decidió una persona** —una línea registrada o excluida, un
   concepto editado a mano (`estimado: false`), lo que Mauro dijo en el chat—.
   El agente no lo cambia.
2. **Lo que dijo el banco**: monto, moneda, fecha y medio de una línea. Ni el
   agente ni la regla dejan cambiarlos.
3. **Lo que ya se hizo antes**: el mismo comercio con su cuenta en movimientos
   y extractos (es la primera pista de `cuentaSugerida`).
4. **El Año**: un concepto con proyecto que nombra al comercio.
5. **Una clasificación vieja** (la de un sistema anterior), traducida con
   cuidado: en el sistema viejo de Casa Verde «X – Personal» era QUIÉN PAGÓ,
   no para quién.
6. **Lo que deduce la IA** leyendo una foto o un texto.
7. **Una estimación** (búsqueda en la web, promedio de pocas boletas).

**Qué se completa**, siempre agregando y nunca borrando:

- **Una línea pendiente** gana clase, categoría, cuenta, para quién y nota. Lo
  que el banco dijo queda.
- **Un concepto del Año** gana proyecto (`cuenta`), temporada, el monto real o
  la marca de revisado. Si un dato real lo contradice, se corrige el monto y
  la nota dice el valor anterior.
- **Un concepto `base`** (una categoría entera) se achica cuando una parte
  pasa a tener concepto propio —no se cuenta dos veces— y se ajusta a lo real
  con «Usar lo real en el Año» de Plata → Análisis.
- **La nota** de cada cosa acumula el porqué: quién lo dijo, de qué dato
  salió, cuándo. Se agrega al final; no se reescribe lo anterior.

**Una estimación siempre se marca** (`estimado: true`, «≈ estimado, a
corregir» en el Año, «≈ por verificar» en el Análisis), con la cuenta que la
produjo en la nota —p. ej., «el porcentaje que cobra el organismo, sobre un
valor supuesto de tanto»—. Deja de estar marcada cuando una persona
la edita o cuando «Usar lo real» la reemplaza.

---

## 6 · Cómo se va afinando solo

- **Cada boleta con foto corrige lo real** del Análisis y enseña: la próxima
  vez que aparezca ese comercio, la cuenta se propone sola.
- **Cada extracto nuevo** amplía los meses medidos; la base anual
  (`baseAnual`) se recalcula sola, por moneda, con los meses de verdad.
- **Plata → Análisis** pone lo estimado al lado de lo real, ordenado por lo que
  más pesa: se depura primero lo grande.
- **El análisis de Claude** (`analisis.mjs`) trae lo mismo y dice qué
  estimación conviene corregir primero.

---

## 7 · El procedimiento, paso a paso, para un chat

Cuando llega algo de plata —capturas, un archivo, una frase de Mauro, una
consulta desde Tiempos—:

1. **Leer lo que ya hay** antes de escribir: extractos del medio, conceptos del
   Año, movimientos, y si corresponde el libro de Casa Verde.
2. **Pasar lo nuevo por los seis controles del § 4.** Lo repetido no entra.
3. **Clasificar con el orden del § 5**, sin preguntar lo que se puede deducir;
   lo dudoso se resuelve con el mejor criterio y la razón queda en la nota.
4. **Incorporar completando**: líneas nuevas con `extractos.mjs` (sólo crea lo
   que falta); correcciones con `fusionar` o `fusionarRutas` de
   `firestore.mjs`, **en UNA sesión** por tanda (cada inicio de sesión cuenta
   contra un límite de Firebase, y cientos de cambios de a uno lo agotan).
5. **Si un dato real contradice una estimación**, corregirla y decir en la nota
   cuánto era antes.
6. **Contar en el chat qué cambió en los números**: el Año, lo estimado contra
   lo real, y qué quedó marcado por verificar. Con fuentes, si hubo búsqueda.
7. **Anotar en el panel** (pendiente `tiempos:V12` o el que corresponda) lo
   incorporado, lo descartado y por qué, y lo que queda esperando un dato.

**Nunca**: guardar números de cuenta o de tarjeta (la carga los borra de la
descripción), escribir movimientos en nombre de una persona, escribir en un
sistema viejo, ni pegar extractos o datos de la familia en un repositorio —son
JSON en la carpeta de trabajo del chat, y nada más—.

---

## 8 · Dónde está cada regla en el código

| Regla | Dónde | Banco |
|---|---|---|
| El id de una línea; qué se registra; el movimiento que sale de una línea | `idExtracto`, `faltaParaRegistrar`, `movimientoDeExtracto` en `tiempos/nucleo.js` | `node pruebas.mjs` de Tiempos |
| Lo que no se cambia de una línea; quién la decide | `match /extractos` en `tiempos/firestore.rules` (v14) | banco de Tiempos y el emulador |
| Cargar sin duplicar ni guardar números de cuenta | `armarLineas` en `herramientas/extractos.mjs` | `node pruebas/herramientas/extractos.mjs` |
| A qué destino va cada cosa | `economiaFamiliar` | banco de Tiempos |
| Lo que costó vivir un año; los meses medidos | `baseAnual`, `medidosDe` | banco de Tiempos |
| Temporada, conceptos base, estimado contra real | `montoDelMes`, `anualDe`, `estimadoVsReal` | banco de Tiempos |
| La cuenta que se propone sola | `cuentaSugerida`, `leerSugerencia` | banco de Tiempos |
| Lo que lleva el análisis de Claude | `armarDatos` en `herramientas/analisis.mjs` | `node pruebas/herramientas/analisis.mjs` |
