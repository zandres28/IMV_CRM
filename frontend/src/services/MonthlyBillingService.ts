import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/monthly-billing`;
const ROOT_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface Payment {
    id: number;
    reminderSent?: boolean; // Nuevo campo
    client: {
        id: number;
        fullName: string;
        identificationNumber: string;
        primaryPhone: string;
        installations?: {
            id: number;
            serviceType: string;
            speedMbps: number;
            isActive: boolean;
            servicePlan?: {
                name: string;
                speedMbps: number;
            };
            installationDate: string;
        }[];
        additionalServices?: {
            id: number;
            name: string;
            cost: number;
            status: string;
        }[];
        productsSold?: {
            id: number;
            productName: string;
            status: string;
            installmentPayments?: {
                id: number;
                installmentNumber: number;
                amount: number;
                dueDate: string;
                status: string;
                paymentDate?: string;
            }[];
        }[];
    };
    installation?: {
        id: number;
        serviceType: string;
        speedMbps: number;
        servicePlan?: {
            name: string;
        };
        installationDate: string;
    };
    amount: number;
    paymentDate?: string;
    paymentMonth: string;
    paymentYear: number;
    dueDate: string;
    status: 'pending' | 'paid' | 'overdue' | 'cancelled';
    paymentType: 'monthly' | 'installation' | 'other';
    paymentMethod?: 'efectivo' | 'nequi' | 'bancolombia' | 'daviplata' | 'transferencia' | 'otro';
    servicePlanAmount: number;
    additionalServicesAmount: number;
    productInstallmentsAmount: number;
    productFutureInstallmentsAmount?: number;
    productFutureInstallmentsCount?: number;
    isProrated: boolean;
    billedDays?: number;
    totalDaysInMonth?: number;
    notes?: string;
    created_at: string;
}

export interface BillingStats {
    total: number;
    pending: number;
    paid: number;
    overdue: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    totalServicePlan: number;
    totalAdditionalServices: number;
    totalProducts: number;
    totalInstallationFees: number;
}

export interface MonthlyBillingResponse {
    payments: Payment[];
    stats: BillingStats;
}

const MonthlyBillingService = {
    // Generar cobros mensuales
    generateMonthlyBilling: async (month: string, year: number) => {
        const response = await axios.post(`${API_URL}/generate`, { month, year });
        return response.data;
    },

    // Obtener cobros del mes
    getMonthlyBilling: async (month: string, year: number, status?: string, viewMode?: 'month' | 'cumulative'): Promise<MonthlyBillingResponse> => {
        const params: any = { month, year };
        if (status) params.status = status;
        if (viewMode) params.viewMode = viewMode;
        const response = await axios.get(API_URL, { params });
        return response.data;
    },

    // Obtener detalle de un pago
    getPaymentDetail: async (id: number): Promise<Payment> => {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data;
    },

    // Registrar un pago
    registerPayment: async (id: number, data: {
        paymentDate?: string;
        paymentMethod: string;
        amount?: number;
        notes?: string;
        extraInstallmentIds?: number[];
    }) => {
        const response = await axios.put(`${API_URL}/${id}/pay`, data);
        return response.data;
    },

    // Actualizar estado de un pago
    updatePaymentStatus: async (id: number, status: string, notes?: string) => {
        const response = await axios.put(`${API_URL}/${id}/status`, { status, notes });
        return response.data;
    },

    // Marcar pagos vencidos
    markOverduePayments: async () => {
        const response = await axios.post(`${API_URL}/mark-overdue`);
        return response.data;
    },

    // Obtener pagos pendientes de un cliente
    getClientPendingPayments: async (clientId: number) => {
        const response = await axios.get(`${API_URL}/client/${clientId}/pending`);
        return response.data;
    },

    // Marcar pagos en lote como pagados
    bulkMarkPaid: async (payload: { clientIds: number[]; month?: string; year?: number; paymentMethod?: string; paymentDate?: string; }) => {
        const response = await axios.post(`${API_URL}/bulk/mark-paid`, payload);
        return response.data;
    },

    setReminderStatus: async (clientIds: number[], sent: boolean): Promise<any> => {
        const response = await axios.post(`${ROOT_API_URL}/interactions/set-reminder-status`, { clientIds, sent });
        return response.data;
    }
};

export default MonthlyBillingService;
