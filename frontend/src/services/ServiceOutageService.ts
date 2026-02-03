import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ServiceOutage {
  id: number;
  clientId: number;
  installationId: number;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  discountAmount: number;
  status: 'pending' | 'applied' | 'cancelled';
  appliedToPaymentId?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  client?: any;
  installation?: any;
}

export interface CreateServiceOutageData {
  clientId: number;
  installationId: number;
  startDate: string;
  endDate: string;
  reason?: string;
  notes?: string;
}

export interface ServiceOutageFilters {
  clientId?: number;
  status?: 'pending' | 'applied' | 'cancelled' | 'all';
  startDate?: string;
  endDate?: string;
}

export interface PendingDiscountsResponse {
  outages: ServiceOutage[];
  totalDiscount: number;
  count: number;
}

export class ServiceOutageService {
  /**
   * Crear nueva caída de servicio
   */
  static async create(data: CreateServiceOutageData): Promise<ServiceOutage> {
    const response = await axios.post(`${API_BASE_URL}/service-outages`, data);
    return response.data;
  }

  /**
   * Listar caídas de servicio con filtros
   */
  static async list(filters?: ServiceOutageFilters): Promise<ServiceOutage[]> {
    const params = new URLSearchParams();
    
    if (filters?.clientId) {
      params.append('clientId', filters.clientId.toString());
    }
    
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    
    if (filters?.startDate) {
      params.append('startDate', filters.startDate);
    }
    
    if (filters?.endDate) {
      params.append('endDate', filters.endDate);
    }

    const response = await axios.get(`${API_BASE_URL}/service-outages?${params.toString()}`);
    return response.data;
  }

  /**
   * Obtener una caída de servicio por ID
   */
  static async getById(id: number): Promise<ServiceOutage> {
    const response = await axios.get(`${API_BASE_URL}/service-outages/${id}`);
    return response.data;
  }

  /**
   * Actualizar una caída de servicio
   */
  static async update(id: number, data: Partial<CreateServiceOutageData>): Promise<ServiceOutage> {
    const response = await axios.put(`${API_BASE_URL}/service-outages/${id}`, data);
    return response.data;
  }

  /**
   * Eliminar una caída de servicio
   */
  static async delete(id: number): Promise<void> {
    await axios.delete(`${API_BASE_URL}/service-outages/${id}`);
  }

  /**
   * Marcar caída como aplicada
   */
  static async markAsApplied(id: number, appliedToPaymentId: number): Promise<ServiceOutage> {
    const response = await axios.post(`${API_BASE_URL}/service-outages/${id}/apply`, {
      appliedToPaymentId
    });
    return response.data;
  }

  /**
   * Obtener descuentos pendientes de un cliente
   */
  static async getPendingDiscounts(clientId: number): Promise<PendingDiscountsResponse> {
    const response = await axios.get(`${API_BASE_URL}/service-outages/client/${clientId}/pending`);
    return response.data;
  }

  /**
   * Calcular días entre dos fechas (helper para preview)
   */
  static calculateDays(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }

  /**
   * Calcular descuento prorrateado (helper para preview)
   */
  static calculateDiscount(monthlyFee: number, startDate: string, endDate: string): number {
    const days = this.calculateDays(startDate, endDate);
    const start = new Date(startDate);
    const year = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const discountAmount = (monthlyFee / daysInMonth) * days;
    return Math.round(discountAmount);
  }
}
