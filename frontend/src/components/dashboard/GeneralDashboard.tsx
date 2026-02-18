import React, { useEffect, useState } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Divider,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  People,
  PersonAdd,
  PersonRemove,
  AccountBalanceWallet,
  AssignmentLate,
  Router,
} from '@mui/icons-material';
import { DashboardService, DashboardStats } from '../../services/DashboardService';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

// --- COLORS ---
const COLORS = {
  primary: '#4e73df',
  success: '#1cc88a',
  info: '#36b9cc',
  warning: '#f6c23e',
  danger: '#e74a3b',
  secondary: '#858796',
  light: '#f8f9fc',
  dark: '#5a5c69',
};

const PIE_COLORS = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#858796'];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtext, icon, color }) => (
  <Card sx={{ height: '100%', borderLeft: `4px solid ${color}`, boxShadow: 2 }}>
    <CardContent>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={8}>
          <Typography variant="overline" display="block" color={color} sx={{ fontWeight: 'bold' }}>
            {title}
          </Typography>
          <Typography variant="h5" component="div" sx={{ fontWeight: 'bold', color: COLORS.dark }}>
            {value}
          </Typography>
          {subtext && (
             <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
              {subtext}
            </Typography>
          )}
        </Grid>
        <Grid item xs={4} sx={{ textAlign: 'right' }}>
           <Box sx={{ color: '#dddfeb' }}>{icon}</Box>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

export const GeneralDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth] = useState(new Date().getMonth());
  const [selectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await DashboardService.getStats(selectedMonth, selectedYear);
        setStats(data);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [selectedMonth, selectedYear]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) return <Typography>No se pudieron cargar las estadísticas.</Typography>;

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  const formatPercentage = (value: number) => `${value}%`;

  // Prepare Chart Data
  const growthHistoryData = stats.history.growth;
  const revenueHistoryData = stats.history.revenue;
  
  const portfolioData = [
    { name: '0-30 Días', value: stats.collection.portfolioByAge.range0_30 },
    { name: '31-60 Días', value: stats.collection.portfolioByAge.range31_60 },
    { name: '61-90 Días', value: stats.collection.portfolioByAge.range61_90 },
    { name: '+90 Días', value: stats.collection.portfolioByAge.range90_plus },
  ];

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold', color: COLORS.dark }}>
        Dashboard Ejecutivo
      </Typography>

      {/* --- EXECUTIVE SUMMARY ROWS --- */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        
        {/* ROW 1: CLIENTS & GROWTH */}
        <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Clientes Activos" 
             value={stats.growth.totalActiveClients} 
             icon={<People fontSize="large" />} 
             color={COLORS.primary} 
           />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Nuevos (Mes)" 
             value={stats.growth.newClientsMonth} 
             subtext={`Crecimiento Neto: ${stats.growth.netGrowth}`}
             icon={<PersonAdd fontSize="large" />} 
             color={COLORS.success} 
           />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Retiros (Mes)" 
             value={stats.retention.retiredClientsMonth} 
             subtext={`Churn Rate: ${stats.retention.churnRate}%`}
             icon={<PersonRemove fontSize="large" />} 
             color={COLORS.danger} 
           />
        </Grid>
         <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Crecimiento Mensual" 
             value={formatPercentage(stats.growth.growthRate)} 
             icon={<TrendingUp fontSize="large" />} 
             color={COLORS.info} 
           />
        </Grid>

        {/* ROW 2: FINANCE */}
        <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Facturación (Mes)" 
             value={formatCurrency(stats.finance.monthlyBilling)} 
             icon={<AttachMoney fontSize="large" />} 
             color={COLORS.primary} 
           />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Recaudo Real" 
             value={formatCurrency(stats.collection.realCollection)} 
             subtext={`Eficiencia: ${stats.collection.collectionEfficiency}%`}
             icon={<AccountBalanceWallet fontSize="large" />} 
             color={COLORS.success} 
           />
        </Grid>
         <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="Cartera Vencida" 
             value={formatCurrency(stats.collection.totalOverdue)} 
             subtext={`Clientes en Mora: ${stats.collection.clientsInDefault}`}
             icon={<AssignmentLate fontSize="large" />} 
             color={COLORS.warning} 
           />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
           <MetricCard 
             title="ARPU" 
             value={formatCurrency(stats.finance.arpu)} 
             icon={<TrendingUp fontSize="large" />} 
             color={COLORS.info} 
           />
        </Grid>
      </Grid>

      {/* --- DETAILED SECTIONS --- */}
      
      <Grid container spacing={3}>
        
        {/* GROWTH & REVENUE CHARTS */}
        <Grid item xs={12} lg={8}>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: COLORS.primary, fontWeight: 'bold' }}>
              Histórico de Crecimiento (Últimos 6 meses)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Bar dataKey="newClients" name="Nuevos" fill={COLORS.success} />
                <Bar dataKey="retiredClients" name="Retiros" fill={COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper sx={{ p: 2 }}>
             <Typography variant="h6" sx={{ mb: 2, color: COLORS.primary, fontWeight: 'bold' }}>
              Facturación vs Recaudo
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="billed" name="Facturado" fill={COLORS.primary} />
                <Bar dataKey="collected" name="Recaudado" fill={COLORS.success} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* SIDEBAR CHARTS */}
        <Grid item xs={12} lg={4}>
           {/* PLANS DISTRIBUTION */}
           <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: COLORS.dark, fontWeight: 'bold' }}>
              Altas por Plan (Mes)
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie 
                  data={stats.growth.signupsByPlan} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={80} 
                  label 
                >
                  {stats.growth.signupsByPlan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }}/>
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          {/* RETIREMENT REASONS */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: COLORS.dark, fontWeight: 'bold' }}>
              Motivos de Retiro
            </Typography>
             <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie 
                  data={stats.retention.retirementReasons} 
                  dataKey="value" 
                  nameKey="name" 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60}
                  outerRadius={80} 
                >
                  {stats.retention.retirementReasons.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

           {/* PORTFOLIO AGE */}
           <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: COLORS.dark, fontWeight: 'bold' }}>
              Antigüedad de Cartera
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={portfolioData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(val) => `$${val/1000}k`} />
                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '12px' }} />
                <ChartTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Bar dataKey="value" name="Monto" fill={COLORS.warning} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

        </Grid>
      </Grid>
    </Box>
  );
};


