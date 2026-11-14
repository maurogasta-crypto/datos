/* ═══════════════════════════════════════════════════════════
   roli.js — las actividades de Roli y lo que conviene comprarle.
   Sello: roli-js-4 (14-nov-2026: cuatro dinámicas colaborativas; roli-js-3 la primera versión colaborativa; roli-js-2 la primera, competitiva; roli-js-1, 10-nov)

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
export const VERSION = "roli-js-4";

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

/* ═══ JUGAR HOY: dinámicas de equipo (roli-js-3, 14-nov-2026) ═══
   Mauro, 14-nov-2026: «las dinámicas de juegos deben ser colaborativas y no competitivas: un jugador controla un
   aspecto de Roli y otro indica los movimientos; uno inicia las órdenes en la consola y el otro prepara el terreno».
   Por eso no hay puntos por persona, ni podio, ni lugares: el equipo entero junta ESTRELLAS ⭐ y busca una meta
   común. Cada ronda reparte ROLES que se necesitan entre sí (uno escribe, otro guía, otro prepara el terreno) y se
   rotan de a una ronda, para que todos hagan de todo. Menos intentos para lograrlo = más estrellas, pero no se resta
   nada: equivocarse es parte de aprender. Sólo usa palabras que ya existen en su nivel (el banco lo comprueba); lo que
   depende de los ojos es un bonus aparte, marcado `ojos`. `fecha` dice para qué día es: la página muestra la más
   reciente que no sea del futuro. */

/** Estrellas de una ronda: 1.er intento 3, 2.º 2, de ahí en adelante 1; si todavía no se logró, 0. Nunca resta. */
export function estrellasPorIntentos(intentos, logrado = true) {
  const n = Math.floor(Number(intentos));
  if (!logrado || !Number.isFinite(n) || n < 1) return 0;
  return n === 1 ? 3 : n === 2 ? 2 : 1;
}
/** Las estrellas del equipo: `estado[rondaId] = { intentos, logrado }`. El bonus (`ojos`) suma pero no entra en el máximo. */
export function totalEstrellas(estado = {}, rondas = []) {
  let total = 0, max = 0;
  for (const r of rondas) {
    const e = estado[r.id] || {}, est = estrellasPorIntentos(e.intentos, !!e.logrado);
    total += est; if (!r.ojos) max += 3;
  }
  return { total, max };
}
/** Lo que le dice la página al equipo: siempre en plural, siempre para adelante. */
export function mensajeDeEquipo(total, max, meta) {
  if (total <= 0) return "Todavía no hay estrellas: la primera ronda es para entrar en calor. ¡Juntos se puede!";
  if (total >= max) return "¡Estrella en todas! Roli y el equipo salieron perfectos.";
  if (total >= meta) return "¡Lo logramos! Llegaron a la meta del equipo (" + meta + " ⭐). Sigan por más.";
  return "Van " + total + " ⭐ de la meta de " + meta + ". Cada intento enseña algo: ¡a seguir juntos!";
}
/** Reparte los roles de una ronda entre las personas, rotando de a uno por ronda. Si hay menos personas que roles,
 *  a alguien le tocan dos (el que más rota se queda con el sobrante); si hay más, algunas personas ayudan en la ronda. */
export function asignarRoles(jugadores, roles, ronda = 0) {
  const J = jugadores.filter((j) => String(j || "").trim());
  if (!J.length || !roles.length) return [];
  const k = ((ronda % J.length) + J.length) % J.length;
  return roles.map((r, i) => ({ rol: r.id, persona: J[(i + k) % J.length] }));
}
/** Lo que se le cuenta a Mauro al final: las medidas de hoy, para ajustar a Roli. */
export function medidasParaMauro(m = {}, fecha = "") {
  const n = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) || Number(v) <= 0 ? null : Number(v));
  const vel = n(m.velocidad), seg = n(m.segundosPorMetro), giro = n(m.giro90);
  const L = [`Medidas de Roli${fecha ? " · " + fecha : ""}`];
  L.push(seg ? `- A velocidad ${vel || "(la de siempre)"}, avanza 1 metro en ${seg} s.` : "- Segundos para 1 metro: sin medir.");
  L.push(giro ? `- Con «izquierda ${giro}» gira unos 90° (≈ ${Math.round((giro * 1000) / 90)} ms por grado; orientativo para GIRO_MS_POR_GRADO, lo confirma Mauro).` : "- Tiempo del giro de 90°: sin medir.");
  if (m.nota) L.push("- " + String(m.nota).trim().slice(0, 300));
  return L.join("\n");
}

const R_OPERADOR = { id: "operador", ic: "⌨️", nombre: "Operador", hace: "Es el ÚNICO que escribe en la consola. Teclea lo que le dicen, ni una letra más." };
const R_NAVEGANTE = { id: "navegante", ic: "🧭", nombre: "Navegante", hace: "Mira a Roli y dice en voz alta qué tiene que hacer, paso a paso. No toca el teclado." };
const R_TERRENO = { id: "terreno", ic: "🏗", nombre: "Constructor del terreno", hace: "Prepara el piso con cinta, cajas y marcas antes de cada intento, y ayuda a medir." };

const R_COREOGRAFO = { id: "coreografo", ic: "🩰", nombre: "Coreógrafo del movimiento", hace: "Decide SÓLO cómo se mueve Roli: adelante, atrás, giros y pausas." };
const R_LUCES = { id: "luces", ic: "💡", nombre: "Director de luces y voz", hace: "Decide SÓLO lo que Roli enciende y dice: la luz, los parpadeos y las frases." };
const R_ESCENARIO = { id: "escenario", ic: "🎪", nombre: "Escenógrafo", hace: "Prepara el escenario con cinta y marcas, y decide dónde empieza y dónde termina el baile." };
const R_REDACTOR = { id: "redactor", ic: "📝", nombre: "Redactor de mensajes", hace: "Inventa lo que Roli le dice a cada casa y lo dicta para que el Operador lo escriba después de «di»." };

export const DINAMICAS = [
  { id: "mision-equipo", fecha: "2026-11-14", ic: "🤝", titulo: "La misión de Roli: todos juntos", minutos: "40 a 50",
    meta: "Lograr entre todos cuatro misiones con Roli, y medirlo de paso para ajustarlo mejor.",
    como: "No se compite: el equipo entero junta ESTRELLAS ⭐ y busca una meta común. En cada ronda cada persona tiene un ROL y ninguno puede hacer la misión solo: uno escribe en la consola, otro guía con la voz y otro prepara el terreno. Los roles rotan de a uno por ronda, para que todos hagan de todo. Menos intentos para lograrlo, más estrellas; equivocarse nunca resta.",
    metaEstrellas: 8,
    cosas: ["Roli con las baterías cargadas, prendido y conectado a la laptop", "Un piso liso y libre de 2 × 2 metros", "Cinta de pintor y unas cajas o libros", "Una regla o cinta métrica"],
    rondas: [
      { id: "despierta", ic: "👋", titulo: "Roli despierta", nivel: 1, minutos: 5, roles: [R_OPERADOR, R_NAVEGANTE],
        que: "Calentamiento: el equipo hace que Roli salude, diga una frase y titile. El Navegante dicta, el Operador teclea.",
        logro: "Que Roli haga las tres cosas.",
        pasos: [
          { t: "El Navegante dicta; el Operador escribe. Saludalo y pedile una frase de ustedes.", escribi: ["hola", "di Vamos Roli"], ve: "Roli contesta y repite la frase." },
          { t: "Que parpadee tres veces.", escribi: ["parpadear 3"], ve: "La luz titila tres veces." },
          { t: "Que prenda y apague su luz.", escribi: ["led 1", "led 0"], ve: "Se enciende y se apaga." } ] },
      { id: "guia", ic: "🧭", titulo: "Guiá a Roli hasta la meta", nivel: 3, minutos: 12, roles: [R_TERRENO, R_NAVEGANTE, R_OPERADOR],
        que: "El Constructor arma una pista de 1 metro con una curva suave: cinta de salida y cinta de meta. El Navegante MIRA a Roli y dice qué hacer («avanzá dos segundos… ahora girá un poquito»); el Operador teclea sólo lo que oye. Nadie más puede decirle nada a la consola.",
        logro: "Que Roli llegue hasta la cinta de meta.",
        pasos: [
          { t: "Constructor: armen la pista (salida, curva, meta) y pongan a Roli en la salida.", ve: "Las ruedas justo sobre la cinta de salida." },
          { t: "Navegante: dictá el primer tramo. Operador: escribilo.", escribi: ["velocidad 150", "adelante 2"], ve: "Roli avanza y se para solo." },
          { t: "Sigan por la curva, de a un tramo por vez.", escribi: ["izquierda 0.5", "adelante 1"], ve: "El Navegante corrige con la voz: «un poco más», «menos»." },
          { t: "Si no llegó, ajusten y cuenten un intento más.", ve: "Cada intento enseña algo: anótenlo en las medidas." } ],
        entrena: "Anoten en «Las medidas de hoy» la velocidad y cuántos segundos hicieron falta para 1 metro." },
      { id: "dosmanos", ic: "🕹", titulo: "Dos manos, un Roli", nivel: 3, minutos: 12,
        roles: [{ id: "acelerador", ic: "⚡", nombre: "Acelerador", hace: "Controla SÓLO la velocidad: es el único que escribe `velocidad`." }, { id: "direccion", ic: "🕹", nombre: "Dirección", hace: "Controla SÓLO el rumbo: escribe adelante, atras, izquierda, derecha y parar." }, R_TERRENO],
        que: "Roli tiene dos aspectos y los manejan dos personas distintas: una la velocidad y otra la dirección. Tienen que hablarse todo el tiempo. El Constructor arma la pista con una ZONA LENTA marcada con cinta (ahí hay que ir despacio).",
        logro: "Recorrer la pista sin salir de la cinta, yendo despacio en la zona lenta.",
        pasos: [
          { t: "Constructor: pista con un tramo recto, una zona lenta marcada y la meta.", ve: "Todos saben dónde está la zona lenta." },
          { t: "Acelerador: velocidad para el tramo recto. Dirección: arrancá.", escribi: ["velocidad 170", "adelante 1"], ve: "Avanza rápido por el tramo recto." },
          { t: "Antes de la zona lenta, el Acelerador baja la velocidad; la Dirección sigue.", escribi: ["velocidad 100", "adelante 1"], ve: "Entra despacio a la zona lenta." },
          { t: "Terminen en la meta.", escribi: ["parar"], ve: "Roli se detiene sobre la cinta de meta." } ] },
      { id: "ciegas", ic: "📝", titulo: "El programa a ciegas", nivel: 4, minutos: 12, roles: [R_TERRENO, R_OPERADOR, R_NAVEGANTE],
        que: "El Constructor arma un recorrido con tres tramos, SIN mostrárselo al Operador (que se da vuelta) y se lo describe sólo con palabras. El Operador graba el programa. Antes de ejecutarlo, el Navegante lo lee en la lista y dice si coincide con lo que se describió.",
        logro: "Que Roli haga el recorrido entero con el programa grabado.",
        pasos: [
          { t: "Constructor: armá el recorrido y describilo con palabras. Operador: de espaldas.", ve: "El Operador no ve el piso: sólo escucha." },
          { t: "Operador: grabá el programa que imaginás.", escribi: ["programa", "adelante 2", "izquierda 1", "adelante 2", "fin"], ve: "Roli dice «Grabando» y guarda los pasos." },
          { t: "Navegante: mirá la lista y decí si coincide con el recorrido.", escribi: ["listar"], ve: "Aparece la lista numerada. Si hay que cambiar algo, se vuelve a grabar." },
          { t: "Ejecuten juntos.", escribi: ["ejecutar"], ve: "Roli hace todo solo." },
          { t: "Borren y prueben otro recorrido.", escribi: ["borrar"], ve: "Se borra el programa anterior." } ] },
      { id: "solo", ic: "🛑", titulo: "Bonus · Roli frena solo", nivel: 5, minutos: 5, ojos: true, roles: [R_TERRENO, R_OPERADOR, R_NAVEGANTE],
        que: "SÓLO si los ojos de Roli andan hoy. El Constructor pone una pared o caja grande a 1 metro; el Operador activa la protección; el Navegante vigila con la mano lista.",
        logro: "Que Roli se frene solo antes de tocar la pared.",
        pasos: [
          { t: "Activá la protección y mandalo hacia la pared.", escribi: ["proteccion 20", "adelante 3"], ve: "Se frena solo antes de tocarla." },
          { t: "Apagá la protección cuando terminen.", escribi: ["proteccion 0"], ve: "Ya no frena solo: usalo con la mano lista." } ] },
    ],
    cierre: ["Cuenten las estrellas del equipo y celebren juntos, ganen las que ganen.", "Cada uno cuenta qué rol le gustó más y cuál le costó.", "Las medidas de hoy (abajo) se le pasan a Mauro para ajustar a Roli."],
  },
  { id: "baile", fecha: "2026-11-14", ic: "💃", titulo: "El baile de Roli", minutos: "30 a 40",
    meta: "Inventar entre todos un baile de Roli con movimiento, luces y voz, y mostrárselo a la familia.",
    como: "Roli baila siguiendo un PROGRAMA, y el programa lo inventan entre varios: uno decide cómo se mueve, otro qué luces y frases tiene, otro arma el escenario y otro lo teclea. Nadie baila solo y nadie decide por los demás. Las estrellas son del equipo: menos intentos para que salga bien, más estrellas. Si una línea no hace lo esperado dentro del programa, se prueba suelta y se vuelve a grabar.",
    metaEstrellas: 6,
    cosas: ["Roli con las baterías cargadas y conectado a la laptop", "Un piso liso de 2 × 2 metros", "Cinta de pintor para marcar el escenario", "Papel y lápiz para anotar el baile"],
    rondas: [
      { id: "acuerdo", ic: "🤝", titulo: "Ponerse de acuerdo", nivel: 4, minutos: 10, roles: [R_OPERADOR, R_COREOGRAFO, R_LUCES],
        que: "Un baile cortito de tres momentos. El Coreógrafo dicta los movimientos, el Director las luces, y el Operador los va escribiendo EN ORDEN, un renglón por vez.",
        logro: "Que el baile de tres momentos salga a la primera.",
        pasos: [
          { t: "Empiecen a grabar y escriban el primer momento: avanzar y encender la luz.", escribi: ["programa", "adelante 1", "led 1"], ve: "Roli dice «Grabando» y guarda los renglones." },
          { t: "Segundo momento: una pausa y girar con la luz apagada.", escribi: ["esperar 1", "led 0", "izquierda 0.5"], ve: "Los renglones se guardan, todavía no se ejecutan." },
          { t: "Tercer momento: avanzar, titilar y terminar. Cierren la grabación y miren la lista.", escribi: ["adelante 1", "parpadear 2", "fin", "listar"], ve: "Aparece la lista numerada de todos los pasos del baile." },
          { t: "¡A bailar!", escribi: ["ejecutar"], ve: "Roli baila solo, de punta a punta." } ] },
      { id: "voces", ic: "🎶", titulo: "A dos voces", nivel: 4, minutos: 12, roles: [R_OPERADOR, R_COREOGRAFO, R_LUCES, R_ESCENARIO],
        que: "Ahora con voz. El Escenógrafo marca con cinta dónde empieza y dónde termina el baile; el Director de luces y voz inventa una frase para Roli; el Coreógrafo suma movimientos. Se graba de nuevo.",
        logro: "Que Roli baile con movimiento, luces y una frase, y termine dentro del escenario.",
        pasos: [
          { t: "Borren el programa anterior y marquen el escenario.", escribi: ["borrar"], ve: "El programa queda vacío. Roli en la cinta de salida." },
          { t: "Graben el baile con una frase en el medio (la inventa el Director de luces y voz).", escribi: ["programa", "adelante 1", "di Buenas tardes", "led 1", "izquierda 0.5", "parpadear 3", "fin"], ve: "Se guardan los pasos, con la frase adentro." },
          { t: "Revisen la lista juntos y ejecuten.", escribi: ["listar", "ejecutar"], ve: "Roli baila y dice su frase. Si una línea no se ejecuta, pruébenla suelta." } ] },
      { id: "funcion", ic: "🎭", titulo: "La función", nivel: 4, minutos: 8, roles: [R_OPERADOR, R_COREOGRAFO, R_LUCES, R_ESCENARIO],
        que: "El baile final, para mostrárselo a alguien de la familia. Cada uno presenta SU parte antes de que Roli baile: el movimiento, las luces y el escenario.",
        logro: "Que el baile se repita dos veces seguidas igual, para el público.",
        pasos: [
          { t: "Presenten el baile: cada uno cuenta qué hizo.", ve: "El público sabe quién hizo qué." },
          { t: "Ejecútenlo dos veces seguidas.", escribi: ["ejecutar 2"], ve: "Roli repite el baile completo dos veces." } ],
        entrena: "Si la segunda vuelta no empieza donde empezó la primera, anoten cuánto se corrió: sirve para ajustar los giros." },
    ],
    cierre: ["Muéstrenle el baile a alguien y cuenten juntos cómo lo inventaron.", "Cada uno cuenta qué parte del baile fue idea suya y cuál fue idea de otro.", "Las medidas de hoy se le pasan a Mauro."],
  },
  { id: "laberinto", fecha: "2026-11-14", ic: "🧩", titulo: "El laberinto del equipo", minutos: "35 a 45",
    meta: "Armar un laberinto de cajas y sacar a Roli del otro lado, primero guiándolo y después programándolo.",
    como: "Un equipo, un laberinto. Quien lo construye conoce el camino, quien guía habla, y quien teclea sólo hace lo que le dicen. Cada ronda cambia la forma de pasarle el camino a Roli: con la voz, con tiempos medidos y, al final, con un programa. Las estrellas son del equipo.",
    metaEstrellas: 6,
    cosas: ["Roli con las baterías cargadas y conectado a la laptop", "Cajas, libros y almohadones para las paredes", "Cinta de pintor para marcar la entrada y la salida", "Papel y lápiz para dibujar el mapa"],
    rondas: [
      { id: "mapa", ic: "🗺", titulo: "El mapa y la voz", nivel: 2, minutos: 12, roles: [R_TERRENO, R_NAVEGANTE, R_OPERADOR],
        que: "El Constructor arma un laberinto de cajas con pasillos de unos 40 cm (que Roli pase cómodo) y dibuja el mapa en papel. El Navegante mira a Roli y lo guía con la voz, de a un movimiento; el Operador teclea sólo lo que oye.",
        logro: "Que Roli salga del laberinto sin tocar una caja.",
        pasos: [
          { t: "Constructor: armen el laberinto, marquen entrada y salida, y dibujen el mapa.", ve: "El mapa muestra el camino de la entrada a la salida." },
          { t: "Navegante: guiá de a un movimiento. Operador: tecleá y frená.", escribi: ["d", "r", "i", "r"], ve: "Roli avanza, se frena, gira, se frena. d = adelante, i = izquierda, r = parar." },
          { t: "Sigan hasta la salida. Si Roli toca una caja, cuenten un intento más y vuelvan a empezar.", escribi: ["e", "r", "d", "r"], ve: "Cada intento enseña dónde hay que frenar antes." } ] },
      { id: "tiempos", ic: "⏱", titulo: "Con tiempos medidos", nivel: 3, minutos: 12,
        roles: [{ id: "acelerador", ic: "⚡", nombre: "Acelerador", hace: "Controla SÓLO la velocidad: es el único que escribe `velocidad`." }, { id: "direccion", ic: "🕹", nombre: "Dirección", hace: "Controla SÓLO el rumbo y cuántos segundos dura cada tramo." }, R_TERRENO],
        que: "El mismo laberinto, pero ahora cada tramo lleva su tiempo: «adelante 2» avanza dos segundos. El Acelerador elige la velocidad y Dirección elige el rumbo y los segundos; el Constructor cambia una pared de lugar para que haya que adaptarse.",
        logro: "Salir del laberinto cambiando el tiempo de cada tramo.",
        pasos: [
          { t: "Constructor: cambien una pared de lugar. Acelerador: elegí una velocidad.", escribi: ["velocidad 130"], ve: "Roli recuerda la velocidad." },
          { t: "Dirección: tramo por tramo, con su tiempo.", escribi: ["adelante 2", "izquierda 0.5", "adelante 1"], ve: "Roli avanza, gira y avanza, y se detiene solo al cumplirse el tiempo." },
          { t: "Si se pasó o se quedó corto, ajusten el tiempo y repitan.", ve: "Anoten en las medidas qué tiempo y qué velocidad hicieron falta." } ],
        entrena: "Anoten en «Las medidas de hoy» los segundos que hicieron falta para 1 metro." },
      { id: "salida", ic: "📝", titulo: "El programa de salida", nivel: 4, minutos: 12, roles: [R_TERRENO, R_OPERADOR, R_NAVEGANTE],
        que: "Ahora Roli sale solo. Entre todos escriben el camino completo como un programa: el Constructor lo dicta mirando el mapa, el Operador lo graba y el Navegante lo revisa antes de ejecutar.",
        logro: "Que el programa saque a Roli del laberinto de una sola vez.",
        pasos: [
          { t: "Operador: grabá el camino que dicta el Constructor.", escribi: ["programa", "adelante 2", "izquierda 0.5", "adelante 1", "derecha 0.5", "adelante 2", "fin"], ve: "Se guardan los pasos del camino." },
          { t: "Navegante: mirá la lista y verificá contra el mapa.", escribi: ["listar"], ve: "Aparece la lista. Si algo no coincide, se borra y se graba de nuevo." },
          { t: "Ejecuten.", escribi: ["ejecutar"], ve: "Roli sale solo. Para otro laberinto: borrar y empezar de nuevo." } ] },
      { id: "explora", ic: "🧭", titulo: "Bonus · Roli explora solo", nivel: 6, minutos: 8, ojos: true, roles: [R_TERRENO, R_OPERADOR, R_NAVEGANTE],
        que: "SÓLO si los ojos y el cuello de Roli andan hoy. El Constructor arma un laberinto nuevo y NO lo cuenta; el Operador deja explorar a Roli; el Navegante tiene la mano lista para pararlo.",
        logro: "Que Roli encuentre solo por dónde ir, sin tocar las cajas.",
        pasos: [
          { t: "Dejen explorar a Roli veinte segundos.", escribi: ["explorar 20"], ve: "Avanza, frena ante lo que ve, mira para varios lados y elige por dónde seguir." },
          { t: "El Navegante lo para si hace falta.", escribi: ["parar"], ve: "Se detiene en el acto." } ] },
    ],
    cierre: ["Dibujen entre todos el camino que hizo Roli y compárenlo con el mapa.", "Cada uno cuenta qué rol le resultó más difícil de hacer bien y por qué.", "Las medidas de hoy se le pasan a Mauro."],
  },
  { id: "mensajero", fecha: "2026-11-14", ic: "📬", titulo: "El mensajero", minutos: "30 a 40",
    meta: "Que Roli lleve un mensaje a tres casas, en orden, y vuelva.",
    como: "Roli es un mensajero. En el piso hay tres «casas» marcadas A, B y C, y Roli tiene que visitarlas en orden y decirle algo distinto a cada una, encendiendo su luz al llegar. Uno arma el mapa de casas, otro inventa los mensajes, otro guía y otro teclea. Las estrellas son del equipo.",
    metaEstrellas: 6,
    cosas: ["Roli con las baterías cargadas y conectado a la laptop", "Tres marcas en el piso (A, B y C), con cinta o con una hoja cada una", "Papel y lápiz para el mapa y los mensajes"],
    rondas: [
      { id: "una", ic: "🏠", titulo: "Una casa", nivel: 3, minutos: 8, roles: [R_TERRENO, R_REDACTOR, R_OPERADOR],
        que: "Primero, una sola casa. El Constructor pone la casa A a un metro; el Redactor inventa el mensaje; el Operador teclea.",
        logro: "Que Roli llegue a la casa A, la salude y encienda su luz.",
        pasos: [
          { t: "Constructor: pongan la casa A a un metro de Roli.", ve: "Todos saben dónde está la casa." },
          { t: "Operador: mandalo hasta la casa y que diga el mensaje del Redactor.", escribi: ["adelante 2", "di Hola casa A", "led 1"], ve: "Roli avanza, se para, dice el mensaje y enciende la luz." },
          { t: "Si no llegó justo, ajusten los segundos y repitan.", escribi: ["led 0"], ve: "La luz se apaga para volver a empezar." } ] },
      { id: "tres", ic: "🏘", titulo: "Tres casas, en orden", nivel: 4, minutos: 14, roles: [R_TERRENO, R_REDACTOR, R_NAVEGANTE, R_OPERADOR],
        que: "El recorrido completo: A, después B, después C. El Constructor dibuja el mapa; el Redactor inventa un mensaje distinto para cada casa; el Navegante planifica los giros y el Operador graba todo como un programa.",
        logro: "Que Roli visite las tres casas en orden y diga el mensaje correcto en cada una.",
        pasos: [
          { t: "Grabá el recorrido: ir a la casa, mensaje, luz, y a la siguiente.", escribi: ["programa", "adelante 2", "di Mensaje para A", "led 1", "esperar 1", "led 0", "izquierda 0.5", "adelante 2", "di Mensaje para B", "led 1", "fin"], ve: "Se guarda el recorrido de las dos primeras casas. Sigan igual con la C." },
          { t: "Navegante: revisá la lista contra el mapa.", escribi: ["listar"], ve: "Si el orden no es el del mapa, se borra y se vuelve a grabar." },
          { t: "Ejecuten el recorrido.", escribi: ["ejecutar"], ve: "Roli recorre las casas solo, diciendo cada mensaje." } ] },
      { id: "vuelta", ic: "↩️", titulo: "Ida y vuelta", nivel: 4, minutos: 10, roles: [R_TERRENO, R_NAVEGANTE, R_OPERADOR],
        que: "El mensajero tiene que volver a su base. El Navegante piensa cómo se hace el camino al revés (lo que fue adelante ahora es atrás, y los giros se invierten) y el Operador lo graba.",
        logro: "Que Roli vuelva a la salida después de visitar las casas.",
        pasos: [
          { t: "Navegante: dictá el camino de vuelta, al revés.", escribi: ["programa", "atras 2", "derecha 0.5", "atras 2", "fin"], ve: "Se guarda el regreso." },
          { t: "Revisen y ejecuten.", escribi: ["listar", "ejecutar"], ve: "Roli vuelve. Si no llega justo a la base, ajustan los tiempos y repiten." } ],
        entrena: "Anoten cuánto se corrió Roli de la base al volver: sirve para ajustar los tiempos." },
    ],
    cierre: ["Cuenten entre todos el recorrido que hizo Roli, casa por casa.", "Cada uno cuenta qué mensaje fue su favorito.", "Las medidas de hoy se le pasan a Mauro."],
  },
];

/** La dinámica que corresponde a un día: la más reciente que no sea del futuro; si todas lo son, la primera. */
export function dinamicaDe(hoy, lista = DINAMICAS) {
  const pasadas = lista.filter((d) => d.fecha <= hoy).sort((a, b) => (a.fecha < b.fecha ? 1 : a.fecha > b.fecha ? -1 : 0));
  return pasadas[0] || lista[0] || null;
}
