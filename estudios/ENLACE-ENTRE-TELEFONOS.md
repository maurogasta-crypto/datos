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

### C · Cerca y sin datos: el wi-fi de la casa y el Bluetooth del auto

**Mauro, 26-oct: «me interesa que se pueda utilizar sin consumir datos, para
que ande offline en el caso de tener dos dispositivos cercanos dentro del
mismo auto o dentro de la misma casa, y que pueda despertar al teléfono».**
Esto pasa a ser lo primero, y se puede hacer **sin biblioteca nueva**: todo lo
que hace falta viene con Android.

| Dónde | Cómo se encuentran | Cómo hablan | Datos móviles | Probabilidad |
|---|---|---|---|---|
| **En la casa** (los dos en el mismo wi-fi) | se anuncian en la red local (NSD, el «mDNS» de Android) | directo por la red de la casa | **cero**: no sale a internet | 90 % |
| **En el auto** (no hay wi-fi) | Bluetooth, **emparejados una vez** desde los ajustes del teléfono | Bluetooth clásico, unos 10 m | **cero** | 80 % |

**Despertar sin internet.** Sin internet no hay aviso de Firebase, así que el
teléfono que tiene que «despertarse» deja una escucha liviana: un servicio de
la Pizarra con su notificación fija («Pizarra · escuchando cerca»), con el
Bluetooth y la red local abiertos. Cuando llega algo —una línea marcada, un
viaje que terminó, un «llamame» del handy—, suena y lo muestra aunque la
pantalla esté apagada. **Probabilidad: 85 %**; lo que más falla es MIUI
matando servicios (autostart y batería sin restricciones, en los dos).

- La escucha gasta poco: un Bluetooth esperando conexión y la red local
  anunciada. En el Note 9, que va enchufado, no importa; en tu teléfono, la
  notificación fija dice que está escuchando y se apaga con un toque.
- Pide los permisos de Bluetooth y de dispositivos cercanos una vez.
- **Lo que no se puede probar desde un chat**: el Bluetooth y la red local se
  prueban en los dos teléfonos.

**Y Nearby Connections** (de Google: elige solo entre Bluetooth y wi-fi directo
y no pide emparejar) queda como alternativa si el Bluetooth emparejado da
problemas. Es la tercera dependencia de la Pizarra: se decide después de
probar lo de arriba.

### Y el registro no depende del enlace

Mauro, el mismo día: «la propia apk, al estar conectada e iniciada en el
dispositivo que va a funcionar como detector, debería funcionar
automáticamente los recorridos para que siga habiendo un registro». Hecho en
**`sitd-56`**: el viaje empieza solo con el cargador —también si la app se abre
con el motor ya en marcha— y se cierra con el cargador cortado y la camioneta
quieta 3 minutos (el cargador del encendedor se corta andando). **Hay que
prender «Empezar y terminar con el motor» en el Note 9**: estaba apagado. La
Pizarra no mide nada: si el enlace se cae, la Hilux sigue registrando igual.

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

## 6 · En qué orden, y cuánto lleva (rehecho el 26-oct, sin datos primero)

| Paso | Qué | Repos | Tandas | Decide Mauro |
|---|---|---|---|---|
| 0 | Publicar las reglas de la Hilux de `sitd-55` (276 líneas) y prender «Empezar y terminar con el motor» en el Note 9 | — | — | sí |
| ✓ | Viajes solos en el detector (`sitd-56`) | sitd-hilux | hecho | — |
| ✓ | Puerta local Hilux → Pizarra en el Note 9 (`sitd-57`, `pizarra-70`: un proveedor de contenido, por paquete y firma) | sitd-hilux, pizarra | hecho | — |
| ✓ | **Enlace sin datos**: wi-fi de la casa + Bluetooth del auto, con la escucha que despierta (`pizarra-70`; falta probarlo en los teléfonos) | pizarra | hecho | — |
| ✓ | Handy en vivo por ese mismo enlace, sin datos (`pizarra-71`, `Radio.kt`: PCM 8 kHz en trozos de 100 ms, no se graba) | pizarra | hecho | — |
| ✓ | El enlace por internet (lejos), **por la base** (`pizarra-71`, `EnlaceLejos.kt`, `enlace/` con las reglas v21 de Tiempos). El canal directo WebRTC no se hizo: la base anda siempre y cabe en el cupo; queda para si 10 s no alcanzan | pizarra, tiempos (regla) | hecho | publicar las reglas v21 de Tiempos |
| — | Nearby, si el Bluetooth emparejado no alcanza | pizarra | 1 | la tercera dependencia |

**Recomendación:** 1 y 2 juntos —el Note 9 le pasa todo a su Pizarra, y tu
Pizarra lo recibe sin datos en la casa o en el auto, y suena cuando hay algo—,
después el handy (3) y recién después lo de lejos (4).
