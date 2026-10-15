import cron from 'node-cron';
import { checkOltHealth as probeOltHealth, OltStatus } from './oltHealthCheck';

let lastOltStatus: OltStatus = OltStatus.UNKNOWN;
let firstCheckDone = false;

function getEvolutionConfig() {
    return {
        baseUrl: process.env.EVOLUTION_API_URL || 'https://imvevoapi.duckdns.org:8080',
        instance: process.env.EVOLUTION_INSTANCE_NAME || 'imv_chatwoot3',
        apiKey: process.env.EVOLUTION_API_KEY || '',
        adminPhone: process.env.WHATSAPP_ADMIN_PHONE || '573334006212',
    };
}

async function trySendWhatsApp(baseUrl: string, instance: string, apiKey: string, phone: string, text: string): Promise<boolean> {
    try {
        const url = `${baseUrl}/message/sendText/${instance}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'apikey': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ number: phone, text }),
        });
        if (!response.ok) {
            console.warn(`[OltHealthMonitor] WhatsApp falló (${baseUrl}): ${response.status}`);
            return false;
        }
        console.log('[OltHealthMonitor] WhatsApp enviado correctamente');
        return true;
    } catch {
        return false;
    }
}

async function sendWhatsAppAlert(text: string): Promise<void> {
    const config = getEvolutionConfig();
    if (!config.apiKey) {
        console.warn('[OltHealthMonitor] EVOLUTION_API_KEY no configurada, omitiendo WhatsApp');
        return;
    }

    const endpoints = [
        { url: 'http://imvevoapi.duckdns.org:8080', desc: 'Evolution API (HTTP directo)' },
        { url: 'http://nginx-proxy-manager:80', desc: 'NPM (proxy interno)' },
        { url: config.baseUrl, desc: 'Evolution API (EVOLUTION_API_URL)' },
    ];

    const seen = new Set<string>();
    for (const ep of endpoints) {
        if (seen.has(ep.url)) continue;
        seen.add(ep.url);
        const ok = await trySendWhatsApp(ep.url, config.instance, config.apiKey, config.adminPhone, text);
        if (ok) return;
    }

    console.error('[OltHealthMonitor] No se pudo enviar WhatsApp por ningún endpoint');
}

function formatTimestamp(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function checkOltHealth(): Promise<OltStatus> {
    return probeOltHealth().then(r => r.status);
}

export const startOltHealthMonitor = () => {
    cron.schedule('*/5 * * * *', async () => {
        try {
            const currentStatus = await checkOltHealth();

            if (!firstCheckDone) {
                lastOltStatus = currentStatus;
                firstCheckDone = true;
                console.log(`[OltHealthMonitor] Estado inicial OLT: ${currentStatus}`);
                return;
            }

            if (currentStatus === lastOltStatus) {
                return;
            }

            const ts = formatTimestamp();

            if (currentStatus === OltStatus.OFFLINE) {
                const msg = `⚠️ *ALERTA - CORTE DE ENERGÍA OLT*\n\nLa OLT no responde a nivel de red (sin TCP).\n📅 ${ts}\n📍 Sitio del cliente\n\nPosible corte de energía en el sitio.`;
                console.log(`[OltHealthMonitor] OLT CAÍDA (sin red) - ${ts}`);
                await sendWhatsAppAlert(msg);
            } else if (currentStatus === OltStatus.WEB_HUNG) {
                const msg = `⚠️ *ALERTA - GESTIÓN OLT COLGADA*\n\nEl servidor web de la OLT acepta conexiones pero no responde HTTP.\n📅 ${ts}\n📍 Sitio del cliente\n\n✅ El servicio de clientes NO está afectado (el tráfico sigue pasando).\n🔧 La gestión solo se recupera reiniciando físicamente la OLT (apagar/encender). Hacerlo en horario valle.`;
                console.log(`[OltHealthMonitor] OLT WEB COLGADA - ${ts}`);
                await sendWhatsAppAlert(msg);
            } else if (currentStatus === OltStatus.ONLINE) {
                const msg = lastOltStatus === OltStatus.WEB_HUNG
                    ? `✅ *GESTIÓN OLT RESTAURADA*\n\nEl servidor web de la OLT vuelve a responder.\n📅 ${ts}\n📍 Sitio del cliente\n\nEl servicio de clientes nunca se interrumpió.`
                    : `✅ *OLT RESTAURADA*\n\nLa OLT ha vuelto a responder.\n📅 ${ts}\n📍 Sitio del cliente\n\nEl servicio debería estar restableciéndose.`;
                console.log(`[OltHealthMonitor] OLT RESTAURADA - ${ts}`);
                await sendWhatsAppAlert(msg);
            }

            lastOltStatus = currentStatus;
        } catch (error: any) {
            console.error(`[OltHealthMonitor] Error: ${error.message}`);
        }
    }, {
        timezone: process.env.TZ || 'America/Bogota',
    });

    console.log('[OltHealthMonitor] Monitor de salud OLT iniciado (revisión cada 5 minutos)');
};