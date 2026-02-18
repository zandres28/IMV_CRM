import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/dashboard`;

export interface DashboardStats {
    growth: {
        newClientsMonth: number;
        newClientsYTD: number;
        totalActiveClients: number;
        netGrowth: number;
        growthRate: number;
        signupsByPlan: { name: string; value: number }[];
    };
    retention: {
        retiredClientsMonth: number;
        churnRate: number;
        churnYTD: number;
        retirementReasons: { name: string; value: number }[];
        retirementsByPlan: { name: string; value: number }[];
    };
    finance: {
        monthlyBilling: number;
        yearlyBilling: number;
        arpu: number;
        projectedRevenue: number;
    };
    collection: {
        realCollection: number; // Recaudo real
        collectionEfficiency: number; // %
        totalOverdue: number; // Cartera vencida total
        portfolioByAge: {
            range0_30: number;
            range31_60: number;
            range61_90: number;
            range90_plus: number;
        };
        clientsInDefault: number;
    };
    operations: {
        installationsMonth: number;
    };
    history: {
        growth: {
            month: string;
            newClients: number;
            retiredClients: number;
            netGrowth: number;
        }[];
        revenue: {
            month: string;
            billed: number;
            collected: number;
        }[];
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
