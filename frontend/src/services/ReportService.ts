import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export type ReportType = 'account_status' | 'retired' | 'services';

export interface ReportSearchParams {
  clientStatus?: 'active' | 'inactive' | 'all';
  paymentStatus?: 'pending' | 'completed' | 'all';
  reminderType?: 'PROXIMO' | 'VENCIMIENTO' | 'RECORDATORIO' | 'ULTIMO' | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
  planId?: number;
  reportType?: ReportType;
  serviceType?: 'all' | 'service' | 'product';
}

export interface ReportRow {
  id: string;
  clientId: number;
  fullName: string;
  primaryPhone: string;
  secondaryPhone?: string;
  plan?: string;
  speedMbps?: number;
  monthlyFee?: number;
  additional?: number;
  totalMensual?: number;
  paymentStatus?: string;
  daysDue?: number;
  reminderType?: string;
  installationId?: number;
  installationDate?: string | null;
  // Campos para reporte de retirados
  retirementDate?: string | null;
  retirementReason?: string;
  // Campos para reporte de servicios
  servicesList?: string;
  totalAdditional?: number;
  city?: string;
}

export interface ReportSummary {
  totalClients?: number;
  totalFiltered: number;
  morosos?: number;
  expectedRevenue?: number;
  collectedRevenue?: number;
  averageDaysDue?: number;
  arrearsAmount?: number;
  arpuExpected?: number;
  collectionRate?: number; // porcentaje 0-100
  totalRevenue?: number; // Para servicios adicionales
  reminderCounts?: {
    PROXIMO: number;
    VENCIMIENTO: number;
    RECORDATORIO: number;
    ULTIMO: number;
  };
}

export interface ReportResponse {
  data: ReportRow[];
  summary: ReportSummary;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
}

export const ReportService = {
  search: async (params: ReportSearchParams): Promise<ReportResponse> => {
    const response = await axios.get<ReportResponse>(`${API_URL}/reports/search`, { params });
    return response.data;
  },

  exportCSV: (rows: ReportRow[], type: ReportType = 'account_status'): void => {
    let headers: string[] = [];
    let fields: (keyof ReportRow)[] = [];

    if (type === 'retired') {
      headers = ['ID', 'Nombre', 'Teléfono', 'Ciudad', 'Fecha Retiro', 'Motivo', 'Fecha Instalación'];
      // fields manual mapping below
    } else if (type === 'services') {
      headers = ['ID', 'Nombre', 'Teléfono', 'Ciudad', 'Servicios', 'Total Adicional'];
    } else {
      headers = [
        'ID Cliente',
        'Nombre',
        'Teléfono 1',
        'Teléfono 2',
        'Plan',
        'Velocidad',
        'Valor Plan',
        'Adicional',
        'Total Mensual',
        'Estado Pago',
        'Días Mora',
        'Tipo Recordatorio',
        'Fecha Instalación'
      ];
    }

    const csvRows = [headers.join(',')];

    rows.forEach(row => {
      let values: any[] = [];

      if (type === 'retired') {
        values = [
          row.id,
          `"${row.fullName}"`,
          row.primaryPhone,
          row.city || '',
          row.retirementDate || '',
          `"${row.retirementReason || ''}"`,
          row.installationDate || ''
        ];
      } else if (type === 'services') {
        values = [
          row.id,
          `"${row.fullName}"`,
          row.primaryPhone,
          row.city || '',
          `"${row.servicesList || ''}"`,
          row.totalAdditional || 0
        ];
      } else {
        values = [
          row.id,
          `"${row.fullName}"`,
          row.primaryPhone,
          row.secondaryPhone || '',
          `"${row.plan || ''}"`,
          row.speedMbps || 0,
          row.monthlyFee || 0,
          row.additional || 0,
          row.totalMensual || 0,
          row.paymentStatus || '',
          row.daysDue || 0,
          row.reminderType || '',
          row.installationDate || ''
        ];
      }
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
