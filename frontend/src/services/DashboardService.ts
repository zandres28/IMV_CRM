import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/dashboard`;

export interface DashboardStats {
    clients: {
        week: number;
        month: number;
        year: number;
        total: number;
        active: number;
        suspended: number;
        cancelled: number;
    };
    services: {
        netflix: number;
        tvBox: number;
        teleLatino: number;
    };
    revenue: {
        week: number;
        month: number;
        year: number;
        breakdown: {
            servicePlan: number;
            installations: number;
            additionalServices: number;
            products: number;
        };
    };
    retiros: {
        month: number;
        year: number;
        total: number;
    };
}

export const DashboardService = {
    getStats: async (month?: number, year?: number): Promise<DashboardStats> => {
        const params: any = {};
        if (month !== undefined) params.month = month;
        if (year !== undefined) params.year = year;
        
        const response = await axios.get(`${API_URL}/stats`, { params });
        return response.data;
    }
};
