import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
// Base URL for static files (remove /api suffix)
const BASE_URL = API_URL.replace('/api', '');

export interface PromotionImage {
    id: number;
    filename: string;
    path: string; // Relative path from server root (e.g. /uploads/promotions/...)
    description?: string;
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

    upload: async (file: File, description: string): Promise<PromotionImage> => {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('description', description);

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
    },
    
    // Helper to get full URL
    getImageUrl: (relativePath: string) => {
        if (relativePath.startsWith('http')) return relativePath;
        return `${BASE_URL}${relativePath}`;
    }
};
