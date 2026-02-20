import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface PromotionImage {
    filename: string;
    url: string;
    createdAt: string;
    size: number;
}

export const PromotionService = {
    getAll: async (): Promise<PromotionImage[]> => {
        const response = await axios.get(`${API_URL}/promotions`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    },

    upload: async (file: File): Promise<PromotionImage> => {
        const formData = new FormData();
        formData.append('image', file);

        const response = await axios.post(`${API_URL}/promotions/upload`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
        return response.data;
    },

    delete: async (filename: string): Promise<void> => {
        await axios.delete(`${API_URL}/promotions/${filename}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });
    }
};
