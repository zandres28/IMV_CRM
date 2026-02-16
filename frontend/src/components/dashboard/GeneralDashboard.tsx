import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Typography, CircularProgress, Card, CardContent, Divider, FormControl, InputLabel, Select, MenuItem, Chip } from '@mui/material';
import { DashboardService, DashboardStats } from '../../services/DashboardService';
import PeopleIcon from '@mui/icons-material/People';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import CancelIcon from '@mui/icons-material/Cancel';
import TvIcon from '@mui/icons-material/Tv';
import RouterIcon from '@mui/icons-material/Router';
import OndemandVideoIcon from '@mui/icons-material/OndemandVideo';
import BuildIcon from '@mui/icons-material/Build';

export const GeneralDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const periodLabel = {
        week: 'Esta Semana',
        month: 'Este Mes',
        year: 'Este Año'
    };

    const months = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

    useEffect(() => {
        const fetchStats = async () => {
            setLoading(true);
            try {
                const data = await DashboardService.getStats(selectedMonth, selectedYear);
                setStats(data);
            } catch (error) {
                console.error("Error fetching dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [selectedMonth, selectedYear]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    if (!stats) {
        return <Typography color="error">No se pudieron cargar las estadísticas.</Typography>;
    }

    const StatCard = ({ title, value, subtitle, icon, color, onClick }: { title: string, value: string | number, subtitle?: string, icon: React.ReactNode, color: string, onClick?: () => void }) => (
        <Card 
            sx={{ 
                height: '100%', 
                borderLeft: `5px solid ${color}`,
                cursor: onClick ? 'pointer' : 'default',
                transition: 'transform 0.2s',
                '&:hover': onClick ? {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                } : {}
            }}
            onClick={onClick}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                        <Typography color="textSecondary" gutterBottom variant="overline">
                            {title}
                        </Typography>
                        <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box sx={{ 
                        backgroundColor: `${color}20`, 
                        borderRadius: '50%', 
                        p: 1, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                    }}>
                        {icon}
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount);
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4} flexWrap="wrap" gap={2}>
                <Typography variant="h4">
                    Tablero General
                </Typography>
                
                <Box display="flex" gap={2}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Periodo</InputLabel>
                        <Select
                            value={period}
                            label="Periodo"
                            onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'year')}
                        >
                            <MenuItem value="week">Semana</MenuItem>
                            <MenuItem value="month">Mes</MenuItem>
                            <MenuItem value="year">Año</MenuItem>
                        </Select>
                    </FormControl>

                    {period === 'month' && (
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Mes</InputLabel>
                            <Select
                                value={selectedMonth}
                                label="Mes"
                                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                            >
                                {months.map((month, index) => (
                                    <MenuItem key={index} value={index}>{month}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    {(period === 'month' || period === 'year') && (
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Año</InputLabel>
                            <Select
                                value={selectedYear}
                                label="Año"
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                            >
                                {years.map((year) => (
                                    <MenuItem key={year} value={year}>{year}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* Period Summary Section */}
                <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUpIcon color="primary" /> Resumen del Periodo ({period === 'month' ? `${months[selectedMonth]} ${selectedYear}` : (period === 'year' ? `Año ${selectedYear}` : periodLabel[period])})
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} sm={6} md={6}>
                    <StatCard 
                        title={`Clientes Nuevos (${period === 'year' ? `Año ${selectedYear}` : (period === 'month' ? `${months[selectedMonth]}` : periodLabel[period])})`}
                        value={stats.clients[period]} 
                        icon={<PeopleIcon sx={{ color: '#2196f3' }} />} 
                        color="#2196f3"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={6}>
                    <StatCard 
                        title={`Recaudo (${period === 'year' ? `Año ${selectedYear}` : (period === 'month' ? `${months[selectedMonth]}` : periodLabel[period])})`}
                        value={formatCurrency(stats.revenue[period])} 
                        icon={<AttachMoneyIcon sx={{ color: '#66bb6a' }} />} 
                        color="#66bb6a"
                    />
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AttachMoneyIcon color="success" /> Recaudo mensual y acumulado
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={`Recaudo del Mes (${months[selectedMonth]} ${selectedYear})`}
                        value={formatCurrency(stats.revenue.month)}
                        subtitle="Facturación del mes seleccionado"
                        icon={<AttachMoneyIcon sx={{ color: '#43a047' }} />}
                        color="#43a047"
                        onClick={() => navigate(`/billing?month=${months[selectedMonth].toLowerCase()}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={`Recaudo Acumulado (${selectedYear})`}
                        value={formatCurrency(stats.revenue.year)}
                        subtitle="Total facturación año hasta fecha"
                        icon={<AttachMoneyIcon sx={{ color: '#2e7d32' }} />}
                        color="#2e7d32"
                        onClick={() => navigate(`/billing?year=${selectedYear}`)}
                    />
                </Grid>

                {/* Revenue Breakdown Section */}
                {period === 'month' && stats.revenue.breakdown && (
                    <>
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoneyIcon color="success" /> Desglose de Recaudo (Mes)
                            </Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                             <StatCard 
                                title="Planes" 
                                value={formatCurrency(stats.revenue.breakdown.servicePlan)} 
                                icon={<RouterIcon sx={{ color: '#1976d2' }} />} 
                                color="#1976d2"
                                onClick={() => navigate(`/billing?month=${months[selectedMonth].toLowerCase()}&year=${selectedYear}`)}
                            />
                        </Grid>
                         <Grid item xs={12} sm={6} md={3}>
                             <StatCard 
                                title="Instalaciones" 
                                value={formatCurrency(stats.revenue.breakdown.installations)} 
                                icon={<BuildIcon sx={{ color: '#ff9800' }} />} 
                                color="#ff9800"
                                onClick={() => navigate(`/installation-billing?month=${months[selectedMonth].toLowerCase()}&year=${selectedYear}`)}
                            />
                        </Grid>
                         <Grid item xs={12} sm={6} md={3}>
                             <StatCard 
                                title="Productos" 
                                value={formatCurrency(stats.revenue.breakdown.products)} 
                                icon={<TvIcon sx={{ color: '#9c27b0' }} />} 
                                color="#9c27b0"
                                onClick={() => navigate(`/billing?month=${months[selectedMonth].toLowerCase()}&year=${selectedYear}`)}
                            />
                        </Grid>
                         <Grid item xs={12} sm={6} md={3}>
                             <StatCard 
                                title="Servicios Adic." 
                                value={formatCurrency(stats.revenue.breakdown.additionalServices)} 
                                icon={<OndemandVideoIcon sx={{ color: '#f44336' }} />} 
                                color="#f44336"
                                onClick={() => navigate(`/billing?month=${months[selectedMonth].toLowerCase()}&year=${selectedYear}`)}
                            />
                        </Grid>
                    </>
                )}

                {/* Client Status Section */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CheckCircleIcon color="info" /> Base de Clientes (Total)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Total Clientes" 
                        value={stats.clients.total} 
                        subtitle="Base total de clientes"
                        icon={<PeopleIcon sx={{ color: '#4caf50' }} />} 
                        color="#4caf50"
                        onClick={() => navigate(`/clients?month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Activos" 
                        value={stats.clients.active} 
                        icon={<CheckCircleIcon sx={{ color: '#2e7d32' }} />} 
                        color="#2e7d32"
                        onClick={() => navigate(`/clients?status=active&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Suspendidos" 
                        value={stats.clients.suspended} 
                        icon={<WarningIcon sx={{ color: '#ed6c02' }} />} 
                        color="#ed6c02"
                        onClick={() => navigate(`/clients?status=suspended&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard 
                        title="Cancelados" 
                        value={stats.clients.cancelled} 
                        icon={<CancelIcon sx={{ color: '#d32f2f' }} />} 
                        color="#d32f2f"
                        onClick={() => navigate(`/clients?status=cancelled&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>

                <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CancelIcon color="error" /> Retiros
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={`Retiros del Mes (${months[selectedMonth]} ${selectedYear})`}
                        value={stats.retiros.month}
                        subtitle="Clientes dados de baja este mes"
                        icon={<CancelIcon sx={{ color: '#e53935' }} />}
                        color="#e53935"
                        onClick={() => navigate(`/consultas?reportType=retired&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title={`Retiros Acumulados (${selectedYear})`}
                        value={stats.retiros.year}
                        subtitle="Bajas desde el inicio del año"
                        icon={<CancelIcon sx={{ color: '#b71c1c' }} />}
                        color="#b71c1c"
                        onClick={() => navigate(`/consultas?reportType=retired&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        title="Retiros Históricos"
                        value={stats.retiros.total}
                        subtitle="Total de clientes retirados"
                        icon={<CancelIcon sx={{ color: '#9e9e9e' }} />}
                        color="#9e9e9e"
                        onClick={() => navigate(`/consultas?reportType=retired`)}
                    />
                </Grid>

                {/* Additional Services Section */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TvIcon color="secondary" /> Servicios Adicionales (Instalados)
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                    <StatCard 
                        title="Netflix" 
                        value={stats.services.netflix} 
                        icon={<OndemandVideoIcon sx={{ color: '#e50914' }} />} 
                        color="#e50914"
                        onClick={() => navigate(`/clients?search=netflix&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard 
                        title="TV Box" 
                        value={stats.services.tvBox} 
                        icon={<RouterIcon sx={{ color: '#1976d2' }} />} 
                        color="#1976d2"
                        onClick={() => navigate(`/clients?search=box&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard 
                        title="Tele Latino" 
                        value={stats.services.teleLatino} 
                        icon={<TvIcon sx={{ color: '#9c27b0' }} />} 
                        color="#9c27b0"
                        onClick={() => navigate(`/clients?search=latino&month=${selectedMonth}&year=${selectedYear}`)}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

