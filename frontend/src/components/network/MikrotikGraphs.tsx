import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Alert, Grid, Card, CardContent, Button, LinearProgress } from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';

export const MikrotikGraphs: React.FC = () => {
    // Base URL del Mikrotik
    const BASE_URL = "http://192.168.1.9/graphs/iface/12%2DWAN1";
    // Estado para "cache busting" (forzar recarga de imágenes)
    const [timestamp, setTimestamp] = useState(Date.now());
    const [loading, setLoading] = useState(false);

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
        { title: "Tráfico Diario (Promedio 5 min)", file: "daily.gif", col: 12 },
        { title: "Tráfico Semanal (Promedio 30 min)", file: "weekly.gif", col: 6 },
        { title: "Tráfico Mensual (Promedio 2 horas)", file: "monthly.gif", col: 6 },
        { title: "Tráfico Anual (Promedio 1 día)", file: "yearly.gif", col: 12 }
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
                                    <img 
                                        src={`${BASE_URL}/${graph.file}?t=${timestamp}`} 
                                        alt={graph.title} 
                                        style={{ maxWidth: '100%', height: 'auto', display: 'block' }}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null; // Prevenir loop infinito
                                            target.style.display = 'none';
                                            // Mostrar mensaje de error si la imagen falla
                                            if (target.parentElement) {
                                                target.parentElement.innerHTML = '<span style="color:red">Error cargando imagen. Verifique conexión VPN.</span>';
                                            }
                                        }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
            
            <Box mt={4} textAlign="center">
                <Typography variant="caption" color="text.secondary">
                    Fuente: Mikrotik RouterOS - {BASE_URL}
                </Typography>
            </Box>
        </Box>
    );
};
