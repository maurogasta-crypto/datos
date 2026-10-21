# Pedidos de alquiler de Facebook — cómo funciona y cómo se usa

Al 20-oct-2026 · Pizarra `pizarra-55` · Casa Verde `pedidos-alquiler-5`.
Para Mauro y Florencia. Sin datos de personas: este repositorio es público.

---

## En una línea

Recorrés un grupo de Facebook en el **Redmi 13C**. Cuando tocás **«Comentar»** en
una publicación, la Pizarra mira si hay lugar en Casa Verde para esas fechas, te
avisa, te deja la respuesta **copiada** y guarda el pedido en **Casa Verde →
Pedidos de alquiler**. Pegás la respuesta y la mandás vos.

---

## Antes de empezar (una sola vez)

1. **Instalar la Pizarra** en el 13C: la versión `pizarra-55` o posterior
   (el enlace de siempre, `pizarra.html` del panel).
2. **Encender el lector de Facebook**: Pizarra → sección Casa Verde → «Encender
   el lector de Facebook» → Accesibilidad → Apps descargadas → «Pizarra · lector
   de Facebook». Si Android dice «Ajuste restringido»: Ajustes → Apps → Pizarra
   → ⋮ → «Permitir ajustes restringidos», y de nuevo.
3. **Entrar con la cuenta de Casa Verde** en la Pizarra del 13C (la misma
   sección). Sin eso no guarda pedidos ni ve la ocupación.
4. **Publicar las reglas de Casa Verde** (`interno/firestore.rules`): traen
   `pedidos_busqueda` (Qué busco ahora), la respuesta en `pedidos_alquiler` y
   `notificaciones`.

---

## Qué busco ahora

En **Casa Verde → Pedidos de alquiler**, arriba, «🔎 Qué busco ahora». Lo cambia
quien tiene el permiso de reservas:

- **Alquiler**: por días, por mes o anual.
- **Hasta cuántas personas**: el número, o los atajos 1 cabaña (7), 2 (12),
  las 3 (20).
- **Para quién**: familias, parejas, jóvenes, grupos grandes (ninguno = todos).
- **Dónde**: Canasvieiras, norte de la isla, toda Floripa.
- **Algo más para Claude**: una nota libre.

La Pizarra la trae al encender el lector y cada hora. Claude la respeta al
responder en la ronda.

---

## Cómo se responde

1. Abrís Facebook en el 13C y recorrés el grupo. **No pasa nada**: ni avisos ni
   guardado. Lo único que hace la Pizarra al abrir Facebook (si hacía más de
   media hora que no lo abrías) es traer la ocupación de Casa Verde, una vez.
2. Ves un pedido que te interesa y tocás **«Comentar»** (o el cuadro de texto).
3. Sale **un aviso**:
   - **«✅ Hay lugar del … al … · respuesta copiada»** — la respuesta nombra
     esas fechas, y si hacen falta varias cabañas, cuántas.
   - **«⛔ Sin lugar del … al … · copié lo que sí hay»** — la respuesta ofrece
     otra cosa: las mismas noches unos días antes o después, la parte libre de
     lo pedido, o para cuántas personas hay lugar.
   - **«📋 No dice fechas · respuesta copiada»** — la respuesta general.
4. **Pegás**: tocás la respuesta que ofrece el teclado arriba, o mantenés
   apretado el cuadro → Pegar. Revisás y **mandás vos**.
5. El pedido queda en **Pedidos de alquiler** con esa respuesta.

**A quién se responde**: a la **publicación**, nunca a un comentario: desde el
cuadro de una publicación abierta se toma la de arriba de todo. **El nombre** va
sólo si la publicación está firmada por una persona (nombre y apellido); si la
firma un grupo o no se ve, se saluda sin nombre. Si lo que tocaste no habla de
alojamiento, no se guarda nada y el aviso dice «No reconocí un pedido».

**Lo que ya se comentó se advierte**: si debajo de la publicación ya hay una
respuesta nuestra (con casaverdecanas.com.br), el aviso dice **«⚠️ YA
COMENTADA»**, no copia nada y en la lista queda respondida. Si la elegiste antes
en este teléfono pero no se ve la respuesta, el aviso dice el día y copia igual.

**La respuesta siempre**: corta, con el nombre si está claro, en portugués si
escribieron en portugués, distinta cada vez (tres formas), y sugiere
**casaverdecanas.com.br**.

---

## Las capacidades (de dónde las saca)

De cada espacio en **Casa Verde → Cabañas** (`capacidad` y `tarifas`):

| Espacio | Base | Máximo | Condición del máximo |
|---|---|---|---|
| Cabaña 1 | 6 | 8 | con extra por persona y en situaciones especiales |
| Loft | 5 | 7 | ídem (extra cargado: R$ 50 por persona) |
| Depto de familias | 4 | 5 | ídem |

Se ofrece con la **base**: una cabaña si entra, si no varias juntas. Sólo si no
alcanza se llega al **máximo**, y la respuesta dice «con un adicional por
persona». Si cambia una capacidad, se cambia en Cabañas y la Pizarra la toma en
la próxima sesión.

---

## Fechas que entiende

«13.01 al 21.01», «13/01 hasta el 21/01», «del 10 al 23 de enero», «enero 10
al 23», «del 28 de diciembre al 3 de enero», «primera / segunda quincena de
marzo», «Semana Santa», «Carnaval», «Año Nuevo», y un mes suelto («para
febrero»). Un año escrito que ya pasó («24/01/24») se toma como error de tipeo.
Lo que no entiende no lo inventa: responde sin fechas.

---

## Lo que NO hace, y por qué

- **No toca nada dentro de Facebook**: no desliza, no abre «Ver más», no
  escribe en el cuadro, no manda. Que una app escriba o toque por vos es lo
  que hace que Facebook bloquee la cuenta. Pegar y mandar es tuyo.
- **No abre la publicación exacta desde la lista de Casa Verde.** Facebook no
  da el enlace en la pantalla, y la búsqueda en el teléfono termina en el
  inicio. Por eso el botón de la lista es «Copiar», y el camino rápido es
  responder mientras recorrés. (Los pedidos que llegan por mail sí traen
  enlace: ahí el botón es «Copiar y abrir».)
- **No lee otras apps**: el lector está atado a las apps de Facebook.

---

## Lo demás que lee el 13C

- **Todas sus notificaciones** van a Casa Verde (`notificaciones/`), con los
  códigos de verificación y los enlaces de verificación tapados en el teléfono.
  Las clasifica la ronda: lo que sirve se usa, lo demás se borra; todo vence a
  los 7 días. Nadie del equipo las lee desde un sitio.
- **Airbnb**, como siempre, a la bodega y a las reservas.

---

## Dónde está escrito cada cosa

| Qué | Dónde |
|---|---|
| El lector y la respuesta | `pizarra`: `Pantalla.kt`, `Busqueda.kt`, `Disponibilidad.kt`, `Responder.kt` (banco: 139 casos) |
| La lista y «Qué busco ahora» | `casaverdecanas`: `interno/pedidos-alquiler.html`; reglas `pedidos_busqueda`, `pedidos_alquiler` |
| Las capacidades | `casaverdecanas`: `interno/cabanas.html` (Condición del máximo, Extra por persona) |
| La ronda | `datos`: `TRASPASO.md` § 4, pasos 5 bis ¼ y 5 bis ⅞; `herramientas/facebook.mjs`, `herramientas/notificaciones.mjs` |
