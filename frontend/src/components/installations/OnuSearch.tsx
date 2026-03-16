import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Chip,
    Divider,
    Grid,
    IconButton,
    Tooltip,
    InputAdornment,
} from '@mui/material';
import {
    Search as SearchIcon,
    Router as RouterIcon,
    Person as PersonIcon,
    ContentCopy as CopyIcon,
    OpenInNew as OpenInNewIcon,
    Wifi as WifiIcon,
    WifiOff as WifiOffIcon,
    Pause as PauseIcon,
} from '@mui/icons-material';
import { Installation, InstallationService } from '../../services/InstallationService';
import { formatLocalDate } from '../../utils/dateUtils';

const STATUS_CONFIG: Record<string, { label: string; color: 'success' | 'warning' | 'error'; icon: React.ReactElement }> = {
    active: { label: 'Activo', color: 'success', icon: <WifiIcon sx={{ fontSize: 14 }} /> },
    suspended: { label: 'Suspendido', color: 'warning', icon: <PauseIcon sx={{ fontSize: 14 }} /> },
    cancelled: { label: 'Cancelado', color: 'error', icon: <WifiOffIcon sx={{ fontSize: 14 }} /> },
};

interface InfoRowProps {
    label: string;
    value?: string | number | null;
    copyable?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (value) {
            navigator.clipboard.writeText(String(value));
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
    };

    if (!value && value !== 0) return null;

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', py: 0.75, gap: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 160, flexShrink: 0 }}>
                {label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: 'break-all' }}>
                {String(value)}
            </Typography>
            {copyable && (
                <Tooltip title={copied ? '¡Copiado!' : 'Copiar'}>
                    <IconButton size="small" onClick={handleCopy} sx={{ ml: 'auto', opacity: 0.5, '&:hover': { opacity: 1 } }}>
                        <CopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    );
};

export default function OnuSearch() {
    const navigate = useNavigate();
    const [serial, setSerial] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<Installation | null>(null);
    const [error, setError] = useState('');

    const handleSearch = useCallback(async () => {
        const trimmed = serial.trim();
        if (!trimmed) return;

        setLoading(true);
        setResult(null);
        setError('');

        try {
            const data = await InstallationService.searchByOnuSerial(trimmed);
            setResult(data);
        } catch (err: any) {
            const msg =
                err?.response?.status === 404
                    ? 'No se encontró ninguna instalación con ese serial de ONU.'
                    : err?.response?.data?.message || 'Error al realizar la búsqueda.';
            setError(msg);
        } finally {
            setLoading(false);
        }
    }, [serial]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') handleSearch();
    };

    const statusInfo = result ? (STATUS_CONFIG[result.serviceStatus] ?? null) : null;

    return (
        <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                Buscar ONU por Serial
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
                Ingresa el serial exacto de la ONU para consultar la instalación y el cliente asociado.
            </Typography>

            {/* Barra de búsqueda */}
            <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 1, alignItems: 'center' }} elevation={2}>
                <TextField
                    fullWidth
                    label="Serial ONU"
                    placeholder="Ej: ZTEG1A2B3C4D"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value.toUpperCase())}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    size="small"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <RouterIcon fontSize="small" color="action" />
                            </InputAdornment>
                        ),
                    }}
                    inputProps={{ style: { fontFamily: 'monospace', letterSpacing: 1 } }}
                />
                <Button
                    variant="contained"
                    onClick={handleSearch}
                    disabled={loading || !serial.trim()}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
                    sx={{ whiteSpace: 'nowrap', minWidth: 120 }}
                >
                    {loading ? 'Buscando…' : 'Buscar'}
                </Button>
            </Paper>

            {/* Error */}
            {error && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {/* Resultado */}
            {result && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    {/* Encabezado con estado y acciones */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <RouterIcon color="primary" />
                            <Typography variant="h6" fontWeight={700}>
                                {result.onuSerialNumber}
                            </Typography>
                            {statusInfo && (
                                <Chip
                                    icon={statusInfo.icon as React.ReactElement<any>}
                                    label={statusInfo.label}
                                    color={statusInfo.color}
                                    size="small"
                                />
                            )}
                        </Box>
                        {result.client?.id && (
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<OpenInNewIcon />}
                                onClick={() => navigate(`/clients/${result.client!.id}`)}
                            >
                                Ver cliente
                            </Button>
                        )}
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Grid container spacing={3}>
                        {/* Datos del cliente */}
                        {result.client && (
                            <Grid item xs={12} md={6}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <PersonIcon fontSize="small" color="action" />
                                    <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" fontSize="0.7rem">
                                        Cliente
                                    </Typography>
                                </Box>
                                <InfoRow label="Nombre" value={(result.client as any).fullName} />
                                <InfoRow label="Identificación" value={(result.client as any).identificationNumber} />
                                <InfoRow label="Teléfono" value={(result.client as any).primaryPhone} copyable />
                                <InfoRow label="Dirección" value={(result.client as any).installationAddress} />
                                <InfoRow label="Ciudad" value={(result.client as any).city} />
                            </Grid>
                        )}

                        {/* Datos de la instalación */}
                        <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <RouterIcon fontSize="small" color="action" />
                                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" fontSize="0.7rem">
                                    Instalación
                                </Typography>
                            </Box>
                            <InfoRow label="Serial ONU" value={result.onuSerialNumber} copyable />
                            <InfoRow label="PON ID" value={result.ponId} copyable />
                            <InfoRow label="ONU ID" value={result.onuId} copyable />
                            <InfoRow label="NAP / Caja" value={result.napLabel} />
                            <InfoRow label="IP Asignada" value={result.ipAddress} copyable />
                            <InfoRow label="Plan" value={result.servicePlan?.name ?? result.serviceType} />
                            <InfoRow label="Velocidad" value={result.speedMbps ? `${result.speedMbps} Mbps` : null} />
                            <InfoRow label="Técnico" value={result.technician} />
                            <InfoRow label="Fecha instalación" value={result.installationDate ? formatLocalDate(result.installationDate) : null} />
                        </Grid>
                    </Grid>

                    {result.notes && (
                        <>
                            <Divider sx={{ mt: 2, mb: 1.5 }} />
                            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                Notas
                            </Typography>
                            <Typography variant="body2">{result.notes}</Typography>
                        </>
                    )}
                </Paper>
            )}
        </Box>
    );
}
