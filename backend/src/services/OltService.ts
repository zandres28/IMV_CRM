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
    private token: string | null = null;
    private tokenExpiry: number = 0;

    constructor() {
        const host = process.env.OLT_HOST || '192.168.1.94';
        const port = process.env.OLT_WEB_PORT || '8080';
        this.baseUrl = `http://${host}:${port}/cgi-bin/h.cgi`;
    }

    private async ensureToken(): Promise<string> {
        if (this.token && Date.now() < this.tokenExpiry) {
            return this.token;
        }

        const password = process.env.OLT_PASSWORD || 'IMV*2025*';
        const md5pass = crypto.createHash('md5').update(password).digest('hex');

        const response = await fetch(`${this.baseUrl}?module=sys_login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Usrname: process.env.OLT_USER || 'admin', Password: md5pass })
        });

        const result = await response.json() as ApiResponse;
        if (result.code !== 0 || !result.data?.token) {
            throw new Error(`Error de autenticación OLT: ${result.description}`);
        }

        this.token = result.data.token;
        this.tokenExpiry = Date.now() + 600000;
        return this.token!;
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
            this.token = null;
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
            this.token = null;
            return this.apiPost(module, body);
        }
        if (result.code !== 0) {
            throw new Error(`API error [${module}]: ${result.description}`);
        }
        return result.data;
    }

    async getAllOnus(): Promise<OnuDevice[]> {
        const data = await this.apiGet('onu_list_get');
        return data?.list || [];
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
    }

    async deactivateOnu(ponId: string, onuId: string): Promise<void> {
        await this.apiPost('onu_deactive', { PonId: ponId, OnuId: parseInt(onuId) });
    }

    async activateOnu(ponId: string, onuId: string): Promise<void> {
        await this.apiPost('onu_manual_add', {
            PonId: ponId,
            OnuId: parseInt(onuId),
            Action: 'activate'
        });
    }

    async getRawOnuList(): Promise<any[]> {
        return this.getAllOnus();
    }
}
