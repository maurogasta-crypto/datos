# servidor/ — el servidor del ecosistema (`timon-servidor` en Netlify)

Plan «Timón», 8-nov-2026. Las funciones que usan todas las apps (la IA,
avisos de WhatsApp, avisar a Claude, despertar a las Pizarras, las llamadas y
las luces de remate), fuera del Netlify de Casa Verde. La dirección que usan
las apps vive en `servidor-1.js`, en la raíz de este repositorio.

**Se despliega desde Termux**, con la sesión de `netlify` del teléfono (el chat
no la tiene):

    cd ~/datos && git pull && node herramientas/desplegar.mjs servidor

Arma el paquete (esta carpeta + las luces, bajadas de `rematetaller/remate`),
lo publica y deja el registro en `~/registros/despliegues.jsonl` del teléfono y
en `despliegues/AAAA-MM.jsonl` de la bodega. `--seco` arma sin publicar.
Banco: `node pruebas/herramientas/desplegar.mjs`.

**Mientras las funciones sigan también en Casa Verde**, las dos copias tienen
que ser iguales: el banco lo comprueba. Cuando todas las apps usen este
servidor, se sacan de allá y queda ésta sola.
