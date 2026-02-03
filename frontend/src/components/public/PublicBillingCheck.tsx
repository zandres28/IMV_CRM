import React, { useState } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Container,
    Collapse,
    Chip
} from '@mui/material';
import { Search as SearchIcon, ReceiptLong as ReceiptIcon, KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';
import axios from 'axios';
import { formatLocalDate } from '../../utils/dateUtils';

interface PaymentDetails {
    servicePlan: number;
    additionalServices: number;
    products: number;
    installationFee: number;
    discount: number;
    isProrated: boolean;
    billedDays?: number;
    notes?: string;
}

interface PublicPayment {
    month: string;
    year: number;
    amount: number;
    dueDate: string;
    status: string;
    type: string;
    details: PaymentDetails;
}

interface BillingResult {
    clientName: string;
    identificationNumber: string;
    totalPending: number;
    payments: PublicPayment[];
}

const PaymentRow = ({ payment }: { payment: PublicPayment }) => {
    const [open, setOpen] = useState(false);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusChip = (status: string) => {
        switch (status) {
            case 'pending':
                return <Chip label="Pendiente" color="warning" size="small" />;
            case 'overdue':
                return <Chip label="Vencido" color="error" size="small" />;
            default:
                return <Chip label={status} size="small" />;
        }
    };

    return (
        <>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <Button
                        aria-label="expand row"
                        size="small"
                        onClick={() => setOpen(!open)}
                        endIcon={open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                        sx={{ textTransform: 'none', minWidth: '120px' }}
                    >
                        {open ? 'Ocultar' : 'Ver detalle'}
                    </Button>
                </TableCell>
                <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ReceiptIcon color="action" fontSize="small" />
                        <Typography variant="body2">
                            {payment.type === 'monthly' ? 'Mensualidad' : 'Otro'} {payment.month} {payment.year}
                        </Typography>
                    </Box>
                </TableCell>
                <TableCell>{formatLocalDate(payment.dueDate)}</TableCell>
                <TableCell>{getStatusChip(payment.status)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(payment.amount)}
                </TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1, p: 2, bgcolor: '#fafafa', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom component="div" color="primary">
                                Detalle del Cobro
                            </Typography>
                            <Table size="small" aria-label="purchases">
                                <TableBody>
                                    {payment.details.servicePlan > 0 && (
                                        <TableRow>
                                            <TableCell component="th" scope="row">Plan de Servicio</TableCell>
                                            <TableCell align="right">{formatCurrency(payment.details.servicePlan)}</TableCell>
                                        </TableRow>
                                    )}
                                    {payment.details.additionalServices > 0 && (
                                        <TableRow>
                                            <TableCell component="th" scope="row">Servicios Adicionales</TableCell>
                                            <TableCell align="right">{formatCurrency(payment.details.additionalServices)}</TableCell>
                                        </TableRow>
                                    )}
                                    {payment.details.products > 0 && (
                                        <TableRow>
                                            <TableCell component="th" scope="row">Cuotas de Productos</TableCell>
                                            <TableCell align="right">{formatCurrency(payment.details.products)}</TableCell>
                                        </TableRow>
                                    )}
                                    {payment.details.installationFee > 0 && (
                                        <TableRow>
                                            <TableCell component="th" scope="row">Instalación</TableCell>
                                            <TableCell align="right">{formatCurrency(payment.details.installationFee)}</TableCell>
                                        </TableRow>
                                    )}
                                    {payment.details.discount > 0 && (
                                        <TableRow>
                                            <TableCell component="th" scope="row" sx={{ color: 'success.main' }}>Descuentos (Caídas de servicio)</TableCell>
                                            <TableCell align="right" sx={{ color: 'success.main' }}>- {formatCurrency(payment.details.discount)}</TableCell>
                                        </TableRow>
                                    )}
                                    {payment.details.isProrated && (
                                        <TableRow>
                                            <TableCell colSpan={2}>
                                                <Alert severity="info" sx={{ py: 0 }}>
                                                    <Typography variant="caption">
                                                        Este cobro incluye prorrateo ({payment.details.billedDays} días facturados).
                                                    </Typography>
                                                </Alert>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {payment.details.notes && (
                                        <TableRow>
                                            <TableCell colSpan={2}>
                                                <Typography variant="caption" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                                                    Nota: {payment.details.notes}
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </>
    );
};

const PublicBillingCheck: React.FC = () => {
    const [identificationNumber, setIdentificationNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<BillingResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    
    // Simple Math Captcha
    const [captcha, setCaptcha] = useState({ num1: Math.floor(Math.random() * 10), num2: Math.floor(Math.random() * 10) });
    const [captchaInput, setCaptchaInput] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!identificationNumber.trim()) return;

        // Verify Captcha
        if (parseInt(captchaInput) !== captcha.num1 + captcha.num2) {
            setError('La respuesta de seguridad es incorrecta. Intente nuevamente.');
            setCaptcha({ num1: Math.floor(Math.random() * 10), num2: Math.floor(Math.random() * 10) });
            setCaptchaInput('');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.get(`${API_URL}/public/billing/${identificationNumber}`);
            setResult(response.data);
        } catch (err: any) {
            if (err.response && err.response.status === 429) {
                setError('Demasiadas consultas. Por favor intente más tarde.');
            } else if (err.response && err.response.status === 404) {
                setError('No se encontró ningún cliente con ese número de identificación.');
            } else {
                setError('Ocurrió un error al consultar la información. Por favor intente nuevamente.');
            }
        } finally {
            setLoading(false);
            // Reset captcha after search
            setCaptcha({ num1: Math.floor(Math.random() * 10), num2: Math.floor(Math.random() * 10) });
            setCaptchaInput('');
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                bgcolor: '#f5f5f5',
                py: 4
            }}
        >
            <Container maxWidth="md">
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography variant="h4" component="h1" color="primary" gutterBottom fontWeight="bold">
                        Consulta de Pagos
                    </Typography>
                    <Typography variant="subtitle1" color="textSecondary">
                        Ingrese su número de cédula para consultar sus pagos pendientes
                    </Typography>
                </Box>

                <Card elevation={3} sx={{ mb: 4 }}>
                    <CardContent sx={{ p: 4 }}>
                        <form onSubmit={handleSearch}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                                    <TextField
                                        fullWidth
                                        label="Número de Cédula / NIT"
                                        variant="outlined"
                                        value={identificationNumber}
                                        onChange={(e) => setIdentificationNumber(e.target.value)}
                                        placeholder="Ej: 1234567890"
                                        autoFocus
                                    />
                                    <Box sx={{ display: 'flex', gap: 1, minWidth: { sm: 200 } }}>
                                        <TextField
                                            label={`¿Cuánto es ${captcha.num1} + ${captcha.num2}?`}
                                            variant="outlined"
                                            value={captchaInput}
                                            onChange={(e) => setCaptchaInput(e.target.value)}
                                            type="number"
                                            required
                                            fullWidth
                                        />
                                    </Box>
                                </Box>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    size="large"
                                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                                    disabled={loading || !identificationNumber.trim() || !captchaInput}
                                    sx={{ height: 56, alignSelf: { sm: 'flex-start' } }}
                                >
                                    {loading ? 'Buscando...' : 'Consultar'}
                                </Button>
                            </Box>
                        </form>
                    </CardContent>
                </Card>

                {error && (
                    <Alert severity="error" sx={{ mb: 4 }}>
                        {error}
                    </Alert>
                )}

                {result && (
                    <Card elevation={3}>
                        <CardContent sx={{ p: 0 }}>
                            <Box sx={{ p: 3, bgcolor: '#e3f2fd', borderBottom: '1px solid #bbdefb' }}>
                                <Typography variant="h6" gutterBottom>
                                    Resultados para: <strong>{result.clientName}</strong>
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Cédula: {result.identificationNumber}
                                </Typography>
                            </Box>

                            <Box sx={{ p: 3 }}>
                                {result.payments.length > 0 ? (
                                    <>
                                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                                            <Typography variant="h6">
                                                Pagos Pendientes
                                            </Typography>
                                            <Paper sx={{ p: 2, bgcolor: '#fff3e0', border: '1px solid #ffe0b2' }}>
                                                <Typography variant="subtitle2" color="textSecondary">
                                                    Total a Pagar
                                                </Typography>
                                                <Typography variant="h4" color="error" fontWeight="bold">
                                                    {formatCurrency(result.totalPending)}
                                                </Typography>
                                            </Paper>
                                        </Box>

                                        <TableContainer component={Paper} variant="outlined">
                                            <Table>
                                                <TableHead>
                                                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                                                        <TableCell width={140} />
                                                        <TableCell>Concepto</TableCell>
                                                        <TableCell>Vencimiento</TableCell>
                                                        <TableCell>Estado</TableCell>
                                                        <TableCell align="right">Monto</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {result.payments.map((payment, index) => (
                                                        <PaymentRow key={index} payment={payment} />
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                        
                                        <Box sx={{ mt: 3 }}>
                                            <Alert severity="info">
                                                Para realizar el pago, por favor acérquese a nuestros puntos de recaudo o realice una transferencia a las cuentas autorizadas.
                                            </Alert>
                                        </Box>
                                    </>
                                ) : (
                                    <Box sx={{ textAlign: 'center', py: 4 }}>
                                        <Typography variant="h6" color="success.main" gutterBottom>
                                            ¡Estás al día!
                                        </Typography>
                                        <Typography color="textSecondary">
                                            No tienes pagos pendientes registrados en este momento.
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Container>
        </Box>
    );
};

export default PublicBillingCheck;
