import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface Technician {
    id: number;
    name: string;
    phone?: string;
    email?: string;
    isActive?: boolean;
}

export const TechnicianService = {
    getAll: async () => {
        const res = await axios.get(`${API_URL}/technicians`);
        return res.data;
    },
    getById: async (id: number) => {
        const res = await axios.get(`${API_URL}/technicians/${id}`);
        return res.data;
    },
    create: async (payload: Partial<Technician>) => {
        const res = await axios.post(`${API_URL}/technicians`, payload);
        return res.data;
    },
    update: async (id: number, payload: Partial<Technician>) => {
        const res = await axios.put(`${API_URL}/technicians/${id}`, payload);
        return res.data;
    },
    delete: async (id: number) => {
        const res = await axios.delete(`${API_URL}/technicians/${id}`);
        return res.data;
    }
};
