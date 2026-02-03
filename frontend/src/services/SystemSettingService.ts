import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const SystemSettingService = {
    getAll: async (): Promise<any[]> => {
        const response = await axios.get(`${API_URL}/settings`);
        return response.data;
    },

    getSetting: async (key: string): Promise<any> => {
        const response = await axios.get(`${API_URL}/settings/${key}`);
        return response.data;
    },

    updateSetting: async (key: string, value: string): Promise<any> => {
        const response = await axios.put(`${API_URL}/settings/${key}`, { value });
        return response.data;
    }
};
