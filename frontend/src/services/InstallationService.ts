import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface Installation {
    id: number;
    client?: {
        id: number;
    };
    clientId?: number;
    servicePlanId?: number;
    servicePlan?: {
        id: number;
        name: string;
        speedMbps: number;
        monthlyFee: number;
    };
    serviceType: string;
    speedMbps: number;
    routerModel?: string;
    onuSerialNumber?: string;
    ponId?: string;
    onuId?: string;
    ipAddress?: string;
    technician: string;
    notes?: string;
    monthlyFee: number;
    installationFee?: number;
    serviceStatus: 'active' | 'suspended' | 'cancelled';
    installationDate: string;
    retirementDate?: string;
    isActive: boolean;
    isDeleted?: boolean;
    deletedAt?: string | null;
    speedHistory?: SpeedHistory[];
}

export interface SpeedHistory {
    id: number;
    previousSpeed: number;
    newSpeed: number;
    reason?: string;
    changeDate: string;
}

export const InstallationService = {
    create: async (installation: Partial<Installation>) => {
        const response = await axios.post(`${API_URL}/installations`, installation);
        return response.data;
    },

    getByClient: async (clientId: number, opts?: { includeDeleted?: boolean }) => {
        const includeDeleted = opts?.includeDeleted ? 'true' : 'false';
        const response = await axios.get(`${API_URL}/installations/client/${clientId}?includeDeleted=${includeDeleted}`);
        return response.data;
    },

    update: async (id: number, installation: Partial<Installation>) => {
        const response = await axios.put(`${API_URL}/installations/${id}`, installation);
        return response.data;
    },

    getSpeedHistory: async (installationId: number) => {
        const response = await axios.get(`${API_URL}/installations/${installationId}/speed-history`);
        return response.data;
    },

    changeStatus: async (id: number, serviceStatus: 'active' | 'suspended' | 'cancelled') => {
        const response = await axios.patch(`${API_URL}/installations/${id}/status`, { serviceStatus });
        return response.data;
    },

    delete: async (id: number) => {
        const response = await axios.delete(`${API_URL}/installations/${id}`);
        return response.data;
    },

    restore: async (id: number) => {
        const response = await axios.patch(`${API_URL}/installations/${id}/restore`);
        return response.data;
    }
};