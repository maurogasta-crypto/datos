# Lo que Mariano sube a BandoMaps — trabajo de la ronda

> Era el paso 5 bis ⅞ ⅞ ⅞ ½ de `TRASPASO.md` § 4 (hasta el 16-nov-2026; plan «Timón», etapa 7a). 14-nov-2026,
> Mauro: «que él continúe haciendo modificaciones de forma directa subiendo a GitHub con su cuenta como colaborador».
> Sube sus cambios por la web de GitHub, directo a `main` de masotromauro-ai/tocatoca (GUIA-PARA-TU-CHAT.md § 2).
> Lo que esta ronda hace es COMPROBARLO, no frenarlo.

| | |
|---|---|
| **App** | tocatoca (BandoMaps; en el panel, proyecto `harmonia`) |
| **Cuándo** | sólo la corrida de la mañana |
| **Qué lee** | los commits nuevos de `main` que no sean de Claude; con commits, corre los bancos del repo |
| **Qué puede dejar** | una línea en el resumen si todo está verde; con rojo de verdad, un aviso ARRIBA del resumen y un pendiente del proyecto harmonia. NO se revierte ni se corrige solo |
| **Nivel** | Mirar |

## Criterio

a) git -C /home/user/tocatoca pull --ff-only origin main  y  git -C /home/user/tocatoca log --since="2 days ago" --format='%h %an %s'. Si no hay commits nuevos que no sean de Claude, saltá esto.
b) Con commits de otra persona: desde /home/user/tocatoca  node pruebas/humo.mjs  ·  node pruebas/arquitectura.mjs  ·  los bancos (areas, mover, medir, codigo, gestos, teoria, puerta, registro, usuarios). Si el commit movió código, node herramientas/mover.mjs --base <commit anterior> src/App.jsx <archivos>.
c) Todo verde: una línea en el resumen. Si humo dice «cambió» y el commit lo explica (un color, un botón), no es una falla: revisá el cambio, y si es lo que se quiso, rehacé la foto con  node pruebas/humo.mjs --guardar  y commit «Foto de humo al día». Rojo de verdad (error de consola, falta medir/medirLote/__tab, claves harmonia_, un archivo de más de 400 líneas, una pestaña que no abre): va ARRIBA del resumen a Mauro con el commit y el archivo, y un pendiente del proyecto harmonia. NO se revierte ni se corrige solo: es trabajo de Mariano; el único revert automático que se justifica es el de algo que deja la app sin abrir, y aun así se le pregunta a Mauro.
d) Con la fase 2 en adelante, antes de partir más código, comprobá que lo de Mariano no esté a medio camino: git status limpio y su último commit comprobado.
