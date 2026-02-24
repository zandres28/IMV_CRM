import axios from 'axios';
import { Client } from '../types/Client';
import { Technician } from '../types/Technician';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/service-transfers`;

export interface ServiceTransfer {
    id: number;
    clientId: number;
    client?: Client;
    previousAddress: string;
    newAddress: string;
    requestDate: string;
    scheduledDate?: string;
    completionDate?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    cost: number;
    technicianId?: number;
    technician?: Technician;
    notes?: string;
    created_at: string;
    updated_at: string;
}

export const ServiceTransferService = {
    getAll: async (): Promise<ServiceTransfer[]> => {
        const response = await axios.get(API_URL);
        return response.data;
    },

    getByClient: async (clientId: number): Promise<ServiceTransfer[]> => {
        const response = await axios.get(`${API_URL}/client/${clientId}`);
        return response.data;
    },

    create: async (data: Partial<ServiceTransfer>): Promise<ServiceTransfer> => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    update: async (id: number, data: Partial<ServiceTransfer>): Promise<ServiceTransfer> => {
        const response = await axios.put(`${API_URL}/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/${id}`);
    },

    checkCost: async (clientId: number): Promise<{ cost: number, count: number }> => {
        const response = await axios.get(`${API_URL}/cost/${clientId}`);
        return response.data;
    }
};
