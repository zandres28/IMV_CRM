import axios from 'axios';

const XUI_PANEL_URL = process.env.XUI_PANEL_URL || '';
const XUI_API_KEY = process.env.XUI_API_KEY || '';
const XUI_BOUQUET_IDS = JSON.parse(process.env.XUI_BOUQUET_IDS || '[]');
const XUI_DEFAULT_MAX_CONNECTIONS = parseInt(process.env.XUI_DEFAULT_MAX_CONNECTIONS || '1', 10);

interface XuiResponse {
    status?: string;
    data?: any;
    result?: boolean;
    error?: string;
    created_id?: number;
    username?: string;
    password?: string;
}

function getBaseUrl(): string {
    return XUI_PANEL_URL.replace(/\/+$/, '');
}

function extractInitials(fullName: string): string {
    const parts = fullName.toUpperCase().trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return parts[0]?.substring(0, 2) || 'XX';
    const first = parts[0][0];
    const last = parts[parts.length - 1][0];
    return first + last;
}

function generatePassword(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export interface IptvCreateResult {
    success: boolean;
    username: string;
    password: string;
    panelId?: number;
    error?: string;
}

export interface IptvLineStatus {
    exists: boolean;
    active: boolean;
    expDate?: string;
    maxConnections?: number;
    activeCons?: number;
    error?: string;
}

export class IptvService {

    /**
     * Genera el username IPTV formato IMVCALI + iniciales
     */
    static generateUsername(fullName: string): string {
        const initials = extractInitials(fullName);
        return `IMVCALI${initials}`;
    }

    /**
     * Genera una contraseña aleatoria
     */
    static generatePassword(): string {
        return generatePassword(10);
    }

    /**
     * Crea una línea IPTV en el panel XUI
     */
    static async createLine(
        fullName: string,
        customPassword?: string,
        expDate?: Date
    ): Promise<IptvCreateResult> {
        if (!XUI_PANEL_URL || !XUI_API_KEY) {
            return {
                success: false,
                username: '',
                password: '',
                error: 'Configuración IPTV incompleta (falta XUI_PANEL_URL o XUI_API_KEY)'
            };
        }

        const username = this.generateUsername(fullName);
        const password = customPassword || this.generatePassword();

        const params: Record<string, any> = {
            api_key: XUI_API_KEY,
            action: 'create_line',
            username,
            password,
            max_connections: XUI_DEFAULT_MAX_CONNECTIONS,
        };

        if (expDate) {
            params.exp_date = Math.floor(expDate.getTime() / 1000);
        }

        if (XUI_BOUQUET_IDS.length > 0) {
            params.bouquets_selected = JSON.stringify(XUI_BOUQUET_IDS);
        }

        try {
            const response = await axios.get<XuiResponse>(getBaseUrl(), {
                params,
                timeout: 15000,
            });

            const body = response.data;

            if (body.status === 'STATUS_SUCCESS') {
                return {
                    success: true,
                    username,
                    password,
                    panelId: body.data?.id,
                };
            }

            return {
                success: false,
                username,
                password,
                error: body.status || body.error || 'Error desconocido del panel IPTV',
            };
        } catch (error: any) {
            const msg = error?.response?.data?.status
                || error?.response?.data?.error
                || error.message
                || 'Error de conexión con el panel IPTV';
            return {
                success: false,
                username,
                password,
                error: String(msg),
            };
        }
    }

    /**
     * Consulta el estado de una línea en el panel XUI
     */
    static async getLineStatus(username: string): Promise<IptvLineStatus> {
        if (!XUI_PANEL_URL || !XUI_API_KEY) {
            return { exists: false, active: false, error: 'Configuración IPTV incompleta' };
        }

        try {
            const response = await axios.get<XuiResponse>(getBaseUrl(), {
                params: {
                    api_key: XUI_API_KEY,
                    action: 'get_lines',
                    search: username,
                },
                timeout: 10000,
            });

            const body = response.data;

            if (body.status === 'STATUS_SUCCESS' && Array.isArray(body.data)) {
                const line = body.data.find((l: any) => l.username === username);
                if (line) {
                    return {
                        exists: true,
                        active: line.enabled === '1' || line.enabled === 1,
                        expDate: line.exp_date || undefined,
                        maxConnections: parseInt(line.max_connections || '1', 10),
                        activeCons: parseInt(line.active_cons || '0', 10),
                    };
                }
            }

            return { exists: false, active: false };
        } catch (error: any) {
            return {
                exists: false,
                active: false,
                error: error?.message || 'Error consultando panel IPTV',
            };
        }
    }

    /**
     * Habilitar una línea IPTV
     */
    static async enableLine(username: string): Promise<{ success: boolean; error?: string }> {
        if (!XUI_PANEL_URL || !XUI_API_KEY) {
            return { success: false, error: 'Configuración IPTV incompleta' };
        }

        try {
            const response = await axios.get<XuiResponse>(getBaseUrl(), {
                params: {
                    api_key: XUI_API_KEY,
                    action: 'enable_line',
                    username,
                },
                timeout: 10000,
            });

            return { success: response.data?.status === 'STATUS_SUCCESS' };
        } catch (error: any) {
            return { success: false, error: error?.message };
        }
    }

    /**
     * Deshabilitar una línea IPTV
     */
    static async disableLine(username: string): Promise<{ success: boolean; error?: string }> {
        if (!XUI_PANEL_URL || !XUI_API_KEY) {
            return { success: false, error: 'Configuración IPTV incompleta' };
        }

        try {
            const response = await axios.get<XuiResponse>(getBaseUrl(), {
                params: {
                    api_key: XUI_API_KEY,
                    action: 'disable_line',
                    username,
                },
                timeout: 10000,
            });

            return { success: response.data?.status === 'STATUS_SUCCESS' };
        } catch (error: any) {
            return { success: false, error: error?.message };
        }
    }

    /**
     * Eliminar una línea IPTV
     */
    static async deleteLine(username: string): Promise<{ success: boolean; error?: string }> {
        if (!XUI_PANEL_URL || !XUI_API_KEY) {
            return { success: false, error: 'Configuración IPTV incompleta' };
        }

        try {
            const response = await axios.get<XuiResponse>(getBaseUrl(), {
                params: {
                    api_key: XUI_API_KEY,
                    action: 'delete_line',
                    username,
                },
                timeout: 10000,
            });

            return { success: response.data?.status === 'STATUS_SUCCESS' };
        } catch (error: any) {
            return { success: false, error: error?.message };
        }
    }

    /**
     * Editar línea IPTV (ej: cambiar exp_date)
     */
    static async editLine(
        username: string,
        fields: Record<string, any>
    ): Promise<{ success: boolean; error?: string }> {
        if (!XUI_PANEL_URL || !XUI_API_KEY) {
            return { success: false, error: 'Configuración IPTV incompleta' };
        }

        try {
            const params: Record<string, any> = {
                api_key: XUI_API_KEY,
                action: 'edit_line',
                username,
                ...fields,
            };

            const response = await axios.get<XuiResponse>(getBaseUrl(), {
                params,
                timeout: 10000,
            });

            return { success: response.data?.status === 'STATUS_SUCCESS' };
        } catch (error: any) {
            return { success: false, error: error?.message };
        }
    }
}
