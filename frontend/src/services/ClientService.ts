import axios from 'axios';
import { Client } from '../types/Client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const ClientService = {
    getAll: async (includeDeleted: boolean = false): Promise<Client[]> => {
        const response = await axios.get(`${API_URL}/clients`, {
            params: { includeDeleted }
        });
        return response.data;
    },

    getById: async (id: number): Promise<Client> => {
        const response = await axios.get(`${API_URL}/clients/${id}`);
        return response.data;
    },

    create: async (client: Omit<Client, 'id' | 'created_at' | 'updated_at'>): Promise<Client> => {
        const response = await axios.post(`${API_URL}/clients`, client);
        return response.data;
    },

    update: async (id: number, client: Partial<Client>): Promise<Client> => {
        const response = await axios.put(`${API_URL}/clients/${id}`, client);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/clients/${id}`);
    },

    getPayments: async (id: number): Promise<any[]> => {
        const response = await axios.get(`${API_URL}/clients/${id}/payments`);
        return response.data;
    },

    deletePayment: async (paymentId: number): Promise<void> => {
        await axios.delete(`${API_URL}/monthly-billing/${paymentId}`);
    },

    resetReminderStatus: async (phone: string): Promise<any> => {
        const response = await axios.post(`${API_URL}/interactions/reset-n8n-reminder`, { phone });
        return response.data;
    },
};
