import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Box,
    Chip,
    CircularProgress,
    Container,
    Divider,
    Grid,
    IconButton,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    Refresh as RefreshIcon,
    AccessTime as ClockIcon,
    Person as PersonIcon,
    Router as RouterIcon,
} from '@mui/icons-material';
import { Installation, InstallationService } from '../../services/InstallationService';

// ── Franjas horarias en orden para agrupar ────────────────────────────────
const TIME_SLOTS = [
    '8:00 am a 10:00 am',
    '10:00 am a 12:00 m',
    '2:00 pm a 4:00 pm',
    '4:00 pm a 6:00 pm',
];

const SLOT_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
    '8:00 am a 10:00 am': 'info',
    '10:00 am a 12:00 m': 'primary',
    '2:00 pm a 4:00 pm': 'warning',
    '4:00 pm a 6:00 pm': 'secondary',
};

// ── Helpers ───────────────────────────────────────────────────────────────
const toLocalDateString = (d: string): string => {
    // YYYY-MM-DD → dd/mm/yyyy
    if (!d) return '';
    const [y, m, day] = d.split('T')[0].split('-');
    return `${day}/${m}/${y}`;
};

const isoToday = (): string => new Date().toISOString().split('T')[0];
const isoWeekEnd = (): string => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
};

type ViewMode = 'list' | 'grouped';

// ── COMPONENTE ────────────────────────────────────────────────────────────
const AgendaInstalaciones: React.FC = () => {
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fromDate, setFromDate] = useState(isoToday());
    const [toDate, setToDate] = useState(isoWeekEnd());
    const [viewMode, setViewMode] = useState<ViewMode>('grouped');

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await InstallationService.getScheduled(fromDate, toDate);
            setInstallations(data);
        } catch {
            setError('Error al cargar las instalaciones agendadas');
        } finally {
            setLoading(false);
        }
    }, [fromDate, toDate]);

    useEffect(() => { load(); }, [load]);

    // Agrupar por fecha → franja
    const grouped = installations.reduce<Record<string, Record<string, Installation[]>>>((acc, inst) => {
        const dateKey = (inst.installationDate as string).split('T')[0];
        const slot = inst.scheduledTimeSlot || 'Sin franja definida';
        if (!acc[dateKey]) acc[dateKey] = {};
        if (!acc[dateKey][slot]) acc[dateKey][slot] = [];
        acc[dateKey][slot].push(inst);
        return acc;
    }, {});

    const sortedDates = Object.keys(grouped).sort();

    // ── Render tarjeta de instalación individual ──────────────────────────
    const InstCard: React.FC<{ inst: Installation }> = ({ inst }) => (
        <Paper
            variant="outlined"
            sx={{ p: 1.5, borderRadius: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}
        >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" fontWeight={700} noWrap sx={{ flex: 1, mr: 1 }}>
                    {inst.client ? (inst.client as any).fullName || `Cliente #${inst.client.id}` : '—'}
                </Typography>
                <Chip
                    size="small"
                    label={inst.serviceStatus === 'active' ? 'Activo' : inst.serviceStatus === 'suspended' ? 'Suspendido' : 'Cancelado'}
                    color={inst.serviceStatus === 'active' ? 'success' : inst.serviceStatus === 'suspended' ? 'warning' : 'error'}
                />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <RouterIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                    {inst.servicePlan?.name || inst.serviceType} · {inst.speedMbps} Mbps
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                    Técnico: {inst.technician || '—'}
                </Typography>
            </Box>
            {inst.client && (inst.client as any).installationAddress && (
                <Typography variant="caption" color="text.secondary" noWrap title={(inst.client as any).installationAddress}>
                    📍 {(inst.client as any).installationAddress}
                </Typography>
            )}
            {inst.notes && (
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }} noWrap title={inst.notes}>
                    "{inst.notes}"
                </Typography>
            )}
        </Paper>
    );

    // ── Vista agrupada ────────────────────────────────────────────────────
    const GroupedView = () => (
        <Stack spacing={3}>
            {sortedDates.length === 0 && !loading && (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <CalendarIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No hay instalaciones agendadas en este rango de fechas.</Typography>
                </Paper>
            )}
            {sortedDates.map(dateKey => (
                <Box key={dateKey}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                        <CalendarIcon color="primary" fontSize="small" />
                        <Typography variant="h6" fontWeight={700}>
                            {toLocalDateString(dateKey)}
                        </Typography>
                        <Chip
                            size="small"
                            label={`${Object.values(grouped[dateKey]).flat().length} instalación(es)`}
                            variant="outlined"
                        />
                    </Box>

                    {/* Franjas en orden estándar */}
                    <Grid container spacing={2}>
                        {[...TIME_SLOTS, 'Sin franja definida'].map(slot => {
                            const items = grouped[dateKey][slot];
                            if (!items || items.length === 0) return null;
                            return (
                                <Grid item xs={12} md={6} lg={3} key={slot}>
                                    <Box sx={{ mb: 1 }}>
                                        <Chip
                                            icon={<ClockIcon sx={{ fontSize: '14px !important' }} />}
                                            label={slot}
                                            color={SLOT_COLORS[slot] || 'default'}
                                            size="small"
                                            sx={{ mb: 1, fontWeight: 700 }}
                                        />
                                        <Stack spacing={1}>
                                            {items.map(inst => <InstCard key={inst.id} inst={inst} />)}
                                        </Stack>
                                    </Box>
                                </Grid>
                            );
                        })}
                    </Grid>
                    <Divider sx={{ mt: 2 }} />
                </Box>
            ))}
        </Stack>
    );

    // ── Vista tabla ───────────────────────────────────────────────────────
    const ListView = () => (
        <TableContainer component={Paper} variant="outlined">
            <Table size="small">
                <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.100' }}>
                        <TableCell><strong>Fecha</strong></TableCell>
                        <TableCell><strong>Franja</strong></TableCell>
                        <TableCell><strong>Cliente</strong></TableCell>
                        <TableCell><strong>Plan</strong></TableCell>
                        <TableCell><strong>Dirección</strong></TableCell>
                        <TableCell><strong>Técnico</strong></TableCell>
                        <TableCell><strong>Estado</strong></TableCell>
                        <TableCell><strong>Notas</strong></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {installations.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                No hay instalaciones agendadas en este rango de fechas
                            </TableCell>
                        </TableRow>
                    )}
                    {installations.map(inst => (
                        <TableRow key={inst.id} hover>
                            <TableCell>{toLocalDateString((inst.installationDate as string).split('T')[0])}</TableCell>
                            <TableCell>
                                {inst.scheduledTimeSlot ? (
                                    <Chip
                                        size="small"
                                        label={inst.scheduledTimeSlot}
                                        color={SLOT_COLORS[inst.scheduledTimeSlot] || 'default'}
                                    />
                                ) : (
                                    <Typography variant="caption" color="text.disabled">Sin definir</Typography>
                                )}
                            </TableCell>
                            <TableCell>
                                {inst.client ? (inst.client as any).fullName || `#${inst.client.id}` : '—'}
                            </TableCell>
                            <TableCell>{inst.servicePlan?.name || inst.serviceType}</TableCell>
                            <TableCell>
                                <Typography variant="caption" noWrap sx={{ maxWidth: 200, display: 'block' }} title={inst.client ? (inst.client as any).installationAddress : ''}>
                                    {inst.client ? (inst.client as any).installationAddress || '—' : '—'}
                                </Typography>
                            </TableCell>
                            <TableCell>{inst.technician || '—'}</TableCell>
                            <TableCell>
                                <Chip
                                    size="small"
                                    label={inst.serviceStatus === 'active' ? 'Activo' : inst.serviceStatus === 'suspended' ? 'Suspendido' : 'Cancelado'}
                                    color={inst.serviceStatus === 'active' ? 'success' : inst.serviceStatus === 'suspended' ? 'warning' : 'error'}
                                />
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption" noWrap sx={{ maxWidth: 200, display: 'block' }} title={inst.notes}>
                                    {inst.notes || '—'}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    // ── Render principal ──────────────────────────────────────────────────
    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Cabecera */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CalendarIcon color="primary" sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h5" fontWeight={700}>Agenda de Instalaciones</Typography>
                        <Typography variant="caption" color="text.secondary">
                            {installations.length} instalación(es) en el rango seleccionado
                        </Typography>
                    </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    {/* Filtros de fecha */}
                    <TextField
                        label="Desde"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        sx={{ width: 160 }}
                    />
                    <TextField
                        label="Hasta"
                        type="date"
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        sx={{ width: 160 }}
                    />
                    <Tooltip title="Actualizar">
                        <IconButton onClick={load} color="primary" disabled={loading}>
                            {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                        </IconButton>
                    </Tooltip>

                    {/* Vista */}
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={(_, v) => { if (v) setViewMode(v); }}
                        size="small"
                    >
                        <ToggleButton value="grouped" title="Vista por bloques">
                            <CalendarIcon fontSize="small" />
                        </ToggleButton>
                        <ToggleButton value="list" title="Vista tabla">
                            <RouterIcon fontSize="small" />
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : (
                viewMode === 'grouped' ? <GroupedView /> : <ListView />
            )}
        </Container>
    );
};

export default AgendaInstalaciones;
