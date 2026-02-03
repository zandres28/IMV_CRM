import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Chip,
    Button,
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
    Alert,
    Tooltip,
    IconButton,
    Card,
    CardContent,
    Stack
} from '@mui/material';
import {
    Add as AddIcon,
    Build as BuildIcon,
    ReportProblem as ReportIcon,
    Phone as PhoneIcon,
    Home as VisitIcon,
    HelpOutline as QueryIcon,
    Warning as ComplaintIcon,
    Edit as EditIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { InteractionService, Interaction, InteractionStatus, InteractionPriority } from '../../services/InteractionService';
import { InteractionTypeService, InteractionType } from '../../services/InteractionTypeService';
import { TechnicianService } from '../../services/TechnicianService';
import { formatLocalDate } from '../../utils/dateUtils';

interface ClientInteractionHistoryProps {
    clientId: number;
}

export const ClientInteractionHistory: React.FC<ClientInteractionHistoryProps> = ({ clientId }) => {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedInteraction, setSelectedInteraction] = useState<Interaction | null>(null);
    const [formData, setFormData] = useState<Partial<Interaction> & { interactionTypeId?: number }>({
        interactionTypeId: undefined,
        status: 'pendiente',
        priority: 'media',
        clientId
    });

    const [technicians, setTechnicians] = useState<any[]>([]);
    const [interactionTypes, setInteractionTypes] = useState<InteractionType[]>([]);
    const [stats, setStats] = useState({ total: 0, pendientes: 0, completados: 0 });

    const loadInteractions = useCallback(async () => {
        setLoading(true);
        try {
            const data = await InteractionService.getByClient(clientId);
            setInteractions(data);
            
            // Calcular stats
            const pendientes = data.filter(i => i.status === 'pendiente' || i.status === 'en_progreso').length;
            const completados = data.filter(i => i.status === 'completado').length;
            setStats({ total: data.length, pendientes, completados });
        } catch (error) {
            console.error('Error cargando interacciones:', error);
        } finally {
            setLoading(false);
        }
    }, [clientId]);

    const loadCatalogs = useCallback(async () => {
        try {
            const [techniciansData, typesData] = await Promise.all([
                TechnicianService.getAll(),
                InteractionTypeService.getAll()
            ]);
            setTechnicians(techniciansData);
            setInteractionTypes(typesData);
        } catch (error) {
            console.error('Error cargando catálogos:', error);
        }
    }, []);

    useEffect(() => {
        loadInteractions();
        loadCatalogs();
    }, [loadInteractions, loadCatalogs]);

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
                interactionTypeId: undefined,
                status: 'pendiente',
                priority: 'media',
                clientId
            });
        }
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setFormData({
            interactionTypeId: undefined,
            status: 'pendiente',
            priority: 'media',
            clientId
        });
        setSelectedInteraction(null);
    };

    const handleSubmit = async () => {
        try {
            if (isEditing && selectedInteraction) {
                await InteractionService.update(selectedInteraction.id, formData);
            } else {
                await InteractionService.create({ ...formData, clientId });
            }
            handleCloseDialog();
            loadInteractions();
        } catch (error) {
            console.error('Error guardando interacción:', error);
            alert('Error al guardar la interacción');
        }
    };

    const getTypeIcon = (interaction: Interaction) => {
        const name = interaction.interactionType?.name.toLowerCase() || '';
        if (name.includes('mantenimiento')) return <BuildIcon />;
        if (name.includes('daño') || name.includes('problema')) return <ReportIcon />;
        if (name.includes('llamada')) return <PhoneIcon />;
        if (name.includes('visita')) return <VisitIcon />;
        if (name.includes('queja')) return <ComplaintIcon />;
        return <QueryIcon />;
    };

    const getTypeColor = (interaction: Interaction): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        const name = interaction.interactionType?.name.toLowerCase() || '';
        if (name.includes('mantenimiento')) return 'primary';
        if (name.includes('daño') || name.includes('urgente')) return 'error';
        if (name.includes('solicitud')) return 'info';
        if (name.includes('visita')) return 'secondary';
        if (name.includes('queja')) return 'warning';
        return 'default';
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

    const getStatusColor = (status: InteractionStatus): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
        const colors: Record<InteractionStatus, "warning" | "info" | "success" | "error" | "default"> = {
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

    const getTypeLabel = (interaction: Interaction) => {
        return interaction.interactionType?.name || 'Desconocido';
    };

    return (
        <Box>
            {/* Estadísticas */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <Card>
                        <CardContent>
                            <Typography color="textSecondary" variant="body2">Total Interacciones</Typography>
                            <Typography variant="h4">{stats.total}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'warning.light' }}>
                        <CardContent>
                            <Typography color="white" variant="body2">Pendientes</Typography>
                            <Typography variant="h4" color="white">{stats.pendientes}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Card sx={{ bgcolor: 'success.light' }}>
                        <CardContent>
                            <Typography color="white" variant="body2">Completados</Typography>
                            <Typography variant="h4" color="white">{stats.completados}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6">Historial de Interacciones</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Nueva Interacción
                </Button>
            </Box>

            {loading ? (
                <Typography>Cargando...</Typography>
            ) : interactions.length === 0 ? (
                <Alert severity="info">No hay interacciones registradas para este cliente</Alert>
            ) : (
                <Stack spacing={2}>
                    {interactions
                        .slice()
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .map((interaction) => (
                            <Paper key={interaction.id} elevation={2} sx={{ p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        {getTypeIcon(interaction)}
                                        <Typography variant="overline" color="textSecondary">
                                            {formatLocalDate(interaction.created_at)}
                                        </Typography>
                                        {interaction.scheduledDate && (
                                            <Chip size="small" label={`Prog: ${formatLocalDate(interaction.scheduledDate)}`} variant="outlined" color="info" />
                                        )}
                                    </Box>
                                    <Tooltip title="Editar">
                                        <IconButton size="small" onClick={() => handleOpenDialog(interaction)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 1 }}>
                                    {interaction.subject}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    <Chip label={getTypeLabel(interaction)} size="small" color={getTypeColor(interaction)} />
                                    <Chip label={getStatusLabel(interaction.status)} size="small" color={getStatusColor(interaction.status)} />
                                    <Chip label={getPriorityLabel(interaction.priority)} size="small" variant="outlined" />
                                </Box>
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    {interaction.description}
                                </Typography>
                                {interaction.assignedToTechnician && (
                                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <AssignmentIcon fontSize="small" color="action" />
                                        <Typography variant="caption" color="textSecondary">
                                            Técnico: {interaction.assignedToTechnician.name}
                                        </Typography>
                                    </Box>
                                )}
                                {interaction.resolution && (
                                    <Alert severity="success" sx={{ mt: 2 }}>
                                        <Typography variant="caption">
                                            <strong>Resolución:</strong> {interaction.resolution}
                                        </Typography>
                                    </Alert>
                                )}
                                {interaction.notes && (
                                    <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block', fontStyle: 'italic' }}>
                                        Notas: {interaction.notes}
                                    </Typography>
                                )}
                            </Paper>
                        ))}
                </Stack>
            )}

            {/* Dialog de creación/edición */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{isEditing ? 'Editar' : 'Nueva'} Interacción</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
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
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel>Técnico Asignado</InputLabel>
                                <Select
                                    value={formData.assignedToTechnicianId || ''}
                                    label="Técnico Asignado"
                                    onChange={(e) => setFormData({ ...formData, assignedToTechnicianId: e.target.value as number })}
                                >
                                    <MenuItem value="">Sin asignar</MenuItem>
                                    {technicians.map(tech => (
                                        <MenuItem key={tech.id} value={tech.id}>
                                            {tech.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        {formData.status === 'completado' && (
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={3}
                                    label="Resolución"
                                    value={formData.resolution || ''}
                                    onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                                />
                            </Grid>
                        )}
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
                        disabled={!formData.interactionTypeId || !formData.subject || !formData.description}
                    >
                        {isEditing ? 'Actualizar' : 'Crear'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
