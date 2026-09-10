import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Chip, Button, IconButton, Tooltip, CircularProgress, Alert } from '@mui/material';
import {
    Tv as TvIcon,
    Add as AddIcon,
    PowerSettingsNew as PowerIcon,
    Delete as DeleteIcon,
    ContentCopy as CopyIcon,
} from '@mui/icons-material';
import { Client } from '../../types/Client';
import { IptvService } from '../../services/IptvService';
import AuthService from '../../services/AuthService';

interface IptvCardProps {
    client: Client;
}

const statusColor = (status?: string): 'success' | 'warning' | 'default' | 'error' | 'info' => {
    if (!status || status === 'no_creado') return 'default';
    if (status === 'activo') return 'success';
    if (status === 'suspendido') return 'warning';
    return 'default';
};

const statusLabel = (status?: string): string => {
    if (!status || status === 'no_creado') return 'No creado';
    if (status === 'activo') return 'Activo';
    if (status === 'suspendido') return 'Suspendido';
    return status;
};

const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
};

export const IptvCard: React.FC<IptvCardProps> = ({ client }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [chipKey, setChipKey] = useState(0);

    // Estado IPTV local (se sincroniza con las acciones realizadas)
    const [iptv, setIptv] = useState({
        username: client.iptvUsername || null,
        password: client.iptvPassword || null,
        status: client.iptvStatus || 'no_creado',
        expDate: client.iptvExpDate || null,
    });

    // Si el cliente cambia externamente, refrescar estado local
    useEffect(() => {
        setIptv({
            username: client.iptvUsername || null,
            password: client.iptvPassword || null,
            status: client.iptvStatus || 'no_creado',
            expDate: client.iptvExpDate || null,
        });
    }, [client.id, client.iptvUsername, client.iptvPassword, client.iptvStatus, client.iptvExpDate]);

    const handleCreate = async () => {
        if (!window.confirm('¿Crear la línea IPTV para este cliente? Se generará el usuario con formato IMVCALI<INICIALES> y se creará en el panel.')) return;
        setLoading(true);
        setError(null);
        try {
            const result = await IptvService.create(client.id);
            setIptv({
                username: result.client.iptvUsername || null,
                password: result.client.iptvPassword || null,
                status: result.client.iptvStatus || 'no_creado',
                expDate: result.client.iptvExpDate || null,
            });
            setChipKey(k => k + 1);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error creando la línea IPTV');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!window.confirm('¿Deshabilitar la línea IPTV? El cliente dejará de tener acceso a los canales.')) return;
        setLoading(true);
        setError(null);
        try {
            const result = await IptvService.disable(client.id);
            setIptv({ ...iptv, status: result.client.iptvStatus || 'suspendido' });
            setChipKey(k => k + 1);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error deshabilitando la línea IPTV');
        } finally {
            setLoading(false);
        }
    };

    const handleEnable = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await IptvService.enable(client.id);
            setIptv({ ...iptv, status: result.client.iptvStatus || 'activo' });
            setChipKey(k => k + 1);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error habilitando la línea IPTV');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('¿Eliminar la línea IPTV del panel y del CRM? Esta acción no se puede deshacer.')) return;
        setLoading(true);
        setError(null);
        try {
            await IptvService.remove(client.id);
            setIptv({ username: null, password: null, status: 'no_creado', expDate: null });
            setChipKey(k => k + 1);
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error eliminando la línea IPTV');
        } finally {
            setLoading(false);
        }
    };

    const canManage = AuthService.hasPermission('clients.crm.edit');

    return (
        <Paper sx={{ p: 2, mb: 2, borderLeft: 4, borderColor: iptv.status === 'activo' ? '#2D5BFF' : '#E2E6F0' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box display="flex" alignItems="center" gap={1}>
                    <TvIcon sx={{ fontSize: 18, color: '#2D5BFF' }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0E1330' }}>
                        IPTV
                    </Typography>
                    <Chip
                        key={chipKey}
                        label={loading ? '...' : statusLabel(iptv.status)}
                        color={statusColor(iptv.status)}
                        size="small"
                        sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700 }}
                    />
                </Box>
                <Box display="flex" gap={0.5}>
                    {iptv.status === 'no_creado' && canManage && (
                        <Button
                            size="small"
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <AddIcon />}
                            onClick={handleCreate}
                            disabled={loading}
                            sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                        >
                            Crear IPTV
                        </Button>
                    )}
                    {iptv.status === 'activo' && canManage && (
                        <Tooltip title="Suspender IPTV">
                            <IconButton size="small" onClick={handleDisable} disabled={loading} sx={{ color: '#E5484D' }}>
                                <PowerIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {iptv.status === 'suspendido' && canManage && (
                        <Tooltip title="Activar IPTV">
                            <IconButton size="small" onClick={handleEnable} disabled={loading} sx={{ color: '#00D4A6' }}>
                                <PowerIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                    {(iptv.status === 'activo' || iptv.status === 'suspendido') && canManage && (
                        <Tooltip title="Eliminar línea IPTV">
                            <IconButton size="small" onClick={handleDelete} disabled={loading} sx={{ color: '#E5484D' }}>
                                <DeleteIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mt: 1, mb: 1, py: 0 }}>{error}</Alert>
            )}

            {iptv.username ? (
                <Box mt={1} display="flex" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
                            Usuario
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.25}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                {iptv.username}
                            </Typography>
                            <Tooltip title="Copiar usuario">
                                <IconButton size="small" onClick={() => copyToClipboard(iptv.username || '')} sx={{ p: 0.25 }}>
                                    <CopyIcon fontSize="small" sx={{ fontSize: 14, color: '#6B7290' }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                    <Box>
                        <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
                            Contraseña
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.25}>
                            <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', fontFamily: 'monospace' }}>
                                {iptv.password}
                            </Typography>
                            <Tooltip title="Copiar contraseña">
                                <IconButton size="small" onClick={() => copyToClipboard(iptv.password || '')} sx={{ p: 0.25 }}>
                                    <CopyIcon fontSize="small" sx={{ fontSize: 14, color: '#6B7290' }} />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                    {iptv.expDate && (
                        <Box>
                            <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem' }}>
                                Vence
                            </Typography>
                            <Typography sx={{ fontSize: '0.85rem' }}>
                                {new Date(iptv.expDate).toLocaleDateString('es-CO')}
                            </Typography>
                        </Box>
                    )}
                </Box>
            ) : (
                !loading && (
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, fontSize: '0.8rem' }}>
                        Sin línea IPTV asignada.
                    </Typography>
                )
            )}
        </Paper>
    );
};