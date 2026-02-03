import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ServicePlan {
    id: number;
    name: string;
    speedMbps: number;
    monthlyFee: number;
    installationFee: number;
    isActive: boolean;
}

export const ServicePlanService = {
    getAll: async () => {
        const res = await axios.get(`${API_URL}/service-plans`);
        return res.data;
    },
    getActive: async () => {
        const res = await axios.get(`${API_URL}/service-plans/active`);
        return res.data;
    },
    getById: async (id: number) => {
        const res = await axios.get(`${API_URL}/service-plans/${id}`);
        return res.data;
    },
    create: async (payload: Partial<ServicePlan>) => {
        const res = await axios.post(`${API_URL}/service-plans`, payload);
        return res.data;
    },
    update: async (id: number, payload: Partial<ServicePlan>) => {
        const res = await axios.put(`${API_URL}/service-plans/${id}`, payload);
        return res.data;
    },
    delete: async (id: number) => {
        const res = await axios.delete(`${API_URL}/service-plans/${id}`);
        return res.data;
    }
};
