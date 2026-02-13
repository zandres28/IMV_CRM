import React, { useEffect, useMemo, useState } from 'react';
import { Box, Paper, Typography, TextField, MenuItem, Button, Grid, Chip, Stack, Alert, CircularProgress } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { ReportService, ReportRow, ReportSummary, ReportType } from '../../services/ReportService';
import DownloadIcon from '@mui/icons-material/Download';
import { ServicePlanService, ServicePlan } from '../../services/ServicePlanService';
import { formatLocalDate } from '../../utils/dateUtils';

export default function QueryDashboard() {
  const [reportType, setReportType] = useState<ReportType>('account_status');
  const [clientStatus, setClientStatus] = useState<'active' | 'inactive' | 'all'>('active');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'completed' | 'all'>('all');
  const [reminderType, setReminderType] = useState<'PROXIMO' | 'VENCIMIENTO' | 'RECORDATORIO' | 'ULTIMO' | 'all'>('all');
  const [search, setSearch] = useState('');
  const [planId, setPlanId] = useState<number | 'all'>('all');
  const [plans, setPlans] = useState<ServicePlan[]>([]);
  const [serviceType, setServiceType] = useState<'all' | 'service' | 'product'>('all');

  const [rows, setRows] = useState<ReportRow[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [totalRows, setTotalRows] = useState(0);

  useEffect(() => {
    // Cargar planes activos para el filtro
    ServicePlanService.getActive()
      .then(setPlans)
      .catch((e) => console.error('Error cargando planes', e));
  }, []);

  // Limpiar filtros al cambiar tipo de reporte
  useEffect(() => {
    onClear(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  const columns = useMemo<GridColDef<ReportRow>[]>(() => {
    if (reportType === 'retired') {
      return [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'fullName', headerName: 'Nombre', flex: 1, minWidth: 200 },
        { field: 'primaryPhone', headerName: 'Teléfono', width: 120 },
        { field: 'city', headerName: 'Ciudad', width: 150 },
        {
          field: 'retirementDate',
          headerName: 'F. Retiro',
          width: 130,
          renderCell: (params) => formatLocalDate(params.value)
        },
        { field: 'retirementReason', headerName: 'Motivo', flex: 1, minWidth: 200 },
        {
          field: 'installationDate',
          headerName: 'Instalado',
          width: 130,
          renderCell: (params) => params.value ? formatLocalDate(params.value) : '-'
        },
      ];
    }

    if (reportType === 'services') {
      return [
        { field: 'id', headerName: 'ID', width: 90 },
        { field: 'fullName', headerName: 'Nombre', flex: 1, minWidth: 200 },
        { field: 'primaryPhone', headerName: 'Teléfono', width: 120 },
        { field: 'city', headerName: 'Ciudad', width: 150 },
        { field: 'servicesList', headerName: 'Servicios Adicionales', flex: 1.5, minWidth: 250 },
        {
          field: 'totalAdditional',
          headerName: 'Total Extra',
          width: 130,
          valueFormatter: (params: any) => {
            const val = params?.value as number | undefined;
            return typeof val === 'number' ? `$${val.toLocaleString('es-CO')}` : '$0';
          }
        },
      ];
    }

    // Default: account_status
    return [
      { field: 'id', headerName: 'ID Cliente', width: 120 },
      { field: 'fullName', headerName: 'Nombre', flex: 1, minWidth: 220 },
      { field: 'primaryPhone', headerName: 'Teléfono', width: 150 },
      { field: 'plan', headerName: 'Plan', width: 180 },
      {
        field: 'monthlyFee',
        headerName: 'Valor Plan',
        width: 110,
        valueFormatter: (params: any) => {
          const val = params?.value as number | undefined;
          return typeof val === 'number' ? `$${val.toLocaleString('es-CO')}` : '$0';
        }
      },
      {
        field: 'additional',
        headerName: 'Adicional',
        width: 100,
        valueFormatter: (params: any) => {
          const val = params?.value as number | undefined;
          return typeof val === 'number' ? `$${val.toLocaleString('es-CO')}` : '$0';
        }
      },
      {
        field: 'totalMensual',
        headerName: 'Total',
        width: 110,
        valueFormatter: (params: any) => {
          const val = params?.value as number | undefined;
          return typeof val === 'number' ? `$${val.toLocaleString('es-CO')}` : '$0';
        }
      },
      { field: 'paymentStatus', headerName: 'Pago', width: 110 },
      { field: 'daysDue', headerName: 'Días', width: 70 },
      {
        field: 'reminderType', headerName: 'Tipo', width: 130, renderCell: (params: GridRenderCellParams) => {
          const color = params.value === 'ULTIMO' ? 'error' : params.value === 'VENCIMIENTO' ? 'warning' : 'default';
          return <Chip label={params.value} size="small" color={color} />;
        }
      },
    ];
  }, [reportType]);

  const onSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await ReportService.search({
        reportType,
        clientStatus: reportType === 'retired' ? undefined : clientStatus,
        paymentStatus: reportType === 'account_status' ? paymentStatus : undefined,
        reminderType: reportType === 'account_status' ? reminderType : undefined,
        search,
        planId: planId === 'all' ? undefined : Number(planId),
        serviceType: reportType === 'services' ? serviceType : undefined,
        page: page + 1,
        pageSize
      });
      setRows(result.data);
      setSummary(result.summary);
      setTotalRows(result.pagination.total);
    } catch (err) {
      setError('Error al buscar datos. Por favor intenta de nuevo.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const onClear = (clearType = true) => {
    if (clearType) setReportType('account_status');
    setClientStatus('active');
    setPaymentStatus('all');
    setPaymentStatus('all');
    setReminderType('all');
    setServiceType('all');
    setSearch('');
    setRows([]);
    setSummary(null);
    setPage(0);
  };

  const onExport = () => {
    if (rows.length > 0) {
      ReportService.exportCSV(rows, reportType);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Consultas y Reportes</Typography>

      {summary && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: '#f5f5f5' }}>
          <Grid container spacing={2}>

            {/* Resumen para Estado de Cuenta */}
            {reportType === 'account_status' && (
              <>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Total Clientes</Typography>
                  <Typography variant="h6">{summary.totalFiltered}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Morosos</Typography>
                  <Typography variant="h6" color="error">{summary.morosos}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Ingresos Esperados</Typography>
                  <Typography variant="h6">${summary.expectedRevenue?.toLocaleString('es-CO')}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Recaudado</Typography>
                  <Typography variant="h6" color="success.main">${summary.collectedRevenue?.toLocaleString('es-CO')}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Promedio Días Mora</Typography>
                  <Typography variant="h6">{summary.averageDaysDue}</Typography>
                </Grid>
                <Grid item xs={6} md={2}>
                  <Typography variant="caption" color="text.secondary">Monto en Mora</Typography>
                  <Typography variant="h6" color="error">${(summary.arrearsAmount ?? 0).toLocaleString('es-CO')}</Typography>
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip label={`Próximo: ${summary.reminderCounts?.PROXIMO ?? 0}`} size="small" />
                    <Chip label={`Vencimiento: ${summary.reminderCounts?.VENCIMIENTO ?? 0}`} size="small" color="warning" />
                    <Chip label={`Recordatorio: ${summary.reminderCounts?.RECORDATORIO ?? 0}`} size="small" />
                    <Chip label={`Último: ${summary.reminderCounts?.ULTIMO ?? 0}`} size="small" color="error" />
                  </Stack>
                </Grid>
              </>
            )}

            {/* Resumen para Retirados */}
            {reportType === 'retired' && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">Total Clientes Retirados</Typography>
                <Typography variant="h6">{summary.totalFiltered}</Typography>
              </Grid>
            )}

            {/* Resumen para Servicios Adicionales */}
            {reportType === 'services' && (
              <>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Clientes con Servicios Extra</Typography>
                  <Typography variant="h6">{summary.totalFiltered}</Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="caption" color="text.secondary">Ingreso Adicional Mensual</Typography>
                  <Typography variant="h6" color="success.main">${(summary.totalRevenue ?? 0).toLocaleString('es-CO')}</Typography>
                </Grid>
              </>
            )}

          </Grid>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">

          {/* Selector de Tipo de Reporte */}
          <Grid item xs={12}>
            <TextField
              select
              fullWidth
              label="Tipo de Reporte"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              sx={{ mb: 1, bgcolor: '#e3f2fd' }}
            >
              <MenuItem value="account_status">Estado de Cuenta (Cobranza)</MenuItem>
              <MenuItem value="retired">Clientes Retirados</MenuItem>
              <MenuItem value="services">Servicios Adicionales y Productos</MenuItem>
            </TextField>
          </Grid>

          {/* Filtros para Servicios Adicionales */}
          {reportType === 'services' && (
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                label="Tipo de Extra"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value as any)}
                sx={{ bgcolor: '#fff' }}
              >
                <MenuItem value="all">Todos</MenuItem>
                <MenuItem value="service">Solo Servicios</MenuItem>
                <MenuItem value="product">Solo Productos</MenuItem>
              </TextField>
            </Grid>
          )}

          {/* Filtros para Estado de Cuenta */}
          {reportType === 'account_status' && (
            <>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Estado cliente" value={clientStatus} onChange={(e) => setClientStatus(e.target.value as any)}>
                  <MenuItem value="active">Activo</MenuItem>
                  <MenuItem value="inactive">Inactivo</MenuItem>
                  <MenuItem value="all">Todos</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Estado pago" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as any)}>
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="pending">Pendiente</MenuItem>
                  <MenuItem value="completed">Pagado</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Plan" value={planId} onChange={(e) => setPlanId((e.target.value === 'all' ? 'all' : Number(e.target.value)) as any)}>
                  <MenuItem value="all">Todos</MenuItem>
                  {plans.map((p) => (
                    <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField select fullWidth label="Tipo recordatorio" value={reminderType} onChange={(e) => setReminderType(e.target.value as any)}>
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="PROXIMO">Próximo</MenuItem>
                  <MenuItem value="VENCIMIENTO">Vencimiento</MenuItem>
                  <MenuItem value="RECORDATORIO">Recordatorio</MenuItem>
                  <MenuItem value="ULTIMO">Último</MenuItem>
                </TextField>
              </Grid>
            </>
          )}

          <Grid item xs={12} md={reportType === 'account_status' ? 12 : 6}>
            <TextField fullWidth label="Buscar (nombre, teléfono, ID)" value={search} onChange={(e) => setSearch(e.target.value)} />
          </Grid>

          <Grid item xs={12}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={onSearch} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Buscar'}
              </Button>
              <Button variant="outlined" onClick={() => onClear(true)}>Limpiar</Button>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onExport} disabled={rows.length === 0}>
                Exportar CSV
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ height: 520 }}>
        <DataGrid
          rows={rows}
          columns={columns}
          disableRowSelectionOnClick
          pageSizeOptions={[25, 50, 100]}
          paginationMode="server"
          rowCount={totalRows}
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(model: any) => {
            setPage(model.page);
            setPageSize(model.pageSize);
          }}
          loading={loading}
          getRowId={(row: any) => row.id}
        />
      </Paper>
    </Box>
  );
}
