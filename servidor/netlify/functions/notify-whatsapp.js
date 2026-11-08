// Netlify Function: envío de WhatsApp vía CallMeBot.
//
// CAMBIO jul-2026 — SE ELIMINÓ CALLMEBOT_RECIPIENTS.
// Antes, el teléfono y la clave de cada persona vivían en una variable de
// entorno con forma de JSON, indexada por uid. Eso tenía dos problemas que
// costaron una tarde entera de diagnóstico:
//   1. EL MISMO DATO EN DOS LUGARES. La clave de cada uno estaba en Firestore
//      (avisos_contacto) Y en la variable de Netlify, sincronizadas a mano
//      copiando un JSON. Dos fuentes para un dato es una que se desactualiza.
//   2. NETLIFY NO APLICA VARIABLES NUEVAS SIN DESPLEGAR. Comprobado el
//      30-jul-2026: se cambió CALLMEBOT_APIKEY a un valor inválido y la
//      función siguió mandando bien. Este proyecto se publicó con Netlify
//      Drop y no tiene repositorio enganchado, así que cada alta de una
//      persona obligaba a rearmar y resoltar el paquete a mano.
//
// Ahora el destinatario viaja EN EL PEDIDO: la app lee avisos_contacto de
// Firestore (que ya es la fuente única) y manda phone + apikey. Nadie vuelve
// a tocar Netlify cuando entra alguien nuevo.
//
// Variables de entorno que siguen haciendo falta (destino por defecto, para
// un aviso que no dice a quién va):
//   CALLMEBOT_PHONE   = número del admin
//   CALLMEBOT_APIKEY  = clave de CallMeBot de ese número
//
// El frontend llama con POST { text, phone (opcional), apikey (opcional) }.
//
// SOBRE LA SEGURIDAD DE ESTE ENDPOINT, dicho sin adornos: está abierto, y
// quien conozca la dirección puede pedirle que mande un WhatsApp. Pero una
// clave de CallMeBot SOLO sirve para mandarle mensajes AL NÚMERO QUE LA
// GENERÓ: sin la clave del destinatario no se le puede escribir a nadie, y
// quien tenga una clave la tiene porque es de su propio teléfono. No hay
// forma de usar esto para molestar a un tercero ni de gastarnos nada: la
// cuota es de CallMeBot y es por número de destino.

var LIMITE_TEXTO = 900;

function limpiarTelefono(v) {
    var s = String(v || '').replace(/[^\d+]/g, '');
    // Un solo '+' y solo adelante.
    if (s.indexOf('+') === 0) return '+' + s.slice(1).replace(/\+/g, '');
    return s.replace(/\+/g, '');
}

exports.handler = async function (event) {
    var headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers: headers, body: '' };
    }
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers: headers, body: JSON.stringify({ ok: false, error: 'Método no permitido' }) };
    }

    try {
        var body = JSON.parse(event.body || '{}');
        var text = (body.text || '').toString().trim();
        if (!text) {
            return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'Falta el texto del mensaje' }) };
        }

        // Resolución de destinatario:
        //  - Con 'phone' y 'apikey' en el pedido: van esos, tal cual.
        //  - Sin ellos: el número por defecto del admin.
        var phone = limpiarTelefono(body.phone);
        var apikey = (body.apikey || '').toString().trim();

        if (phone || apikey) {
            // Vino uno de los dos: tienen que venir los dos, y bien formados.
            // Se valida acá y no solo en la app porque la app se puede saltear.
            if (!phone || !apikey) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'Faltan el teléfono o la clave del destinatario.' }) };
            }
            if (phone.replace('+', '').length < 8 || phone.length > 20) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'El teléfono no tiene forma de teléfono.' }) };
            }
            if (!/^[A-Za-z0-9_-]{4,40}$/.test(apikey)) {
                return { statusCode: 400, headers: headers, body: JSON.stringify({ ok: false, error: 'La clave de CallMeBot no tiene forma de clave.' }) };
            }
        } else {
            phone = process.env.CALLMEBOT_PHONE;
            apikey = process.env.CALLMEBOT_APIKEY;
            if (!phone || !apikey) {
                return { statusCode: 500, headers: headers, body: JSON.stringify({ ok: false, error: 'WhatsApp no configurado (faltan CALLMEBOT_PHONE o CALLMEBOT_APIKEY).' }) };
            }
        }

        // CallMeBot: GET con phone, text (encodeURIComponent) y apikey.
        var url = 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone) +
                  '&text=' + encodeURIComponent(text.slice(0, LIMITE_TEXTO)) +
                  '&apikey=' + encodeURIComponent(apikey);

        var resp = await fetch(url);
        var respText = await resp.text();

        // OJO: 'ok' acá significa "CallMeBot contestó", NO "el mensaje salió".
        // CallMeBot devuelve HTTP 200 aunque rechace el pedido (cuenta en
        // pausa, clave inválida) y mete el error como HTML rojo en el cuerpo.
        // Quien lee esto de verdad es CV2._leerRespuestaWa en nucleo.js.
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({ ok: resp.ok, status: resp.status, respuesta: respText.slice(0, 400) })
        };
    } catch (e) {
        return { statusCode: 500, headers: headers, body: JSON.stringify({ ok: false, error: e.message }) };
    }
};
