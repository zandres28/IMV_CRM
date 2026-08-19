import crypto from 'crypto';

interface OnuDevice {
    PonId: string;
    OnuId: number;
    OnuName: string;
    OnuDesc: string;
    PonSn: string;
    RunningState: number;
    ControlFlag: number;
    ConfigState: number;
    LastDownCause: number;
}

interface ApiResponse {
    code: number;
    description: string;
    data?: any;
}

export class OltService {
    private baseUrl: string;

    // Token y caché compartidos entre TODAS las instancias: la OLT es un
    // recurso único con un servidor web embebido (lighttpd) que se cuelga
    // bajo ráfagas de peticiones simultáneas. Cada `new OltService()` con
    // token propio generaba un sys_login + onu_list_get por petición.
    private static token: string | null = null;
    private static tokenExpiry: number = 0;
    private static tokenPromise: Promise<string> | null = null;

    private static onuListCache: OnuDevice[] | null = null;
    private static onuListCacheExpiry: number = 0;
    private static onuListPromise: Promise<OnuDevice[]> | null = null;
    private static readonly ONU_LIST_TTL_MS = 30000;

    constructor() {
        const host = process.env.OLT_HOST || '192.168.1.94';
        const port = process.env.OLT_WEB_PORT || '8080';
        this.baseUrl = `http://${host}:${port}/cgi-bin/h.cgi`;
    }

    private async ensureToken(): Promise<string> {
        if (OltService.token && Date.now() < OltService.tokenExpiry) {
            return OltService.token;
        }

        // Single-flight: logins concurrentes comparten la misma promesa
        if (!OltService.tokenPromise) {
            OltService.tokenPromise = this.login().finally(() => {
                OltService.tokenPromise = null;
            });
        }
        return OltService.tokenPromise;
    }

    private async login(): Promise<string> {
        const password = process.env.OLT_PASSWORD || 'IMV*2025*';
        const md5pass = crypto.createHash('md5').update(password).digest('hex').toUpperCase();

        const response = await fetch(`${this.baseUrl}?module=sys_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Usrname: process.env.OLT_USER || 'admin', Password: md5pass })
        });

        const result = await response.json() as ApiResponse;
        if (result.code !== 0 || !result.data?.token) {
            throw new Error(`Error de autenticación OLT: ${result.description}`);
        }

        OltService.token = result.data.token;
        OltService.tokenExpiry = Date.now() + 600000;
        return OltService.token!;
    }

    private async apiGet(module: string, params: Record<string, any> = {}): Promise<any> {
        const token = await this.ensureToken();
        const url = new URL(this.baseUrl);
        url.searchParams.set('module', module);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

        const response = await fetch(url.toString(), {
            headers: { 'token': token, 'Content-Type': 'application/json' }
        });

        const result = await response.json() as ApiResponse;
        if (result.code === 2) {
            OltService.token = null;
            return this.apiGet(module, params);
        }
        if (result.code !== 0) {
            throw new Error(`API error [${module}]: ${result.description}`);
        }
        return result.data;
    }

    private async apiPost(module: string, body: Record<string, any> = {}): Promise<any> {
        const token = await this.ensureToken();
        const response = await fetch(`${this.baseUrl}?module=${module}`, {
            method: 'POST',
            headers: { 'token': token, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const result = await response.json() as ApiResponse;
        if (result.code === 2) {
            OltService.token = null;
            return this.apiPost(module, body);
        }
        if (result.code !== 0) {
            throw new Error(`API error [${module}]: ${result.description}`);
        }
        return result.data;
    }

    async getAllOnus(): Promise<OnuDevice[]> {
        if (OltService.onuListCache && Date.now() < OltService.onuListCacheExpiry) {
            return OltService.onuListCache;
        }

        // Single-flight: consultas concurrentes esperan el mismo fetch,
        // así N peticiones simultáneas = 1 sola llamada HTTP a la OLT
        if (!OltService.onuListPromise) {
            OltService.onuListPromise = this.fetchAllOnus().finally(() => {
                OltService.onuListPromise = null;
            });
        }
        return OltService.onuListPromise;
    }

    private async fetchAllOnus(): Promise<OnuDevice[]> {
        const data = await this.apiGet('onu_list_get');
        const list: OnuDevice[] = data?.list || [];
        OltService.onuListCache = list;
        OltService.onuListCacheExpiry = Date.now() + OltService.ONU_LIST_TTL_MS;
        return list;
    }

    static invalidateOnuListCache(): void {
        OltService.onuListCache = null;
        OltService.onuListCacheExpiry = 0;
    }

    async getOnuBySerial(serialNumber: string): Promise<OnuDevice | null> {
        const onus = await this.getAllOnus();
        return onus.find(o => o.PonSn?.toUpperCase() === serialNumber.toUpperCase()) || null;
    }

    async getOnuByPonPort(ponId: string, onuId: number): Promise<OnuDevice | null> {
        const onus = await this.getAllOnus();
        return onus.find(o => o.PonId === ponId && o.OnuId === onuId) || null;
    }

    async getOnuRunState(ponId: string, onuId: string): Promise<string | null> {
        try {
            const onu = await this.getOnuByPonPort(ponId, parseInt(onuId));
            if (!onu) return null;
            return onu.RunningState === 1 ? 'Online' : 'Offline';
        } catch {
            return null;
        }
    }

    async getOnuRunStateBySn(serialNumber: string): Promise<{ state: string | null; ponId: string; onuId: number } | null> {
        try {
            const onu = await this.getOnuBySerial(serialNumber);
            if (!onu) return null;
            return {
                state: onu.RunningState === 1 ? 'Online' : 'Offline',
                ponId: onu.PonId,
                onuId: onu.OnuId
            };
        } catch {
            return null;
        }
    }

    async rebootOnu(ponId: string, onuId: string): Promise<void> {
        await this.apiPost('onu_reboot', { PonId: ponId, OnuId: parseInt(onuId) });
        OltService.invalidateOnuListCache();
    }

    async deactivateOnu(ponId: string, onuId: string): Promise<void> {
        await this.apiPost('onu_deactive', { PonId: ponId, OnuId: parseInt(onuId) });
        OltService.invalidateOnuListCache();
    }

    async activateOnu(ponId: string, onuId: string): Promise<void> {
        await this.apiPost('onu_manual_add', {
            PonId: ponId,
            OnuId: parseInt(onuId),
            Action: 'activate'
        });
        OltService.invalidateOnuListCache();
    }

    async getRawOnuList(): Promise<any[]> {
        return this.getAllOnus();
    }
}
