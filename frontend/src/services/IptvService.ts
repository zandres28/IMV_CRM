import axios from 'axios';
import { Client } from '../types/Client';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface IptvLineStatus {
    exists: boolean;
    active: boolean;
    expDate?: string;
    maxConnections?: number;
    activeCons?: number;
    error?: string;
}

export interface IptvStatusResponse {
    client: Client;
    panelStatus: IptvLineStatus;
}

export const IptvService = {
    create: async (clientId: number, expDate?: string): Promise<{ message: string; client: Client }> => {
        const response = await axios.post(`${API_URL}/iptv/${clientId}/create`, { expDate });
        return response.data;
    },

    status: async (clientId: number): Promise<IptvStatusResponse> => {
        const response = await axios.get(`${API_URL}/iptv/${clientId}/status`);
        return response.data;
    },

    disable: async (clientId: number): Promise<{ message: string; client: Client }> => {
        const response = await axios.post(`${API_URL}/iptv/${clientId}/disable`);
        return response.data;
    },

    enable: async (clientId: number): Promise<{ message: string; client: Client }> => {
        const response = await axios.post(`${API_URL}/iptv/${clientId}/enable`);
        return response.data;
    },

    remove: async (clientId: number): Promise<{ message: string; client: Client }> => {
        const response = await axios.delete(`${API_URL}/iptv/${clientId}`);
        return response.data;
    },

    generateUsername: async (fullName: string): Promise<{ username: string }> => {
        const response = await axios.post(`${API_URL}/iptv/generate-username`, { fullName });
        return response.data;
    },
};