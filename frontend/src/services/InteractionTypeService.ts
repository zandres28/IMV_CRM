import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/interaction-types`;

export interface InteractionType {
    id: number;
    name: string;
    description: string;
    isSystem: boolean;
    created_at: string;
}

export const InteractionTypeService = {
    getAll: async (): Promise<InteractionType[]> => {
        const response = await axios.get(API_URL);
        return response.data;
    },

    create: async (data: { name: string; description: string }): Promise<InteractionType> => {
        const response = await axios.post(API_URL, data);
        return response.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/${id}`);
    }
};
