import net from "net";

export enum OltStatus {
    ONLINE = 'online',
    OFFLINE = 'offline',
    WEB_HUNG = 'web_hung',
}

export async function checkOltHealth(): Promise<{ status: OltStatus; details: string }> {
    const host = process.env.OLT_HOST || '192.168.1.94';
    const port = parseInt(process.env.OLT_WEB_PORT || '8080');
    const username = process.env.OLT_USER || 'admin';
    const password = process.env.OLT_PASSWORD || 'IMV*2025*';

    const tcpOk = await new Promise<boolean>((resolve) => {
        const sock = new net.Socket();
        sock.setTimeout(5000);
        sock.connect(port, host, () => { sock.destroy(); resolve(true); });
        sock.on('error', () => { sock.destroy(); resolve(false); });
        sock.on('timeout', () => { sock.destroy(); resolve(false); });
    });

    if (!tcpOk) {
        return { status: OltStatus.OFFLINE, details: `TCP ${host}:${port} no responde` };
    }

    const crypto = require('crypto');
    const md5pass = crypto.createHash('md5').update(password).digest('hex').toUpperCase();
    const url = `http://${host}:${port}/cgi-bin/h.cgi?module=sys_login`;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Usrname: username, Password: md5pass }),
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            return { status: OltStatus.WEB_HUNG, details: `HTTP ${response.status}` };
        }

        const result = await response.json() as any;
        if (result.code !== 0) {
            return { status: OltStatus.WEB_HUNG, details: `Login falló (code=${result.code})` };
        }

        return { status: OltStatus.ONLINE, details: `Login OK` };
    } catch (e: any) {
        return { status: OltStatus.WEB_HUNG, details: e.message || 'HTTP timeout/error' };
    }
}
