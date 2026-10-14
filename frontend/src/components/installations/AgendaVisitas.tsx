import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Snackbar,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    Cancel as CancelIcon,
    CheckCircle as CheckCircleIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Event as EventIcon,
    LocationOn as LocationIcon,
    Notes as NotesIcon,
    Person as PersonIcon,
    Phone as PhoneIcon,
    PlayArrow as PlayIcon,
} from '@mui/icons-material';
import AuthService from '../../services/AuthService';
import { ClientService } from '../../services/ClientService';
import { TechnicianService, Technician } from '../../services/TechnicianService';
import {
    TechnicalVisit,
    TechnicalVisitPayload,
    TechnicalVisitService,
    TechnicalVisitStatus,
    TechnicalVisitType,
} from '../../services/TechnicalVisitService';
import { Client } from '../../types/Client';

// ── Constantes ────────────────────────────────────────────────────────────
const TIME_SLOTS = [
    '8:00 am a 10:00 am',
    '10:00 am a 12:00 m',
    '2:00 pm a 4:00 pm',
    '4:00 pm a 6:00 pm',
];

const VISIT_TYPE_LABELS: Record<TechnicalVisitType, string> = {
    instalacion: 'Instalación',
    soporte: 'Soporte',
    mantenimiento: 'Mantenimiento',
    reparacion: 'Reparación',
    traslado: 'Traslado',
    otro: 'Otro',
};

const STATUS_META: Record<TechnicalVisitStatus, { label: string; color: string; bg: string }> = {
    programada: { label: 'Programada', color: '#3DA5F5', bg: 'rgba(61,165,245,0.14)' },
    en_progreso: { label: 'En Progreso', color: '#F0A23A', bg: 'rgba(240,162,58,0.16)' },
    completada: { label: 'Completada', color: '#00A884', bg: 'rgba(0,212,166,0.14)' },
    cancelada: { label: 'Cancelada', color: '#E5484D', bg: 'rgba(229,72,77,0.14)' },
};

const toLocalDateString = (d: string): string => {
    if (!d) return '';
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}/${m}/${y}`;
};

interface VisitForm {
    clientId: number | null;
    technicianId: number | null;
    visitType: TechnicalVisitType;
    scheduledDate: string;
    timeSlot: string;
    address: string;
    notes: string;
}

const EMPTY_FORM: VisitForm = {
    clientId: null,
    technicianId: null,
    visitType: 'soporte',
    scheduledDate: new Date().toISOString().split('T')[0],
    timeSlot: TIME_SLOTS[0],
    address: '',
    notes: '',
};

interface AgendaVisitasProps {
    fromDate: string;
    toDate: string;
    reloadKey: number;
}

// ── Componente ────────────────────────────────────────────────────────────
export const AgendaVisitas: React.FC<AgendaVisitasProps> = ({ fromDate, toDate, reloadKey }) => {
    const [visits, setVisits] = useState<TechnicalVisit[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [clients, setClients] = useState<Client[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingVisit, setEditingVisit] = useState<TechnicalVisit | null>(null);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState<VisitForm>(EMPTY_FORM);

    const [snackOpen, setSnackOpen] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackSeverity, setSnackSeverity] = useState<'success' | 'error' | 'info'>('success');

    const canCreate = AuthService.hasPermission('visits.create');
    const canManage = AuthService.hasPermission('visits.edit');

    const showSnack = (message: string, severity: 'success' | 'error' | 'info' = 'success') => {
        setSnackMessage(message);
        setSnackSeverity(severity);
        setSnackOpen(true);
    };

    // ¿Esta visita es del usuario actual? (técnico asignado)
    const isAssignedToMe = useCallback((visit: TechnicalVisit): boolean => {
        if (canManage) return true;
        const user = AuthService.getCurrentUser();
        if (!user || !visit.technician) return false;
        if (visit.technician.userId && visit.technician.userId === user.id) return true;
        const me = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
        return (visit.technician.name || '').trim().toLowerCase() === me;
    }, [canManage]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await TechnicalVisitService.getAll({ from: fromDate, to: toDate });
            setVisits(data);
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Error al cargar las visitas técnicas';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    const loadCatalogs = useCallback(async () => {
        try {
            const [clientsData, techniciansData] = await Promise.all([
                ClientService.getAll(),
                TechnicianService.getAll(),
            ]);
            setClients(clientsData);
            setTechnicians(techniciansData.filter((t: Technician) => t.isActive !== false));
        } catch {
            // Los catálogos solo son necesarios para crear/editar
        }
    }, []);

    useEffect(() => { load(); }, [load, reloadKey]);
    useEffect(() => { loadCatalogs(); }, [loadCatalogs]);

    // ── Diálogos ──────────────────────────────────────────────────────────
    const handleOpenNew = () => {
        setEditingVisit(null);
        setForm({ ...EMPTY_FORM, scheduledDate: fromDate || EMPTY_FORM.scheduledDate });
        setDialogOpen(true);
    };

    const handleOpenEdit = (visit: TechnicalVisit) => {
        setEditingVisit(visit);
        setForm({
            clientId: visit.clientId,
            technicianId: visit.technicianId,
            visitType: visit.visitType,
            scheduledDate: String(visit.scheduledDate).split('T')[0],
            timeSlot: visit.timeSlot || '',
            address: visit.address || '',
            notes: visit.notes || '',
        });
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setEditingVisit(null);
        setForm(EMPTY_FORM);
    };

    const handleClientChange = (client: Client | null) => {
        setForm(prev => ({
            ...prev,
            clientId: client ? client.id : null,
            address: client ? (client.installationAddress || '') : '',
        }));
    };

    const handleSubmit = async () => {
        if (!form.clientId) {
            showSnack('Selecciona el cliente de la visita', 'error');
            return;
        }
        if (!form.technicianId) {
            showSnack('Selecciona el técnico asignado', 'error');
            return;
        }
        if (!form.scheduledDate) {
            showSnack('Indica la fecha de la visita', 'error');
            return;
        }

        setSaving(true);
        try {
            const payload: TechnicalVisitPayload = {
                clientId: form.clientId,
                technicianId: form.technicianId,
                visitType: form.visitType,
                scheduledDate: form.scheduledDate,
                timeSlot: form.timeSlot || null,
                address: form.address || null,
                notes: form.notes || null,
            };

            if (editingVisit) {
                await TechnicalVisitService.update(editingVisit.id, payload);
                showSnack('Visita actualizada (fecha/técnico reasignados)');
            } else {
                await TechnicalVisitService.create(payload);
                showSnack('Visita programada correctamente');
            }
            handleCloseDialog();
            await load();
        } catch (err: any) {
            const msg = err?.response?.data?.message || 'Error al guardar la visita';
            showSnack(msg, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (visit: TechnicalVisit, status: TechnicalVisitStatus) => {
        try {
            await TechnicalVisitService.update(visit.id, { status });
            showSnack(`Visita marcada como "${STATUS_META[status].label.toLowerCase()}"`);
            await load();
        } catch (err: any) {
            showSnack(err?.response?.data?.message || 'Error al actualizar el estado', 'error');
        }
    };

    const handleDelete = async (visit: TechnicalVisit) => {
        if (!window.confirm(`¿Eliminar la visita de "${visit.client?.fullName || 'este cliente'}"?`)) return;
        try {
            await TechnicalVisitService.remove(visit.id);
            showSnack('Visita eliminada');
            await load();
        } catch (err: any) {
            showSnack(err?.response?.data?.message || 'Error al eliminar la visita', 'error');
        }
    };

    // ── Agrupar por fecha ─────────────────────────────────────────────────
    const grouped = visits.reduce<Record<string, TechnicalVisit[]>>((acc, visit) => {
        const dateKey = String(visit.scheduledDate).split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(visit);
        return acc;
    }, {});
    const sortedDates = Object.keys(grouped).sort();

    // ── Tarjeta de visita ─────────────────────────────────────────────────
    const VisitCard: React.FC<{ visit: TechnicalVisit }> = ({ visit }) => {
        const status = STATUS_META[visit.status] || STATUS_META.programada;
        const mine = isAssignedToMe(visit);
        const address = visit.address || visit.client?.installationAddress || '';

        return (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1 }}>
                        {visit.client?.fullName || `Cliente #${visit.clientId}`}
                    </Typography>
                    <Chip
                        size="small"
                        label={status.label}
                        sx={{ height: 20, fontSize: '0.6rem', fontWeight: 800, bgcolor: status.bg, color: status.color, border: `1px solid ${status.color}` }}
                    />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <EventIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                        {VISIT_TYPE_LABELS[visit.visitType] || visit.visitType}
                        {visit.timeSlot ? ` · ${visit.timeSlot}` : ' · Sin franja'}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                        Técnico: {visit.technician?.name || '—'}
                    </Typography>
                </Box>

                {address && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LocationIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary" noWrap title={address}>
                            {address}
                        </Typography>
                    </Box>
                )}

                {visit.client?.primaryPhone && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <PhoneIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                            {visit.client.primaryPhone}
                        </Typography>
                    </Box>
                )}

                {visit.notes && (
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
                        <NotesIcon sx={{ fontSize: 14, color: 'text.secondary', mt: '2px' }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            "{visit.notes}"
                        </Typography>
                    </Box>
                )}

                <Divider sx={{ my: 0.5, opacity: 0.5 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {mine && visit.status === 'programada' && (
                            <>
                                <Button size="small" startIcon={<PlayIcon sx={{ fontSize: 14 }} />} onClick={() => handleStatusChange(visit, 'en_progreso')}
                                    sx={{ textTransform: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#F0A23A', border: '1px solid #F0A23A', '&:hover': { bgcolor: 'rgba(240,162,58,0.1)' } }}>
                                    Iniciar
                                </Button>
                                <Button size="small" startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />} onClick={() => handleStatusChange(visit, 'completada')}
                                    sx={{ textTransform: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#00A884', border: '1px solid #00A884', '&:hover': { bgcolor: 'rgba(0,212,166,0.1)' } }}>
                                    Completar
                                </Button>
                            </>
                        )}
                        {mine && visit.status === 'en_progreso' && (
                            <>
                                <Button size="small" startIcon={<CheckCircleIcon sx={{ fontSize: 14 }} />} onClick={() => handleStatusChange(visit, 'completada')}
                                    sx={{ textTransform: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#00A884', border: '1px solid #00A884', '&:hover': { bgcolor: 'rgba(0,212,166,0.1)' } }}>
                                    Completar
                                </Button>
                                <Button size="small" startIcon={<CancelIcon sx={{ fontSize: 14 }} />} onClick={() => handleStatusChange(visit, 'cancelada')}
                                    sx={{ textTransform: 'none', fontSize: '0.65rem', fontWeight: 700, color: '#E5484D', border: '1px solid #E5484D', '&:hover': { bgcolor: 'rgba(229,72,77,0.1)' } }}>
                                    Cancelar
                                </Button>
                            </>
                        )}
                    </Box>

                    {canManage && (
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                            <Tooltip title="Editar / Reasignar (fecha y técnico)">
                                <IconButton size="small" onClick={() => handleOpenEdit(visit)} sx={{ color: '#2D5BFF' }}>
                                    <EditIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Eliminar visita">
                                <IconButton size="small" onClick={() => handleDelete(visit)} sx={{ color: '#E5484D' }}>
                                    <DeleteIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Box>
            </Paper>
        );
    };

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#2D5BFF', textTransform: 'uppercase', fontSize: '0.8rem' }}>
                    Visitas Técnicas · {visits.length} en el rango seleccionado
                </Typography>
                {canCreate && (
                    <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleOpenNew}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem', bgcolor: '#2D5BFF', '&:hover': { bgcolor: '#1B3FCC' } }}>
                        Nueva visita
                    </Button>
                )}
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : sortedDates.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                    <EventIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">
                        No hay visitas técnicas programadas en este rango de fechas.
                    </Typography>
                </Paper>
            ) : (
                <Stack spacing={3}>
                    {sortedDates.map(dateKey => (
                        <Box key={dateKey}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <EventIcon color="primary" fontSize="small" />
                                <Typography variant="h6" fontWeight={700}>{toLocalDateString(dateKey)}</Typography>
                                <Chip size="small" label={`${grouped[dateKey].length} visita(s)`} variant="outlined" />
                            </Box>
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                                {grouped[dateKey].map(visit => <VisitCard key={visit.id} visit={visit} />)}
                            </Box>
                            <Divider sx={{ mt: 2 }} />
                        </Box>
                    ))}
                </Stack>
            )}

            {/* Diálogo crear / editar-reasignar */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {editingVisit ? 'Editar / Reasignar Visita' : 'Programar Visita Técnica'}
                </DialogTitle>
                <DialogContent dividers>
                    <Stack spacing={2} sx={{ pt: 0.5 }}>
                        <Autocomplete
                            options={clients}
                            getOptionLabel={(option) => (option as Client).fullName || ''}
                            isOptionEqualToValue={(a, b) => a.id === b.id}
                            value={clients.find(c => c.id === form.clientId) || null}
                            onChange={(_, value) => handleClientChange(value)}
                            disabled={!!editingVisit}
                            renderInput={(params) => <TextField {...params} label="Cliente" size="small" required />}
                        />
                        {editingVisit && (
                            <Alert severity="info" sx={{ fontSize: '0.75rem' }}>
                                Para reasignar, cambia la fecha y/o el técnico y guarda.
                            </Alert>
                        )}
                        <FormControl size="small" required>
                            <InputLabel>Técnico asignado</InputLabel>
                            <Select
                                value={form.technicianId ?? ''}
                                label="Técnico asignado"
                                onChange={(e) => setForm(prev => ({ ...prev, technicianId: Number(e.target.value) }))}
                            >
                                {technicians.map(tech => (
                                    <MenuItem key={tech.id} value={tech.id}>{tech.name}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Fecha"
                                type="date"
                                size="small"
                                fullWidth
                                required
                                InputLabelProps={{ shrink: true }}
                                value={form.scheduledDate}
                                onChange={(e) => setForm(prev => ({ ...prev, scheduledDate: e.target.value }))}
                            />
                            <FormControl size="small" fullWidth>
                                <InputLabel>Franja horaria</InputLabel>
                                <Select
                                    value={form.timeSlot}
                                    label="Franja horaria"
                                    onChange={(e) => setForm(prev => ({ ...prev, timeSlot: e.target.value }))}
                                >
                                    <MenuItem value="">Sin franja</MenuItem>
                                    {TIME_SLOTS.map(slot => (
                                        <MenuItem key={slot} value={slot}>{slot}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                        <FormControl size="small" fullWidth>
                            <InputLabel>Tipo de visita</InputLabel>
                            <Select
                                value={form.visitType}
                                label="Tipo de visita"
                                onChange={(e) => setForm(prev => ({ ...prev, visitType: e.target.value as TechnicalVisitType }))}
                            >
                                {(Object.keys(VISIT_TYPE_LABELS) as TechnicalVisitType[]).map(type => (
                                    <MenuItem key={type} value={type}>{VISIT_TYPE_LABELS[type]}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Dirección de la visita"
                            size="small"
                            value={form.address}
                            onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                            placeholder={clients.find(c => c.id === form.clientId)?.installationAddress || ''}
                        />
                        <TextField
                            label="Notas"
                            size="small"
                            multiline
                            minRows={2}
                            value={form.notes}
                            onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} sx={{ textTransform: 'none' }}>Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={saving}
                        variant="contained"
                        sx={{ textTransform: 'none', fontWeight: 700, bgcolor: '#2D5BFF', '&:hover': { bgcolor: '#1B3FCC' } }}
                    >
                        {saving ? <CircularProgress size={18} color="inherit" /> : editingVisit ? 'Guardar cambios' : 'Programar visita'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackOpen}
                autoHideDuration={4000}
                onClose={() => setSnackOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackOpen(false)} severity={snackSeverity} sx={{ width: '100%' }}>
                    {snackMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default AgendaVisitas;
