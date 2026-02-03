import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface ReportSearchParams {
  clientStatus?: 'active' | 'inactive' | 'all';
  paymentStatus?: 'pending' | 'completed' | 'all';
  reminderType?: 'PROXIMO' | 'VENCIMIENTO' | 'RECORDATORIO' | 'ULTIMO' | 'all';
  search?: string;
  page?: number;
  pageSize?: number;
  planId?: number;
}

export interface ReportRow {
  id: string;
  clientId: number;
  fullName: string;
  primaryPhone: string;
  secondaryPhone: string;
  plan: string;
  speedMbps: number;
  monthlyFee: number;
  additional: number;
  totalMensual: number;
  paymentStatus: string;
  daysDue: number;
  reminderType: string;
  installationId: number;
  installationDate: string | null;
}

export interface ReportSummary {
  totalClients: number;
  totalFiltered: number;
  morosos: number;
  expectedRevenue: number;
  collectedRevenue: number;
  averageDaysDue: number;
  arrearsAmount?: number;
  arpuExpected?: number;
  collectionRate?: number; // porcentaje 0-100
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

  exportCSV: (rows: ReportRow[]): void => {
    const headers = [
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

    const csvRows = [headers.join(',')];
    
    rows.forEach(row => {
      const values = [
        row.id,
        `"${row.fullName}"`,
        row.primaryPhone,
        row.secondaryPhone,
        `"${row.plan}"`,
        row.speedMbps,
        row.monthlyFee,
        row.additional,
        row.totalMensual,
        row.paymentStatus,
        row.daysDue,
        row.reminderType,
        row.installationDate || ''
      ];
      csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
