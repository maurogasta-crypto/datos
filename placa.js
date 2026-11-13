/* ═══════════════════════════════════════════════════════════════════
   placa.js — la guía para armar la placa de la Hilux. Sello: placa-js-9

   Pedido de Mauro, 4-nov-2026: «una pantalla dedicada para el proceso de
   construcción en Arduino del componente que se va a fabricar, con diseño y
   guía paso a paso en lo que tenemos que ir realizando: primero conseguir
   materiales y después proceso de fabricación, accesible desde el panel».

   Acá vive el CONTENIDO de la guía y las cuentas que se hacen con él (qué
   sigue, cuánto falta, cuánto cuesta). La pantalla es `placa.html`, que sólo
   dibuja; el banco es `pruebas/placa.mjs`. El porqué de cada decisión está en
   `CRUCERO.md` (§ 6, 7 y 9) y `PLACA-FASE-1.md` de
   `maurogasta-crypto/sitd-hilux`: si cambian allá, cambia acá en la misma tanda.

   LO QUE SE MARCA vive en `proyectos/hilux.placa` del panel —sin colección ni
   regla nueva: `proyectos/` ya lo escriben Mauro y el agente—, como MAPAS para
   que dos teléfonos no se pisen:
     placa.marcas.<paso>  = { en, por }      un paso hecho
     placa.notas.<paso>   = "texto"          lo que se anotó en ese paso
     placa.medidas.<k>    = "0,82"           una medición, tal como se leyó
     placa.compras.<pieza>= "pedido"|"llego" (sin valor = falta)

   UN SOLO CEREBRO (placa-js-2, 4-nov-2026). La primera versión ponía un
   ESP32 para los sensores y un Nano aparte para el pedal. Mauro: «¿por qué
   no puede ser uno solo que gestione todo, que en una primera instancia sirva
   para registrar las mediciones y en una segunda le demos la activación del
   acelerador, con un sistema de seguridad que cuando pierde active el
   funcionamiento normal por el relé?». Puede, y quedó así: la seguridad no
   depende de cuántos cerebros hay sino de que NINGUNO pueda sostener los
   relés solo. Lo que hace falta para eso son los pasos `b-autocontrol` y
   `b-nucleo`, y repetir las pruebas de seguridad con cada programa nuevo.

   ESPEJO PERMANENTE (placa-js-3, 4-nov-2026). Mauro: «el sistema sólo debe
   entrar en seguridad y desactivar los relés en caso de una falla… en su
   funcionamiento normal debemos mantener siempre la comunicación estable de
   la ECU por los pulsos emulados por la placa… cuando se presiona el freno o
   el embrague es la misma placa ESP que envía esa información… sólo ante una
   falla de funcionamiento de la placa ESP se deberían desactivar los relés».
   Así queda: con el contacto puesto la placa toma el pedal UNA vez, con el pie
   suelto, y desde ahí la ECU lee siempre lo que fabrica la placa —el pie
   copiado, o el crucero—. Cada conmutación de un relé es un corte de
   milisegundos en las dos señales, y eso es lo que la ECU puede leer como
   falla; ahora pasa una vez por viaje y no con cada frenada. El freno y el
   embrague apagan el crucero en el programa. Lo que queda por cable no es un
   corte en cada frenada: es la DETECCIÓN de que la placa falló en
   obedecerlos (`b-cortes`, un comparador), y sólo ahí sueltan los relés.

   LA CADENA DE SEGURIDAD (placa-js-4, 4-nov-2026). Mauro: «el diseño debe
   ponderar sobre todas las cosas la simpleza y robustez de la propuesta, y un
   sistema de seguridad debe correr por encima de todas las herramientas
   programables para reconectar el sistema original en caso de emergencia.
   Pero debe ser verdaderamente un caso de emergencia que salga del uso
   esperado». Así: la corriente de las bobinas de los relés pasa por UNA
   cadena de contactos en serie, toda por cable —interruptor general,
   watchdog, comparador del freno y la orden de la placa—. Cualquiera que se
   abra suelta los relés; el programa puede abrirla y nunca cerrarla solo. Lo
   que la abre es una lista CERRADA de emergencias (EMERGENCIAS), y lo que es
   uso esperado no la abre nunca (USO_ESPERADO): el banco comprueba las dos
   listas.

   LAS IDEAS ACCESORIAS (placa-js-5, 4-nov-2026). Mauro propuso sumarle a la
   placa GPS, micrófono, cortar el acelerador si falta el teléfono y un
   rastreador, «sólo si no amplían o complejizan de forma exagerada el diseño
   y la funcionalidad segura». Entra el GPS (c-gps, a-gps): barato, un cable,
   y sirve de CONTROL de la velocidad de la caja y de registro propio; nunca es
   la velocidad del crucero. Lo demás queda afuera, con su porqué en
   ACCESORIAS: las RPM exactas ya salen del cable del tacómetro; la falta del
   teléfono es uso esperado y no puede mover los relés; y un rastreador que
   avise necesita una línea móvil, que cuesta todos los meses.

   LO BÁSICO PRIMERO (placa-js-6, 4-nov-2026). Mauro: «el proyecto más
   básico posible para tener las herramientas que comiencen el aprendizaje de
   los instrumentos. Sin intervención… una lista de compras precisa… un
   proceso descriptivo de ensamblado… y la modalidad de instalación para
   buscar información y tutoriales en blogs y foros que permita identificar
   con precisión cada una de las conexiones… sin alterar el funcionamiento
   normal del vehículo». La guía arranca por la CAJA BÁSICA (secciones sin
   `etapa`): sólo lee la luz de freno, el tacómetro y la velocidad del
   tablero, más su GPS y su acelerómetro; no toca el pedal (hasta placa-js-8: desde
   placa-js-9 lo lee en paralelo). Todo el crucero
   lleva `etapa: "b"` y espera a que la caja haya aprendido. Cada pieza dice
   qué `buscar` y en qué fijarse (`ojo`); cada cable se encuentra con
   `buscar` y se confirma con el tester (`prueba`) antes de conectarlo.

   CÓMO SE TOMAN LAS SEÑALES (placa-js-7, 4-nov-2026). Decisión de Mauro:
   «los cables que hay que conectar lo haré directamente pelando un poco el
   forro y engrosando un cable para tomar su señal, y lo aislaré bien… Los
   interrumpidos, como los del acelerador, serán cortados y debidamente
   identificados en caso de volver a conectar. Es mi decisión». Así: las
   señales en paralelo, con una ventanita pelada y soldada (sin Posi-Tap), y
   los cables del pedal cortados, rotulados y terminados en conectores, que
   unidos entre sí devuelven el original.

   LA MENOR COMPLEJIDAD (placa-js-8, 4-nov-2026, Mauro: «menor complejidad
   posible»). La caja básica no tiene nada soldado adentro: el ESP32 va en una
   placa de borneras, las entradas son un módulo de optoacopladores armado y
   se alimenta con un cargador USB en el encendedor. El GPS y el acelerómetro
   son opcionales (`opcional`, que tampoco cuenta en `progreso` ni en
   `siguiente`). La fuente armada para la camioneta pasa a la etapa del
   crucero, que es cuando hace falta.

   LA FASE 1 TAMBIÉN LEE EL PEDAL Y ESCUCHA CON SU ACELERÓMETRO (placa-js-9,
   13-nov-2026). Mauro: «en una primera etapa… conectar la ESP32 a los cables
   del acelerador en paralelo sin cambiar el circuito para que pueda hacer las
   lecturas y aprender de qué forma está operando», y un acelerómetro propio en
   la misma placa que alimente la misma APK. Cambia lo que decía placa-js-6
   («no toca el pedal»): la etapa A LEE VPA y VPA2 en paralelo, con alta
   impedancia y con la masa del pedal en lectura diferencial (nunca unida a la
   masa de la placa), y sigue sin tener una sola salida. Lo que queda para la
   etapa B es CORTAR e intercalar. Las medidas del pedal con el tester pasaron
   a la sección 1 (`k-pedal`, `m-vcpa`, `m-vpa`, `m-vpa2`, `k-masa-pedal`)
   porque hay que hacerlas antes de conectar nada. El acelerómetro es el que
   Mauro ya tiene («creo que es el MPU»): MODELO A CONFIRMAR; esta guía traía
   el ADXL345. El porqué y los detalles, en `PLACA-FASE-1.md`.

   Y lo que no se negocia, para quien edite esto: los pasos que hacen segura a
   la placa —el watchdog, el corte por freno y embrague cableado y el paso
   directo con los relés sueltos— van ANTES de que la placa mande una señal a
   la ECU, y `siguiente()` no deja saltarlos. El banco lo comprueba.
   ═══════════════════════════════════════════════════════════════════ */

export const VERSION = "placa-js-9";

/* Las dos etapas, en el orden en que se hacen. La A no comanda el pedal —sólo
   lo lee, en paralelo— y sirve sola (CRUCERO.md § 9.1 y PLACA-FASE-1.md); la B
   es el crucero. */
export const SECCIONES = [
  {
    id: "cables", ic: "🔎", n: "1 · Encontrar los cables, sin cortar nada",
    d: "Antes de conectar, se encuentra cada cable en el diagrama y se CONFIRMA con el tester. Los colores cambian según el año y el mercado: nunca alcanza con el color. Para buscar: en Asia esta Hilux se llama «Vigo»; el código es KUN26 (está en la chapa del vano o en el marco de la puerta del conductor). El documento que manda es el diagrama eléctrico de Toyota, el EWD («Electrical Wiring Diagram»), y en los foros suele estar en PDF. Para preguntar en un foro: código, año, mercado y si es manual. Cada cosa que encuentres, anotala en la nota del paso: pin, color y dónde está. El pedal también se busca y se mide acá, con el tester, ANTES de conectar nada: la placa lo va a leer en paralelo, sin cortar.",
    pasos: [
      { id: "k-codigo", t: "El código exacto de la camioneta", quien: "mauro",
        d: "En la chapa del vano motor o en el marco de la puerta: modelo (KUN26…), año y el código completo de la versión. Con eso se buscan los diagramas correctos.",
        buscar: ["Toyota Hilux KUN26 EWD pdf", "Hilux Vigo electrical wiring diagram 2008"],
        prueba: "Anotado en la nota de este paso." },
      { id: "k-encendedor", t: "El encendedor: corriente SÓLO con el contacto puesto", quien: "mauro",
        d: "La caja se alimenta con un cargador USB enchufado ahí: así se apaga sola con el contacto y no descarga la batería. Si el encendedor tuviera corriente siempre, se usa otro enchufe o se avisa.",
        prueba: "Tester en el encendedor (el centro es positivo, el costado masa): 12 V con contacto, 0 V sin contacto.",
        campos: [{ k: "enc_con", n: "con contacto", u: "V" }, { k: "enc_sin", n: "sin contacto", u: "V" }] },
      { id: "k-masa", t: "Un tornillo de masa firme cerca de donde va la caja", quien: "mauro",
        d: "Para la masa del lado de entrada del módulo (la de la camioneta): un tornillo del chasis o de la estructura del tablero, sin pintura debajo del terminal.",
        prueba: "Tester en continuidad entre el tornillo y el negativo de la batería: pita (o menos de 1 Ω)." },
      { id: "k-freno", t: "El cable de la luz de freno (STP)", quien: "mauro",
        d: "En el interruptor que está arriba del pedal de freno. En el EWD la señal se llama STP. Es el más fácil de los tres: da 12 V sólo con el pedal pisado.",
        buscar: ["Hilux Vigo stop light switch wiring", "Hilux KUN26 brake light switch STP wire colour"],
        prueba: "Pinchando de atrás la ficha del interruptor con la punta fina del tester: 12 V pisando, 0 V suelto. Anotá el color y cuántas patas tiene el interruptor.",
        campos: [{ k: "stp_pisado", n: "pisado", u: "V" }, { k: "stp_suelto", n: "suelto", u: "V" }] },
      { id: "k-tac", t: "La señal del tacómetro (TACH) en la ficha del tablero", quien: "mauro",
        d: "Es la que mueve la aguja de las RPM: la ECU se la manda al tablero. Se busca en el EWD como TACH (o TAC), en la ficha del tablero de instrumentos («combination meter»). Para llegar a la ficha se saca el marco del tablero; hay videos de cómo hacerlo.",
        buscar: ["Hilux Vigo combination meter pinout TACH", "Hilux Vigo instrument cluster removal", "1KD-FTV ECU TACH pin"],
        prueba: "Motor en ralentí, tester en Hz pinchando ese cable: un número estable que sube al acelerar. Si el tester no mide Hz, en continua da una tensión intermedia que cambia con las RPM. Anotá los Hz en ralentí y a 2.000 por la aguja: con eso se sabe cuántos pulsos da por vuelta.",
        campos: [{ k: "tac_v", n: "tensión", u: "V" }, { k: "tac_ral", n: "Hz en ralentí", u: "Hz" }, { k: "tac_2000", n: "Hz a 2.000", u: "Hz" }] },
      { id: "k-vss", t: "La señal de velocidad (SPD) en la misma ficha", quien: "mauro",
        d: "Sale del sensor de la caja de cambios y va al tablero y a la ECU. En el EWD se llama SPD. Está en la misma ficha del tablero que el tacómetro.",
        buscar: ["Hilux Vigo speed signal wire SPD", "Hilux KUN26 vehicle speed sensor wiring"],
        prueba: "Con alguien manejando despacio y el tester en Hz: sube con la velocidad y en cero quieto. Anotá los Hz a 20 km/h según el GPS del teléfono. Los pulsos por kilómetro exactos los saca después la placa sola, contra su GPS.",
        campos: [{ k: "spd_v", n: "tensión", u: "V" }, { k: "spd_20", n: "Hz a 20 km/h", u: "Hz" }] },
      { id: "k-pedal", t: "Los cables del pedal: VPA, VPA2, sus masas y sus alimentaciones (sólo encontrarlos)", quien: "mauro",
        d: "El pedal del acelerador de esta camioneta es «por cable eléctrico»: dos sensores (VPA y VPA2), cada uno con su alimentación de 5 V (VCPA, VCP2) y su masa (EPA, EPA2). Lo normal en Toyota son seis conexiones, pero se confirma contra el EWD. Se buscan en la ficha del pedal y en la de la ECU. Acá NO se pela ni se corta nada. Lo más peligroso de esta etapa es tomar el cable equivocado: una alimentación de 5 V o un 12 V en una entrada de la placa la daña, y la masa de los sensores NUNCA se une a la masa de la placa.",
        buscar: ["Hilux Vigo accelerator pedal sensor VPA VPA2 EPA wiring", "Hilux KUN26 EWD accelerator pedal position sensor connector"],
        prueba: "Anotado en la nota de este paso: pin, color y de qué lado de la ficha (pedal o ECU) está cada una de las seis, y confirmado con el tester, con nada conectado a la placa." },
      { id: "m-vcpa", t: "Los 5 V que la ECU le da al pedal (VCPA y VCP2)", quien: "mauro",
        d: "Entre el cable de alimentación de cada sensor y su masa (EPA / EPA2), en la ficha del pedal, sin desenchufarla (se pincha de atrás con una aguja fina).",
        campos: [{ k: "vcpa", n: "VCPA", u: "V" }, { k: "vcp2", n: "VCP2", u: "V" }] },
      { id: "m-vpa", t: "VPA: pedal suelto, a la mitad y a fondo", quien: "mauro",
        d: "Entre VPA y EPA. Tres lecturas, sin apurarse: la de la mitad no tiene que ser exacta.",
        campos: [{ k: "vpa0", n: "suelto", u: "V" }, { k: "vpa1", n: "mitad", u: "V" }, { k: "vpa2", n: "a fondo", u: "V" }] },
      { id: "m-vpa2", t: "VPA2: las mismas tres posiciones", quien: "mauro",
        d: "Entre VPA2 y EPA2. Con esto y lo de arriba se sabe si la segunda señal va CORRIDA (la misma más un tanto) o PROPORCIONAL: es lo que la ECU vigila.",
        campos: [{ k: "vpb0", n: "suelto", u: "V" }, { k: "vpb1", n: "mitad", u: "V" }, { k: "vpb2", n: "a fondo", u: "V" }] },
      { id: "k-masa-pedal", t: "Cuánto hay entre la masa del pedal y el chasis", quien: "mauro",
        d: "Contacto puesto, motor apagado: tester en milivoltios entre EPA y el chasis, y entre EPA2 y el chasis. Si es casi cero, bien; si no, se anota igual. La placa lee diferencial contra la masa del pedal por un divisor de alta resistencia, sin unirla a su masa (PLACA-FASE-1.md § 4.1): este número sólo dice de qué tamaño es la diferencia.",
        campos: [{ k: "epa_mv", n: "EPA–chasis", u: "mV" }, { k: "epa2_mv", n: "EPA2–chasis", u: "mV" }] },
      { id: "k-lugar", t: "Dónde va la caja y por dónde pasan los cables", quien: "mauro",
        d: "Abajo del tablero o detrás de la guantera, firme. NINGÚN cable cerca de los pedales ni de la columna de dirección: todo con precintos, lejos de lo que se mueve. El acelerómetro, atornillado a un punto rígido del piso o del túnel (adentro de la cabina, no en el motor). La antena del GPS, arriba del tablero contra el parabrisas.",
        prueba: "Con todo presentado (sin conectar): los pedales y el volante se mueven entero sin tocar un cable." },
    ],
  },
  {
    id: "comprar-a", ic: "🛒", n: "2 · Comprar la caja básica",
    d: "La caja que sólo MIDE: no comanda el pedal —lo lee en paralelo— y no corta ningún cable; las señales se toman soldando sobre una ventanita pelada, y al terminar las pruebas se vuelve a aislar. Lo mínimo: nada se suelda dentro de la caja, todo se atornilla o se enchufa; el GPS y el acelerómetro son opcionales. Cada pieza dice qué buscar en la tienda y en qué fijarse. Anotá dónde la compraste y a cuánto.",
    piezas: [
      { id: "c-esp32", n: "2 × placa ESP32 DevKit V1 (ESP32-WROOM-32, 30 pines)", para: "el cerebro de toda la placa —sensores y lectura del pedal ahora y, más adelante, la salida al pedal—, con Bluetooth adentro; se programa con el mismo Arduino IDE. Una es de repuesto.", usd: [10, 16],
        buscar: "ESP32 DevKit V1 WROOM-32 30 pin", ojo: "Que diga WROOM-32 (no S2, C3 ni S3: son otros chips), con los pines ya soldados. Fijate si es micro-USB o USB-C: el cable tiene que ser de esa punta." },
      { id: "c-borneras", n: "Placa de borneras para ESP32 de 30 pines (expansion board con tornillos)", para: "el ESP32 se enchufa encima y cada pata queda en un tornillo: todo se conecta con destornillador, sin soldar nada dentro de la caja", usd: [4, 8],
        buscar: "ESP32 30 pin expansion board screw terminal", ojo: "Que sea para la de 30 pines (hay de 38, que no calza)." },
      { id: "c-opto", n: "Módulo de 4 optoacopladores PC817 (placa armada), con la entrada para la tensión que mediste", para: "las tres señales de la camioneta (freno, tacómetro, velocidad) entran aisladas: lo que pase del lado de la camioneta no llega al ESP32. Viene armado: sin resistencias ni diodos que soldar.", usd: [3, 6],
        buscar: "PC817 4 channel optocoupler isolation module 12V", ojo: "Viene en versiones de 3,3 V, 5 V, 12 V y 24 V de entrada: elegila con lo que mediste en «Encontrar los cables». Si el tacómetro o la velocidad dieron 5 V y el freno 12 V, hacen falta dos módulos (uno de cada uno). Que la salida diga 3,3 V o 3,3–5 V." },
      { id: "c-usb", n: "Cargador USB de auto de buena marca, con dos salidas, y un cable USB de DATOS de 1 m", para: "alimenta la caja desde el encendedor, que sólo tiene corriente con el contacto puesto: no hay fuente que armar ni fusible que tocar. La otra salida sigue cargando el teléfono.", usd: [6, 12],
        buscar: "car charger dual USB 12V + USB data cable", ojo: "Un cargador de marca, no el más barato: es lo que protege a la placa de los picos de la camioneta. El cable tiene que pasar datos (muchos sólo cargan) y tener la punta de tu ESP32." },
      { id: "c-dupont", n: "Cables Dupont hembra-hembra (un paquete de 40)", para: "unir el módulo de optoacopladores con la placa de borneras sin soldar", usd: [2, 4] },
      { id: "c-caja", n: "Caja plástica de unos 120 × 80 × 40 mm con tapa", para: "que entren el ESP32 con su placa de borneras y el módulo", usd: [4, 8] },
      { id: "c-cable", n: "Cable automotriz 0,5 mm² en 4 colores (2 m de cada uno)", para: "de cada toma (freno, tacómetro, velocidad) y de la masa hasta la caja", usd: [4, 8],
        buscar: "automotive wire 20 AWG" },
      { id: "c-aislar", n: "Cinta aisladora de buena calidad (3M Super 33+ o similar), 1 rollo, y cinta de tela para mazos (Tesa 51036 o similar), 1 rollo", para: "aislar cada toma soldada: la Super 33+ aguanta el calor y no se despega con los meses; la de tela encima la protege del roce", usd: [8, 14],
        buscar: "3M Super 33+ · Tesa 51036 harness tape", ojo: "La cinta aisladora común barata se despega con el calor del tablero y deja pegote." },
      { id: "c-fijar", n: "Precintos y cinta doble faz", para: "que nada cuelgue ni roce: es lo que hace que una instalación dure", usd: [3, 6] },
      { id: "c-ads", n: "Módulo ADS1115 (conversor de 16 bits, I2C)", para: "lee VPA y VPA2 con precisión, en diferencial contra la masa del pedal: el conversor interno del ESP32 es poco lineal, ruidoso y sólo tolera 3,3 V", usd: [3, 6],
        buscar: "ADS1115 16 bit ADC module I2C", ojo: "Que sea el ADS1115 (16 bits) y no el ADS1015 (12 bits). Se alimenta a 3,3 V." },
      { id: "c-divisores", n: "8 resistencias de 1 % (4 × 68 kΩ y 4 × 100 kΩ, película metálica) y 4 capacitores de 100 nF", para: "los cuatro divisores que bajan VPA, VPA2 y sus dos masas a menos de 3,1 V sin cargarlas: la de 68 kΩ va pegada a la toma", usd: [1, 3],
        buscar: "resistor kit 68k 100k 1% metal film · capacitor 100nF", ojo: "Comprar alguna de más: las que se pierden son las de 68 kΩ de la toma." },
      { id: "c-sd", n: "Módulo microSD (SPI) y una tarjeta de 8 a 32 GB", opcional: true, para: "respaldo dentro de la placa: si el Bluetooth se corta no se pierde nada. Se recomienda; está por decidir (PLACA-FASE-1.md § 10).", usd: [2, 5],
        buscar: "microSD card module SPI 3.3V", ojo: "Que funcione a 3,3 V: el ESP32 no tolera 5 V en sus pines." },
      { id: "c-rtc", n: "Reloj DS3231 (módulo con pila)", opcional: true, para: "alinear las sesiones de la placa con los viajes aunque el teléfono no esté; si no, se usa sólo el reloj del teléfono", usd: [2, 4] },
      { id: "c-fichas", n: "Fichas del pedal (macho y hembra) para tomar VPA y VPA2 sin cortar", opcional: true, para: "toma reversible: se intercala y se saca, y la camioneta queda como de fábrica. Alternativa: ventanita pelada y soldada, como el resto de las señales. A decidir (PLACA-FASE-1.md § 4.2).", usd: [15, 30],
        buscar: "Toyota accelerator pedal connector pigtail", ojo: "Antes de comprar hay que saber cuál es el conector exacto del pedal de esta camioneta: se mira la ficha y se confirma con el EWD." },
      { id: "c-gps", n: "Módulo GPS GY-NEO6MV2 (u-blox NEO-6M) con su antena cerámica", opcional: true, para: "velocidad y posición propias de la placa, sin depender del teléfono, para controlar la velocidad de la caja. Opcional: el teléfono ya tiene GPS; son cuatro cables Dupont más.", usd: [5, 10],
        buscar: "GY-NEO6MV2 NEO-6M GPS module antenna", ojo: "Que venga con la antena cuadrada (25 × 25 mm) y su cable." },
      { id: "c-adxl", n: "Acelerómetro propio y 1,5 m de cable blindado de 4 hilos (Mauro ya tiene uno: «creo que es el MPU»; MODELO A CONFIRMAR cuando llegue. Esta guía traía el ADXL345, módulo GY-291)", opcional: true, para: "vibración más fina que la del teléfono, que da unas 200 lecturas por segundo: cuántas da el suyo se MIDE en la primera prueba, no se supone. Es la fuente de vibración de la placa para la APK; es opcional sólo para el costo, porque ya lo tiene.", usd: [5, 10],
        buscar: "shielded cable 4 core · el modelo exacto, cuando se confirme" },
    ],
  },
  {
    id: "herramientas", ic: "🧰", n: "3 · Herramientas",
    d: "Lo que queda después. Si ya tenés alguna, marcala como «Llegó».",
    piezas: [
      { id: "h-soldador", n: "Soldador de 40–60 W con temperatura regulable, punta fina y su soporte", para: "", usd: [10, 25] },
      { id: "h-estano", n: "Estaño de 0,8 mm con resina y malla desoldadora", para: "", usd: [4, 8] },
      { id: "h-pela", n: "Pelacables automático y un cúter fino", para: "el pelacables para las puntas; el cúter para abrir la ventanita en el medio de un cable sin cortar hilos", usd: [8, 15] },
      { id: "h-hz", n: "Tester que mida frecuencia (Hz)", para: "encontrar el tacómetro y la velocidad sin osciloscopio. Si el tuyo no mide Hz, se puede seguir igual: lo mide la propia placa", usd: [15, 30], opcional: true },
      { id: "h-logico", n: "Analizador lógico USB (opcional)", para: "ver los pulsos de velocidad y RPM si algo no cierra", usd: [8, 12], opcional: true },
    ],
  },
  {
    id: "armar-a", ic: "🔧", n: "4 · Armar la caja en la mesa",
    d: "Todo se arma y se prueba en la mesa, alimentado por USB. No se suelda nada: se enchufa y se atornilla. Cada paso se prueba antes de seguir: si una prueba no da, se anota lo que dio y lo miramos.",
    pasos: [
      { id: "a-programa", t: "El programa de la caja básica", quien: "claude",
        d: "Lo escribo yo en el repositorio de la Hilux (carpeta placa/), con su banco de pruebas: lee las tres entradas, los dos canales del pedal y el acelerómetro (y el GPS, si lo pusiste), sella el tiempo en la placa, lo manda por Bluetooth (BLE) y por USB y lo guarda en la microSD si la pusiste. El formato de las tramas está en PLACA-FASE-1.md § 6. En esta etapa el programa no tiene NINGUNA salida salvo el LED y la microSD: el banco lo comprueba. Te digo cómo cargarlo." },
      { id: "a-esp", t: "El ESP32 en su placa de borneras, con el programa de prueba", quien: "mauro",
        d: "Se enchufa, se conecta por USB al cargador o a la computadora y se le carga el programa.",
        prueba: "El LED de la placa parpadea y el teléfono ve la caja por Bluetooth." },
      { id: "a-entradas", t: "El módulo de optoacopladores", quien: "mauro",
        d: "Del lado de salida, tres cables Dupont a la placa de borneras (alimentación, masa y una salida por señal, a los tornillos que diga el programa). Del lado de entrada, los tornillos IN1 (freno), IN2 (tacómetro), IN3 (velocidad) y G (masa de la camioneta).",
        prueba: "En la mesa, tocando cada entrada con la batería (o 5 V, según su versión): cambia en la pantalla de prueba, y sólo ésa." },
      { id: "a-ads", t: "El conversor ADS1115 y los divisores del pedal", quien: "mauro",
        d: "El ADS1115 a 3,3 V por I2C (SDA y SCL). Cuatro divisores: 68 kΩ arriba, 100 kΩ a la masa de la placa y 100 nF en la entrada; dos para VPA y VPA2 y dos para las masas del pedal (EPA y EPA2). Entradas en diferencial: A0–A1 para VPA y A2–A3 para VPA2. Las de 100 kΩ y los capacitores van en las borneras, sin soldar; las de 68 kΩ se sueldan al cable que sale a la toma, para que a la caja llegue ya la señal dividida. Se prueba todo en la mesa antes de ir a la camioneta.",
        prueba: "En la mesa, con un potenciómetro alimentado con 5 V haciendo de pedal: lo que lee la placa coincide con el tester en todo el recorrido, y ninguna entrada pasa de 3,1 V." },
      { id: "a-gps", t: "El GPS (si lo compraste)", quien: "mauro", opcional: true,
        d: "Cuatro cables Dupont a la placa de borneras (alimentación, masa y los dos de datos). La antena hacia arriba.",
        prueba: "Cerca de una ventana o afuera: en unos minutos fija y da la hora." },
      { id: "a-acel", t: "El acelerómetro (el que ya tenés)", quien: "mauro", opcional: true,
        d: "Con el cable blindado, a los tornillos de la placa de borneras (la malla a masa sólo del lado de la caja), por I2C en el mismo bus que el ADS1115, y su pin INT a la entrada del ESP32. Al arrancar la placa lee el registro de identidad del chip (WHO_AM_I) y lo manda: así se confirma que es el modelo que se creía.",
        prueba: "Quieto marca 1 g; un golpecito con el dedo se ve." },
      { id: "a-sd", t: "La microSD (si la pusiste)", quien: "mauro", opcional: true,
        d: "Los cables del módulo SPI a la placa de borneras, más alimentación y masa.",
        prueba: "El programa de prueba escribe un archivo y se puede leer en la computadora." },
      { id: "a-cerrar", t: "Todo a la caja", quien: "mauro",
        d: "Cada cable con un precinto que lo agarre antes del tornillo, rotulado (FRENO, TAC, VEL, MASA). La caja lejos del sol directo.",
        prueba: "Se sacude la caja cerrada y la pantalla de prueba sigue igual." },
    ],
  },
  {
    id: "instalar-a", ic: "🚙", n: "5 · Instalar sin alterar nada",
    d: "La regla: la camioneta tiene que andar y marcar EXACTAMENTE igual con la caja puesta, y al terminar las pruebas cada toma se puede sacar y volver a aislar. Se instala con el contacto sacado.",
    pasos: [
      { id: "i-alim", t: "Alimentación: el cargador en el encendedor, y la masa", quien: "mauro",
        prueba: "Contacto puesto: la caja prende. Contacto sacado: se apaga. La otra salida del cargador sigue cargando el teléfono." },
      { id: "i-senales", t: "Freno, tacómetro y velocidad: una ventanita pelada y soldada", quien: "mauro",
        d: "En los cables que confirmaste con el tester, cerca de la ficha donde los encontraste: con el cúter se abre una ventanita de 1 cm en el forro sin cortar hilos, se enrolla la punta pelada del cable nuevo, se suelda y se aísla con la Super 33+ y encima la de tela. Cada cable nuevo, rotulado en la punta que va a la caja.",
        prueba: "Lo que no se negocia: con la caja conectada la aguja de RPM y la de velocidad marcan lo mismo que sin ella, y la luz de freno prende igual. Si algo cambia, se desconecta y lo miramos." },
      { id: "i-pedal", t: "El pedal en paralelo: la toma de VPA y VPA2 (y de sus masas)", quien: "mauro",
        d: "Sólo después de pasar la prueba de la mesa y de tener identificadas las seis conexiones. En cada una de las cuatro señales a leer (VPA, VPA2, EPA y EPA2): la resistencia de 68 kΩ va pegada al punto de toma y de ahí sale un cable fino a la caja. La toma se aísla con termocontraíble y no sólo con cinta, y con el tester se comprueba que no haya continuidad hacia ningún cable vecino ni hacia el chasis. NUNCA se toma la alimentación de los sensores (VCPA, VCP2) y la masa del pedal NO se une a la masa de la placa. Se recomienda la toma reversible con fichas en vez de pelar.",
        prueba: "Lo que no se negocia: con el tester en VPA y VPA2, contacto puesto, pedal suelto, a la mitad y a fondo, los valores son los mismos con la placa conectada y sin ella (±20 mV es un punto de partida: se fija con la primera medición), y no se prende la luz del motor ni queda un código. Si aparece una luz o un código de falla —el típico es el P2135—, se desconecta la placa y lo miramos." },
      { id: "i-fijar", t: "Fijar la caja (y la antena y el acelerómetro, si van)", quien: "mauro",
        prueba: "Los pedales y el volante, de punta a punta, sin tocar un cable. Ningún cable colgando." },
    ],
  },
  {
    id: "aprender", ic: "📈", n: "6 · Empezar a aprender",
    d: "Con la caja andando empieza lo que se buscaba: medidas propias, exactas, para que el programa del crucero se escriba sobre datos y no sobre suposiciones.",
    pasos: [
      { id: "a-app", t: "La app lee la caja", quien: "claude",
        d: "Tanda de la app: la caja entra como fuente nueva (por las interfaces que ya existen) y lo suyo se guarda marcado como de la placa, aparte de lo del teléfono. El acelerómetro de la placa entra por FuenteDeVibracion y el pedal por una interfaz nueva (FuenteDePedal); se guardan en la base de la app y se exportan junto con los viajes (PLACA-FASE-1.md § 7)." },
      { id: "l-ralenti", t: "Motor parado: las RPM de la caja contra la aguja", quien: "mauro",
        d: "Ralentí, 1.000, 1.500 y 2.000 por la aguja: lo que dice la caja en cada uno.",
        campos: [{ k: "rpm_ral", n: "ralentí", u: "rpm" }, { k: "rpm_1500", n: "a 1.500", u: "rpm" }, { k: "rpm_2000", n: "a 2.000", u: "rpm" }] },
      { id: "l-velocidad", t: "Velocidad de la caja contra su GPS", quien: "claude",
        d: "Con los primeros viajes saco los pulsos por kilómetro exactos y la relación de cada marcha (velocidad contra RPM)." },
      { id: "l-pedal", t: "El pedal de la caja contra el tester", quien: "mauro",
        d: "Con la placa leyendo y la app guardando: pedal suelto, a la mitad y a fondo, y lo que dice la caja.",
        campos: [{ k: "pl0", n: "suelto", u: "V" }, { k: "pl1", n: "mitad", u: "V" }, { k: "pl2", n: "a fondo", u: "V" }],
        prueba: "Coincide con lo que midió el tester en el paso «VPA» de la sección 1." },
      { id: "a-viajes", t: "Dos semanas de viajes sin una diferencia", quien: "mauro",
        prueba: "Velocidad de la caja contra el GPS, RPM de la caja contra la aguja: lo comparo yo con los reportes. Con eso la caja básica está lista, y recién ahí se piensa el crucero." },
    ],
  },
  {
    id: "medir", etapa: "b", ic: "📏", n: "7 · Lo que falta medir del crucero",
    d: "Más adelante. Las medidas del pedal con el tester (VCPA, VPA, VPA2) ya se hicieron en la sección 1, porque la caja las necesita para leerlo; acá quedan el crucero de la ECU, el freno, el embrague y el paso de cortar el pedal. Sin las medidas del pedal no se puede diseñar la salida hacia la ECU: si la relación entre VPA y VPA2 se emula mal, la ECU entra en modo de emergencia.",
    pasos: [
      { id: "m-ccs", t: "Ver si la ECU tiene crucero (E5-21 contra masa)", quien: "mauro",
        d: "Con 10–14 V la ECU trae el crucero y alcanza con cablearlo; con 0 V no lo trae.",
        campos: [{ k: "ccs", n: "E5-21", u: "V" }] },
      { id: "m-freno", t: "El interruptor del freno: cuántas patas y qué da al pisar", quien: "mauro",
        d: "Si tiene 4 patas, una de las dos parejas se ABRE al pisar (en Toyota se llama ST1−) y existe justo para cortar un crucero. Si tiene 2, el corte sale de la luz de freno con un relé. Anotá cuántas y qué cable da 12 V pisando." },
      { id: "m-embrague", t: "¿Hay interruptor de embrague que se abra al pisarlo?", quien: "mauro",
        d: "El de arranque (el que pide el embrague a fondo para dar arranque) no sirve: tiene que cambiar apenas se toca el pedal. Si no hay, va un microinterruptor (está en la lista de compras)." },
      { id: "a-pedal", t: "Intercalar el pedal: los cables cortados y en conectores", quien: "mauro",
        d: "La lectura en paralelo ya anda desde la etapa A. Acá se CORTAN SÓLO las dos señales (VPA y VPA2), no la alimentación ni las masas del sensor. Cada punta queda rotulada y en su conector: del lado del pedal uno, del lado de la ECU el otro. Unidos entre sí, es el original; con la caja en el medio, la señal pasa directo por los relés (sin corriente conectan el pedal real a la ECU) y la placa la sigue leyendo con divisores de alta resistencia, sin sacarle corriente al sensor.",
        prueba: "Con el tester: el pedal mide lo mismo con la caja enchufada y sin ella (comparar con lo del paso «VPA»)." },
    ],
  },
  {
    id: "decidir-b", etapa: "b", ic: "⚖️", n: "8 · Antes del crucero",
    d: "Lo que se decide antes de que la placa mande sobre el pedal.",
    pasos: [
      { id: "d-seguro", t: "Preguntar al seguro y a la habilitación", quien: "mauro",
        d: "Es una modificación de un mando del vehículo. Mejor saberlo antes de construir." },
      { id: "d-diseno", t: "El diseño del interceptor con tus medidas", quien: "claude",
        d: "Esquema y placa impresa, con la relación VPA/VPA2 medida, el corte por freno y embrague y el watchdog. Te lo dejo acá antes de que compres." },
    ],
  },
  {
    id: "comprar-b", etapa: "b", ic: "🛒", n: "9 · Comprar lo del crucero",
    d: "Etapa B: lo que se le agrega a la MISMA placa para manejar el pedal. El cerebro es el ESP32 de la etapa A; lo que se suma son las salidas y lo que las hace seguras.",
    piezas: [
      { id: "c-fuente", n: "Fuente reductora Pololu D24V10F5 (5 V, 1 A) + diodo TVS 1.5KE24A + diodo 1N5819 + capacitor 1000 µF 35 V + portafusible en línea con fusible de 1 A", para: "para la etapa del crucero la placa pasa a una fuente propia, armada para la camioneta: tiene picos que queman un regulador común (el TVS los recorta) y al dar arranque la batería baja: esta fuente sigue dando 5 V hasta unos 6 V de entrada, y el capacitor cubre el resto. El 1N5819 protege si se conecta al revés.", usd: [14, 20],
        buscar: "Pololu D24V10F5 · 1.5KE24A TVS · 1N5819", ojo: "No sirven los módulos «mini-360» ni los LM2596 baratos: aguantan poco más de lo que da la batería y un pico los quema." },
      { id: "c-conectores", n: "2 juegos de conectores estancos de 4 vías (tipo Superseal 1.5), macho y hembra, con sus terminales y sellos, y etiquetas para cables", para: "los cables del pedal se cortan y cada punta queda en un conector: unidos entre sí devuelven el original en un minuto, y con la placa en el medio pasan por ella", usd: [8, 15],
        buscar: "Superseal 1.5 4 pin connector kit", ojo: "Los terminales se crimpan: con la pinza de crimpar para ese conector, o soldados con cuidado. Un juego de repuesto." },
      { id: "c-dac", n: "DAC doble MCP4822 + amplificador MCP6002", para: "fabricar VPA y VPA2 limpias, escaladas a los 5 V de la ECU", usd: [6, 8] },
      { id: "c-reles", n: "2 × relé de señal DPDT (Omron G5V-2 o similar) + transistores y diodos", para: "SIN corriente conectan el pedal real directo a la ECU", usd: [6, 10] },
      { id: "c-wdt", n: "Supervisor con watchdog (TPS3823) o monoestable 74HC123", para: "si el programa se cuelga, o se da cuenta de que algo no cierra, los relés caen solos", usd: [2, 4] },
      { id: "c-comparador", n: "Comparador doble LM393, resistencias y capacitor", para: "el control por cable: detecta si con el freno o el embrague pisados la placa sigue dando más que el pie", usd: [1, 3] },
      { id: "c-micro", n: "Microinterruptor para el embrague (si no hay uno que sirva)", para: "", usd: [3, 5], opcional: true },
      { id: "c-pcb", n: "Placa impresa, 5 unidades, con envío", para: "con el diseño del paso anterior", usd: [15, 30] },
      { id: "c-tablero", n: "LED, zumbador e interruptor general en el tablero", para: "ver y oír cuándo está activo y cuándo cortó; y apagarlo todo con un dedo", usd: [5, 8] },
    ],
  },
  {
    id: "armar-b", etapa: "b", ic: "🛡️", n: "10 · Armar el interceptor",
    d: "En funcionamiento normal la ECU lee SIEMPRE lo que fabrica la placa: el pie copiado o el crucero. Los relés sólo vuelven al pedal original ante una falla de la placa. Primero lo que lo hace seguro, después lo que lo hace andar. Y cada vez que se carga un programa nuevo en la placa —también uno que sólo cambia los sensores— se repiten los pasos marcados «seguridad» de esta sección y el paso directo: diez minutos, con la camioneta parada.",
    pasos: [
      { id: "b-programa", t: "El programa del pedal, en el mismo ESP32", quien: "claude",
        d: "Espejo permanente: sin crucero copia el pie, con crucero entrega el mayor entre el pie y el crucero. El freno, el embrague o el botón de cancelar apagan el crucero EN EL PROGRAMA, en la misma vuelta, y la salida vuelve a ser el pie sin tocar los relés. La velocidad del crucero es la de la caja (pulsos, sin cortes); el GPS de la placa sólo la CONTROLA: si la caja deja de mandar pulsos, o andando no coincide con el GPS, el crucero se apaga igual que con el botón de cancelar —suave, sin tocar los relés—, y sin GPS (un túnel) sigue andando con la caja. Todo lo que la placa mide es SUYO: va marcado como de la placa y no se mezcla con lo del teléfono ni se presenta como dato de la ECU. Con su banco de pruebas, y los límites viven en el programa, no en un mensaje." },
      { id: "b-toma", t: "La placa toma el pedal una sola vez: motor en marcha, pie suelto", quien: "mauro", seguridad: true,
        d: "Con el contacto la placa arranca con los relés sueltos (pedal original) y la camioneta arranca como siempre. Recién con el motor en marcha, el ralentí estable y el pie suelto, y cuando ya fabrica exactamente lo que da el pie, cierra los relés. Así el arranque —que es cuando más baja la batería— nunca pasa por la placa. Desde ahí no los vuelve a mover salvo una emergencia. Es la única conmutación de un viaje normal.",
        prueba: "Diez veces seguidas: contacto, arrancar, esperar que la placa tome el pedal (LED). Ninguna vez se prende la luz del motor ni la camioneta entra en modo de emergencia." },
      { id: "b-nucleo", t: "El pedal tiene su núcleo y nadie lo frena", quien: "claude", seguridad: true,
        d: "El ESP32 tiene dos núcleos: el lazo del pedal corre solo en uno, con prioridad, y el Bluetooth y los sensores en el otro. Un Bluetooth trabado no le roba tiempo al pedal." },
      { id: "b-reposo", t: "Relés sin corriente: el pedal va directo", quien: "mauro", seguridad: true,
        prueba: "Placa SIN alimentar, tester en continuidad: pedal↔ECU en VPA y en VPA2 a través de los dos relés." },
      { id: "b-wdt", t: "El watchdog suelta los relés", quien: "mauro", seguridad: true,
        d: "Con un tiempo holgado (alrededor de 1,5 s): sólo un programa colgado de verdad lo dispara, nunca una vuelta lenta.",
        prueba: "Placa alimentada y relés encendidos: se le corta la alimentación al ESP32 (o se lo frena con el botón de reset apretado) y los dos relés caen, con su clic." },
      { id: "b-autocontrol", t: "Si lo que sale no es lo que tiene que salir, suelta", quien: "mauro", seguridad: true,
        d: "El watchdog cubre al programa colgado; esto cubre al programa vivo pero equivocado. Cada vuelta, la placa LEE DE VUELTA las dos señales que fabrica y las compara con lo que mandó y con la relación VPA/VPA2 medida; sólo si todo cierra alimenta al watchdog. Con margen y con paciencia: tiene que fallar varias vueltas seguidas (unos 50 ms), no una lectura suelta con ruido. Si de verdad no cierra, deja de alimentarlo y los relés caen.",
        prueba: "Con la salida conectada a una resistencia (como en «salida al vacío»): se desconecta un cable de la lectura de vuelta, y los relés caen en menos de medio segundo." },
      { id: "b-cortes", t: "Si la placa no obedece al freno o al embrague, se suelta por cable", quien: "mauro", seguridad: true,
        d: "En una frenada normal NO se toca ningún relé: el programa ya volvió a copiar el pie. Lo que va por cable es el control de que eso pasó: un comparador mira, mientras el freno o el embrague están pisados, si la salida de la placa sigue más alta que el pie. Si sigue más de 0,3 s, eso es una placa que no obedece —una falla— y corta la bobina de los relés sin pasar por el programa.",
        prueba: "Frenar y embragar con el crucero puesto: el crucero se apaga, la camioneta sigue andando con el pie y los relés NO hacen clic. Y con un programa de prueba que a propósito ignora el freno: al pisarlo, los relés caen solos en menos de medio segundo." },
      { id: "b-tablero", t: "El LED, el zumbador y el interruptor general", quien: "mauro",
        prueba: "Con el interruptor apagado no hay forma de que los relés se enciendan." },
      { id: "b-cadena", t: "La cadena de seguridad: cada eslabón abre solo, y nada más la abre", quien: "mauro", seguridad: true,
        d: "Interruptor general → watchdog → comparador del freno → orden de la placa → bobinas de los relés, todo en serie y por cable. Se prueba de las dos maneras: que cada emergencia la abre por sí sola, y que el uso de todos los días no la abre nunca.",
        prueba: "Cada emergencia de la lista, de a una: los relés caen. Y después un rato de uso normal con el motor andando —arrancar, frenar, embragar, cancelar, pisar a fondo, poner y sacar las luces y el aire—: los relés no hacen clic ni una vez." },
    ],
  },
  {
    id: "probar", etapa: "b", ic: "🚦", n: "11 · Probar en la camioneta, por etapas",
    d: "Las de CRUCERO.md § 7, sin saltear ninguna. Cada una pasa sólo si el tester y la pantalla dicen lo mismo.",
    pasos: [
      { id: "p-escuchar", t: "Escuchar, motor apagado", quien: "mauro",
        d: "Intercalada, con las salidas desconectadas: sólo lee pedal, freno, embrague y velocidad." },
      { id: "p-vacio", t: "Salida al vacío", quien: "mauro",
        d: "Fabrica sus dos señales hacia una resistencia, no hacia la ECU, copiando el pedal. Tester en la salida." },
      { id: "p-directo", t: "Paso directo", quien: "mauro", seguridad: true,
        d: "Conectada a la ECU con los relés apagados: la camioneta tiene que andar EXACTAMENTE igual. Es como queda cuando la placa falla." },
      { id: "p-espejo", t: "Espejo, parada", quien: "mauro", seguridad: true,
        d: "La placa toma el pedal y lo copia: primero contacto sin motor, después motor en punto muerto y freno de mano. Las RPM siguen al pie sin demora y sin luz del motor. Ahí se prueban las fallas: se DESENCHUFA la placa con el motor andando y el pedal real vuelve solo." },
      { id: "p-andando", t: "Espejo andando", quien: "mauro",
        d: "Viajes enteros con la placa copiando el pie, sin crucero: frenadas, embragues, arranques. Se mira que no aparezca ninguna falla en la ECU, que el pedal se sienta igual que siempre y que los relés no hayan soltado NI UNA VEZ: si soltaron sin una emergencia, eso es un error a corregir antes de seguir, no una seguridad que anduvo." },
      { id: "p-lento", t: "Crucero a baja velocidad, en un lugar vacío", quien: "mauro",
        d: "Con otra persona mirando la pantalla." },
      { id: "p-ruta", t: "Ruta", quien: "mauro" },
    ],
  },
];

/* Lo ÚNICO que abre la cadena de seguridad y devuelve el pedal original. Es
   una lista cerrada: algo que no está acá no suelta los relés. */
export const EMERGENCIAS = [
  { id: "interruptor", n: "El conductor apaga el interruptor general", por: "cable" },
  { id: "colgada", n: "La placa deja de dar señales de vida por más de 1,5 s (watchdog)", por: "cable" },
  { id: "no-obedece", n: "Con el freno o el embrague pisados, la placa sigue dando más que el pie por más de 0,3 s", por: "cable" },
  { id: "sin-energia", n: "La placa se queda sin corriente o se desenchufa", por: "cable" },
  { id: "no-cierra", n: "La placa lee de vuelta lo que fabrica y no es lo que tiene que salir, varias vueltas seguidas", por: "programa (sólo puede soltar)" },
];

/* Lo que es uso de todos los días y NO puede soltar los relés: si alguna de
   estas cosas los suelta, el error es del diseño, no una seguridad que anduvo. */
export const USO_ESPERADO = [
  "frenar y embragar, con crucero o sin él",
  "cancelar el crucero o volver a ponerlo",
  "pisar el acelerador por encima del crucero",
  "dar arranque (la batería baja a 8–9 V)",
  "prender las luces, el aire o la radio",
  "una lectura suelta con ruido",
  "cargar el teléfono o perder el Bluetooth",
  "que el teléfono no esté, o que la app se cierre",
  "perder el GPS (un túnel, un garaje)",
];

/* Las ideas que se evaluaron para sumarle a la placa (4-nov-2026), con el
   criterio de Mauro: entran sólo si no complican de más el diseño ni la
   seguridad. Se muestran en la guía para que no se vuelvan a evaluar desde
   cero. */
export const ACCESORIAS = [
  { id: "gps", n: "GPS propio de la placa", entra: true,
    porque: "Cuesta US$ 5–10 y es un cable. Le da a la placa velocidad y posición propias, sin depender del teléfono, y CONTROLA la velocidad de la caja: si dejan de coincidir, el crucero se apaga solo. No es la velocidad del crucero: da 1 a 10 lecturas por segundo y se corta en un túnel; la caja da pulsos todo el tiempo." },
  { id: "rpm", n: "RPM exactas", entra: true,
    porque: "Salen del cable del tacómetro del tablero, con un optoacoplador que ya está en la lista: es la medida exacta, sin interpretar. Un micrófono en el vano del motor no: ahí hay más de 100 °C, agua y un cable que atraviesa el parallamas, y oír las RPM es justo lo que hoy confunde la 2.ª con la 4.ª. El acelerómetro de la placa queda como segunda opinión: hasta dónde ve el encendido depende de cuántas lecturas por segundo dé su modelo (A CONFIRMAR: se mide en la primera prueba)." },
  { id: "sin-telefono", n: "Cortar el acelerador si falta el teléfono", entra: false,
    porque: "Que el teléfono no esté, se descargue o pierda el Bluetooth es uso de todos los días: si eso moviera los relés, cada corte de Bluetooth sería un corte en las señales que lee la ECU, y la seguridad dependería del teléfono, que es lo que no tiene que pasar. La placa anda sola y muestra en su LED que está sin teléfono. Si se quiere, se puede elegir que sin teléfono el crucero no se pueda PONER (suave, sin relés); eso se decide después." },
  { id: "rastreador", n: "Rastreador GPS", entra: false,
    porque: "Avisar dónde está la camioneta necesita una línea móvil en la placa: un módulo de US$ 10–20 y un abono que se paga todos los meses, que es lo que el ecosistema no hace. Lo que sí sale gratis: la placa guarda sus últimas posiciones y el teléfono las lee al conectarse. Un rastreador contra robo, además, tiene que tener batería propia y estar escondido: es otro aparato, no éste." },
];

/* Todos los pasos y todas las piezas, en orden, con su sección. */
export const PASOS = SECCIONES.flatMap((s) => (s.pasos || []).map((p) => ({ ...p, seccion: s.id })));
export const PIEZAS = SECCIONES.flatMap((s) => (s.piezas || []).map((p) => ({ ...p, seccion: s.id })));

/* Lo que no deja empezar una sección. La B entera espera a la A y a las
   medidas: es la regla del § 9.1 («se llega a la Fase 3 con el hardware ya
   probado»). Y probar espera a que el interceptor esté armado. */
export const ESPERA = {
  "cables": [],
  "comprar-a": [],
  "armar-a": ["comprar-a"],
  "instalar-a": ["armar-a", "cables"],
  "aprender": ["instalar-a"],
  "medir": ["aprender"],
  "decidir-b": ["medir"],
  "comprar-b": ["decidir-b"],
  "armar-b": ["comprar-b"],
  "probar": ["armar-b"],
};

const hecho = (estado, id) => !!(estado && estado.marcas && estado.marcas[id]);
const compra = (estado, id) => (estado && estado.compras && estado.compras[id]) || "falta";

/* Una sección está completa cuando sus pasos están hechos y sus piezas —las
   que no son opcionales— llegaron. */
export function progreso(seccion, estado) {
  const s = typeof seccion === "string" ? SECCIONES.find((x) => x.id === seccion) : seccion;
  if (!s) return { hechos: 0, total: 0, completa: false };
  const pasos = (s.pasos || []).filter((p) => !p.opcional), piezas = (s.piezas || []).filter((p) => !p.opcional);
  const hechos = pasos.filter((p) => hecho(estado, p.id)).length
    + piezas.filter((p) => compra(estado, p.id) === "llego").length;
  const total = pasos.length + piezas.length;
  return { hechos, total, completa: total > 0 && hechos === total };
}

/* Qué secciones faltan para poder empezar ésta. */
export function bloqueos(seccionId, estado) {
  return (ESPERA[seccionId] || []).filter((id) => !progreso(id, estado).completa);
}

/* LO QUE SIGUE: el primer paso sin hacer o la primera pieza sin llegar,
   recorriendo en orden y sin entrar a una sección bloqueada. Medir y comprar
   la etapa A pueden ir a la vez —no dependen una de otra—, así que se ofrece
   lo primero de cada una que esté abierta. */
export function siguiente(estado) {
  const out = [];
  for (const s of SECCIONES) {
    if (bloqueos(s.id, estado).length) continue;
    const p = (s.pasos || []).find((x) => !x.opcional && !hecho(estado, x.id));
    if (p) { out.push({ seccion: s.id, tipo: "paso", ...p }); continue; }
    const pz = (s.piezas || []).find((x) => !x.opcional && compra(estado, x.id) !== "llego");
    if (pz) out.push({ seccion: s.id, tipo: "pieza", ...pz });
  }
  return out;
}

/* Lo que cuesta, en dólares y como rango (los precios son de referencia: los
   de CRUCERO.md § 6, de tienda internacional). Separado por lo que falta
   comprar y lo ya pedido o llegado, y sin las opcionales en el total. */
export function costo(estado, seccionIds) {
  const r = { falta: [0, 0], pedido: [0, 0], llego: [0, 0] };
  for (const p of PIEZAS) {
    if (seccionIds && !seccionIds.includes(p.seccion)) continue;
    if (p.opcional) continue;
    const e = compra(estado, p.id);
    r[e][0] += p.usd[0]; r[e][1] += p.usd[1];
  }
  return r;
}

/* Un número escrito como lo escribe una persona: «0,82», «0.82 V», « 4 ». */
export function numero(v) {
  if (v === null || v === undefined) return null;
  const m = String(v).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

/* La relación entre VPA y VPA2, que es lo que la ECU vigila y lo que el
   interceptor tiene que copiar. Con las tres medidas de cada una dice si la
   segunda va CORRIDA (VPA2 ≈ VPA + c) o PROPORCIONAL (VPA2 ≈ k · VPA): la que
   menos se aparta de las tres lecturas. Devuelve null si falta alguna. */
export function relacionVPA(medidas) {
  const a = ["vpa0", "vpa1", "vpa2"].map((k) => numero(medidas && medidas[k]));
  const b = ["vpb0", "vpb1", "vpb2"].map((k) => numero(medidas && medidas[k]));
  if ([...a, ...b].some((x) => x === null) || a.some((x) => x <= 0)) return null;
  const difs = b.map((x, i) => x - a[i]);
  const razones = b.map((x, i) => x / a[i]);
  const prom = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const c = prom(difs), k = prom(razones);
  const errC = Math.max(...b.map((x, i) => Math.abs(x - (a[i] + c))));
  const errK = Math.max(...b.map((x, i) => Math.abs(x - a[i] * k)));
  const sube = a[2] > a[0] && b[2] > b[0];
  return {
    forma: errC <= errK ? "corrida" : "proporcional",
    corrimiento: Math.round(c * 1000) / 1000,
    razon: Math.round(k * 1000) / 1000,
    error: Math.round(Math.min(errC, errK) * 1000) / 1000,
    sube,
  };
}
