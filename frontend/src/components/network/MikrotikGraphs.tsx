import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Alert,
    Grid,
    Card,
    CardContent,
    Button,
    LinearProgress,
    TextField,
    Stack,
    Chip,
    CircularProgress
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

interface OnuDiagnosticsResult {
    ip: string;
    sshTarget: string;
    lease: {
        status: string;
        lastSeen: string;
        mac: string;
    };
    arp: {
        status: string;
        mac: string;
    };
    connections: {
        total: number;
        seenReply: number;
        assured: number;
        wan1: number;
        wan2: number;
    };
    pingReplies: number;
    hasNavigationSignals: boolean;
    hasLocalReachability: boolean;
}

const AuthenticatedImage = ({ src, alt, style, onError }: { src: string, alt: string, style?: React.CSSProperties, onError?: (e: any) => void }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchImage = async () => {
            try {
                const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found');
                }

                const response = await fetch(src, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`Error fetching graph (${response.status}):`, errorText);
                    throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();
                if (isMounted) {
                    const url = URL.createObjectURL(blob);
                    setImageSrc(url);
                }
            } catch (error) {
                console.error('Error fetching image:', error);
                if (onError && isMounted) onError(error);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        if (src) {
            fetchImage();
        }

        return () => {
            isMounted = false;
            if (imageSrc) URL.revokeObjectURL(imageSrc);
        };
    }, [src]);

    if (loading) {
        return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinearProgress style={{ width: '50%' }} /></div>;
    }

    if (!imageSrc) {
        return <div style={{ color: 'red', textAlign: 'center', padding: 20 }}>Error cargando imagen</div>;
    }

    return <img src={imageSrc} alt={alt} style={style} onError={onError} />;
};

export const MikrotikGraphs: React.FC = () => {
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

    const [timestamp, setTimestamp] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [onuIp, setOnuIp] = useState('10.50.0.250');
    const [diagLoading, setDiagLoading] = useState(false);
    const [diagError, setDiagError] = useState<string | null>(null);
    const [diagResult, setDiagResult] = useState<OnuDiagnosticsResult | null>(null);

    const handleRefresh = () => {
        setLoading(true);
        setTimestamp(Date.now());
        setTimeout(() => setLoading(false), 800);
    };

    const handleOnuDiagnostics = async () => {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
        if (!token) {
            setDiagError('No hay sesion activa para ejecutar el diagnostico.');
            return;
        }

        if (!onuIp.trim()) {
            setDiagError('Ingresa una IP valida.');
            return;
        }

        setDiagLoading(true);
        setDiagError(null);

        try {
            const response = await fetch(`${API_URL}/mikrotik/onu-diagnostics/${encodeURIComponent(onuIp.trim())}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `Error ${response.status}`);
            }

            const data = await response.json();
            setDiagResult(data as OnuDiagnosticsResult);
        } catch (error: any) {
            setDiagError(error?.message || 'No se pudo ejecutar el diagnostico.');
            setDiagResult(null);
        } finally {
            setDiagLoading(false);
        }
    };

    useEffect(() => {
        const interval = setInterval(handleRefresh, 300000);
        return () => clearInterval(interval);
    }, []);

    const graphs = [
        { title: 'Trafico Diario (Promedio 5 min)', type: 'daily', col: 12 },
        { title: 'Trafico Semanal (Promedio 30 min)', type: 'weekly', col: 6 },
        { title: 'Trafico Mensual (Promedio 2 horas)', type: 'monthly', col: 6 },
        { title: 'Trafico Anual (Promedio 1 dia)', type: 'yearly', col: 12 }
    ];

    return (
        <Box sx={{ width: '100%', maxWidth: '1800px', mx: 'auto', p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1">
                    Monitor de Red (WAN1)
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<RefreshIcon />}
                    onClick={handleRefresh}
                    disabled={loading}
                >
                    Actualizar
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                Visualizando datos directamente desde <strong>192.168.40.10</strong>. Requiere conexion VPN/LAN.

            </Alert>

            <Card elevation={3} sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Diagnostico ONU por IP
                    </Typography>
                    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
                        <TextField
                            label="IP ONU"
                            value={onuIp}
                            onChange={(e) => setOnuIp(e.target.value)}
                            size="small"
                            sx={{ minWidth: 220 }}
                        />
                        <Button variant="contained" onClick={handleOnuDiagnostics} disabled={diagLoading}>
                            {diagLoading ? <CircularProgress size={20} color="inherit" /> : 'Ejecutar prueba'}
                        </Button>
                    </Stack>

                    {diagError && <Alert severity="error" sx={{ mt: 2 }}>{diagError}</Alert>}

                    {diagResult && (
                        <Box sx={{ mt: 2 }}>
                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <Chip label={`IP: ${diagResult.ip}`} />
                                <Chip label={`SSH: ${diagResult.sshTarget}`} />
                                <Chip color={diagResult.hasNavigationSignals ? 'success' : 'error'} label={diagResult.hasNavigationSignals ? 'Con senal de navegacion' : 'Sin senal de navegacion'} />
                                <Chip color={diagResult.hasLocalReachability ? 'success' : 'warning'} label={diagResult.hasLocalReachability ? 'Con alcance local' : 'Sin alcance local'} />
                            </Stack>

                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2"><strong>Lease:</strong> {diagResult.lease.status}</Typography>
                                    <Typography variant="body2"><strong>Last-seen:</strong> {diagResult.lease.lastSeen}</Typography>
                                    <Typography variant="body2"><strong>MAC lease:</strong> {diagResult.lease.mac}</Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2"><strong>ARP:</strong> {diagResult.arp.status}</Typography>
                                    <Typography variant="body2"><strong>MAC ARP:</strong> {diagResult.arp.mac}</Typography>
                                    <Typography variant="body2"><strong>Ping replies (router -&gt; ONU):</strong> {diagResult.pingReplies}</Typography>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <Typography variant="body2"><strong>Conexiones totales:</strong> {diagResult.connections.total}</Typography>
                                    <Typography variant="body2"><strong>Con seen-reply:</strong> {diagResult.connections.seenReply}</Typography>
                                    <Typography variant="body2"><strong>Con assured:</strong> {diagResult.connections.assured}</Typography>
                                    <Typography variant="body2"><strong>WAN1/WAN2:</strong> {diagResult.connections.wan1}/{diagResult.connections.wan2}</Typography>
                                </Grid>
                            </Grid>
                        </Box>
                    )}
                </CardContent>
            </Card>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Grid container spacing={3}>
                {graphs.map((graph, index) => (
                    <Grid item xs={12} md={graph.col} key={index}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom color="text.secondary">
                                    {graph.title}
                                </Typography>
                                <Box
                                    display="flex"
                                    justifyContent="center"
                                    alignItems="center"
                                    sx={{
                                        bgcolor: '#f5f5f5',
                                        p: 2,
                                        borderRadius: 1,
                                        minHeight: 200
                                    }}
                                >
                                    <AuthenticatedImage
                                        src={`${API_URL}/mikrotik/graph?type=${graph.type}&t=${timestamp}`}
                                        alt={graph.title}
                                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box mt={4} textAlign="center">
                <Typography variant="caption" color="text.secondary">
                    Fuente: Mikrotik RouterOS - {API_URL}
                </Typography>
            </Box>
        </Box>
    );
};

