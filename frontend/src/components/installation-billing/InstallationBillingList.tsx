import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  TextField,
  MenuItem,
  Grid,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Payment as PaymentIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import InstallationBillingService, {
  InstallationPayment,
  InstallationBillingStats,
  MarkPaidRequest,
} from '../../services/InstallationBillingService';

const InstallationBillingList: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState<InstallationPayment[]>([]);
  const [statistics, setStatistics] = useState<InstallationBillingStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Parse filters from URL
  const urlMonth = searchParams.get('month');
  const urlYear = searchParams.get('year');

  const [filters, setFilters] = useState({
    month: urlMonth || '', // Assuming '' means all? or needs a default? The original was ''
    year: urlYear ? parseInt(urlYear) : new Date().getFullYear(),
    status: '',
  });
  const [selectedPayment, setSelectedPayment] = useState<InstallationPayment | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState<{
    paymentDate: string;
    paymentMethod: string;
    notes: string;
  }>({
    paymentDate: '',
    paymentMethod: '',
    notes: '',
  });
  const [paymentData, setPaymentData] = useState<MarkPaidRequest>({
    paymentMethod: 'efectivo',
    paymentDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadPayments();
  }, [filters]);

  const loadPayments = async () => {
    try {
      setLoading(true);
      const response = await InstallationBillingService.getPayments(filters);
      setPayments(response.payments);
      setStatistics(response.statistics);
    } catch (error) {
      console.error('Error al cargar pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (payment: InstallationPayment) => {
    try {
      const detail = await InstallationBillingService.getPaymentDetail(payment.id);
      setSelectedPayment(detail);
      setDetailDialogOpen(true);
    } catch (error) {
      console.error('Error al cargar detalle:', error);
    }
  };

  const handleOpenEditDialog = (payment: InstallationPayment) => {
    setSelectedPayment(payment);
    setEditData({
      paymentDate: payment.paymentDate ? new Date(payment.paymentDate).toISOString().split('T')[0] : '',
      paymentMethod: payment.paymentMethod || 'efectivo',
      notes: payment.notes || '',
    });
    setEditDialogOpen(true);
  };

  const handleUpdatePayment = async () => {
    if (!selectedPayment) return;

    try {
      await InstallationBillingService.updatePayment(selectedPayment.id, editData);
      setEditDialogOpen(false);
      loadPayments();
    } catch (error) {
      console.error('Error al actualizar pago:', error);
    }
  };

  const handleOpenPayDialog = (payment: InstallationPayment) => {
    setSelectedPayment(payment);
    setPayDialogOpen(true);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedPayment) return;

    try {
      await InstallationBillingService.markAsPaid(selectedPayment.id, paymentData);
      setPayDialogOpen(false);
      setPaymentData({
        paymentMethod: 'efectivo',
        paymentDate: new Date().toISOString().split('T')[0],
      });
      loadPayments();
    } catch (error) {
      console.error('Error al marcar como pagado:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'pending':
        return 'warning';
      case 'overdue':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pagado';
      case 'pending':
        return 'Pendiente';
      case 'overdue':
        return 'Vencido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Pagos de Instalación</Typography>
        <Button variant="contained" startIcon={<AddIcon />} disabled>
          Nuevo Pago Manual
        </Button>
      </Box>

      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Total Pagos
                </Typography>
                <Typography variant="h5">{statistics.total}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Pagados
                </Typography>
                <Typography variant="h5" color="success.main">
                  {statistics.paid}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Monto Total
                </Typography>
                <Typography variant="h5">{formatCurrency(statistics.totalAmount)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>
                  Monto Pagado
                </Typography>
                <Typography variant="h5" color="success.main">
                  {formatCurrency(statistics.paidAmount)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Mes"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="enero">Enero</MenuItem>
              <MenuItem value="febrero">Febrero</MenuItem>
              <MenuItem value="marzo">Marzo</MenuItem>
              <MenuItem value="abril">Abril</MenuItem>
              <MenuItem value="mayo">Mayo</MenuItem>
              <MenuItem value="junio">Junio</MenuItem>
              <MenuItem value="julio">Julio</MenuItem>
              <MenuItem value="agosto">Agosto</MenuItem>
              <MenuItem value="septiembre">Septiembre</MenuItem>
              <MenuItem value="octubre">Octubre</MenuItem>
              <MenuItem value="noviembre">Noviembre</MenuItem>
              <MenuItem value="diciembre">Diciembre</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              type="number"
              label="Año"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Estado"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="paid">Pagado</MenuItem>
              <MenuItem value="pending">Pendiente</MenuItem>
              <MenuItem value="overdue">Vencido</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadPayments}
              disabled={loading}
            >
              Actualizar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Payments Table */}
      <TableContainer component={Paper}>
        <Table>
            <TableHead>
                <TableRow>
                  <TableCell>Cliente</TableCell>
              <TableCell>Servicio</TableCell>
              <TableCell>Fecha Pago</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell>
                  <Typography variant="body2">{payment.client.fullName}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {payment.client.identificationNumber}
                  </Typography>
                </TableCell>
                <TableCell>
                  {payment.installation.serviceType} - {payment.installation.speedMbps} Mbps
                </TableCell>
                <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                <TableCell>{formatCurrency(payment.amount)}</TableCell>
                <TableCell>{payment.paymentMethod || '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={getStatusLabel(payment.status)}
                    color={getStatusColor(payment.status)}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleViewDetail(payment)}
                    title="Ver detalle"
                  >
                    <VisibilityIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    color="info"
                    onClick={() => handleOpenEditDialog(payment)}
                    title="Editar pago"
                  >
                    <EditIcon />
                  </IconButton>
                  {payment.status === 'pending' && (
                    <IconButton
                      size="small"
                      color="success"
                      onClick={() => handleOpenPayDialog(payment)}
                      title="Marcar como pagado"
                    >
                      <PaymentIcon />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="textSecondary" sx={{ py: 3 }}>
                    No se encontraron pagos de instalación
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Detalle del Pago de Instalación</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Cliente
                </Typography>
                <Typography variant="body1">{selectedPayment.client.fullName}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Identificación
                </Typography>
                <Typography variant="body1">{selectedPayment.client.identificationNumber}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Teléfono
                </Typography>
                <Typography variant="body1">{selectedPayment.client.primaryPhone}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Dirección
                </Typography>
                <Typography variant="body1">{selectedPayment.client.installationAddress}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Servicio
                </Typography>
                <Typography variant="body1">
                  {selectedPayment.installation.serviceType} - {selectedPayment.installation.speedMbps} Mbps
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Fecha Instalación
                </Typography>
                <Typography variant="body1">{formatDate(selectedPayment.installation.installationDate)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Fecha Pago
                </Typography>
                <Typography variant="body1">{formatDate(selectedPayment.paymentDate)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Monto
                </Typography>
                <Typography variant="body1">{formatCurrency(selectedPayment.amount)}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Método de Pago
                </Typography>
                <Typography variant="body1">{selectedPayment.paymentMethod || '-'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="textSecondary">
                  Estado
                </Typography>
                <Chip
                  label={getStatusLabel(selectedPayment.status)}
                  color={getStatusColor(selectedPayment.status)}
                  size="small"
                />
              </Grid>
              {selectedPayment.notes && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Notas
                  </Typography>
                  <Typography variant="body1">{selectedPayment.notes}</Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Pago de Instalación</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Cliente: {selectedPayment.client.fullName}
              </Typography>
              
              <TextField
                fullWidth
                type="date"
                label="Fecha de Pago"
                value={editData.paymentDate}
                onChange={(e) => setEditData({ ...editData, paymentDate: e.target.value })}
                sx={{ mt: 2 }}
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={editData.paymentMethod}
                  label="Método de Pago"
                  onChange={(e) => setEditData({ ...editData, paymentMethod: e.target.value })}
                >
                    <MenuItem value=""><em>Seleccione...</em></MenuItem>
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="nequi">Nequi</MenuItem>
                  <MenuItem value="daviplata">Daviplata</MenuItem>
                  <MenuItem value="bancolombia">Bancolombia</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>

              <TextField 
                fullWidth
                multiline
                rows={3}
                label="Notas"
                value={editData.notes}
                onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                sx={{ mt: 2 }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleUpdatePayment} variant="contained" color="primary">
            Guardar Cambios
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={payDialogOpen} onClose={() => setPayDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Marcar como Pagado</DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Cliente: {selectedPayment.client.fullName}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Monto: {formatCurrency(selectedPayment.amount)}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>Método de Pago</InputLabel>
                <Select
                  value={paymentData.paymentMethod}
                  label="Método de Pago"
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                >
                  <MenuItem value="efectivo">Efectivo</MenuItem>
                  <MenuItem value="transferencia">Transferencia</MenuItem>
                  <MenuItem value="nequi">Nequi</MenuItem>
                  <MenuItem value="daviplata">Daviplata</MenuItem>
                  <MenuItem value="bancolombia">Bancolombia</MenuItem>
                  <MenuItem value="otro">Otro</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                type="date"
                label="Fecha de Pago"
                value={paymentData.paymentDate}
                onChange={(e) => setPaymentData({ ...paymentData, paymentDate: e.target.value })}
                sx={{ mt: 2 }}
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPayDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleMarkAsPaid} variant="contained" color="success">
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InstallationBillingList;
