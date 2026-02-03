import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Card,
    CardContent,
    Tooltip,
    Alert,
    TablePagination
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { InteractionService, Interaction, InteractionStatus, InteractionPriority, InteractionFilters } from '../../services/InteractionService';
import { InteractionTypeService, InteractionType } from '../../services/InteractionTypeService';
import { ClientService } from '../../services/ClientService';
import { TechnicianService } from '../../services/TechnicianService';
import { formatLocalDate, toInputDateString } from '../../utils/dateUtils';

export const InteractionManager: React.FC = () => {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [filteredInteractions, setFilteredInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Estados para formulario
    const [dialogOpen, setDialogOpen] = useState(false);
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form data
    const [formData, setFormData] = useState<Partial<any>>({
        interactionTypeId: undefined,
        status: 'pendiente',
        priority: 'media'
    });

    // Filtros
    const [filters, setFilters] = useState<InteractionFilters>({});

    // Catálogos
    const [clients, setClients] = useState<any[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [interactionTypes, setInteractionTypes] = useState<InteractionType[]>([]);
    const [technicianToAssign, setTechnicianToAssign] = useState<number | ''>('');

    // Estadísticas
    const [stats, setStats] = useState<any>(null);

    const loadInteractions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await InteractionService.getAll(filters);
            setInteractions(data);
            setFilteredInteractions(data);
        } catch (error) {
            console.error('Error cargando interacciones:', error);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    const loadStats = useCallback(async () => {
        try {
            const data = await InteractionService.getStats();
            setStats(data);
        } catch (error) {
            console.error('Error cargando estadísticas:', error);
        }
    }, []);

    const loadCatalogs = useCallback(async () => {
        try {
            const [clientsData, techniciansData, typesData] = await Promise.all([
                ClientService.getAll(),
                TechnicianService.getAll(),
                InteractionTypeService.getAll()
            ]);
            setClients(clientsData);
            setTechnicians(techniciansData);
            setInteractionTypes(typesData);
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    }, []);

    useEffect(() => {
        loadInteractions();
        loadStats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    useEffect(() => {
        loadCatalogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleOpenDialog = (interaction?: Interaction) => {
        if (interaction) {
            setIsEditing(true);
            setFormData({
                ...interaction,
                interactionTypeId: interaction.interactionType?.id
            });
            setSelectedInteraction(interaction);
        } else {
            setIsEditing(false);
            setFormData({
                status: 'pendiente',
                priority: 'media'
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setFormData({
            status: 'pendiente',
            priority: 'media'
        });
        setSelectedInteraction(null);
    };

    const handleClientChange = (clientId: number) => {
        setFormData({ ...formData, clientId });
    };

    const handleSubmit = async () => {
        try {
            if (isEditing && selectedInteraction) {
                await InteractionService.update(selectedInteraction.id, formData);
            } else {
                await InteractionService.create(formData);
            }
            handleCloseDialog();
            loadInteractions();
            loadStats();
        } catch (error) {
            console.error('Error guardando interacción:', error);
            alert('Error al guardar la interacción');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar esta interacción?')) {
            try {
                await InteractionService.delete(id);
                loadInteractions();
                loadStats();
            } catch (error) {
                console.error('Error eliminando interacción:', error);
            }
        }
    };

    const handleOpenDetail = (interaction: Interaction) => {
        setSelectedInteraction(interaction);
        setDetailDialogOpen(true);
    };

    const handleOpenAssignDialog = (interaction: Interaction) => {
        setSelectedInteraction(interaction);
        setTechnicianToAssign(interaction.assignedToTechnicianId || '');
        setAssignDialogOpen(true);
    };

    const handleAssignTechnician = async () => {
        if (!selectedInteraction || !technicianToAssign) return;
        try {
            await InteractionService.assignTechnician(selectedInteraction.id, technicianToAssign as number);
            setAssignDialogOpen(false);
            setTechnicianToAssign('');
            loadInteractions();
        } catch (error) {
            console.error('Error asignando técnico:', error);
        }
    };

    const getTypeLabel = (interaction: Interaction) => {
        return interaction.interactionType?.name || 'Clásico';
    };

    const getTypeColor = (interaction: Interaction): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        // Simple color mapping based on name or ID if needed, or return default
        const name = interaction.interactionType?.name.toLowerCase() || '';
        if (name.includes('daño') || name.includes('problema') || name.includes('urgente')) return 'error';
        if (name.includes('queja')) return 'warning';
        if (name.includes('solicitud')) return 'info';
        if (name.includes('visita')) return 'secondary';
        return 'primary';
    };

    const getStatusLabel = (status: InteractionStatus) => {
        const labels: Record<InteractionStatus, string> = {
            pendiente: 'Pendiente',
            en_progreso: 'En Progreso',
            completado: 'Completado',
            cancelado: 'Cancelado',
            pospuesto: 'Pospuesto'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status: InteractionStatus) => {
        const colors: Record<InteractionStatus, any> = {
            pendiente: 'warning',
            en_progreso: 'info',
            completado: 'success',
            cancelado: 'error',
            pospuesto: 'default'
        };
        return colors[status] || 'default';
    };

    const getPriorityLabel = (priority: InteractionPriority) => {
        const labels: Record<InteractionPriority, string> = {
            baja: 'Baja',
            media: 'Media',
            alta: 'Alta',
            urgente: 'Urgente'
        };
        return labels[priority] || priority;
    };

    const getPriorityColor = (priority: InteractionPriority) => {
        const colors: Record<InteractionPriority, any> = {
            baja: 'default',
            media: 'info',
            alta: 'warning',
            urgente: 'error'
        };
        return colors[priority] || 'default';
    };

    const paginatedInteractions = filteredInteractions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4">Gestión de Interacciones CRM</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Nueva Interacción
                </Button>
            </Box>

            {/* Estadísticas */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" variant="body2">Total</Typography>
                                <Typography variant="h5">{stats.total}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: 'warning.light' }}>
                            <CardContent>
                                <Typography color="white" variant="body2">Pendientes</Typography>
                                <Typography variant="h5" color="white">{stats.pendientes}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: 'info.light' }}>
                            <CardContent>
                                <Typography color="white" variant="body2">En Progreso</Typography>
                                <Typography variant="h5" color="white">{stats.enProgreso}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: 'success.light' }}>
                            <CardContent>
                                <Typography color="white" variant="body2">Completados</Typography>
                                <Typography variant="h5" color="white">{stats.completados}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={2.4}>
                        <Card sx={{ bgcolor: 'error.light' }}>
                            <CardContent>
                                <Typography color="white" variant="body2">Urgentes</Typography>
                                <Typography variant="h5" color="white">{stats.urgentes}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Filtros */}
            <Paper sx={{ p: 2, mb: 2 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Tipo</InputLabel>
                            <Select
                                value={filters.interactionTypeId || ''}
                                label="Tipo"
                                onChange={(e) => setFilters({ ...filters, interactionTypeId: e.target.value ? Number(e.target.value) : undefined })}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                {interactionTypes.map(type => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Estado</InputLabel>
                            <Select
                                value={filters.status || ''}
                                label="Estado"
                                onChange={(e) => setFilters({ ...filters, status: e.target.value as InteractionStatus || undefined })}
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="pendiente">Pendiente</MenuItem>
                                <MenuItem value="en_progreso">En Progreso</MenuItem>
                                <MenuItem value="completado">Completado</MenuItem>
                                <MenuItem value="cancelado">Cancelado</MenuItem>
                                <MenuItem value="pospuesto">Pospuesto</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Prioridad</InputLabel>
                            <Select
                                value={filters.priority || ''}
                                label="Prioridad"
                                onChange={(e) => setFilters({ ...filters, priority: e.target.value as InteractionPriority || undefined })}
                            >
                                <MenuItem value="">Todas</MenuItem>
                                <MenuItem value="baja">Baja</MenuItem>
                                <MenuItem value="media">Media</MenuItem>
                                <MenuItem value="alta">Alta</MenuItem>
                                <MenuItem value="urgente">Urgente</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Button
                            variant="outlined"
                            fullWidth
                            onClick={() => setFilters({})}
                        >
                            Limpiar Filtros
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabla */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#1976d2' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cliente</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Asunto</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Prioridad</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Técnico</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">Cargando...</TableCell>
                            </TableRow>
                        ) : paginatedInteractions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center">No hay interacciones registradas</TableCell>
                            </TableRow>
                        ) : (
                            paginatedInteractions.map((interaction, index) => (
                                <TableRow
                                    key={interaction.id}
                                    sx={{
                                        backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                        '&:hover': { backgroundColor: '#e3f2fd' }
                                    }}
                                >
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                            {interaction.client?.fullName || 'N/A'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {interaction.client?.primaryPhone || ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getTypeLabel(interaction)}
                                            color={getTypeColor(interaction)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{interaction.subject}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getStatusLabel(interaction.status)}
                                            color={getStatusColor(interaction.status)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={getPriorityLabel(interaction.priority)}
                                            color={getPriorityColor(interaction.priority)}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {interaction.assignedToTechnician?.name || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {formatLocalDate(interaction.created_at)}
                                    </TableCell>
                                    <TableCell align="center">
                                        <Tooltip title="Ver detalle">
                                            <IconButton size="small" onClick={() => handleOpenDetail(interaction)}>
                                                <VisibilityIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Asignar técnico">
                                            <IconButton size="small" color="primary" onClick={() => handleOpenAssignDialog(interaction)}>
                                                <AssignmentIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Editar">
                                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(interaction)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(interaction.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={filteredInteractions.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Filas por página:"
                />
            </TableContainer>

            {/* Dialog de creación/edición */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{isEditing ? 'Editar' : 'Nueva'} Interacción</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Cliente</InputLabel>
                                <Select
                                    value={formData.clientId || ''}
                                    label="Cliente"
                                    onChange={(e) => handleClientChange(e.target.value as number)}
                                >
                                    {clients.map(client => (
                                        <MenuItem key={client.id} value={client.id}>
                                            {client.fullName}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Tipo</InputLabel>
                                <Select
                                    value={formData.interactionTypeId || ''}
                                    label="Tipo"
                                    onChange={(e) => setFormData({ ...formData, interactionTypeId: e.target.value as number })}
                                >
                                    {interactionTypes.map(type => (
                                        <MenuItem key={type.id} value={type.id}>
                                            {type.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Prioridad</InputLabel>
                                <Select
                                    value={formData.priority || 'media'}
                                    label="Prioridad"
                                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as InteractionPriority })}
                                >
                                    <MenuItem value="baja">Baja</MenuItem>
                                    <MenuItem value="media">Media</MenuItem>
                                    <MenuItem value="alta">Alta</MenuItem>
                                    <MenuItem value="urgente">Urgente</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                label="Asunto"
                                value={formData.subject || ''}
                                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                multiline
                                rows={4}
                                label="Descripción"
                                value={formData.description || ''}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Estado</InputLabel>
                                <Select
                                    value={formData.status || 'pendiente'}
                                    label="Estado"
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as InteractionStatus })}
                                >
                                    <MenuItem value="pendiente">Pendiente</MenuItem>
                                    <MenuItem value="en_progreso">En Progreso</MenuItem>
                                    <MenuItem value="completado">Completado</MenuItem>
                                    <MenuItem value="cancelado">Cancelado</MenuItem>
                                    <MenuItem value="pospuesto">Pospuesto</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Fecha Programada"
                                type="date"
                                value={formData.scheduledDate || ''}
                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={2}
                                label="Notas adicionales"
                                value={formData.notes || ''}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        disabled={!formData.clientId || !formData.subject || !formData.description}
                    >
                        {isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de detalle */}
            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Detalle de Interacción</DialogTitle>
                <DialogContent>
                    {selectedInteraction && (
                        <Box sx={{ pt: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Cliente</Typography>
                                    <Typography variant="body1">{selectedInteraction.client?.fullName}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Teléfono</Typography>
                                    <Typography variant="body1">{selectedInteraction.client?.primaryPhone}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="subtitle2" color="textSecondary">Tipo</Typography>
                                    <Chip label={getTypeLabel(selectedInteraction)} color={getTypeColor(selectedInteraction)} size="small" />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="subtitle2" color="textSecondary">Estado</Typography>
                                    <Chip label={getStatusLabel(selectedInteraction.status)} color={getStatusColor(selectedInteraction.status)} size="small" />
                                </Grid>
                                <Grid item xs={12} sm={4}>
                                    <Typography variant="subtitle2" color="textSecondary">Prioridad</Typography>
                                    <Chip label={getPriorityLabel(selectedInteraction.priority)} color={getPriorityColor(selectedInteraction.priority)} size="small" />
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">Asunto</Typography>
                                    <Typography variant="body1">{selectedInteraction.subject}</Typography>
                                </Grid>
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="textSecondary">Descripción</Typography>
                                    <Typography variant="body2">{selectedInteraction.description}</Typography>
                                </Grid>
                                {selectedInteraction.assignedToTechnician && (
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="textSecondary">Técnico Asignado</Typography>
                                        <Typography variant="body1">{selectedInteraction.assignedToTechnician.name}</Typography>
                                    </Grid>
                                )}
                                {selectedInteraction.scheduledDate && (
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="textSecondary">Fecha Programada</Typography>
                                        <Typography variant="body1">{formatLocalDate(selectedInteraction.scheduledDate)}</Typography>
                                    </Grid>
                                )}
                                {selectedInteraction.completedDate && (
                                    <Grid item xs={12} sm={6}>
                                        <Typography variant="subtitle2" color="textSecondary">Fecha Completado</Typography>
                                        <Typography variant="body1">{formatLocalDate(selectedInteraction.completedDate)}</Typography>
                                    </Grid>
                                )}
                                {selectedInteraction.resolution && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="textSecondary">Resolución</Typography>
                                        <Alert severity="success">
                                            <Typography variant="body2">{selectedInteraction.resolution}</Typography>
                                        </Alert>
                                    </Grid>
                                )}
                                {selectedInteraction.notes && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="textSecondary">Notas</Typography>
                                        <Typography variant="body2">{selectedInteraction.notes}</Typography>
                                    </Grid>
                                )}
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Creado</Typography>
                                    <Typography variant="caption">{formatLocalDate(selectedInteraction.created_at)}</Typography>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Actualizado</Typography>
                                    <Typography variant="caption">{formatLocalDate(selectedInteraction.updated_at)}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de asignación de técnico */}
            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Asignar Técnico</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        {selectedInteraction && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Cliente:</strong> {selectedInteraction.client?.fullName}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Asunto:</strong> {selectedInteraction.subject}
                                </Typography>
                            </Alert>
                        )}
                        <FormControl fullWidth>
                            <InputLabel>Técnico</InputLabel>
                            <Select
                                value={technicianToAssign}
                                label="Técnico"
                                onChange={(e) => setTechnicianToAssign(e.target.value as number)}
                            >
                                <MenuItem value="">Sin asignar</MenuItem>
                                {technicians.map(tech => (
                                    <MenuItem key={tech.id} value={tech.id}>
                                        {tech.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAssignDialogOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleAssignTechnician}
                        variant="contained"
                        color="primary"
                        disabled={!technicianToAssign}
                    >
                        Asignar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
