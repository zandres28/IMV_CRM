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
  Checkbox,
  ToggleButton,
  ToggleButtonGroup,
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
  ponId?: string;
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
  const [ponIdFilter, setPonIdFilter] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [selectedOutageIds, setSelectedOutageIds] = useState<number[]>([]);
  const [registerMode, setRegisterMode] = useState<'single' | 'pon'>('single');
  const [ponOptions, setPonOptions] = useState<string[]>([]);

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
  const [ponMassiveFormData, setPonMassiveFormData] = useState({
    ponId: '',
    startDate: '',
    endDate: '',
    reason: '',
    notes: '',
  });
  const [ponPreview, setPonPreview] = useState<{
    ponId: string;
    totalInstallations: number;
    totalClients: number;
    sampleClients: string[];
  } | null>(null);
  const [loadingPonPreview, setLoadingPonPreview] = useState(false);

  useEffect(() => {
    loadOutages();
  }, [statusFilter, ponIdFilter]);

  useEffect(() => {
    loadClients();
    loadPonOptions();
  }, []);

  useEffect(() => {
    const visibleIds = new Set(outages.map((outage) => outage.id));
    setSelectedOutageIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [outages]);

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
      const filters: any = {};

      if (statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      if (ponIdFilter.trim()) {
        filters.ponId = ponIdFilter.trim();
      }

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

  const loadPonOptions = async () => {
    try {
      const data = await ServiceOutageService.getPonOptions();
      setPonOptions(data || []);
    } catch (err) {
      console.warn('No se pudieron cargar los PON IDs para registro masivo', err);
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
    setRegisterMode('single');
    setFormData({
      clientId: 0,
      installationId: 0,
      startDate: '',
      endDate: '',
      reason: '',
      notes: '',
    });
    setPonMassiveFormData({
      ponId: '',
      startDate: '',
      endDate: '',
      reason: '',
      notes: '',
    });
    setPonPreview(null);
    setPreviewDays(0);
    setPreviewDiscount(0);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setError('');
  };

  const handleSubmit = async () => {
    if (registerMode === 'pon') {
      await handleSubmitByPon();
      return;
    }

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

  const handleSubmitByPon = async () => {
    try {
      setError('');

      if (!ponMassiveFormData.ponId.trim()) {
        setError('Debe seleccionar o escribir un PON ID para la caída masiva');
        return;
      }

      if (!ponMassiveFormData.startDate || !ponMassiveFormData.endDate) {
        setError('Fecha de inicio y fecha fin son obligatorias');
        return;
      }

      if (!ponMassiveFormData.reason.trim()) {
        setError('La razón de la caída es obligatoria para el registro masivo');
        return;
      }

      if (new Date(ponMassiveFormData.startDate) > new Date(ponMassiveFormData.endDate)) {
        setError('La fecha de inicio debe ser menor o igual a la fecha fin');
        return;
      }

      const response = await ServiceOutageService.bulkCreateByPon({
        ponId: ponMassiveFormData.ponId.trim(),
        startDate: ponMassiveFormData.startDate,
        endDate: ponMassiveFormData.endDate,
        reason: ponMassiveFormData.reason,
        notes: ponMassiveFormData.notes,
      });

      setSuccess(
        `PON ${response.ponId}: ${response.createdCount} caída(s) creada(s), ${response.skippedCount} omitida(s)`
      );
      handleCloseDialog();
      loadOutages();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar caída masiva por PON');
    }
  };

  const handlePreviewByPon = async () => {
    try {
      setError('');

      const ponId = ponMassiveFormData.ponId.trim();
      if (!ponId) {
        setError('Debe seleccionar o escribir un PON ID para ver el preview');
        return;
      }

      setLoadingPonPreview(true);
      const data = await ServiceOutageService.previewByPon(ponId);
      setPonPreview(data);
    } catch (err: any) {
      setPonPreview(null);
      setError(err.response?.data?.error || 'Error al consultar preview por PON');
    } finally {
      setLoadingPonPreview(false);
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

  const toggleOutageSelection = (outageId: number) => {
    setSelectedOutageIds((prev) =>
      prev.includes(outageId)
        ? prev.filter((id) => id !== outageId)
        : [...prev, outageId]
    );
  };

  const handleSelectAllPending = (checked: boolean) => {
    if (checked) {
      const pendingIds = outages
        .filter((outage) => outage.status === 'pending')
        .map((outage) => outage.id);
      setSelectedOutageIds(pendingIds);
      return;
    }

    setSelectedOutageIds([]);
  };

  const handleBulkDelete = async () => {
    try {
      setError('');

      if (selectedOutageIds.length === 0) {
        setError('Seleccione al menos un registro pendiente para eliminar');
        return;
      }

      const confirmDelete = window.confirm(
        `¿Está seguro de eliminar ${selectedOutageIds.length} registro(s) seleccionados?`
      );
      if (!confirmDelete) {
        return;
      }

      await ServiceOutageService.bulkDelete(selectedOutageIds);
      setSuccess(`Se eliminaron ${selectedOutageIds.length} registro(s) seleccionados`);
      setSelectedOutageIds([]);
      loadOutages();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al eliminar registros en bloque');
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

  const pendingOutages = outages.filter((outage) => outage.status === 'pending');
  const allPendingSelected = pendingOutages.length > 0 && pendingOutages.every((outage) => selectedOutageIds.includes(outage.id));
  const somePendingSelected = pendingOutages.some((outage) => selectedOutageIds.includes(outage.id));

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
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Filtrar por PON ID"
              placeholder="Ej: 0/0/2"
              value={ponIdFilter}
              onChange={(e) => setPonIdFilter(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="error"
              fullWidth
              onClick={handleBulkDelete}
              disabled={selectedOutageIds.length === 0}
            >
              Eliminar seleccionados ({selectedOutageIds.length})
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={somePendingSelected && !allPendingSelected}
                  checked={allPendingSelected}
                  onChange={(e) => handleSelectAllPending(e.target.checked)}
                  inputProps={{ 'aria-label': 'Seleccionar todos los registros pendientes' }}
                />
              </TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Instalación</TableCell>
              <TableCell>PON ID</TableCell>
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
                <TableCell colSpan={11} align="center">
                  No hay caídas de servicio registradas
                </TableCell>
              </TableRow>
            ) : (
              outages.map((outage) => (
                <TableRow key={outage.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedOutageIds.includes(outage.id)}
                      onChange={() => toggleOutageSelection(outage.id)}
                      disabled={outage.status !== 'pending'}
                      inputProps={{ 'aria-label': `Seleccionar caída ${outage.id}` }}
                    />
                  </TableCell>
                  <TableCell>{outage.client?.fullName || `Cliente #${outage.clientId}`}</TableCell>
                  <TableCell>
                    {outage.installation?.installationAddress || `Instalación #${outage.installationId}`}
                  </TableCell>
                  <TableCell>{outage.installation?.ponId || '-'}</TableCell>
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
              <ToggleButtonGroup
                value={registerMode}
                exclusive
                onChange={(_, mode) => {
                  if (!mode) {
                    return;
                  }
                  setRegisterMode(mode);
                  setError('');
                }}
                size="small"
              >
                <ToggleButton value="single">Por Cliente</ToggleButton>
                <ToggleButton value="pon">Masiva por PON</ToggleButton>
              </ToggleButtonGroup>
            </Grid>

            {registerMode === 'single' ? (
              <>
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
              </>
            ) : (
              <>
                <Grid item xs={12}>
                  <Autocomplete
                    freeSolo
                    options={ponOptions}
                    value={ponMassiveFormData.ponId}
                    onInputChange={(_, value) => {
                      setPonMassiveFormData((prev) => ({ ...prev, ponId: value }));
                      setPonPreview(null);
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="PON ID *"
                        fullWidth
                        placeholder="Ej: 0/0/2"
                        helperText="Se registrará la caída para todos los clientes activos de este PON"
                      />
                    )}
                    noOptionsText="Sin PONs disponibles"
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    onClick={handlePreviewByPon}
                    disabled={loadingPonPreview || !ponMassiveFormData.ponId.trim()}
                  >
                    {loadingPonPreview ? 'Consultando preview...' : 'Ver preview de afectados'}
                  </Button>
                </Grid>

                {ponPreview && (
                  <Grid item xs={12}>
                    <Alert severity="info">
                      <strong>PON:</strong> {ponPreview.ponId} <br />
                      <strong>Instalaciones activas afectadas:</strong> {ponPreview.totalInstallations} <br />
                      <strong>Clientes únicos afectados:</strong> {ponPreview.totalClients}
                      {ponPreview.sampleClients.length > 0 && (
                        <>
                          <br />
                          <strong>Muestra:</strong> {ponPreview.sampleClients.join(', ')}
                        </>
                      )}
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha Inicio *"
                    value={ponMassiveFormData.startDate}
                    onChange={(e) => setPonMassiveFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Fecha Fin *"
                    value={ponMassiveFormData.endDate}
                    onChange={(e) => setPonMassiveFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Razón de la caída *"
                    value={ponMassiveFormData.reason}
                    onChange={(e) => setPonMassiveFormData((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="Ej: Falla masiva en tarjeta OLT"
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Notas adicionales"
                    value={ponMassiveFormData.notes}
                    onChange={(e) => setPonMassiveFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </Grid>
              </>
            )}
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
            {registerMode === 'pon' ? 'Registrar Caída Masiva por PON' : 'Registrar Caída'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
};

export default ServiceOutageManager;
