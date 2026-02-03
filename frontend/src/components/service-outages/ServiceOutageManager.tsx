import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  TextField,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  MenuItem,
  IconButton,
  Tooltip,
  Autocomplete,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
import { ServiceOutageService, ServiceOutage, CreateServiceOutageData } from '../../services/ServiceOutageService';
import { ClientService } from '../../services/ClientService';
import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

interface Client {
  id: number;
  fullName: string;
}

interface Installation {
  id: number;
  installationAddress: string;
  monthlyFee: number;
  servicePlan: {
    name: string;
  };
}

const ServiceOutageManager: React.FC = () => {
  const [outages, setOutages] = useState<ServiceOutage[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'applied' | 'cancelled'>('all');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<CreateServiceOutageData>({
    clientId: 0,
    installationId: 0,
    startDate: '',
    endDate: '',
    reason: '',
    notes: '',
  });

  const [previewDays, setPreviewDays] = useState<number>(0);
  const [previewDiscount, setPreviewDiscount] = useState<number>(0);

  useEffect(() => {
    loadOutages();
    loadClients();
  }, [statusFilter]);

  useEffect(() => {
    if (formData.clientId > 0) {
      loadInstallations(formData.clientId);
    } else {
      setInstallations([]);
      setFormData((prev) => ({ ...prev, installationId: 0 }));
    }
  }, [formData.clientId]);

  useEffect(() => {
    // Calcular preview cuando cambian fechas o instalación
    if (formData.startDate && formData.endDate && formData.installationId > 0) {
      const installation = installations.find((i) => i.id === formData.installationId);
      if (installation) {
        const days = ServiceOutageService.calculateDays(formData.startDate, formData.endDate);
        const discount = ServiceOutageService.calculateDiscount(
          installation.monthlyFee,
          formData.startDate,
          formData.endDate
        );
        setPreviewDays(days);
        setPreviewDiscount(discount);
      }
    } else {
      setPreviewDays(0);
      setPreviewDiscount(0);
    }
  }, [formData.startDate, formData.endDate, formData.installationId, installations]);

  const loadOutages = async () => {
    try {
      const filters = statusFilter !== 'all' ? { status: statusFilter } : undefined;
      const data = await ServiceOutageService.list(filters);
      setOutages(data);
    } catch (err) {
      setError('Error al cargar caídas de servicio');
    }
  };

  const loadClients = async () => {
    try {
  const data = await ClientService.getAll();
      setClients(data);
    } catch (err) {
      setError('Error al cargar clientes');
    }
  };

  const loadInstallations = async (clientId: number) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/installations/client/${clientId}`);
      setInstallations(response.data);
    } catch (err) {
      console.error('Error loading installations:', err);
      setError('Error al cargar instalaciones del cliente');
    }
  };

  const handleOpenDialog = () => {
    setFormData({
      clientId: 0,
      installationId: 0,
      startDate: '',
      endDate: '',
      reason: '',
      notes: '',
    });
    setPreviewDays(0);
    setPreviewDiscount(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleSubmit = async () => {
    try {
      setError('');

      if (!formData.clientId || !formData.installationId || !formData.startDate || !formData.endDate) {
        setError('Cliente, instalación y fechas son obligatorios');
        return;
      }

      if (new Date(formData.startDate) > new Date(formData.endDate)) {
        setError('La fecha de inicio debe ser menor o igual a la fecha fin');
        return;
      }

      await ServiceOutageService.create(formData);
      setSuccess('Caída de servicio registrada exitosamente');
      handleCloseDialog();
      loadOutages();
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar caída de servicio');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('¿Está seguro de eliminar esta caída de servicio?')) {
      return;
    }

    try {
      await ServiceOutageService.delete(id);
      setSuccess('Caída de servicio eliminada');
      loadOutages();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar caída de servicio');
    }
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'error' => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'applied':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'applied':
        return 'Aplicado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestión de Caídas de Servicio</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
          Registrar Caída
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label="Filtrar por Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="pending">Pendientes</MenuItem>
              <MenuItem value="applied">Aplicados</MenuItem>
              <MenuItem value="cancelled">Cancelados</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Instalación</TableCell>
              <TableCell>Fecha Inicio</TableCell>
              <TableCell>Fecha Fin</TableCell>
              <TableCell align="center">Días</TableCell>
              <TableCell align="right">Descuento</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Razón</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {outages.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  No hay caídas de servicio registradas
                </TableCell>
              </TableRow>
            ) : (
              outages.map((outage) => (
                <TableRow key={outage.id}>
                  <TableCell>{outage.client?.fullName || `Cliente #${outage.clientId}`}</TableCell>
                  <TableCell>
                    {outage.installation?.installationAddress || `Instalación #${outage.installationId}`}
                  </TableCell>
                  <TableCell>{new Date(outage.startDate).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell>{new Date(outage.endDate).toLocaleDateString('es-CO')}</TableCell>
                  <TableCell align="center">{outage.days}</TableCell>
                  <TableCell align="right">${outage.discountAmount.toLocaleString('es-CO')}</TableCell>
                  <TableCell>
                    <Chip label={getStatusLabel(outage.status)} color={getStatusColor(outage.status)} size="small" />
                  </TableCell>
                  <TableCell>
                    {outage.reason && (
                      <Tooltip title={outage.reason}>
                        <IconButton size="small">
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {outage.status === 'pending' && (
                      <IconButton size="small" color="error" onClick={() => handleDelete(outage.id)}>
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear nueva caída */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>Registrar Caída de Servicio</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <Autocomplete
                options={clients}
                getOptionLabel={(option) => option.fullName}
                value={clients.find((c) => c.id === formData.clientId) || null}
                onChange={(_, newValue) => {
                  setFormData({ ...formData, clientId: newValue ? newValue.id : 0 });
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Cliente *"
                    fullWidth
                    placeholder="Buscar cliente..."
                  />
                )}
                noOptionsText="No se encontraron clientes"
                isOptionEqualToValue={(option, value) => option.id === value.id}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                select
                fullWidth
                label="Instalación *"
                value={formData.installationId}
                onChange={(e) => setFormData({ ...formData, installationId: parseInt(e.target.value) })}
                disabled={installations.length === 0}
              >
                <MenuItem value={0}>-- Seleccione una instalación --</MenuItem>
                {installations.map((installation) => (
                  <MenuItem key={installation.id} value={installation.id}>
                    {installation.installationAddress} - {installation.servicePlan.name} ($
                    {installation.monthlyFee.toLocaleString('es-CO')})
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Inicio *"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="date"
                label="Fecha Fin *"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {previewDays > 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  <strong>Días sin servicio:</strong> {previewDays} días <br />
                  <strong>Descuento a aplicar:</strong> ${previewDiscount.toLocaleString('es-CO')}
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Razón de la caída"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Ej: Daño en fibra óptica, falla eléctrica, etc."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Notas adicionales"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            Registrar Caída
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiceOutageManager;
