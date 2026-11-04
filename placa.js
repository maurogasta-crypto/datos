/* ═══════════════════════════════════════════════════════════════════
   placa.js — la guía para armar la placa de la Hilux. Sello: placa-js-1

   Pedido de Mauro, 4-nov-2026: «una pantalla dedicada para el proceso de
   construcción en Arduino del componente que se va a fabricar, con diseño y
   guía paso a paso en lo que tenemos que ir realizando: primero conseguir
   materiales y después proceso de fabricación, accesible desde el panel».

   Acá vive el CONTENIDO de la guía y las cuentas que se hacen con él (qué
   sigue, cuánto falta, cuánto cuesta). La pantalla es `placa.html`, que sólo
   dibuja; el banco es `pruebas/placa.mjs`. El porqué de cada decisión está en
   `CRUCERO.md` de `maurogasta-crypto/sitd-hilux` (§ 6, 7 y 9): si cambia
   allá, cambia acá en la misma tanda.

   LO QUE SE MARCA vive en `proyectos/hilux.placa` del panel —sin colección ni
   regla nueva: `proyectos/` ya lo escriben Mauro y el agente—, como MAPAS para
   que dos teléfonos no se pisen:
     placa.marcas.<paso>  = { en, por }      un paso hecho
     placa.notas.<paso>   = "texto"          lo que se anotó en ese paso
     placa.medidas.<k>    = "0,82"           una medición, tal como se leyó
     placa.compras.<pieza>= "pedido"|"llego" (sin valor = falta)

   Y lo que no se negocia, para quien edite esto: los pasos que hacen segura a
   la placa —el watchdog, el corte por freno y embrague cableado y el paso
   directo con los relés sueltos— van ANTES de que la placa mande una señal a
   la ECU, y `siguiente()` no deja saltarlos. El banco lo comprueba.
   ═══════════════════════════════════════════════════════════════════ */

export const VERSION = "placa-js-1";

/* Las dos etapas, en el orden en que se hacen. La A no toca el pedal —sólo
   lee— y sirve sola (CRUCERO.md § 9.1); la B es el crucero. */
export const SECCIONES = [
  {
    id: "medir", ic: "📏", n: "1 · Medir antes de comprar",
    d: "Con el tester, contacto puesto y motor apagado. Sin estas medidas no se puede diseñar la salida hacia la ECU: si la relación entre VPA y VPA2 se emula mal, la ECU entra en modo de emergencia.",
    pasos: [
      { id: "m-ccs", t: "Ver si la ECU tiene crucero (E5-21 contra masa)", quien: "mauro",
        d: "Con 10–14 V la ECU trae el crucero y alcanza con cablearlo; con 0 V no lo trae.",
        campos: [{ k: "ccs", n: "E5-21", u: "V" }] },
      { id: "m-vcpa", t: "Los 5 V que la ECU le da al pedal (VCPA y VCP2)", quien: "mauro",
        d: "Entre el cable de alimentación de cada sensor y su masa (EPA / EPA2), en la ficha del pedal, sin desenchufarla (se pincha de atrás con una aguja fina).",
        campos: [{ k: "vcpa", n: "VCPA", u: "V" }, { k: "vcp2", n: "VCP2", u: "V" }] },
      { id: "m-vpa", t: "VPA: pedal suelto, a la mitad y a fondo", quien: "mauro",
        d: "Entre VPA y EPA. Tres lecturas, sin apurarse: la de la mitad no tiene que ser exacta.",
        campos: [{ k: "vpa0", n: "suelto", u: "V" }, { k: "vpa1", n: "mitad", u: "V" }, { k: "vpa2", n: "a fondo", u: "V" }] },
      { id: "m-vpa2", t: "VPA2: las mismas tres posiciones", quien: "mauro",
        d: "Entre VPA2 y EPA2. Con esto y lo de arriba se sabe si la segunda señal va CORRIDA (la misma más un tanto) o PROPORCIONAL: es lo que la ECU vigila.",
        campos: [{ k: "vpb0", n: "suelto", u: "V" }, { k: "vpb1", n: "mitad", u: "V" }, { k: "vpb2", n: "a fondo", u: "V" }] },
      { id: "m-freno", t: "El interruptor del freno: cuántas patas y qué da al pisar", quien: "mauro",
        d: "Si tiene 4 patas, una de las dos parejas se ABRE al pisar (en Toyota se llama ST1−) y existe justo para cortar un crucero. Si tiene 2, el corte sale de la luz de freno con un relé. Anotá cuántas y qué cable da 12 V pisando." },
      { id: "m-embrague", t: "¿Hay interruptor de embrague que se abra al pisarlo?", quien: "mauro",
        d: "El de arranque (el que pide el embrague a fondo para dar arranque) no sirve: tiene que cambiar apenas se toca el pedal. Si no hay, va un microinterruptor (está en la lista de compras)." },
      { id: "m-vss", t: "La señal de velocidad (en la ficha del tablero)", quien: "mauro",
        d: "Andando despacio, con el tester en continua, un cable que oscila entre 0 y 5 o 12 V. Anotá cuál es. Los pulsos por kilómetro no hace falta medirlos: se calibran solos contra el GPS." },
      { id: "m-tac", t: "La señal del tacómetro (en la ficha del tablero)", quien: "mauro",
        d: "Lo mismo, con el motor en marcha: el cable que mueve la aguja. Es la forma más limpia de tener las RPM sin tocar un sensor del motor." },
    ],
  },
  {
    id: "comprar-a", ic: "🛒", n: "2 · Comprar lo de la caja de sensores",
    d: "Etapa A: la placa que sólo LEE. No toca el pedal, sirve sola y deja el hardware probado antes de que nada mande sobre el acelerador.",
    piezas: [
      { id: "c-esp32", n: "2 × ESP32 DevKit (uno de repuesto)", para: "el cerebro de los sensores, con Bluetooth adentro; se programa con el mismo Arduino IDE", usd: [8, 14] },
      { id: "c-adxl", n: "2 × acelerómetro ADXL345 (módulo SPI)", para: "vibración a 1.600 por segundo; el del teléfono llega a 200", usd: [4, 8] },
      { id: "c-opto", n: "6 × optoacoplador PC817 y resistencias", para: "contacto, freno, embrague, velocidad y RPM, aislados de la camioneta", usd: [2, 4] },
      { id: "c-fuente", n: "Fuente automotriz 12→5 V (p. ej. Pololu) + diodo TVS + diodo + portafusible", para: "la camioneta tiene picos que queman un regulador común", usd: [12, 18] },
      { id: "c-tap", n: "Derivador de fusible (add-a-fuse) del tamaño de los fusibles de la camioneta", para: "tomar los 12 V con contacto sin cortar un cable", usd: [3, 5] },
      { id: "c-fichas", n: "Par de fichas del pedal (macho y hembra) con cables", para: "el arnés en Y: se saca y la camioneta queda como de fábrica", usd: [15, 30] },
      { id: "c-perfo", n: "Placa perforada y tira de pines", para: "armar la etapa A sin mandar a hacer una placa", usd: [2, 4] },
      { id: "c-caja", n: "Caja, cable automotriz, terminales, termocontraíble y fusible", para: "", usd: [15, 25] },
      { id: "c-blindado", n: "1 m de cable blindado fino (4 hilos)", para: "llevar el acelerómetro hasta su soporte sin que levante ruido", usd: [2, 4] },
    ],
  },
  {
    id: "herramientas", ic: "🧰", n: "3 · Herramientas",
    d: "Lo que queda después. Si ya tenés alguna, marcala como llegó.",
    piezas: [
      { id: "h-soldador", n: "Soldador de 40–60 W con punta fina, y su soporte", para: "", usd: [10, 25] },
      { id: "h-estano", n: "Estaño con resina de 0,8 mm y malla desoldadora", para: "", usd: [4, 8] },
      { id: "h-pela", n: "Pelacables y crimpeadora de terminales", para: "un terminal apretado con pinza común se suelta con la vibración", usd: [8, 20] },
      { id: "h-calor", n: "Termocontraíble surtido (y un encendedor o pistola de calor)", para: "", usd: [3, 6] },
      { id: "h-usb", n: "Cable USB de la placa y adaptador OTG", para: "programar desde el teléfono o una computadora", usd: [2, 5] },
      { id: "h-logico", n: "Analizador lógico USB (opcional)", para: "ver los pulsos de velocidad y RPM si algo no cierra", usd: [8, 12], opcional: true },
    ],
  },
  {
    id: "armar-a", ic: "🔧", n: "4 · Armar la caja de sensores",
    d: "Cada paso se prueba antes de seguir. Si una prueba no da, no se avanza: se anota lo que dio y lo miramos.",
    pasos: [
      { id: "a-programa", t: "El programa de la caja de sensores", quien: "claude",
        d: "Lo escribo yo en el repositorio de la Hilux (carpeta placa/), con su banco de pruebas, y te digo cómo cargarlo." },
      { id: "a-fuente", t: "Armar la fuente y probarla SOLA", quien: "mauro",
        d: "Portafusible → diodo → TVS → regulador, en la placa perforada.",
        prueba: "Con la batería de la camioneta o una fuente: 5,0 V (±0,1) en la salida, con el tester, ANTES de conectar el ESP32.",
        campos: [{ k: "fuente5", n: "salida", u: "V" }] },
      { id: "a-esp", t: "Montar el ESP32 y cargar el programa de prueba", quien: "mauro",
        prueba: "El LED parpadea y el teléfono ve la placa por Bluetooth." },
      { id: "a-entradas", t: "Las cinco entradas con optoacoplador", quien: "mauro",
        d: "Contacto, freno, embrague, velocidad y RPM: cada una con su resistencia y su PC817.",
        prueba: "En la mesa, tocando cada entrada con 12 V: cambia en la pantalla de prueba, y sólo ésa." },
      { id: "a-acel", t: "El acelerómetro en un soporte rígido", quien: "mauro",
        d: "Con el cable blindado corto, atornillado o pegado con epoxi a un punto firme (el túnel de la caja o el piso), nunca colgando.",
        prueba: "Quieto marca 1 g; un golpecito con el dedo se ve." },
      { id: "a-pedal", t: "El arnés en Y del pedal", quien: "mauro",
        d: "Las dos fichas unidas cable a cable (la señal pasa DERECHO a la ECU) y, en paralelo, la placa lee VPA y VPA2 a través de resistencias de 100 kΩ: no le saca corriente al sensor.",
        prueba: "Con el tester: el pedal mide lo mismo con la placa enchufada y sin ella (comparar con lo del paso «VPA»)." },
      { id: "a-caja", t: "Todo a la caja", quien: "mauro",
        d: "Cada cable con alivio de tensión (un precinto que lo agarre antes del terminal), rotulado, y la caja lejos del sol directo." },
      { id: "a-instalar", t: "Instalar en la camioneta", quien: "mauro",
        d: "12 V del derivador en un fusible que sólo tenga corriente con contacto; masa a un tornillo del chasis; el arnés en Y en el pedal; el acelerómetro firme.",
        prueba: "Motor apagado: cada señal de la pantalla de prueba coincide con el tester. Motor en marcha: las RPM de la placa, cerca de lo que marca la aguja." },
      { id: "a-app", t: "La app lee la placa", quien: "claude",
        d: "Tanda de la app: la placa entra como fuente nueva (por las interfaces que ya existen) y lo suyo se guarda aparte de lo del teléfono." },
      { id: "a-viajes", t: "Dos semanas de viajes sin una diferencia", quien: "mauro",
        prueba: "Velocidad de la placa contra el GPS, RPM de la placa contra las oídas: lo comparo yo con los reportes. Con eso la etapa A está lista." },
    ],
  },
  {
    id: "decidir-b", ic: "⚖️", n: "5 · Antes del crucero",
    d: "Lo que se decide antes de que la placa mande sobre el pedal.",
    pasos: [
      { id: "d-seguro", t: "Preguntar al seguro y a la habilitación", quien: "mauro",
        d: "Es una modificación de un mando del vehículo. Mejor saberlo antes de construir." },
      { id: "d-diseno", t: "El diseño del interceptor con tus medidas", quien: "claude",
        d: "Esquema y placa impresa, con la relación VPA/VPA2 medida, el corte por freno y embrague y el watchdog. Te lo dejo acá antes de que compres." },
    ],
  },
  {
    id: "comprar-b", ic: "🛒", n: "6 · Comprar lo del crucero",
    d: "Etapa B: el interceptor. Va en una placa aparte, con su propio Arduino: si el Bluetooth o los sensores se cuelgan, el pedal no se entera.",
    piezas: [
      { id: "c-nano", n: "2 × Arduino Nano (uno de repuesto)", para: "el que manda sobre el pedal, sin Bluetooth y sin nada más que eso", usd: [10, 15] },
      { id: "c-dac", n: "DAC doble MCP4822 + amplificador MCP6002", para: "fabricar VPA y VPA2 limpias, escaladas a los 5 V de la ECU", usd: [6, 8] },
      { id: "c-reles", n: "2 × relé de señal DPDT (Omron G5V-2 o similar) + transistores y diodos", para: "SIN corriente conectan el pedal real directo a la ECU", usd: [6, 10] },
      { id: "c-wdt", n: "Supervisor con watchdog (TPS3823) o monoestable 74HC123", para: "si el programa se cuelga, los relés caen solos", usd: [2, 4] },
      { id: "c-micro", n: "Microinterruptor para el embrague (si no hay uno que sirva)", para: "", usd: [3, 5], opcional: true },
      { id: "c-pcb", n: "Placa impresa, 5 unidades, con envío", para: "con el diseño del paso anterior", usd: [15, 30] },
      { id: "c-tablero", n: "LED, zumbador e interruptor general en el tablero", para: "ver y oír cuándo está activo y cuándo cortó; y apagarlo todo con un dedo", usd: [5, 8] },
    ],
  },
  {
    id: "armar-b", ic: "🛡️", n: "7 · Armar el interceptor",
    d: "Primero lo que lo hace seguro, después lo que lo hace andar.",
    pasos: [
      { id: "b-programa", t: "El programa del interceptor", quien: "claude",
        d: "Con su banco de pruebas: el pie siempre gana, nunca entrega menos de lo que pide el pedal, y los límites viven en el programa, no en un mensaje." },
      { id: "b-reposo", t: "Relés sin corriente: el pedal va directo", quien: "mauro", seguridad: true,
        prueba: "Placa SIN alimentar, tester en continuidad: pedal↔ECU en VPA y en VPA2 a través de los dos relés." },
      { id: "b-wdt", t: "El watchdog suelta los relés", quien: "mauro", seguridad: true,
        prueba: "Placa alimentada y relés encendidos: se desenchufa el Nano (o se lo frena) y los dos relés caen, con su clic." },
      { id: "b-cortes", t: "Freno y embrague cortan por cable, no por programa", quien: "mauro", seguridad: true,
        d: "La bobina de los relés pasa por el contacto del freno (ST1− o el relé de la luz de freno) y por el del embrague.",
        prueba: "Relés encendidos: pisar el freno → caen; tocar el embrague → caen; con el programa diciendo lo contrario." },
      { id: "b-tablero", t: "El LED, el zumbador y el interruptor general", quien: "mauro",
        prueba: "Con el interruptor apagado no hay forma de que los relés se enciendan." },
    ],
  },
  {
    id: "probar", ic: "🚦", n: "8 · Probar en la camioneta, por etapas",
    d: "Las de CRUCERO.md § 7, sin saltear ninguna. Cada una pasa sólo si el tester y la pantalla dicen lo mismo.",
    pasos: [
      { id: "p-escuchar", t: "Escuchar, motor apagado", quien: "mauro",
        d: "Intercalada, con las salidas desconectadas: sólo lee pedal, freno, embrague y velocidad." },
      { id: "p-vacio", t: "Salida al vacío", quien: "mauro",
        d: "Fabrica sus dos señales hacia una resistencia, no hacia la ECU, copiando el pedal. Tester en la salida." },
      { id: "p-directo", t: "Paso directo", quien: "mauro", seguridad: true,
        d: "Conectada a la ECU con los relés apagados: la camioneta tiene que andar EXACTAMENTE igual." },
      { id: "p-espejo", t: "Espejo, parada", quien: "mauro", seguridad: true,
        d: "Relés encendidos copiando el pie: primero contacto sin motor, después motor en punto muerto y freno de mano. Ahí se prueban los cortes y se DESENCHUFA la placa con el motor andando: el pedal real vuelve solo." },
      { id: "p-andando", t: "Espejo andando", quien: "mauro",
        d: "Viajes cortos con la placa sólo copiando el pie." },
      { id: "p-lento", t: "Crucero a baja velocidad, en un lugar vacío", quien: "mauro",
        d: "Con otra persona mirando la pantalla." },
      { id: "p-ruta", t: "Ruta", quien: "mauro" },
    ],
  },
];

/* Todos los pasos y todas las piezas, en orden, con su sección. */
export const PASOS = SECCIONES.flatMap((s) => (s.pasos || []).map((p) => ({ ...p, seccion: s.id })));
export const PIEZAS = SECCIONES.flatMap((s) => (s.piezas || []).map((p) => ({ ...p, seccion: s.id })));

/* Lo que no deja empezar una sección. La B entera espera a la A y a las
   medidas: es la regla del § 9.1 («se llega a la Fase 3 con el hardware ya
   probado»). Y probar espera a que el interceptor esté armado. */
export const ESPERA = {
  "comprar-a": [],
  "armar-a": ["comprar-a"],
  "decidir-b": ["medir", "armar-a"],
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
  const pasos = s.pasos || [], piezas = (s.piezas || []).filter((p) => !p.opcional);
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
    const p = (s.pasos || []).find((x) => !hecho(estado, x.id));
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
