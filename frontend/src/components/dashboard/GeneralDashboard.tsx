import React, { useEffect, useState, useCallback } from 'react';
import {
  Grid,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  IconButton,
  Button,
  Skeleton,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  AttachMoney,
  People,
  PersonAdd,
  PersonRemove,
  AccountBalanceWallet,
  AssignmentLate,
  ChevronLeft,
  ChevronRight,
  Refresh,
} from '@mui/icons-material';
import { DashboardService, DashboardStats } from '../../services/DashboardService';
import {
  BarChart,
  Bar,
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
import { tokens } from '../../theme';
import { useNavigate } from 'react-router-dom';

const PIE_COLORS = [tokens.brand, tokens.accent, tokens.info, tokens.warn, tokens.danger, tokens.muted];

interface MetricCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
  color: string;
  delta?: number;
  sparkline?: number[];
  onClick?: () => void;
  prominent?: boolean;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;
  const w = 96;
  const h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => `${(i * step).toFixed(2)},${(h - ((v - min) / range) * h).toFixed(2)}`)
    .join(' ');
  const area = `0,${h} ${points} ${w},${h}`;
  const id = `g-${color.replace('#', '')}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden focusable="false">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtext, icon, color, delta, sparkline, onClick, prominent }) => {
  const positive = (delta ?? 0) >= 0;
  const deltaColor = delta == null ? 'text.secondary' : positive ? 'success.main' : 'error.main';
  const deltaLabel = delta == null ? null : `${positive ? '+' : ''}${delta.toFixed(1)}%`;

  return (
    <Card
      onClick={onClick}
      sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: onClick ? 'pointer' : 'default',
        ...(prominent && {
          gridColumn: { md: 'span 2' },
          '& .MuiCardContent-root': {
            display: 'flex',
            flexDirection: { md: 'row' },
            alignItems: { md: 'center' },
            gap: { md: 3 },
          },
        }),
      }}
    >
      <CardContent sx={{ pb: '16px !important' }}>
        <Stack
          direction={prominent ? { xs: 'row', md: 'row' } : 'row'}
          alignItems="flex-start"
          justifyContent="space-between"
          spacing={1.5}
        >
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {title}
            </Typography>
            <Typography
              variant={prominent ? 'h3' : 'h4'}
              component="div"
              sx={{
                fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
                fontWeight: 700,
                color: 'text.primary',
                lineHeight: 1.1,
                fontSize: { xs: prominent ? '1.8rem' : '1.4rem', sm: prominent ? '2.2rem' : '1.6rem' },
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {value}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.75 }}>
              {deltaLabel && (
                <Typography
                  variant="caption"
                  sx={{
                    color: deltaColor,
                    fontWeight: 700,
                    fontFamily: '"JetBrains Mono", monospace',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                  }}
                >
                  {positive ? (
                    <Box component="span" sx={{ fontSize: '0.6rem' }}>&#9650;</Box>
                  ) : (
                    <Box component="span" sx={{ fontSize: '0.6rem' }}>&#9660;</Box>
                  )}
                  {deltaLabel}
                </Typography>
              )}
              {subtext && (
                <Typography variant="caption" color="text.secondary" noWrap>
                  {subtext}
                </Typography>
              )}
            </Stack>
          </Box>
          <Box
            sx={{
              width: prominent ? 52 : 40,
              height: prominent ? 52 : 40,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color,
              background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
              border: `1px solid ${color}33`,
            }}
          >
            {icon}
          </Box>
        </Stack>
        {sparkline && (
          <Box sx={{ mt: 1.5, opacity: 0.95 }}>
            <Sparkline data={sparkline} color={color} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const SkeletonCard: React.FC = () => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ pb: '16px !important' }}>
      <Skeleton variant="text" width="60%" sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width="80%" height={40} />
      <Skeleton variant="text" width="40%" />
    </CardContent>
  </Card>
);

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const GeneralDashboard: React.FC = () => {
  const navigate = useNavigate();
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await DashboardService.getStats(selectedMonth, selectedYear);
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('No se pudieron cargar las estadísticas. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const navigatePeriod = (direction: -1 | 1) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;
    if (newMonth < 0) { newMonth = 11; newYear -= 1; }
    if (newMonth > 11) { newMonth = 0; newYear += 1; }
    if (newYear > today.getFullYear() || (newYear === today.getFullYear() && newMonth > today.getMonth())) return;
    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);

  if (loading) {
    return (
      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width="160px" />
          <Skeleton variant="text" width="280px" height={44} />
        </Box>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <SkeletonCard />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Alert
          severity="error"
          sx={{ maxWidth: 480, borderRadius: 2 }}
          action={
            <Button color="error" size="small" startIcon={<Refresh />} onClick={fetchStats}>
              Reintentar
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!stats) return null;

  const growthHistoryData = stats.history.growth;
  const revenueHistoryData = stats.history.revenue;

  const portfolioData = [
    { name: '0-30 Días', value: stats.collection.portfolioByAge.range0_30 },
    { name: '31-60 Días', value: stats.collection.portfolioByAge.range31_60 },
    { name: '61-90 Días', value: stats.collection.portfolioByAge.range61_90 },
    { name: '+90 Días', value: stats.collection.portfolioByAge.range90_plus },
  ];

  const isCurrentPeriod = selectedMonth === today.getMonth() && selectedYear === today.getFullYear();

  return (
    <Box sx={{ flexGrow: 1, p: 2 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Resumen ejecutivo
          </Typography>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' }}
          >
            Dashboard Ejecutivo
          </Typography>
        </Box>
        <Paper
          variant="outlined"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, px: 1, py: 0.5, borderRadius: 2 }}
        >
          <IconButton size="small" onClick={() => navigatePeriod(-1)} aria-label="Mes anterior">
            <ChevronLeft fontSize="small" />
          </IconButton>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, minWidth: 120, textAlign: 'center', fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif' }}
          >
            {MONTHS[selectedMonth]} {selectedYear}
          </Typography>
          <IconButton
            size="small"
            onClick={() => navigatePeriod(1)}
            aria-label="Mes siguiente"
            disabled={isCurrentPeriod}
          >
            <ChevronRight fontSize="small" />
          </IconButton>
        </Paper>
      </Box>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="Clientes Activos"
            value={stats.growth.totalActiveClients}
            icon={<People fontSize="small" />}
            color={tokens.brand}
            sparkline={growthHistoryData.map((g) => g.netGrowth)}
            onClick={() => navigate('/clients')}
            prominent
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Nuevos (Mes)"
            value={stats.growth.newClientsMonth}
            subtext={`Crec. Neto: ${stats.growth.netGrowth}`}
            icon={<PersonAdd fontSize="small" />}
            color={tokens.accent}
            delta={stats.growth.growthRate}
            sparkline={growthHistoryData.map((g) => g.newClients)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Retiros (Mes)"
            value={stats.retention.retiredClientsMonth}
            subtext={`Churn: ${stats.retention.churnRate}%`}
            icon={<PersonRemove fontSize="small" />}
            color={tokens.danger}
            delta={-stats.retention.churnRate}
            sparkline={growthHistoryData.map((g) => g.retiredClients)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Crecimiento"
            value={`${stats.growth.growthRate}%`}
            icon={<TrendingUp fontSize="small" />}
            color={tokens.info}
            delta={stats.growth.growthRate}
            sparkline={growthHistoryData.map((g) => g.netGrowth)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2}>
          <MetricCard
            title="Facturación (Mes)"
            value={formatCurrency(stats.finance.monthlyBilling)}
            icon={<AttachMoney fontSize="small" />}
            color={tokens.brand}
            sparkline={revenueHistoryData.map((r) => r.billed)}
            onClick={() => navigate('/billing')}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Recaudo Real"
            value={formatCurrency(stats.collection.realCollection)}
            subtext={`Eficiencia: ${stats.collection.collectionEfficiency}%`}
            icon={<AccountBalanceWallet fontSize="small" />}
            color={tokens.accent}
            delta={stats.collection.collectionEfficiency}
            sparkline={revenueHistoryData.map((r) => r.collected)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="ARPU"
            value={formatCurrency(stats.finance.arpu)}
            icon={<TrendingUp fontSize="small" />}
            color={tokens.info}
            sparkline={revenueHistoryData.map((r) => r.billed)}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Cartera Vencida"
            value={formatCurrency(stats.collection.totalOverdue)}
            subtext={`Mora: ${stats.collection.clientsInDefault} clientes`}
            icon={<AssignmentLate fontSize="small" />}
            color={tokens.warn}
            sparkline={[
              stats.collection.portfolioByAge.range0_30,
              stats.collection.portfolioByAge.range31_60,
              stats.collection.portfolioByAge.range61_90,
              stats.collection.portfolioByAge.range90_plus,
            ]}
            onClick={() => navigate('/clients?status=mora')}
            prominent
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Antigüedad Cartera"
            value={`${stats.collection.portfolioByAge.range90_plus > 0 ? stats.collection.portfolioByAge.range90_plus : 0}`}
            subtext="+90 días en mora"
            icon={<AssignmentLate fontSize="small" />}
            color={tokens.danger}
            onClick={() => navigate('/billing?tab=cartera')}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={8}>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: tokens.brand, fontWeight: 'bold' }}>
              Histórico de Crecimiento (Últimos 6 meses)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={growthHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip />
                <Legend />
                <Bar dataKey="newClients" name="Nuevos" fill={tokens.accent} />
                <Bar dataKey="retiredClients" name="Retiros" fill={tokens.danger} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: tokens.brand, fontWeight: 'bold' }}>
              Facturación vs Recaudo
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueHistoryData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <ChartTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Legend />
                <Bar dataKey="billed" name="Facturado" fill={tokens.brand} />
                <Bar dataKey="collected" name="Recaudado" fill={tokens.accent} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} lg={4}>
          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: tokens.ink, fontWeight: 'bold' }}>
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
                  {stats.growth.signupsByPlan.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, color: tokens.ink, fontWeight: 'bold' }}>
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
                  {stats.retention.retirementReasons.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <ChartTooltip />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, color: tokens.ink, fontWeight: 'bold' }}>
              Antigüedad de Cartera
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={portfolioData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(val: number) => `$${val / 1000}k`} />
                <YAxis dataKey="name" type="category" width={80} style={{ fontSize: '12px' }} />
                <ChartTooltip formatter={(value: any) => formatCurrency(Number(value))} />
                <Bar dataKey="value" name="Monto" fill={tokens.warn} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};
