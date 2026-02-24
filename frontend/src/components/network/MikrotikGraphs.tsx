import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Alert, Grid, Card, CardContent, Button, LinearProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

const AuthenticatedImage = ({ src, alt, style, onError }: { src: string, alt: string, style?: React.CSSProperties, onError?: (e: any) => void }) => {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const fetchImage = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(src, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) throw new Error('Network response was not ok');
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

    if (loading) return <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LinearProgress style={{ width: '50%' }} /></div>;
    if (!imageSrc) return <div style={{ color: 'red', textAlign: 'center', padding: 20 }}>Error cargando imagen</div>;

    return <img src={imageSrc} alt={alt} style={style} onError={onError} />;
};

export const MikrotikGraphs: React.FC = () => {
    // Base URL del API
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    
    // Estado para "cache busting" (forzar recarga de imágenes)
    const [timestamp, setTimestamp] = useState(Date.now());
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

    const handleRefresh = () => {
        setLoading(true);
        setTimestamp(Date.now());
        // Simular tiempo de carga mínimo para feedback visual
        setTimeout(() => setLoading(false), 800);
    };

    // Auto-refresh cada 5 minutos (300000 ms)
    useEffect(() => {
        const interval = setInterval(handleRefresh, 300000);
        return () => clearInterval(interval);
    }, []);

    const graphs = [
        { title: "Tráfico Diario (Promedio 5 min)", type: "daily", col: 12 },
        { title: "Tráfico Semanal (Promedio 30 min)", type: "weekly", col: 6 },
        { title: "Tráfico Mensual (Promedio 2 horas)", type: "monthly", col: 6 },
        { title: "Tráfico Anual (Promedio 1 día)", type: "yearly", col: 12 }
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
                Visualizando datos directamente desde <strong>192.168.1.9</strong>. Requiere conexión VPN/LAN.
            </Alert>

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
