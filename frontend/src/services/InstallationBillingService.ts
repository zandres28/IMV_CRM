import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface InstallationPayment {
  id: number;
  paymentDate: string;
  amount: number;
  paymentMonth: string;
  paymentYear: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  paymentType: 'monthly' | 'installation' | 'other';
  externalId?: string;
  paymentMethod?: string;
  installationFeeAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  client: {
    id: number;
    fullName: string;
    identificationNumber: string;
    primaryPhone: string;
    installationAddress: string;
  };
  installation: {
    id: number;
    serviceType: string;
    speedMbps: number;
    installationDate: string;
    serviceStatus: string;
  };
}

export interface InstallationBillingStats {
  total: number;
  paid: number;
  pending: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
}

export interface InstallationBillingResponse {
  payments: InstallationPayment[];
  statistics: InstallationBillingStats;
}

export interface InstallationBillingFilters {
  month?: string;
  year?: number;
  status?: string;
}

export interface MarkPaidRequest {
  paymentMethod: string;
  paymentDate?: string;
}

export interface CreateManualPaymentRequest {
  clientId: number;
  installationId: number;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  notes?: string;
}

class InstallationBillingService {
  async getPayments(filters?: InstallationBillingFilters): Promise<InstallationBillingResponse> {
    const params = new URLSearchParams();
    if (filters?.month) params.append('month', filters.month);
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.status) params.append('status', filters.status);

    const response = await axios.get(`${API_URL}/installation-billing?${params.toString()}`);
    return response.data;
  }

  async getPaymentDetail(id: number): Promise<InstallationPayment> {
    const response = await axios.get(`${API_URL}/installation-billing/${id}`);
    return response.data;
  }

  async markAsPaid(id: number, data: MarkPaidRequest): Promise<InstallationPayment> {
    const response = await axios.put(`${API_URL}/installation-billing/${id}/pay`, data);
    return response.data;
  }

  async createManualPayment(data: CreateManualPaymentRequest): Promise<InstallationPayment> {
    const response = await axios.post(`${API_URL}/installation-billing/manual`, data);
    return response.data;
  }
}

export default new InstallationBillingService();
