# El enlace entre teléfonos: la Hilux en vivo por la Pizarra

Estudio del 26-oct-2026, pedido de Mauro:

> «Quiero que se interconecte pizarra con la apk de Hilux. El objetivo es que
> pase reportes al teléfono directamente usando la herramienta de conexión que
> hay entre teléfonos, reconociendo el teléfono que está funcionando como
> detector para la camioneta, que pueda estar en cualquier lado, y traer en
> tiempo real a través del wi-fi o del Bluetooth en una conexión directa. Es
> una modificación para pizarra, que tiene que estar instalada en los dos
> dispositivos. […] potencialmente puede conectar otras aplicaciones en tiempo
> real, y se activaría también para la comunicación tipo handy.»

Es un estudio: **no hay código todavía**. Dice qué se puede, con qué
probabilidad de que ande, cuánto cuesta y en qué orden conviene hacerlo.

---

## 1 · Lo que ya existe y se reusa

| Pieza | Dónde | Qué hace hoy | Qué aporta acá |
|---|---|---|---|
| Llamadas de voz | `Llamada.kt` de la Pizarra (pizarra-63/69) | voz directa entre Pizarras por **WebRTC**; se encuentran por `llamadas/` de Tiempos | el **canal directo** entre dos teléfonos, por internet: hoy lleva audio, puede llevar también DATOS |
| Servidores de conexión | `hielo` del Netlify de Casa Verde | STUN gratis; TURN sólo si se cargan `TURN_*` | **TURN no está cargado**: con los dos teléfonos en 4G el canal directo puede no conectar |
| Aviso instantáneo | `despertar` + `Instantaneo.kt` (FCM) | despierta a las Pizarras sin contenido | despertar al teléfono de la camioneta cuando alguien quiere verla en vivo |
| Quién es cada teléfono | `dispositivo` de los mensajes (`uid|teléfono`) | separa los teléfonos de una misma persona | reconocer **cuál es el detector de la camioneta** |
| La app de la Hilux | `sitd-hilux` | mide, guarda y sube a su base (reportes, grabaciones) | la **fuente** de lo que se transmite |

**La Pizarra no tiene que inventar un sistema nuevo**: le suma al canal de las
llamadas un canal de datos, y una puerta local para que otra app del mismo
teléfono le pase lo que quiere transmitir.

---

## 2 · Cómo quedaría armado

```
 Redmi Note 9 (en la camioneta)                 Tu teléfono (donde estés)
 ┌──────────────────┐   puerta local   ┌────────────┐          ┌────────────┐
 │ App de la Hilux  │ ───────────────▶ │  Pizarra   │ ═══════▶ │  Pizarra   │
 │ (mide)           │  mismo teléfono  │ «detector» │  enlace  │ «🚙 Hilux  │
 └──────────────────┘                  └────────────┘          │  en vivo»  │
                                                               └────────────┘
          enlace = 1) internet directo (WebRTC)       — en cualquier lado
                   2) por la base (Firestore), si 1 no conecta
                   3) Bluetooth / wi-fi directo         — cerca, sin internet
```

Tres piezas, que se hacen en este orden:

### A · La puerta local: Hilux → Pizarra, en el mismo teléfono

La app de la Hilux le pasa a la Pizarra del Note 9 lo que pasa: cada 2 s el
estado del viaje (velocidad, km, RPM, marcha, lo que se oye y vibra), y al
momento los eventos (empezó y terminó un viaje, una línea que se salió, una
grabación, un error de la app).

- Android lo resuelve con un **servicio ligado** de la Pizarra que la app de la
  Hilux llama. Sin internet, sin base, sin cupo.
- **Sólo atiende a la app de la Hilux**: verifica el nombre del paquete Y la
  huella de su firma (la clave propia de la Hilux). Cualquier otra app que
  intente hablarle, rebota. Sin esto, una app cualquiera del teléfono podría
  mandar «falla grave» a tu Pizarra.
- Del lado de la Hilux es un poco de código nativo (`MainActivity.kt`), con la
  regla de siempre: si la Pizarra no está o no contesta, la Hilux mide igual.

**Probabilidad de que ande: 95 %.** Es lo más estándar de Android. El riesgo
es MIUI matando a la Pizarra en segundo plano en el Note 9: autostart y
batería sin restricciones también para la Pizarra (lo mismo que `hilux:A3`).

### B · El enlace a distancia: «Hilux en vivo» en tu Pizarra

En tu Pizarra, una tarjeta «🚙 Hilux en vivo». Al abrirla:

1. Tu Pizarra pide el enlace en la base (una colección nueva en Tiempos,
   `enlaces/`, con su regla, como `llamadas/`) y despierta al Note 9 con el
   aviso instantáneo.
2. La Pizarra del Note 9 —que se reconoce como **detector de la Hilux** porque
   tiene la app de la Hilux al lado y está marcada así en sus ajustes— contesta,
   y se abre el canal directo (WebRTC, el mismo de las llamadas, con un canal
   de datos).
3. Mientras la tarjeta esté abierta llega el estado cada 2 s. Al cerrarla, se
   corta. **Nadie mira, nada se transmite.**
4. Si el canal directo no conecta (los dos en 4G sin TURN), cae al **plan B por
   la base**: el Note 9 escribe el estado en un documento cada 10 s mientras
   alguien lo está mirando, y tu Pizarra lo lee. Más lento, pero anda siempre
   que haya internet.

Los **eventos** (terminó un viaje con tantos km, una línea se salió, una
grabación) no necesitan que tengas nada abierto: van como aviso al buzón de tu
Pizarra, que ya existe (`avisos/`), y te llegan como notificación.

**Probabilidad de que ande:**

| Situación | Canal directo | Plan B por la base |
|---|---|---|
| Tu teléfono en wi-fi, el Note 9 en 4G | 85 % | 98 % |
| Los dos en 4G, sin TURN | 30 a 50 % | 98 % |
| Los dos en 4G, con un TURN de cupo fijo | 90 % | 98 % |
| La camioneta sin señal | 0 % | 0 % (llega cuando vuelve la señal) |

**El plan B no es un parche, es lo que garantiza el pedido**: «que pueda estar
en cualquier lado». El directo es más rápido y no gasta base; el de la base
anda siempre.

### C · Cerca y sin internet: Bluetooth o wi-fi directo

Para cuando estás en la camioneta, al lado, o en el campo sin señal: los dos
teléfonos se encuentran solos por Bluetooth y wi-fi directo.

- Lo resuelve **Nearby Connections**, de los servicios de Google que ya traen
  los dos Xiaomi: elige solo entre Bluetooth y wi-fi directo, sin internet y
  sin cupo.
- Es **una tercera dependencia** para la Pizarra, que hoy tiene dos y un banco
  que falla si aparece otra. Hay que decidirlo a propósito.
- Pide permisos de dispositivos cercanos, la primera vez.

**Probabilidad de que ande: 80 %** a menos de 30 m; con el teléfono adentro de
la cabina y vos afuera, menos. Lo que más suele fallar: permisos negados y
MIUI cortando el Bluetooth en segundo plano.

---

## 3 · El mismo enlace para otras apps, y para el handy

La puerta local (A) y el enlace (B y C) no saben de la Hilux: llevan
**mensajes con un tipo**. Cualquier app del ecosistema que se instale en un
teléfono con Pizarra puede usarlos igual:

- **Handy en tiempo real**: hoy el handy son mensajes de voz que pasan por la
  base. Con el enlace abierto, «apretar para hablar» va directo, en vivo, como
  una radio. Y con el C, **sin internet**: dos teléfonos en el campo se hablan
  por Bluetooth/wi-fi directo. El audio en vivo por internet ya lo hace la
  llamada; lo nuevo es la forma de handy (hablar uno por vez) y el modo sin
  internet. Probabilidad: 85 % por internet, 70 % sin internet.
- **Otras apps**: el panel de luces de remate, Gestos, lo que venga. Cada una
  necesita su par de puerta local, y nada más.

---

## 4 · Lo que cuesta (el § 13: nada que pase de los cupos gratuitos)

| Qué | Cuánto | Contra el cupo |
|---|---|---|
| Puerta local (A) | nada: no sale del teléfono | — |
| Canal directo (B) | el estado cada 2 s pesa unos 200 bytes: **unos 0,4 MB por hora** de datos móviles, sólo mientras lo mirás | sin base; si pasa por un TURN, del cupo fijo del TURN |
| Abrir un enlace | 3 a 6 escrituras y unas 30 lecturas en la base | 50.000 lecturas y 20.000 escrituras por día: 100 enlaces son el 6 % |
| Plan B por la base | una escritura cada 10 s mientras alguien mira: **360 por hora** | una hora por día son el 2 % de las escrituras |
| Eventos al buzón | uno por viaje y por línea marcada: unos 5 por día | nada |
| Bluetooth/wi-fi directo (C) | nada | — |

Nada exige facturación. **Lo único que no es gratis de por sí es el TURN**, y
ya está decidido que, si se carga, es uno de cupo fijo sin tarjeta.

---

## 5 · Lo que hay que saber antes de decir que sí

1. **La ubicación de la camioneta.** Ver «dónde está» en vivo es posible, y es
   el dato más sensible de la Hilux. Propuesta: **apagada por defecto**, un
   interruptor en la app de la Hilux; mientras esté apagado, el enlace lleva
   todo menos la posición.
2. **El Note 9 lleva dos apps abiertas.** La Pizarra del detector tiene que
   correr como servicio con su notificación mientras haya un viaje. En
   Android 10 eso no tiene trabas; lo que sí, MIUI (autostart y batería).
3. **La Pizarra del Note 9 entra con una cuenta.** Con la tuya, marcado como
   «detector de la Hilux» en sus ajustes. El día que exista `telefono@…`
   (pendiente de la Hilux), se cambia ahí.
4. **Lo que no se puede probar desde un chat:** el Bluetooth y el wi-fi
   directo, y el 4G contra 4G. Se compila y se prueba la lógica; lo demás se
   prueba en los dos teléfonos.

---

## 6 · En qué orden, y cuánto lleva

| Paso | Qué | Repos | Tandas | Decide Mauro |
|---|---|---|---|---|
| 0 | Publicar las reglas de la Hilux de `sitd-55` (las publicadas son de antes: no traen `grabaciones/`) | — | — | sí |
| 1 | Puerta local Hilux → Pizarra, y los **eventos** al buzón | sitd-hilux, pizarra | 1 | no |
| 2 | «🚙 Hilux en vivo»: canal directo + plan B por la base, `enlaces/` con su regla | pizarra, tiempos (regla) | 1 a 2 | publicar las reglas de Tiempos |
| 3 | Bluetooth / wi-fi directo (Nearby) | pizarra | 1 a 2 | **la tercera dependencia** |
| 4 | Handy en vivo, por internet y sin internet | pizarra | 1 | no |
| — | Un TURN de cupo fijo, para que el directo ande 4G contra 4G | Netlify | — | elegir el proveedor y cargar `TURN_*` |

**Recomendación:** hacer 1 y 2 juntos —con eso ya ves la camioneta en vivo
desde cualquier lado y te llegan los eventos— y decidir 3 después de usarlo
una semana. El 3 es el único que agrega una dependencia, y el que más depende
de probarlo en la mano.
