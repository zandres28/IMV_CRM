import axios from 'axios';
import { AdditionalService } from '../types/AdditionalServices';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const AdditionalServiceService = {
    create: async (service: Partial<AdditionalService>) => {
        const response = await axios.post(`${API_URL}/additional-services`, service);
        return response.data;
    },

    getByClient: async (clientId: number) => {
        const response = await axios.get(`${API_URL}/additional-services/client/${clientId}`);
        return response.data;
    },

    update: async (id: number, service: Partial<AdditionalService>) => {
        const response = await axios.put(`${API_URL}/additional-services/${id}`, service);
        return response.data;
    },

    delete: async (id: number) => {
        await axios.delete(`${API_URL}/additional-services/${id}`);
    }
};