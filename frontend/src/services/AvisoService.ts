import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const authHeader = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
});

export type AvisoCategory = 'emergency' | 'maintenance' | 'outage' | 'general';

export interface AvisoTemplate {
    id: number;
    title: string;
    category: AvisoCategory;
    message: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface AvisoFilters {
    ponId?: string;
    planId?: number | '';
    installationDateFrom?: string;
    installationDateTo?: string;
}

export interface AvisoPreview {
    count: number;
    sample: string[];
}

export const AvisoService = {
    getAll: async (): Promise<AvisoTemplate[]> => {
        const { data } = await axios.get(`${API_URL}/avisos`, { headers: authHeader() });
        return data;
    },

    create: async (payload: Pick<AvisoTemplate, 'title' | 'category' | 'message' | 'isActive'>): Promise<AvisoTemplate> => {
        const { data } = await axios.post(`${API_URL}/avisos`, payload, { headers: authHeader() });
        return data;
    },

    update: async (id: number, payload: Partial<Pick<AvisoTemplate, 'title' | 'category' | 'message' | 'isActive'>>): Promise<AvisoTemplate> => {
        const { data } = await axios.put(`${API_URL}/avisos/${id}`, payload, { headers: authHeader() });
        return data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/avisos/${id}`, { headers: authHeader() });
    },

    /** Devuelve count e muestra de nombres de destinatarios según los filtros activos */
    preview: async (filters: AvisoFilters): Promise<AvisoPreview> => {
        const { data } = await axios.post(`${API_URL}/avisos/preview`, filters, { headers: authHeader() });
        return data;
    },
};

export const CATEGORY_LABELS: Record<AvisoCategory, string> = {
    emergency: '🚨 Emergencia',
    maintenance: '🔧 Mantenimiento',
    outage: '⚡ Caída de Servicio',
    general: '📢 Información General',
};

export const CATEGORY_COLORS: Record<AvisoCategory, 'error' | 'warning' | 'info' | 'success'> = {
    emergency: 'error',
    maintenance: 'warning',
    outage: 'info',
    general: 'success',
};
