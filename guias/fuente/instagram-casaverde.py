from reportlab.lib.pagesizes import A4
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
                                KeepTogether, PageBreak)
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import sys

D = "/usr/share/fonts/truetype/dejavu/"
pdfmetrics.registerFont(TTFont("S", D + "DejaVuSans.ttf"))
pdfmetrics.registerFont(TTFont("SB", D + "DejaVuSans-Bold.ttf"))
pdfmetrics.registerFont(TTFont("F", D + "DejaVuSerif.ttf"))
pdfmetrics.registerFont(TTFont("FB", D + "DejaVuSerif-Bold.ttf"))
pdfmetrics.registerFontFamily("S", normal="S", bold="SB", italic="S", boldItalic="SB")

BURG = colors.HexColor("#7A2C3C")
BLOND = colors.HexColor("#B07A3A")
INK = colors.HexColor("#1F1B17")
GRIS = colors.HexColor("#6B6254")
PAPEL = colors.HexColor("#F3EEE4")

st = {
  "tit": ParagraphStyle("tit", fontName="FB", fontSize=22, leading=27, textColor=INK, spaceAfter=4),
  "sub": ParagraphStyle("sub", fontName="S", fontSize=10.5, leading=15, textColor=GRIS, spaceAfter=14),
  "h1": ParagraphStyle("h1", fontName="FB", fontSize=15, leading=19, textColor=BURG, spaceBefore=14, spaceAfter=6),
  "h2": ParagraphStyle("h2", fontName="SB", fontSize=11, leading=15, textColor=INK, spaceBefore=8, spaceAfter=3),
  "p": ParagraphStyle("p", fontName="S", fontSize=10, leading=14.5, textColor=INK, spaceAfter=5),
  "chico": ParagraphStyle("chico", fontName="S", fontSize=8.5, leading=12, textColor=GRIS),
  "paso": ParagraphStyle("paso", fontName="S", fontSize=10, leading=14.5, textColor=INK),
  "n": ParagraphStyle("n", fontName="SB", fontSize=11, leading=14, textColor=colors.white, alignment=1),
  "caja": ParagraphStyle("caja", fontName="S", fontSize=9.5, leading=13.5, textColor=INK),
}

def P(t, s="p"): return Paragraph(t, st[s])

def pasos(lista, inicio=1):
    filas = []
    for i, (t, d) in enumerate(lista):
        txt = f"<b>{t}</b>" + (f"<br/>{d}" if d else "")
        filas.append([P(str(inicio + i), "n"), P(txt, "paso")])
    tb = Table(filas, colWidths=[11 * mm, None])
    tb.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (0, -1), BURG),
        ("LEFTPADDING", (1, 0), (1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (1, 0), (1, -2), 0.4, colors.HexColor("#D8CEBB")),
    ]))
    return tb

def caja(texto, color=PAPEL, borde=BLOND):
    tb = Table([[P(texto, "caja")]], colWidths=[None])
    tb.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), color),
        ("BOX", (0, 0), (-1, -1), 0.8, borde),
        ("LEFTPADDING", (0, 0), (-1, -1), 9), ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 7), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
    return tb

def pie(c, doc):
    c.saveState()
    c.setFont("S", 8); c.setFillColor(GRIS)
    c.drawString(18 * mm, 10 * mm, "Casa Verde Canas · Instagram automatizado · procedimiento · 19-oct-2026")
    c.drawRightString(A4[0] - 18 * mm, 10 * mm, f"{doc.page}")
    c.restoreState()

s = []
s.append(P("Instagram de Casa Verde, con la IA", "tit"))
s.append(P("Procedimiento paso a paso: primero la IA prepara los posteos y una persona los publica; "
           "después, si conforma, se publican solos por la vía oficial de Instagram. "
           "Cada paso dice quién lo hace.", "sub"))

s.append(caja("<b>La idea en una línea.</b> Las fotos de las cabañas y de los espacios ya están en el sitio de Casa Verde. "
              "Claude arma con ellas carruseles con su texto en portugués y castellano y sus hashtags de Floripa; "
              "la Pizarra avisa; una persona aprueba. Nada sale a Instagram sin que alguien lo vea."))

s.append(Spacer(1, 6))
s.append(caja("<b>Para arrancar ya</b>: la Parte A (pasos 1 a 5) y contestarle a Claude en el chat las tres "
              "decisiones del paso 5. Con eso se construye la Parte B y llegan los primeros tres posteos "
              "de las cabañas para ver el tono. Es el mismo camino que el de CasaYourte: lo que se construya "
              "para uno sirve para el otro.", colors.HexColor("#F6EAEC"), BURG))

s.append(P("Lo que nunca se hace", "h1"))
s.append(P("• <b>Automatizar toques dentro de la app de Instagram</b> (programas que «tocan» la pantalla). "
           "Es lo que hace que Meta bloquee una cuenta. La única automatización es la API oficial (Parte C).<br/>"
           "• <b>Pegar un token, una contraseña o un código en un chat.</b> El token de Instagram va sólo a "
           "Netlify, cargado a mano por Mauro.<br/>"
           "• <b>Publicar huéspedes</b> —su cara, su nombre, sus fechas— sin su permiso, ni la dirección exacta "
           "de la casa. Se usan sólo fotos de las cabañas y los espacios, sin gente.<br/>"
           "• <b>Prometer disponibilidad o precios en un posteo.</b> Las fechas cambian todos los días: "
           "el posteo invita a consultar por privado o por WhatsApp.<br/>"
           "• <b>Publicar sin aprobación.</b> También en la Parte C: la función publica sólo lo aprobado."))

s.append(P("Parte A · Una sola vez: preparar las cuentas", "h1"))
s.append(P("Lo hacen Mauro o Florencia, desde el teléfono. Unos 20 minutos.", "chico"))
s.append(Spacer(1, 4))
s.append(pasos([
  ("Pasar Instagram de Casa Verde a cuenta profesional",
   "Instagram → tu perfil → menú (las tres rayas) → Configuración y actividad → Tipo de cuenta y herramientas → "
   "<i>Cambiar a cuenta profesional</i> → <b>Empresa</b>. Categoría: «Alojamiento» o «Casa de vacaciones». Es gratis y no cambia lo publicado; habilita estadísticas y la publicación programada."),
  ("Tener una página de Facebook de Casa Verde",
   "Si no existe, se crea desde Facebook → Menú → Páginas → Crear. Sólo hace falta nombre, categoría y la foto "
   "de perfil (el ícono del sitio sirve)."),
  ("Vincular Instagram con esa página",
   "Instagram → Editar perfil → <i>Página</i> → Conectar con la página de Casa Verde. "
   "Sin este vínculo, ni Meta Business Suite ni la API pueden publicar."),
  ("Instalar Meta Business Suite en el teléfono",
   "La app oficial de Meta para programar posteos con día y hora, en Instagram y Facebook a la vez."),
  ("Contestar tres decisiones",
   "a) Quién aprueba: Mauro, Florencia o los dos. "
   "b) El texto: uno bilingüe (portugués y castellano en el mismo posteo) o uno por idioma. "
   "c) Cada cuánto: una sugerencia es dos por semana en temporada y uno fuera de ella."),
]))

s.append(PageBreak())
s.append(P("Parte B · La IA prepara, una persona publica", "h1"))
s.append(P("Se arma sin claves nuevas. Riesgo cero para la cuenta: publica una persona.", "chico"))
s.append(P("Lo que construye Claude (una vez)", "h2"))
s.append(pasos([
  ("La lista «Posteos listos» en el panel interno de Casa Verde",
   "Cada posteo con sus fotos a la vista, el texto, los hashtags y un estado: listo, publicado o descartado. "
   "Es una colección nueva de la base, así que entra con su regla en <i>interno/firestore.rules</i>."),
  ("La herramienta que arma los posteos desde las fotos del sitio",
   "Elige un tema —una cabaña, el jardín, la playa a pasos, un atardecer—, de 3 a 10 fotos, y escribe el texto "
   "con el tono del sitio, sin inventar datos: sólo lo que dice el sitio de cada cabaña."),
  ("El aviso en la Pizarra",
   "«N posteos listos de Casa Verde». Al tocarlo: se bajan las fotos al teléfono, se copia el texto "
   "y se abre Instagram (o Meta Business Suite)."),
]))
s.append(P("Lo que hace Mauro (una vez)", "h2"))
s.append(pasos([
  ("Publicar interno/firestore.rules en la consola de Firebase",
   "Como cada vez que entra una colección nueva: el panel muestra el botón «Copiar», la consola y "
   "«Ya las publiqué»."),
], inicio=4))
s.append(P("Cada semana", "h2"))
s.append(pasos([
  ("Claude prepara los posteos", "En la ronda del lunes (o cuando se le pida en el chat)."),
  ("La Pizarra avisa", "Quien aprueba mira la lista y descarta lo que no le guste."),
  ("Publicar o programar",
   "Un toque baja fotos y copia el texto. En Instagram: nuevo posteo → elegir las fotos como carrusel → "
   "pegar el texto. O en Meta Business Suite: Crear publicación → <i>Programar</i>, y se deja la semana armada "
   "de una vez."),
  ("Marcar «publicado»", "Así no se repite un tema y la ronda sabe qué falta."),
], inicio=5))

s.append(caja("<b>Hashtags</b> (los propone Claude en cada posteo, sin pasar de 8):<br/>"
              "Brasil: #canasvieiras #florianopolis #floripa #aluguelportemporada #feriasemfloripa<br/>"
              "Argentina y Uruguay: #alquilerflorianopolis #canasvieiras #vacacionesenbrasil #floripa"))

s.append(P("Parte C · Que se publique solo (opcional)", "h1"))
s.append(P("Sólo si la Parte B conforma. Usa la API oficial de Instagram: es lo que Meta permite.", "chico"))
s.append(P("Lo que hace Mauro", "h2"))
s.append(pasos([
  ("Crear una «app» en Meta for Developers",
   "developers.facebook.com → Mis apps → Crear app → tipo <b>Empresa</b>. Nombre: «Casa Verde publicación». "
   "Es una configuración, no se programa nada."),
  ("Agregarle el producto de Instagram",
   "En la app: Agregar producto → <i>API de Instagram</i> (con inicio de sesión de Facebook). "
   "Permisos: <b>instagram_basic</b>, <b>instagram_content_publish</b>, <b>pages_show_list</b> y "
   "<b>pages_read_engagement</b>."),
  ("Generar el token de acceso de larga duración",
   "Desde el explorador de la API Graph de esa app, eligiendo la página de Casa Verde. De ahí salen dos datos: "
   "el <b>token</b> y el <b>número de la cuenta de Instagram</b> (IG User ID). "
   "<b>El token no se copia en ningún chat.</b>"),
  ("Cargarlos en Netlify",
   "Netlify → proyecto <i>serene-scone-76bd4e</i> → Environment variables: "
   "<b>IG_CV_TOKEN</b> (secreto) e <b>IG_CV_USER_ID</b>. Es el mismo lugar donde están las claves de Gemini y de las luces; "
   "con otros nombres que los de CasaYourte, porque son dos cuentas distintas."),
], inicio=1))
s.append(P("Lo que construye Claude", "h2"))
s.append(pasos([
  ("La función «instagram-publicar» en el Netlify de Casa Verde",
   "La misma que CasaYourte, si ya existe: recibe un posteo aprobado, verifica que quien lo pide tenga "
   "sesión y ficha activa en Casa Verde, y publica el carrusel en la cuenta que corresponde."),
  ("El botón «Aprobar y programar» en la lista",
   "Con día y hora. Sin aprobación no se publica nada: la función se niega."),
  ("Avisar cuando el token esté por vencer",
   "Un token de larga duración vence a los dos meses, más o menos. La ronda avisa por la Pizarra "
   "con tiempo para renovarlo."),
], inicio=5))
s.append(P("Lo que hace Mauro, al final", "h2"))
s.append(pasos([
  ("Subir el zip nuevo a Netlify",
   "Como siempre: el zip lleva todas las funciones del ecosistema, más la nueva."),
  ("Probar con un posteo", "Uno solo, aprobado a mano, y mirar que salga bien en Instagram."),
], inicio=8))

s.append(P("Si algo falla", "h1"))
s.append(P("• <b>Meta Business Suite no muestra Instagram</b>: falta el vínculo de la Parte A, paso 3.<br/>"
           "• <b>La API contesta «permiso denegado»</b>: la cuenta no es profesional, o al token le falta "
           "<i>instagram_content_publish</i>.<br/>"
           "• <b>Una foto no se publica</b>: Instagram pide proporciones entre 4:5 y 1,91:1; la herramienta "
           "las recorta desde Cloudinary, pero una foto muy alargada puede quedar mal: se descarta.<br/>"
           "• <b>Cualquier otra cosa</b>: reportarla desde el panel interno de Casa Verde, como una falla."))

doc = SimpleDocTemplate(sys.argv[1], pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                        topMargin=16 * mm, bottomMargin=18 * mm,
                        title="Instagram de Casa Verde, con la IA", author="Casa Verde Canas")
doc.build(s, onFirstPage=pie, onLaterPages=pie)
