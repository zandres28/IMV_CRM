import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export type TechnicalVisitStatus = 'programada' | 'en_progreso' | 'completada' | 'cancelada';
export type TechnicalVisitType = 'instalacion' | 'soporte' | 'mantenimiento' | 'reparacion' | 'traslado' | 'otro';

export interface TechnicalVisit {
    id: number;
    clientId: number;
    client?: {
        id: number;
        fullName: string;
        installationAddress?: string;
        primaryPhone?: string;
        secondaryPhone?: string;
    };
    installationId?: number | null;
    technicianId: number;
    technician?: {
        id: number;
        userId?: number | null;
        name: string;
        phone?: string;
    };
    visitType: TechnicalVisitType;
    scheduledDate: string;
    timeSlot?: string | null;
    status: TechnicalVisitStatus;
    address?: string | null;
    notes?: string | null;
    createdById?: number | null;
}

export interface TechnicalVisitPayload {
    clientId?: number;
    installationId?: number | null;
    technicianId: number;
    visitType?: TechnicalVisitType;
    scheduledDate: string;
    timeSlot?: string | null;
    address?: string | null;
    notes?: string | null;
    status?: TechnicalVisitStatus;
}

export interface TechnicalVisitFilters {
    from?: string;
    to?: string;
    clientId?: number;
    technicianId?: number;
    status?: string;
}

export const TechnicalVisitService = {
    getAll: async (filters: TechnicalVisitFilters = {}): Promise<TechnicalVisit[]> => {
        const params = new URLSearchParams();
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.clientId) params.set('clientId', String(filters.clientId));
        if (filters.technicianId) params.set('technicianId', String(filters.technicianId));
        if (filters.status) params.set('status', filters.status);
        const query = params.toString();
        const response = await axios.get<TechnicalVisit[]>(`${API_URL}/technical-visits${query ? `?${query}` : ''}`);
        return response.data;
    },

    create: async (payload: TechnicalVisitPayload): Promise<TechnicalVisit> => {
        const response = await axios.post(`${API_URL}/technical-visits`, payload);
        return response.data.data;
    },

    update: async (id: number, payload: Partial<TechnicalVisitPayload>): Promise<TechnicalVisit> => {
        const response = await axios.put(`${API_URL}/technical-visits/${id}`, payload);
        return response.data.data;
    },

    remove: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/technical-visits/${id}`);
    },
};
