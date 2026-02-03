export interface AdditionalService {
    id: number;
    clientId: number;
    serviceName: string;
    monthlyFee: number;
    startDate: string;
    endDate?: string;
    status: 'active' | 'inactive';
    notes?: string;
    created_at: string;
    updated_at: string;
}

export interface ProductSold {
    id: number;
    clientId: number;
    productName: string;
    totalAmount: number;
    installments: number;
    installmentAmount: number;
    saleDate: string;
    status: 'pending' | 'completed';
    notes?: string;
    created_at: string;
    updated_at: string;
    installmentPayments: ProductInstallment[];
}

export interface ProductInstallment {
    id: number;
    productId: number;
    installmentNumber: number;
    amount: number;
    dueDate: string;
    paymentDate?: string;
    status: 'pending' | 'completed';
    notes?: string;
    created_at: string;
}