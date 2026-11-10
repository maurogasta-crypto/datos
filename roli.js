/* ═══════════════════════════════════════════════════════════
   roli.js — las actividades de Roli y lo que conviene comprarle.
   Sello: roli-js-1 (10-nov-2026)

   Mauro, 10-nov-2026: «la página con actividades que contemplen la
   integración del cuello (servo), el sensor ultrasónico delantero y
   trasero y movimientos; y una sección con lo que recomendamos comprar
   para mejorar las capacidades de Roli».

   Todo lo de acá es dato y cuentas, sin DOM ni red: la página sólo dibuja
   y el banco (pruebas/roli.mjs) lo prueba con node. Las palabras salen de
   `ayuda()` de firmware/roli_programa.ino de maurogasta-crypto/roli: si
   el firmware suma o cambia una palabra, cambia NIVEL_DE y las actividades
   en la misma tanda (el banco falla si una actividad usa una palabra que
   todavía no existe en su nivel).
   ═══════════════════════════════════════════════════════════ */
export const VERSION = "roli-js-1";

/* Desde qué nivel existe cada palabra. */
export const NIVEL_DE = {
  hola: 1, info: 1, bateria: 1, di: 1, led: 1, parpadear: 1, ayuda: 1,
  adelante: 2, atras: 2, izquierda: 2, derecha: 2, parar: 2, probar: 2,
  velocidad: 3, zigzag: 3,
  programa: 4, fin: 4, listar: 4, ejecutar: 4, esperar: 4, borrar: 4,
  distancia: 5, escanear: 5, mirar: 5, proteccion: 5,
  cuando: 6, explorar: 6, girar: 6,
  d: 2, a: 2, i: 2, e: 2, r: 2, // los atajos del nivel 2
};

export const NIVELES = [
  { n: 1, t: "Hablar", ic: "💬" }, { n: 2, t: "Moverse", ic: "🚗" },
  { n: 3, t: "Tiempo y velocidad", ic: "⏱" }, { n: 4, t: "Programas", ic: "📝" },
  { n: 5, t: "Ojos y cuello", ic: "👀" }, { n: 6, t: "Decidir", ic: "🧭" },
];

/* El aviso de los niveles 5 y 6: según el traspaso del 9-nov, los sensores
   y el barrido todavía no están cerrados en el robot. */
export const AVISO_OJOS = "Los ojos y el cuello se están terminando de ajustar. Si Roli dice «no veo nada» con la mano adelante, no es culpa tuya: avisale a Mauro.";

/* Cada paso: t = qué hacer; escribi = lo que se teclea, en orden; ve = lo que tendría que pasar. */
export const ACTIVIDADES = [
  { id: "hola", nivel: 1, ic: "👋", titulo: "Hola, Roli", meta: "Que Roli te salude y diga tu nombre.",
    cosas: ["Roli prendido y conectado a la laptop"],
    pasos: [
      { t: "Saludalo.", escribi: ["hola"], ve: "Roli contesta con su nombre y su nivel." },
      { t: "Pedile que diga tu nombre.", escribi: ["di Yacko"], ve: "Roli repite lo que escribiste (cambiá Yacko por tu nombre)." },
      { t: "Prendé y apagá su luz.", escribi: ["led 1", "led 0"], ve: "La luz de la placa se enciende y se apaga." },
      { t: "Hacé que parpadee.", escribi: ["parpadear 5"], ve: "La luz titila cinco veces." } ],
    desafio: "Hacé que Roli diga una frase y parpadee tres veces sin que nadie te ayude." },
  { id: "pasos", nivel: 2, ic: "🚗", titulo: "Los primeros pasos", meta: "Mover a Roli con las cuatro direcciones.",
    cosas: ["Un lugar libre de 2 metros", "Roli en el piso, no sobre la mesa"],
    pasos: [
      { t: "Probá las ruedas de una vez.", escribi: ["probar"], ve: "Cada rueda gira un ratito, una por una." },
      { t: "Mandalo adelante y paralo.", escribi: ["adelante", "parar"], ve: "Roli avanza y se frena. Si no le decís «parar», se frena solo a los 4 segundos." },
      { t: "Probá las otras tres direcciones.", escribi: ["atras", "parar", "izquierda", "parar", "derecha", "parar"], ve: "Va para atrás y gira a cada lado." },
      { t: "Ahora con las letras cortas.", escribi: ["d", "r", "i", "r", "e", "r", "a", "r"], ve: "d = adelante, a = atrás, i = izquierda, e = derecha, r = parar." } ],
    desafio: "Llevá a Roli hasta una marca en el piso y traelo de vuelta, sin tocarlo." },
  { id: "tiempo", nivel: 3, ic: "⏱", titulo: "Tiempo y velocidad", meta: "Que Roli llegue justo a la marca.",
    cosas: ["Cinta en el piso a 1 metro de Roli"],
    pasos: [
      { t: "Mandalo adelante por un tiempo.", escribi: ["adelante 2"], ve: "Avanza dos segundos y se para solo." },
      { t: "Cambiale la velocidad.", escribi: ["velocidad 150", "adelante 2"], ve: "Va más rápido. Probá 100 y 200 y mirá la diferencia." },
      { t: "Si se desvía, corregí una rueda.", escribi: ["velocidad izq 140", "adelante 2"], ve: "Cada rueda tiene su propia velocidad; así se compensa una que rinde distinto." },
      { t: "Probá el zigzag.", escribi: ["zigzag 1", "adelante 3", "zigzag 0"], ve: "Avanza serpenteando suave." } ],
    desafio: "Encontrá cuántos segundos hacen falta para llegar justo a la cinta, y anotalo." },
  { id: "programa", nivel: 4, ic: "📝", titulo: "Mi primer programa", meta: "Que Roli dibuje un cuadrado solo.",
    cosas: ["Un lugar libre de 1,5 × 1,5 m"],
    pasos: [
      { t: "Empezá a grabar.", escribi: ["programa"], ve: "Roli dice «Grabando» y guarda lo que escribas hasta «fin»." },
      { t: "Escribí los pasos del cuadrado, uno por línea.", escribi: ["adelante 2", "izquierda 1", "adelante 2", "izquierda 1", "adelante 2", "izquierda 1", "adelante 2", "izquierda 1"], ve: "Cada línea se guarda, no se ejecuta todavía." },
      { t: "Terminá de grabar y mirá lo que guardó.", escribi: ["fin", "listar"], ve: "Aparece la lista numerada de pasos." },
      { t: "Ejecutalo.", escribi: ["ejecutar"], ve: "Roli hace todo solo. Si el giro no es de 90°, cambiá el tiempo de «izquierda»." },
      { t: "Repetilo.", escribi: ["ejecutar 3"], ve: "Lo hace tres veces seguidas." } ],
    desafio: "Armá un baile con «esperar 1» entre movimientos, y mostráselo a alguien. Para empezar de cero: borrar." },
  { id: "cuello", nivel: 5, ic: "🦒", titulo: "El cuello de Roli", meta: "Mover el cuello y saber qué hay a cada lado.", ojos: true,
    cosas: ["Roli quieto (apoyado, sin moverse)", "Un libro a la izquierda y una caja a la derecha, a unos 30 cm"],
    pasos: [
      { t: "Mirá a la izquierda.", escribi: ["mirar izq"], ve: "El cuello gira y Roli dice la distancia que ve." },
      { t: "Mirá a la derecha y al frente.", escribi: ["mirar der", "mirar frente"], ve: "Lo mismo para cada lado." },
      { t: "Pedile que mire los tres lados de una vez.", escribi: ["escanear"], ve: "Dice «izq=… frente=… der=…» en centímetros." },
      { t: "Movés el libro más cerca y escaneás de nuevo.", escribi: ["escanear"], ve: "El número de la izquierda baja." } ],
    desafio: "Sin mirar, adiviná qué lado está más libre. Después escaneá y comprobá." },
  { id: "ojos", nivel: 5, ic: "📏", titulo: "Ojos de adelante y de atrás", meta: "Medir distancias con los dos sensores.", ojos: true,
    cosas: ["Roli quieto", "Una regla"],
    pasos: [
      { t: "Poné la mano a 20 cm, delante del ojo de adelante.", escribi: ["distancia"], ve: "Dice una distancia cercana a 20." },
      { t: "Alejala de a poco y medí otra vez.", escribi: ["distancia"], ve: "El número crece. Si dice «no veo nada», está muy lejos o no la ve." },
      { t: "Ahora pasá a la parte de atrás.", escribi: ["distancia atras"], ve: "El ojo de atrás no se mueve: mide siempre lo que hay detrás." },
      { t: "Probá con cosas distintas: libro, almohada, mano.", escribi: ["distancia"], ve: "Lo blando y lo inclinado se ven peor. ¿Cuál se ve mejor?" } ],
    desafio: "Con la regla, comprobá si Roli mide bien: ¿cuánto se equivoca a 10, 30 y 60 cm?" },
  { id: "frenar", nivel: 5, ic: "🛑", titulo: "Frenar solo", meta: "Que Roli se pare antes de chocar.", ojos: true,
    cosas: ["Una pared o una caja grande", "2 metros de piso libre"],
    pasos: [
      { t: "Activá la protección a 20 cm.", escribi: ["proteccion 20"], ve: "Roli se frena si ve algo a menos de 20 cm." },
      { t: "Mandalo hacia la pared.", escribi: ["adelante 3"], ve: "Se frena solo antes de tocarla." },
      { t: "Probá con otra distancia.", escribi: ["proteccion 35", "adelante 3"], ve: "Ahora se para más lejos." },
      { t: "Apagá la protección.", escribi: ["proteccion 0"], ve: "Ya no se frena solo. ¡Cuidado, usalo con la mano lista!" } ],
    desafio: "¿Cuál es la distancia más corta con la que Roli frena sin tocar la pared?" },
  { id: "doblar", nivel: 6, ic: "↪️", titulo: "Si ves algo, doblá", meta: "Enseñarle a Roli qué hacer cuando encuentra un obstáculo.", ojos: true,
    cosas: ["Una caja grande en el camino, a 1 metro"],
    pasos: [
      { t: "Decile qué hacer cuando vea un obstáculo.", escribi: ["cuando obstaculo izquierda 1"], ve: "Roli recuerda la regla." },
      { t: "Mandalo hacia la caja.", escribi: ["adelante 4"], ve: "Cuando ve la caja, frena y dobla a la izquierda." },
      { t: "Cambiale la regla.", escribi: ["cuando obstaculo derecha 1", "adelante 4"], ve: "Ahora dobla para el otro lado." },
      { t: "Sacá la regla para que decida solo.", escribi: ["cuando obstaculo nada"], ve: "Vuelve a elegir él." } ],
    desafio: "Armá un camino con dos cajas donde una regla sola no alcance, y pensá cuál usar." },
  { id: "explorar", nivel: 6, ic: "🧭", titulo: "Roli explora", meta: "Que Roli se mueva solo por un laberinto de cajas.", ojos: true,
    cosas: ["Un laberinto de cajas y libros, con pasillos de unos 40 cm", "Alguien con la mano lista para pararlo"],
    pasos: [
      { t: "Dejalo explorar 20 segundos.", escribi: ["explorar 20"], ve: "Avanza mientras el cuello barre de lado a lado. Cuando algo está cerca, frena, mira para varios lados y se va por donde ve más lejos." },
      { t: "Mirá qué cuenta en pantalla.", ve: "Dice qué camino eligió. Si todo está cerrado adelante y atrás, se detiene." },
      { t: "Probalo atrapado en un rincón.", escribi: ["explorar 20"], ve: "Si el mejor camino es para atrás, usa el ojo de atrás y da media vuelta." },
      { t: "Paralo cuando quieras.", escribi: ["parar"], ve: "Se detiene en el acto." } ],
    desafio: "Armá un laberinto con una salida y contá cuántas veces explorar la encuentra." },
  { id: "girar", nivel: 6, ic: "🔄", titulo: "Girar con grados", meta: "Que Roli gire un ángulo exacto.", ojos: true,
    cosas: ["Piso liso", "Una cinta como referencia"],
    pasos: [
      { t: "Pedile un giro de un cuarto de vuelta.", escribi: ["girar der 90"], ve: "Gira más o menos 90° a la derecha." },
      { t: "Cuatro giros seguidos.", escribi: ["girar der 90", "girar der 90", "girar der 90", "girar der 90"], ve: "Tendría que quedar mirando para donde empezó." },
      { t: "Si se pasó o se quedó corto, anotá cuánto." , ve: "Con Mauro: ese error sirve para ajustar el giro de Roli (GIRO_MS_POR_GRADO)." } ],
    desafio: "Con «escanear» y «girar», que Roli se dé vuelta hacia el lado más libre." },
];

/* Lo que recomendamos comprar. `desbloquea` dice qué actividad o pendiente nuevo permite;
   los precios son aproximados en dólares, de una tienda común de electrónica: se confirman al comprar. */
export const COMPRAS = [
  { id: "cargador", n: "Cargador 2S para las 18650 (o cargador de una celda sola)", usd: [8, 15], prioridad: 1,
    para: "Cargar las dos baterías de Roli. El módulo TP4056 que hay es de una sola celda: con las dos en serie hay que cargar cada una por separado o usar un cargador 2S con protección.",
    ojo: "Que tenga protección contra sobrecarga. Las celdas no se cargan en serie con un cargador de una celda.", pendiente: "roli:P4" },
  { id: "capacitor", n: "Capacitor electrolítico de 470 µF / 16 V (2 unidades)", usd: [1, 2], prioridad: 1,
    para: "Si Roli se reinicia solo cuando el cuello se mueve con las ruedas andando, es el servo chupando corriente. El capacitor, pegado a la barra de 5 V, lo calma.", ojo: "La pata larga es el +.", pendiente: "roli:P7" },
  { id: "resistencias", n: "Resistencias de 10 kΩ (2) para medir la batería", usd: [0.5, 1], prioridad: 1,
    para: "Un divisor de VIN a A2 y de A2 a GND deja que Roli diga cuánta batería le queda. Después se pone HAY_MEDIDOR_BATERIA = true.", pendiente: "roli:P3" },
  { id: "rueda", n: "Rueda loca de bola metálica (ball caster)", usd: [2, 4], prioridad: 2,
    para: "La rueda de atrás frena los giros y los retrocesos. Una de bola gira para cualquier lado y hace que el empujón de arranque haga falta menos.", ojo: "Medir la altura: tiene que dejar a Roli derecho." },
  { id: "mpu", n: "Giroscopio MPU-6050", usd: [3, 6], prioridad: 2,
    para: "Roli sabría cuánto giró de verdad y si va derecho. Sin esto, «girar der 90» es una estimación por tiempo.",
    ojo: "Usa los pines A4 y A5, y A4 hoy es el Echo del sensor trasero: habría que mover ese cable a otro pin libre (2, 4, 7 u 8).", pendiente: "roli:P5" },
  { id: "encoder", n: "Sensores de horquilla (LM393) con disco ranurado, 2 unidades", usd: [4, 8], prioridad: 3,
    para: "Cuentan las vueltas de cada rueda: Roli iría derecho aunque un motor rinda distinto, y «adelante 30 cm» sería en centímetros y no en segundos.",
    ojo: "El Arduino UNO sólo tiene dos pines de interrupción, el 2 y el 3, y el 3 es del servo: se podría con un encoder en el 2, o con interrupciones de cambio de pin.", pendiente: "roli:P5" },
  { id: "linea", n: "Sensores de línea TCRT5000 (2 o 3)", usd: [2, 5], prioridad: 3,
    para: "Roli seguiría una línea negra pegada en el piso: actividades nuevas de carreras y recorridos, usando pines libres (2, 4, 7, 8).", ojo: "Hay que sumar palabras al firmware: no es sólo conectar." },
  { id: "buzzer", n: "Buzzer pasivo + LEDs de colores con resistencias de 220 Ω", usd: [1, 3], prioridad: 3,
    para: "Que Roli haga sonidos y luces: una alarma cuando ve un obstáculo, una luz para cada giro. Muy lindo para los chicos y usa pines libres.", ojo: "Hay que sumar palabras al firmware." },
  { id: "divisor", n: "Resistencias de 1 kΩ y 2 kΩ", usd: [0.5, 1], prioridad: 4, opcional: true,
    para: "Divisor para la entrada del módulo Bluetooth. Hoy anda sin él; protege el módulo a largo plazo." },
  { id: "portapilas", n: "Portapilas de 2×18650 con cables e interruptor", usd: [2, 4], prioridad: 4, opcional: true,
    para: "Un interruptor para prender y apagar sin sacar las baterías, y contactos firmes." },
];

export function totalCompras(lista = COMPRAS, estado = {}) {
  let min = 0, max = 0;
  for (const c of lista) { if (estado[c.id] === "llego") continue; min += c.usd[0]; max += c.usd[1]; }
  return { min: Math.round(min * 10) / 10, max: Math.round(max * 10) / 10 };
}
export const porPrioridad = (lista = COMPRAS) => [1, 2, 3, 4].map((p) => ({ p, items: lista.filter((c) => c.prioridad === p) })).filter((g) => g.items.length);
export const PRIORIDAD_TEXTO = { 1: "Primero: lo que arregla problemas de hoy", 2: "Después: que Roli sepa dónde está", 3: "Para ampliar las actividades", 4: "Opcional" };

/* Las palabras que usa una línea tecleada ("adelante 2" → "adelante"). */
export const palabraDe = (linea) => String(linea || "").trim().split(/\s+/)[0].toLowerCase();
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const usd = (r) => (r[0] === r[1] ? "USD " + r[0] : "USD " + r[0] + "–" + r[1]);
