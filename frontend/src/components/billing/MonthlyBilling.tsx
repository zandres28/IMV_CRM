import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Button,
    Chip,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    Card,
    CardContent,
    Alert,
    IconButton,
    Tooltip,
    TablePagination,
    Checkbox,
    Snackbar,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import { formatLocalDate, toInputDateString } from '../../utils/dateUtils';
import {
    Refresh as RefreshIcon,
    Payment as PaymentIcon,
    Visibility as VisibilityIcon,
    Search as SearchIcon,
    Clear as ClearIcon,
    ExpandMore as ExpandMoreIcon,
    NotificationsActive as ReminderOnIcon,
    NotificationsOff as ReminderOffIcon
} from '@mui/icons-material';
import MonthlyBillingService, { Payment, BillingStats } from '../../services/MonthlyBillingService';

const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

const MonthlyBilling: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const currentDate = new Date();

    // Init state from URL params if available
    const urlMonth = searchParams.get('month');
    const urlYear = searchParams.get('year');
    const initialMonth = (urlMonth && MONTHS.includes(urlMonth)) ? urlMonth : MONTHS[currentDate.getMonth()];
    const initialYear = urlYear ? parseInt(urlYear) : currentDate.getFullYear();

    const [selectedMonth, setSelectedMonth] = useState(initialMonth);
    const [selectedYear, setSelectedYear] = useState(initialYear);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<BillingStats | null>(null);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'month' | 'cumulative'>('month');
    const [searchTerm, setSearchTerm] = useState('');
    
    const filteredPayments = payments.filter(payment => {
        if (!payment.client) return false; // Skip orphan payments
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            (payment.client.fullName || '').toLowerCase().includes(searchLower) ||
            (payment.client.identificationNumber || '').includes(searchLower)
        );
    });

    // Pagination
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Selección múltiple
    const [selectedPaymentIds, setSelectedPaymentIds] = useState<number[]>([]);
    const allSelected = selectedPaymentIds.length > 0 && selectedPaymentIds.length === filteredPayments.length;
    const someSelected = selectedPaymentIds.length > 0 && selectedPaymentIds.length < filteredPayments.length;
    
    // Snackbar feedback
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>(
        { open: false, message: '', severity: 'success' }
    );

    // Dialog para confirmación de cambio masivo
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkPaymentMethod, setBulkPaymentMethod] = useState('');
    const [bulkPaymentDate, setBulkPaymentDate] = useState(toInputDateString(new Date()));

    // Dialog para registrar pago
    const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentDate, setPaymentDate] = useState(toInputDateString(new Date()));
    const [paymentNotes, setPaymentNotes] = useState('');
    const [extraInstallmentIds, setExtraInstallmentIds] = useState<number[]>([]);

    // Dialog para detalle
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);

    const handleUpdateReminderStatus = async (clientIds: number[], sent: boolean) => {
        try {
            setLoading(true);
            await MonthlyBillingService.setReminderStatus(clientIds, sent);
            setSnackbar({ 
                open: true, 
                message: sent ? 'Recordatorios marcados como enviados' : 'Recordatorios reseteados (habilitados para envío)', 
                severity: 'success' 
            });
            await loadBillingData(); // Reload to see changes
        } catch (error) {
            console.error(error);
            setSnackbar({ open: true, message: 'Error actualizando estado', severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const loadBillingData = useCallback(async () => {
        setLoading(true);
        try {
            const status = filterStatus === 'all' ? undefined : filterStatus;
            const data = await MonthlyBillingService.getMonthlyBilling(selectedMonth, selectedYear, status, viewMode);
            setPayments(data.payments);
            setStats(data.stats);
        } catch (error) {
            console.error('Error cargando datos de facturación:', error);
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear, filterStatus, viewMode]);

    useEffect(() => {
        loadBillingData();
    }, [loadBillingData]);

    // Limpiar selección al cambiar filtros
    useEffect(() => {
        setSelectedPaymentIds([]);
    }, [selectedMonth, selectedYear, filterStatus, searchTerm]);

    const handleClearFilters = () => {
        setSearchTerm('');
        setFilterStatus('all');
        setPage(0);
    };

    const handleGenerateBilling = async () => {
        if (window.confirm(`¿Generar cobros para ${selectedMonth} ${selectedYear}?`)) {
            setLoading(true);
            try {
                await MonthlyBillingService.generateMonthlyBilling(selectedMonth, selectedYear);
                alert('Cobros generados exitosamente');
                loadBillingData();
            } catch (error) {
                console.error('Error generando cobros:', error);
                alert('Error generando cobros');
            } finally {
                setLoading(false);
            }
        }
    };

    const handleOpenPaymentDialog = async (payment: Payment) => {
        try {
            // Cargar detalle completo para tener acceso a productos y cuotas
            const detail = await MonthlyBillingService.getPaymentDetail(payment.id);
            setSelectedPayment(detail);
            setPaymentMethod('');
            setPaymentDate(toInputDateString(new Date()));
            setPaymentNotes('');
            setExtraInstallmentIds([]);
            setPaymentDialogOpen(true);
        } catch (error) {
            console.error('Error cargando detalle para pago:', error);
            // Fallback al pago básico si falla el detalle
            setSelectedPayment(payment);
            setPaymentDialogOpen(true);
        }
    };

    const handleRegisterPayment = async () => {
        if (!selectedPayment || !paymentMethod) {
            alert('Debe seleccionar un método de pago');
            return;
        }

        try {
            // Calcular total incluyendo extras
            const extraAmount = selectedPayment.client?.productsSold?.flatMap(p => p.installmentPayments || [])
                .filter(i => extraInstallmentIds.includes(i.id))
                .reduce((sum, i) => sum + Number(i.amount), 0) || 0;
            
            const totalAmount = Number(selectedPayment.amount) + extraAmount;

            await MonthlyBillingService.registerPayment(selectedPayment.id, {
                paymentDate,
                paymentMethod,
                amount: totalAmount,
                notes: paymentNotes,
                extraInstallmentIds
            });
            alert('Pago registrado exitosamente');
            setPaymentDialogOpen(false);
            loadBillingData();
        } catch (error) {
            console.error('Error registrando pago:', error);
            alert('Error registrando pago');
        }
    };

    const handleOpenDetailDialog = async (payment: Payment) => {
        try {
            const detail = await MonthlyBillingService.getPaymentDetail(payment.id);
            setSelectedPayment(detail);
            setDetailDialogOpen(true);
        } catch (error) {
            console.error('Error obteniendo detalle:', error);
        }
    };

    // Selección múltiple
    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedPaymentIds([]);
        } else {
            // Solo seleccionar pagos pendientes o vencidos
            const pendingIds = filteredPayments
                .filter(p => p.status === 'pending' || p.status === 'overdue')
                .map(p => p.id);
            setSelectedPaymentIds(pendingIds);
        }
    };

    const toggleSelectOne = (paymentId: number, status: string) => {
        // Solo permitir selección de pagos pendientes o vencidos
        if (status !== 'pending' && status !== 'overdue') return;
        
        setSelectedPaymentIds(prev => 
            prev.includes(paymentId) 
                ? prev.filter(id => id !== paymentId) 
                : [...prev, paymentId]
        );
    };

    // Abrir diálogo de confirmación
    const handleOpenBulkDialog = () => {
        setBulkPaymentMethod('');
        setBulkPaymentDate(toInputDateString(new Date()));
        setBulkDialogOpen(true);
    };

    // Marcar pagados en lote
    const handleBulkMarkPaid = async () => {
        if (selectedPaymentIds.length === 0 || !bulkPaymentMethod) {
            alert('Debe seleccionar un método de pago');
            return;
        }
        
        try {
            // Obtener IDs de cliente únicos de los pagos seleccionados
            const clientIds = Array.from(new Set(
                payments
                    .filter(p => selectedPaymentIds.includes(p.id))
                    .map(p => p.client?.id)
                    .filter((id): id is number => id !== undefined)
            ));

            const resp = await MonthlyBillingService.bulkMarkPaid({
                clientIds,
                month: selectedMonth,
                year: selectedYear,
                paymentMethod: bulkPaymentMethod,
                paymentDate: bulkPaymentDate
            });

            const updated = resp?.summary?.updated ?? 0;
            const already = resp?.summary?.alreadyPaid?.length ?? 0;
            const notFound = resp?.summary?.notFound?.length ?? 0;
            
            setSnackbar({ 
                open: true, 
                message: `Pagos actualizados: ${updated}. Ya pagados: ${already}. Sin pago: ${notFound}.`, 
                severity: 'success' 
            });
            
            setBulkDialogOpen(false);
            setSelectedPaymentIds([]);
            loadBillingData();
        } catch (e: any) {
            setSnackbar({ 
                open: true, 
                message: e?.response?.data?.message || 'Error marcando pagos', 
                severity: 'error' 
            });
        }
    };

    const getStatusChipProps = (payment: Payment) => {
        let status = payment.status;
        
        // Visual override for pending payments that are past due date
        if (status === 'pending') {
            const dueDate = new Date(payment.dueDate);
            const now = new Date();
            // Reset hours to compare dates only
            dueDate.setHours(23, 59, 59, 999); 
            
            if (now > dueDate) {
                status = 'overdue';
            }
        }

        switch (status) {
            case 'paid':
                return { label: 'Pagado', color: 'success' as const };
            case 'pending':
                return { label: 'Pendiente', color: 'warning' as const };
            case 'overdue':
                return { label: 'Vencido', color: 'error' as const };
            case 'cancelled':
                return { label: 'Cancelado', color: 'default' as const };
            default:
                return { label: status, color: 'default' as const };
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const paginatedPayments = filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h4" component="h1">
                    Facturación Mensual
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Modo de Vista</InputLabel>
                        <Select
                            value={viewMode}
                            label="Modo de Vista"
                            onChange={(e) => setViewMode(e.target.value as 'month' | 'cumulative')}
                            size="small"
                        >
                            <MenuItem value="month">Facturación del Mes</MenuItem>
                            <MenuItem value="cumulative">Cartera Acumulada</MenuItem>
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 150 }}>
                        <InputLabel>Mes</InputLabel>
                        <Select
                            value={selectedMonth}
                            label="Mes"
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {MONTHS.map(month => (
                                <MenuItem key={month} value={month}>
                                    {month.charAt(0).toUpperCase() + month.slice(1)}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl sx={{ minWidth: 120 }}>
                        <InputLabel>Año</InputLabel>
                        <Select
                            value={selectedYear}
                            label="Año"
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {[2024, 2025, 2026, 2027].map(year => (
                                <MenuItem key={year} value={year}>{year}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<RefreshIcon />}
                        onClick={handleGenerateBilling}
                        disabled={loading}
                    >
                        Generar Cobros
                    </Button>
                </Box>
            </Box>

            {/* Estadísticas */}
            {stats && (
                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Clientes
                                </Typography>
                                <Typography variant="h4">
                                    {stats.total}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total a Cobrar
                                </Typography>
                                <Typography variant="h5">
                                    {formatCurrency(stats.totalAmount)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'success.light' }}>
                            <CardContent>
                                <Typography color="white" gutterBottom>
                                    Cobrado
                                </Typography>
                                <Typography variant="h5" color="white">
                                    {formatCurrency(stats.paidAmount)}
                                </Typography>
                                <Typography variant="body2" color="white">
                                    {stats.paid} pagos
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card sx={{ bgcolor: 'warning.light' }}>
                            <CardContent>
                                <Typography color="white" gutterBottom>
                                    Pendiente
                                </Typography>
                                <Typography variant="h5" color="white">
                                    {formatCurrency(stats.pendingAmount)}
                                </Typography>
                                <Typography variant="body2" color="white">
                                    {stats.pending + stats.overdue} pagos
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    {/* Nuevas tarjetas de desglose */}
                    <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Planes de Servicio
                                </Typography>
                                <Typography variant="h6">
                                    {formatCurrency(stats.totalServicePlan)}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Servicios Adicionales
                                </Typography>
                                <Typography variant="h6" color="secondary">
                                    {formatCurrency(stats.totalAdditionalServices)}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    (Netflix, TVBox, etc.)
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Productos/Cuotas
                                </Typography>
                                <Typography variant="h6" color="primary">
                                    {formatCurrency(stats.totalProducts)}
                                </Typography>
                                <Typography variant="caption" color="textSecondary">
                                    (Routers, Antenas, etc.)
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Card variant="outlined" sx={{ bgcolor: 'info.light' }}>
                            <CardContent>
                                <Typography color="white" gutterBottom>
                                    Total Instalaciones
                                </Typography>
                                <Typography variant="h6" color="white">
                                    {formatCurrency(stats.totalInstallationFees || 0)}
                                </Typography>
                                <Typography variant="caption" color="white">
                                    (Recaudos por nuevas instalaciones)
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Filtro */}
            <Box sx={{ mb: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                    label="Buscar cliente (Nombre o Cédula)"
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(0); // Resetear a la primera página al buscar
                    }}
                    InputProps={{
                        startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />,
                    }}
                    sx={{ minWidth: 300 }}
                />
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Estado</InputLabel>
                    <Select
                        value={filterStatus}
                        label="Estado"
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <MenuItem value="all">Todos</MenuItem>
                        <MenuItem value="pending">Pendiente</MenuItem>
                        <MenuItem value="paid">Pagado</MenuItem>
                        <MenuItem value="overdue">Vencido</MenuItem>
                    </Select>
                </FormControl>
                <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClearFilters}
                    disabled={!searchTerm && filterStatus === 'all'}
                >
                    Limpiar
                </Button>
            </Box>

            {/* Tabla de pagos */}
            <TableContainer component={Paper}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#1976d2' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold', width: 48 }}>
                                <Tooltip title={allSelected ? 'Deseleccionar todos' : 'Seleccionar todos (solo pendientes)'}>
                                    <Checkbox
                                        indeterminate={someSelected}
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                        sx={{ color: 'white' }}
                                    />
                                </Tooltip>
                            </TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cliente</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Servicio</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Monto</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha Instalación</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedPayments.map((payment, index) => (
                            <TableRow 
                                key={payment.id}
                                sx={{ 
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                    '&:hover': { backgroundColor: '#e3f2fd' }
                                }}
                            >
                                <TableCell>
                                    <Checkbox
                                        checked={selectedPaymentIds.includes(payment.id)}
                                        onChange={() => toggleSelectOne(payment.id, payment.status)}
                                        disabled={payment.status !== 'pending' && payment.status !== 'overdue'}
                                    />
                                </TableCell>
                                <TableCell>
                                    <Box
                                        sx={{ cursor: 'pointer' }}
                                        title="Ver detalles del cliente"
                                        onClick={() => payment.client && navigate(`/clients/${payment.client.id}`)}
                                    >
                                        <Typography variant="body2" sx={{ fontWeight: 500, textDecoration: 'underline' }}>
                                            {payment.client?.fullName || 'Cliente Desconocido'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {payment.client?.identificationNumber || '-'}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {payment.client?.installations && payment.client.installations.length > 0 ? (
                                            payment.client.installations
                                                .filter(inst => inst.isActive)
                                                .map((inst, i) => (
                                                    <Chip
                                                        key={`plan-${i}`}
                                                        label={inst.servicePlan?.name || inst.serviceType}
                                                        size="small"
                                                        color="primary"
                                                        variant="filled"
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                ))
                                        ) : (
                                            <Chip
                                                label={payment.installation?.servicePlan?.name || payment.installation?.serviceType || '-'}
                                                size="small"
                                                color="default"
                                                variant="outlined"
                                            />
                                        )}
                                        
                                        {payment.client?.additionalServices?.filter(s => s.status === 'active').map((service, i) => {
                                            let label = service.name || '';
                                            let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
                                            let variant: 'filled' | 'outlined' = 'outlined';

                                            if (label) {
                                                if (/netflix/i.test(label)) {
                                                    label = 'N';
                                                    color = 'error';
                                                    variant = 'filled';
                                                } else if (/tele.?lat/i.test(label.replace(/\s+/g,'')) || /tele\s+latino/i.test(label)) {
                                                    label = 'TeleL';
                                                    color = 'secondary';
                                                    variant = 'filled';
                                                } else if (/tv\s*box/i.test(label) || /tvbox/i.test(label.replace(/\s+/g,''))) {
                                                    label = 'TVBox';
                                                    color = 'info';
                                                    variant = 'filled';
                                                }
                                            }

                                            return (
                                                <Chip
                                                    key={`svc-${i}`}
                                                    label={label}
                                                    size="small"
                                                    color={color}
                                                    variant={variant}
                                                    title={service.name}
                                                    sx={variant === 'filled' ? { fontWeight: 'bold' } : {}}
                                                />
                                            );
                                        })}

                                        {payment.client?.productsSold?.filter(p => p.status !== 'cancelled' && p.status !== 'paid').map((product, i) => {
                                            let label = product.productName;
                                            let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
                                            
                                            if (/tv\s*box|tvbox/i.test(product.productName)) {
                                                label = 'TVBox';
                                                color = 'info';
                                            } else if (/router/i.test(product.productName)) {
                                                label = 'Router';
                                                color = 'primary';
                                            } else if (/antena/i.test(product.productName)) {
                                                label = 'Antena';
                                                color = 'secondary';
                                            }

                                            return (
                                                <Chip
                                                    key={`prod-${i}`}
                                                    label={label}
                                                    size="small"
                                                    color={color}
                                                    variant="filled"
                                                    title={`Producto: ${product.productName}`}
                                                />
                                            );
                                        })}

                                        {payment.isProrated && (
                                            <Chip 
                                                label="Prorrateo" 
                                                size="small" 
                                                color="info" 
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {formatCurrency(payment.amount)}
                                    </Typography>
                                    {(payment.additionalServicesAmount > 0 || payment.productInstallmentsAmount > 0) && (
                                        <Typography variant="caption" color="textSecondary">
                                            + servicios/productos
                                        </Typography>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Chip 
                                        {...getStatusChipProps(payment)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {(() => {
                                        const installations = payment.client?.installations || [];
                                        const active = installations.find(i => i.isActive) || installations[0];
                                        return active ? formatLocalDate(active.installationDate) : '-';
                                    })()}
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title="Ver detalle">
                                        <IconButton 
                                            size="small" 
                                            onClick={() => handleOpenDetailDialog(payment)}
                                        >
                                            <VisibilityIcon />
                                        </IconButton>
                                    </Tooltip>
                                    {(payment.status === 'pending' || payment.status === 'overdue') && (
                                        <Tooltip title="Registrar pago">
                                            <IconButton 
                                                size="small" 
                                                color="primary"
                                                onClick={() => handleOpenPaymentDialog(payment)}
                                            >
                                                <PaymentIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title={payment.reminderSent ? "Deshabilitar envío (Ya enviado)" : "Habilitar envío (No enviado)"}>
                                        <IconButton
                                            size="small"
                                            color={payment.reminderSent ? "success" : "default"}
                                            onClick={() => handleUpdateReminderStatus([payment.client.id], !payment.reminderSent)}
                                        >
                                            {payment.reminderSent ? <ReminderOnIcon /> : <ReminderOffIcon />}
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    component="div"
                    count={filteredPayments.length}
                    page={page}
                    onPageChange={(_, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Filas por página:"
                />
            </TableContainer>

            {/* Barra de acciones para selección múltiple */}
            {selectedPaymentIds.length > 0 && (
                <Paper sx={{ p: 2, mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                    <Typography variant="body2">
                        Seleccionados: {selectedPaymentIds.length} pago(s)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                            variant="contained" 
                            color="info" 
                            startIcon={<ReminderOffIcon />}
                            onClick={() => {
                                const clientIds = payments.filter(p => selectedPaymentIds.includes(p.id)).map(p => p.client.id);
                                handleUpdateReminderStatus(clientIds, false);
                            }}
                        >
                            Resetear Envíos
                        </Button>
                        <Button 
                            variant="contained" 
                            color="secondary" 
                            startIcon={<ReminderOnIcon />}
                            onClick={() => {
                                const clientIds = payments.filter(p => selectedPaymentIds.includes(p.id)).map(p => p.client.id);
                                handleUpdateReminderStatus(clientIds, true);
                            }}
                        >
                            Marcar Enviados
                        </Button>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleOpenBulkDialog}
                        >
                            Marcar como Pagado
                        </Button>
                    </Box>
                </Paper>
            )}

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                message={snackbar.message}
            />

            {/* Dialog para confirmación de cambio masivo */}
            <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Confirmar Marcado Masivo de Pagos</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2 }}>
                        <Alert severity="warning" sx={{ mb: 3 }}>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                                Esta acción marcará {selectedPaymentIds.length} pago(s) como pagado(s)
                            </Typography>
                            <Typography variant="body2">
                                Mes: <strong>{selectedMonth.charAt(0).toUpperCase() + selectedMonth.slice(1)} {selectedYear}</strong>
                            </Typography>
                            <Typography variant="body2">
                                Clientes afectados: <strong>
                                    {Array.from(new Set(
                                        payments
                                            .filter(p => selectedPaymentIds.includes(p.id))
                                            .map(p => p.client.fullName)
                                    )).length}
                                </strong>
                            </Typography>
                        </Alert>

                        <TextField
                            fullWidth
                            label="Fecha de Pago"
                            type="date"
                            value={bulkPaymentDate}
                            onChange={(e) => setBulkPaymentDate(e.target.value)}
                            sx={{ mb: 2 }}
                            InputLabelProps={{ shrink: true }}
                        />

                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Método de Pago *</InputLabel>
                            <Select
                                value={bulkPaymentMethod}
                                label="Método de Pago *"
                                onChange={(e) => setBulkPaymentMethod(e.target.value)}
                            >
                                <MenuItem value="efectivo">Efectivo</MenuItem>
                                <MenuItem value="nequi">Nequi</MenuItem>
                                <MenuItem value="bancolombia">Bancolombia</MenuItem>
                                <MenuItem value="daviplata">Daviplata</MenuItem>
                                <MenuItem value="transferencia">Transferencia</MenuItem>
                                <MenuItem value="otro">Otro</MenuItem>
                            </Select>
                        </FormControl>

                        <Alert severity="info">
                            <Typography variant="caption">
                                Los pagos ya marcados como pagados no serán afectados.
                            </Typography>
                        </Alert>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
                    <Button 
                        onClick={handleBulkMarkPaid} 
                        variant="contained" 
                        color="primary"
                        disabled={!bulkPaymentMethod}
                    >
                        Confirmar y Marcar Pagados
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog para registrar pago */}
            <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Registrar Pago</DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Box sx={{ pt: 2 }}>
                            <Alert severity="info" sx={{ mb: 2 }}>
                                <Typography variant="body2">
                                    <strong>Cliente:</strong> {selectedPayment.client?.fullName || 'Desconocido'}
                                </Typography>
                                <Typography variant="body2">
                                    <strong>Monto Base:</strong> {formatCurrency(selectedPayment.amount)}
                                </Typography>
                                {extraInstallmentIds.length > 0 && (
                                    <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                                        <strong>+ Adicionales:</strong> {formatCurrency(
                                            selectedPayment.client?.productsSold?.flatMap(p => p.installmentPayments || [])
                                                .filter(i => extraInstallmentIds.includes(i.id))
                                                .reduce((sum, i) => sum + Number(i.amount), 0) || 0
                                        )}
                                    </Typography>
                                )}
                                <Typography variant="h6" sx={{ mt: 1 }}>
                                    <strong>Total a Pagar:</strong> {formatCurrency(
                                        Number(selectedPayment.amount) + 
                                        (selectedPayment.client?.productsSold?.flatMap(p => p.installmentPayments || [])
                                            .filter(i => extraInstallmentIds.includes(i.id))
                                            .reduce((sum, i) => sum + Number(i.amount), 0) || 0)
                                    )}
                                </Typography>
                            </Alert>

                            {/* Selección de cuotas adicionales */}
                            {selectedPayment.client?.productsSold && selectedPayment.client.productsSold.length > 0 && (
                                <Box sx={{ mb: 2, border: '1px solid #e0e0e0', borderRadius: 1, p: 1 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Agregar cuotas adicionales:</Typography>
                                    <List dense sx={{ maxHeight: 150, overflow: 'auto' }}>
                                        {selectedPayment.client.productsSold.flatMap(product => 
                                            product.installmentPayments
                                                ?.filter(inst => {
                                                    // Mostrar cuotas pendientes que NO están incluidas en el cobro base
                                                    // Asumimos que el cobro base incluye las que vencen en este mes
                                                    const dueDate = new Date(inst.dueDate);
                                                    const monthIndex = MONTHS.indexOf(selectedPayment.paymentMonth.toLowerCase());
                                                    const billingPeriodEnd = new Date(selectedPayment.paymentYear, monthIndex + 1, 5);
                                                    
                                                    return inst.status === 'pending' && dueDate > billingPeriodEnd;
                                                })
                                                .map(inst => (
                                                    <ListItem key={`${product.id}-${inst.id}`} disablePadding>
                                                        <ListItemIcon sx={{ minWidth: 36 }}>
                                                            <Checkbox
                                                                edge="start"
                                                                checked={extraInstallmentIds.includes(inst.id)}
                                                                tabIndex={-1}
                                                                disableRipple
                                                                onChange={() => {
                                                                    setExtraInstallmentIds(prev => 
                                                                        prev.includes(inst.id)
                                                                            ? prev.filter(id => id !== inst.id)
                                                                            : [...prev, inst.id]
                                                                    );
                                                                }}
                                                            />
                                                        </ListItemIcon>
                                                        <ListItemText 
                                                            primary={`${product.productName} - Cuota ${inst.installmentNumber}`}
                                                            secondary={`${formatCurrency(inst.amount)} - Vence: ${formatLocalDate(inst.dueDate)}`}
                                                        />
                                                    </ListItem>
                                                ))
                                        )}
                                    </List>
                                </Box>
                            )}

                            <TextField
                                fullWidth
                                label="Fecha de Pago"
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                sx={{ mb: 2 }}
                                InputLabelProps={{ shrink: true }}
                            />

                            <FormControl fullWidth sx={{ mb: 2 }}>
                                <InputLabel>Método de Pago *</InputLabel>
                                <Select
                                    value={paymentMethod}
                                    label="Método de Pago *"
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                >
                                    <MenuItem value="efectivo">Efectivo</MenuItem>
                                    <MenuItem value="nequi">Nequi</MenuItem>
                                    <MenuItem value="bancolombia">Bancolombia</MenuItem>
                                    <MenuItem value="daviplata">Daviplata</MenuItem>
                                    <MenuItem value="transferencia">Transferencia</MenuItem>
                                    <MenuItem value="otro">Otro</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                fullWidth
                                label="Notas"
                                multiline
                                rows={3}
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPaymentDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleRegisterPayment} variant="contained" color="primary">
                        Registrar Pago
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog para detalle */}
            <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Detalle del Pago</DialogTitle>
                <DialogContent>
                    {selectedPayment && (
                        <Box sx={{ pt: 2 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Cliente</Typography>
                                    <Typography variant="body1">{selectedPayment.client?.fullName || 'Desconocido'}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Estado</Typography>
                                    <Chip {...getStatusChipProps(selectedPayment)} size="small" />
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Servicio(s)</Typography>
                                    <Typography variant="body1">
                                        {selectedPayment.client?.installations && selectedPayment.client.installations.length > 0 ? (
                                            selectedPayment.client.installations
                                                .filter(inst => inst.isActive)
                                                .map(inst => (
                                                    <div key={inst.id}>
                                                        {inst.servicePlan?.name || inst.serviceType}
                                                        {inst.servicePlan?.speedMbps && ` (${inst.servicePlan.speedMbps} Mbps)`}
                                                    </div>
                                                ))
                                        ) : (
                                            selectedPayment.installation?.servicePlan?.name || selectedPayment.installation?.serviceType || 'Sin servicio'
                                        )}
                                    </Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Fecha Vencimiento</Typography>
                                    <Typography variant="body1">
                                        {formatLocalDate(selectedPayment.dueDate)}
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Desglose del Cobro</Typography>
                                </Grid>
                                
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Plan de Servicio</Typography>
                                    <Typography variant="body1">{formatCurrency(selectedPayment.servicePlanAmount)}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Servicios Adicionales</Typography>
                                    <Typography variant="body1">{formatCurrency(selectedPayment.additionalServicesAmount)}</Typography>
                                </Grid>
                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary">Cuotas de Productos</Typography>
                                    <Typography variant="body1">{formatCurrency(selectedPayment.productInstallmentsAmount)}</Typography>
                                </Grid>
                                
                                {/* Desglose de cuotas de productos */}
                                {selectedPayment.client?.productsSold && selectedPayment.client.productsSold.length > 0 && (
                                    <Grid item xs={12}>
                                        <Accordion disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                <Typography variant="subtitle2">Ver detalle de cuotas</Typography>
                                            </AccordionSummary>
                                            <AccordionDetails>
                                                <List dense>
                                                    {selectedPayment.client.productsSold.flatMap(product => 
                                                        product.installmentPayments
                                                            ?.filter(inst => {
                                                                // Mostrar cuotas que vencen en este mes de facturación o antes (si están pendientes)
                                                                // O si el pago ya se realizó, las que coincidan con la fecha de pago aprox?
                                                                // Por simplicidad, mostramos las que contribuyen al monto:
                                                                // Vencimiento en el mes del pago (hasta día 5 del siguiente)
                                                                const dueDate = new Date(inst.dueDate);
                                                                const monthIndex = MONTHS.indexOf(selectedPayment.paymentMonth.toLowerCase());
                                                                const billingPeriodEnd = new Date(selectedPayment.paymentYear, monthIndex + 1, 5);
                                                                const billingPeriodStart = new Date(selectedPayment.paymentYear, monthIndex, 1);
                                                                
                                                                // Si es un pago histórico, mostrar las que vencían en ese periodo
                                                                return dueDate <= billingPeriodEnd && (inst.status === 'pending' || inst.status === 'paid');
                                                            })
                                                            .map(inst => (
                                                                <ListItem key={`${product.id}-${inst.id}`}>
                                                                    <ListItemText 
                                                                        primary={`${product.productName} - Cuota ${inst.installmentNumber}`}
                                                                        secondary={`Vence: ${formatLocalDate(inst.dueDate)} - Estado: ${inst.status}`}
                                                                    />
                                                                    <Typography variant="body2">{formatCurrency(inst.amount)}</Typography>
                                                                </ListItem>
                                                            ))
                                                    )}
                                                </List>
                                            </AccordionDetails>
                                        </Accordion>
                                    </Grid>
                                )}

                                <Grid item xs={6}>
                                    <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 'bold' }}>Total</Typography>
                                    <Typography variant="h6" color="primary">{formatCurrency(selectedPayment.amount)}</Typography>
                                </Grid>

                                {selectedPayment.isProrated && (
                                    <Grid item xs={12}>
                                        <Alert severity="info">
                                            Prorrateo: {selectedPayment.billedDays} días de {selectedPayment.totalDaysInMonth}
                                        </Alert>
                                    </Grid>
                                )}

                                {selectedPayment.paymentDate && (
                                    <>
                                        <Grid item xs={6}>
                                            <Typography variant="subtitle2" color="textSecondary">Fecha de Pago</Typography>
                                            <Typography variant="body1">
                                                {formatLocalDate(selectedPayment.paymentDate)}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Typography variant="subtitle2" color="textSecondary">Método de Pago</Typography>
                                            <Typography variant="body1">{selectedPayment.paymentMethod || '-'}</Typography>
                                        </Grid>
                                    </>
                                )}

                                {selectedPayment.notes && (
                                    <Grid item xs={12}>
                                        <Typography variant="subtitle2" color="textSecondary">Notas</Typography>
                                        <Typography variant="body2">{selectedPayment.notes}</Typography>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDetailDialogOpen(false)}>Cerrar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MonthlyBilling;
