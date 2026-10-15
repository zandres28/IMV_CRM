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
    private static readonly ONU_LIST_TTL_MS = 300000; // 5 minutos
    private static readonly MAX_RETRIES = 3;
    private static readonly RETRY_BASE_DELAY_MS = 1000;

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
        return this.withRetry(async () => {
            const password = process.env.OLT_PASSWORD || '***REMOVED***';
            const md5pass = crypto.createHash('md5').update(password).digest('hex').toUpperCase();

            const response = await fetch(`${this.baseUrl}?module=sys_login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Usrname: process.env.OLT_USER || 'admin', Password: md5pass })
            });

            const text = await response.text();
            let result: ApiResponse;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`Error de autenticación OLT: Respuesta no válida (no JSON) - HTTP ${response.status}`);
            }
            if (result.code !== 0 || !result.data?.token) {
                throw new Error(`Error de autenticación OLT: ${result.description}`);
            }

            OltService.token = result.data.token;
            OltService.tokenExpiry = Date.now() + 600000;
            return OltService.token!;
        }, 'sys_login');
    }

    private async apiGet(module: string, params: Record<string, any> = {}): Promise<any> {
        return this.withRetry(async () => {
            const token = await this.ensureToken();
            const url = new URL(this.baseUrl);
            url.searchParams.set('module', module);
            Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

            const response = await fetch(url.toString(), {
                headers: { 'token': token, 'Content-Type': 'application/json' }
            });

            const text = await response.text();
            let result: ApiResponse;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`API error [${module}]: Respuesta no válida (no JSON) - HTTP ${response.status}`);
            }
            if (result.code === 2) {
                OltService.token = null;
                return this.apiGet(module, params);
            }
            if (result.code !== 0) {
                throw new Error(`API error [${module}]: ${result.description}`);
            }
            return result.data;
        }, module);
    }

    private async apiPost(module: string, body: Record<string, any> = {}): Promise<any> {
        return this.withRetry(async () => {
            const token = await this.ensureToken();
            const response = await fetch(`${this.baseUrl}?module=${module}`, {
                method: 'POST',
                headers: { 'token': token, 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const text = await response.text();
            let result: ApiResponse;
            try {
                result = JSON.parse(text);
            } catch {
                throw new Error(`API error [${module}]: Respuesta no válida (no JSON) - HTTP ${response.status}`);
            }
            if (result.code === 2) {
                OltService.token = null;
                return this.apiPost(module, body);
            }
            if (result.code !== 0) {
                throw new Error(`API error [${module}]: ${result.description}`);
            }
            return result.data;
        }, module);
    }

    private async withRetry<T>(fn: () => Promise<T>, module: string): Promise<T> {
        let lastError: Error;
        for (let attempt = 0; attempt <= OltService.MAX_RETRIES; attempt++) {
            try {
                return await fn();
            } catch (error: any) {
                lastError = error;
                const isRetryable = error.message.includes('no JSON') ||
                    error.message.includes('fetch failed') ||
                    error.message.includes('ECONNREFUSED') ||
                    error.message.includes('ETIMEDOUT');

                if (attempt < OltService.MAX_RETRIES && isRetryable) {
                    const delay = OltService.RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
                    console.warn(`[OltService] ${module} attempt ${attempt + 1} failed: ${error.message}. Retrying in ${delay}ms...`);
                    await new Promise(r => setTimeout(r, delay));
                    // Invalidar cache y token para forzar re-login y nuevo fetch
                    OltService.token = null;
                    OltService.onuListCache = null;
                    OltService.onuListCacheExpiry = 0;
                    continue;
                }
                throw error;
            }
        }
        throw lastError!;
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

    // El CGI de la OLT (lighttpd) trunca CUALQUIER respuesta > ~40KB: con 97
    // ONUs el listado completo (~43KB) llegaba cortado a mitad de JSON, así que
    // `JSON.parse` fallaba y el CRM reportaba "web hung" / "no se pudo conectar
    // a la OLT" aunque el servidor sí respondía (HTTP 200) y el login funcionaba.
    //
    // Solución permanente: PAGINAR. `onu_list_get` acepta `PageNumber`
    // (1-based; 0 = "todas" → truncado) y `PageSize`. Con PageSize=20 cada
    // respuesta pesa ~8.6KB, muy por debajo del límite. Las páginas se recorren
    // SECUENCIALMENTE (1 request a la vez): nunca fan-out a la OLT.
    private async fetchAllOnus(): Promise<OnuDevice[]> {
        const PAGE_SIZE = 20;
        const all: OnuDevice[] = [];
        let page = 1;
        let total = Infinity;

        while (all.length < total) {
            const data = await this.apiGet('onu_list_get', { PageNumber: page, PageSize: PAGE_SIZE });
            const list: OnuDevice[] = data?.list || [];
            if (list.length === 0) break; // salvaguarda anti-bucle infinito
            all.push(...list);
            total = Number(data?.PageTotal ?? all.length);
            if (list.length < PAGE_SIZE) break; // última página
            page++;
        }

        OltService.onuListCache = all;
        OltService.onuListCacheExpiry = Date.now() + OltService.ONU_LIST_TTL_MS;
        return all;
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
        await this.apiPost('onu_deactive', { PonId: ponId, OnuId: parseInt(onuId), ControlFlag: 0 });
        OltService.invalidateOnuListCache();
    }

    async activateOnu(ponId: string, onuId: string): Promise<void> {
        await this.apiPost('onu_deactive', { PonId: ponId, OnuId: parseInt(onuId), ControlFlag: 1 });
        OltService.invalidateOnuListCache();
    }

    // Renombra la descripción de la ONU en la OLT (OnuDesc).
    // Módulo descubierto en el bundle Vue de la OLT (onu-detail chunk):
    //   r.onuModifyDescription = e => u("onu_desc_set", e)
    //   onSubmit() => this.$api.onuModifyDescription({ Desc: this.des, OnuId: +t, PonId: i })
    async renameOnu(ponId: string, onuId: string, description: string): Promise<void> {
        await this.apiPost('onu_desc_set', { Desc: description, PonId: ponId, OnuId: parseInt(onuId) });
        OltService.invalidateOnuListCache();
    }

    async getRawOnuList(): Promise<any[]> {
        return this.getAllOnus();
    }

    // Devuelve mapa { onuSerialNumber: { state, ponId, onuId, runningState, controlFlag } }
    // Usa el cache estático - UNA sola llamada a la OLT para N instalaciones
    async getAllOnuStatusMap(): Promise<Record<string, { state: string | null; ponId: string; onuId: number; runningState: number; controlFlag: number }>> {
        const onus = await this.getAllOnus();
        const map: Record<string, { state: string | null; ponId: string; onuId: number; runningState: number; controlFlag: number }> = {};
        for (const onu of onus) {
            if (onu.PonSn) {
                map[onu.PonSn.toUpperCase()] = {
                    state: onu.RunningState === 1 ? 'Online' : 'Offline',
                    ponId: onu.PonId,
                    onuId: onu.OnuId,
                    runningState: onu.RunningState,
                    controlFlag: onu.ControlFlag
                };
            }
        }
        return map;
    }
}
