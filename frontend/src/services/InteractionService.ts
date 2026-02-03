import axios from 'axios';
import { InteractionType as LinkedInteractionType } from './InteractionTypeService';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/interactions`;

// export type InteractionType = 'mantenimiento' | 'reporte_daño' | 'solicitud_servicio' | 'llamada' | 'visita' | 'consulta' | 'queja' | 'otro';
export type InteractionStatus = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado' | 'pospuesto';
export type InteractionPriority = 'baja' | 'media' | 'alta' | 'urgente';

export interface Interaction {
    id: number;
    clientId: number;
    client?: {
        id: number;
        fullName: string;
        identificationNumber: string;
        primaryPhone: string;
    };
    /* Removed Installation relation */
    interactionTypeId: number;
    interactionType?: LinkedInteractionType;
    
    subject: string;
    description: string;
    status: InteractionStatus;
    priority: InteractionPriority;
    assignedToTechnicianId?: number;
    assignedToTechnician?: {
        id: number;
        name: string;
        phone?: string;
        email?: string;
    };
    scheduledDate?: string;
    completedDate?: string;
    notes?: string;
    resolution?: string;
    attachments?: string[];
    next_follow_up?: string;
    created_at: string;
    updated_at: string;
}

export interface InteractionStats {
    total: number;
    pendientes: number;
    enProgreso: number;
    completados: number;
    urgentes: number;
    porTipo: Array<{ type: string; count: string }>;
}

export interface InteractionFilters {
    interactionTypeId?: number;
    status?: InteractionStatus;
    priority?: InteractionPriority;
    clientId?: number;
    technicianId?: number;
    technicianName?: string;
    startDate?: string;
    endDate?: string;
}

export const InteractionService = {
    // Obtener todas las interacciones con filtros
    getAll: async (filters?: InteractionFilters): Promise<Interaction[]> => {
        const response = await axios.get(API_URL, { params: filters });
        return response.data;
    },

    // Obtener una interacción por ID
    getById: async (id: number): Promise<Interaction> => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },

    // Obtener interacciones por cliente
    getByClient: async (clientId: number): Promise<Interaction[]> => {
        const response = await axios.get(`${API_URL}/client/${clientId}`);
        return response.data;
    },

    // Obtener estadísticas
    getStats: async (): Promise<InteractionStats> => {
        const response = await axios.get(`${API_URL}/stats`);
        return response.data;
    },

    // Crear una nueva interacción
    create: async (data: Partial<Interaction>): Promise<Interaction> => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    // Actualizar una interacción
    update: async (id: number, data: Partial<Interaction>): Promise<Interaction> => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },

    // Actualizar estado
    updateStatus: async (id: number, status: InteractionStatus, resolution?: string, completedDate?: string): Promise<Interaction> => {
        const response = await axios.put(`${API_URL}/${id}/status`, { 
            status, 
            resolution,
            completedDate 
        });
        return response.data;
    },

    // Asignar técnico
    assignTechnician: async (id: number, technicianId: number): Promise<Interaction> => {
        const response = await axios.put(`${API_URL}/${id}/assign-technician`, { technicianId });
        return response.data;
    },

    // Eliminar una interacción
    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/${id}`);
    }
};
