/* ═══════════════════════════════════════════════════════════
   glosario.js — las palabras técnicas que aparecen en el panel, explicadas
   para quien no programa. Sello: glosario-1 (7-nov-2026)

   Mauro, 7-nov-2026: «pensando que la persona sea una persona sin
   conocimiento de programación… explicaciones de los conceptos más generales
   y básicos posibles hasta los detalles más técnicos». Cada palabra tiene
   `simple` (una o dos frases, sin otras palabras técnicas) y `mas` (para quien
   quiere seguir). Es contenido general: no lleva nada de ningún proyecto.
   ═══════════════════════════════════════════════════════════ */
export const VERSION = "glosario-1";

export const GLOSARIO = [
  { palabra: "Sitio o aplicación", simple: "Lo que se abre en el teléfono o la computadora para usar el proyecto: pantallas, botones, formularios.",
    mas: "Puede ser una página web (se abre con el navegador, nada que instalar) o una app de Android (un archivo .apk que se instala)." },
  { palabra: "Base de datos", simple: "Donde se guarda lo que la gente carga: cuentas, reservas, avances, mensajes. Es como un archivero en internet.",
    mas: "Acá se usa Firebase (de Google), en su plan gratuito. Cada proyecto tiene la suya, separada de las demás." },
  { palabra: "Cuenta e invitación", simple: "Para entrar hace falta una cuenta con tu mail y una contraseña que elegís vos. Sólo puede crearla quien fue invitado.",
    mas: "La invitación dice a qué proyectos entrás. El mail se confirma una vez, para saber que es tuyo." },
  { palabra: "Reglas", simple: "El portero de la base de datos: deciden quién puede ver y quién puede cambiar cada cosa.",
    mas: "Están escritas como texto y se publican en la consola de Firebase. No dependen de la pantalla: aunque alguien toque un botón que no debe, la base dice que no." },
  { palabra: "Repositorio", simple: "La carpeta donde vive el código del proyecto, con la historia de cada cambio.",
    mas: "Está en GitHub. Cada cambio queda guardado con fecha y explicación, y se puede volver atrás." },
  { palabra: "Commit (un cambio subido)", simple: "Un cambio al código, con su explicación. «Lo último que se subió» es la lista de esos cambios.",
    mas: "Al subirlo, el sitio se publica solo en unos minutos." },
  { palabra: "Pendiente y línea de trabajo", simple: "Un pendiente es una cosa por hacer. Una línea de trabajo junta los pendientes que van hacia un mismo objetivo.",
    mas: "Cada pendiente dice quién lo tiene que hacer (Mauro o Claude) y su historia. Podés comentarlo." },
  { palabra: "Pedido", simple: "Algo que querés que cambie o que no anda, contado con tus palabras. Lo lee Claude.",
    mas: "Si es simple, Claude lo resuelve en el día; si necesita una decisión, queda en una línea de trabajo con un plan." },
  { palabra: "Claude", simple: "Una inteligencia artificial que desarrolla el proyecto con Mauro: lee los pedidos y las preguntas, contesta y hace los cambios.",
    mas: "No toca contraseñas ni decide solo lo importante: eso lo aprueba Mauro." },
  { palabra: "Clave o credencial", simple: "Algo que abre una puerta: una contraseña, un código. Nunca se escribe en un mensaje ni en un chat.",
    mas: "Las claves de cada proyecto viven en un lugar aparte del panel, y sólo las ve quien Mauro autoriza." },
];
