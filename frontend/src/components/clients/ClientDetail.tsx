import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Tab, Tabs, Chip, Grid, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ClientForm } from './ClientForm';
import { ServicesList } from '../services/ServicesList';
import { ProductsList } from '../services/ProductsList';
import { InstallationsList } from '../installations/InstallationsList';
import { ClientInteractionHistory } from '../interactions/ClientInteractionHistory';
import { Client } from '../../types/Client';
import { ClientService } from '../../services/ClientService';
import { InstallationService, Installation } from '../../services/InstallationService';
import { AdditionalService, ProductSold } from '../../types/AdditionalServices';
import { AdditionalServiceService } from '../../services/AdditionalServiceService';
import { ProductService } from '../../services/ProductService';
import { Payment } from '../../services/MonthlyBillingService';
import { LocationOn as LocationIcon, Speed as SpeedIcon, ArrowBack as ArrowBackIcon, Restore as RestoreIcon } from '@mui/icons-material';

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

export const ClientDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [client, setClient] = useState<Client | null>(null);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
    const [products, setProducts] = useState<ProductSold[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const location = useLocation();
    const initialTab = (location.state && (location.state as any).openTabIndex) ?? 0;
    const [tabValue, setTabValue] = useState<number>(initialTab);

    // Estado para confirmación de eliminación
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

    const loadClient = useCallback(async () => {
        try {
            if (id) {
                console.log('Cargando cliente con ID:', id);
                const data = await ClientService.getById(parseInt(id));
                console.log('Datos del cliente recibidos:', data);
                setClient(data);
            }
        } catch (error) {
            console.error('Error al cargar el cliente:', error);
        }
    }, [id]);

    const loadInstallations = useCallback(async () => {
        try {
            if (id) {
                const data = await InstallationService.getByClient(parseInt(id));
                setInstallations(data);
            }
        } catch (error) {
            console.error('Error al cargar instalaciones:', error);
        }
    }, [id]);

    const loadAdditionalServices = useCallback(async () => {
        try {
            if (id) {
                const data = await AdditionalServiceService.getByClient(parseInt(id));
                setAdditionalServices(data);
            }
        } catch (error) {
            console.error('Error al cargar servicios adicionales:', error);
        }
    }, [id]);

    const loadProducts = useCallback(async () => {
        try {
            if (id) {
                const data = await ProductService.getByClient(parseInt(id));
                setProducts(data);
            }
        } catch (error) {
            console.error('Error al cargar productos:', error);
        }
    }, [id]);

    const loadPayments = useCallback(async () => {
        try {
            if (id) {
                const data = await ClientService.getPayments(parseInt(id));
                setPayments(data);
            }
        } catch (error) {
            console.error('Error al cargar pagos:', error);
        }
    }, [id]);

    useEffect(() => {
        loadClient();
        loadInstallations();
        loadAdditionalServices();
        loadProducts();
        loadPayments();
    }, [loadClient, loadInstallations, loadAdditionalServices, loadProducts, loadPayments]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const allPayments = React.useMemo(() => {
        const regularPayments = payments.map(p => ({
            id: `payment-${p.id}`,
            dueDate: p.dueDate,
            monthYear: `${p.paymentMonth} ${p.paymentYear}`,
            type: p.paymentType === 'monthly' ? 'Mensualidad' : 
                  p.paymentType === 'installation' ? 'Instalación' : 'Otro',
            amount: p.amount,
            status: p.status,
            paymentDate: p.paymentDate,
            method: p.paymentMethod,
            isProduct: false
        }));

        const productInstallments = products.flatMap(product => 
            (product.installmentPayments || []).map(inst => ({
                id: `installment-${inst.id}`,
                dueDate: inst.dueDate,
                monthYear: `Cuota ${inst.installmentNumber}`,
                type: `Producto: ${product.productName}`,
                amount: inst.amount,
                status: inst.status === 'completed' ? 'paid' : inst.status,
                paymentDate: inst.paymentDate,
                method: '-',
                isProduct: true
            }))
        );

        const combined = [...regularPayments, ...productInstallments].sort((a, b) => 
            new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        );
        
        console.log('Pagos combinados y ordenados:', combined);
        return combined;
    }, [payments, products]);

    const getStatusColor = (status: string) => {
        const statusMap: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
            active: 'success',
            suspended: 'warning',
            cancelled: 'error',
            pendiente_instalacion: 'info'
        };
        return statusMap[status] || 'default';
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            active: 'Activo',
            suspended: 'Suspendido',
            cancelled: 'Cancelado',
            pendiente_instalacion: 'Pendiente Instalación'
        };
        return statusMap[status] || status;
    };

    const handleDeleteClick = (paymentIdRaw: string) => {
        // El ID viene como "payment-123", extraemos el numero
        if (paymentIdRaw.startsWith('payment-')) {
            const id = parseInt(paymentIdRaw.replace('payment-', ''));
            setPaymentToDelete(id);
            setOpenDeleteDialog(true);
        }
    };

    const handleConfirmDelete = async () => {
        if (paymentToDelete) {
            try {
                await ClientService.deletePayment(paymentToDelete);
                setOpenDeleteDialog(false);
                setPaymentToDelete(null);
                loadPayments(); // Recargar lista
            } catch (error) {
                console.error("Error eliminando pago", error);
                alert("Error eliminando el pago");
            }
        }
    };

    if (!client) {
        return <Typography>Cargando...</Typography>;
    }

    // Obtener planes con su estado de instalación
    const plansWithStatus = installations
        .filter(inst => inst.isActive)
        .map(inst => ({
            name: inst.servicePlan?.name || inst.serviceType,
            status: inst.serviceStatus
        }));

    const handleBack = () => {
        const fromState = (location.state as any)?.from;
        if (fromState === 'billing') {
            navigate('/monthly-billing');
        } else {
            navigate('/clients');
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box mb={2}>
                <Button
                    startIcon={<ArrowBackIcon />}
                    onClick={handleBack}
                    variant="outlined"
                    color="inherit"
                >
                    {(location.state as any)?.from === 'billing' ? 'Regresar a Facturación' : 'Regresar al listado'}
                </Button>
            </Box>
            <Paper 
                sx={{ 
                    p: 3, 
                    mb: 2,
                    borderLeft: 6,
                    borderColor: client.status === 'active' ? 'success.main' : 
                                 client.status === 'suspended' ? 'warning.main' : 
                                 client.status === 'pendiente_instalacion' ? 'info.main' : 'error.main'
                }}
            >
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                            {client.fullName}
                        </Typography>
                        <Typography variant="body1" color="textSecondary" gutterBottom>
                            CC: {client.identificationNumber}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <LocationIcon color="action" fontSize="small" />
                            <Typography variant="body2">
                                {client.installationAddress}, {client.city}
                            </Typography>
                        </Box>
                        {(plansWithStatus.length > 0 || additionalServices.length > 0 || products.length > 0) && (
                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mt={1}>
                                <SpeedIcon color="action" fontSize="small" />
                                <Typography variant="body2" color="textSecondary">
                                    Planes:
                                </Typography>
                                {plansWithStatus.map((plan, index) => (
                                    <Chip
                                        key={`plan-${index}`}
                                        label={plan.name}
                                        size="small"
                                        color={getStatusColor(plan.status)}
                                        variant="outlined"
                                    />
                                ))}
                                {/* Chips de servicios adicionales especiales */}
                                {(() => {
                                    const activeServices = additionalServices.filter(s => s.status === 'active');
                                    const hasNetflix = activeServices.some(s => /netflix/i.test(s.serviceName));
                                    const hasTeleLatino = activeServices.some(s => /tele.?lat/i.test(s.serviceName.replace(/\s+/g,'')) || /tele\s+latino/i.test(s.serviceName));
                                    const hasTvBox = activeServices.some(s => /tv\s*box/i.test(s.serviceName) || /tvbox/i.test(s.serviceName.replace(/\s+/g,'')));
                                    return (
                                        <>
                                            {hasNetflix && (
                                                <Chip
                                                    key="svc-netflix"
                                                    label="N"
                                                    size="small"
                                                    color="error"
                                                    variant="filled"
                                                    title="Netflix activo"
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            )}
                                            {hasTeleLatino && (
                                                <Chip
                                                    key="svc-telel"
                                                    label="TeleL"
                                                    size="small"
                                                    color="secondary"
                                                    variant="outlined"
                                                    title="Tele Latino activo"
                                                />
                                            )}
                                            {hasTvBox && (
                                                <Chip
                                                    key="svc-tvbox"
                                                    label="TVBox"
                                                    size="small"
                                                    color="info"
                                                    variant="outlined"
                                                    title="TVBOX activo"
                                                />
                                            )}
                                        </>
                                    );
                                })()}
                                {/* Chips de productos vendidos */}
                                {products.map((product) => {
                                    const productName = product.productName.toLowerCase();
                                    let label = product.productName;
                                    let color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' = 'default';
                                    
                                    // Simplificar nombre para productos comunes
                                    if (/tv\s*box|tvbox/i.test(productName)) {
                                        label = 'TVBox';
                                        color = 'info';
                                    } else if (/router/i.test(productName)) {
                                        label = 'Router';
                                        color = 'primary';
                                    } else if (/antena/i.test(productName)) {
                                        label = 'Antena';
                                        color = 'secondary';
                                    }
                                    
                                    return (
                                        <Chip
                                            key={`prod-${product.id}`}
                                            label={label}
                                            size="small"
                                            color={color}
                                            variant="filled"
                                            title={`Producto: ${product.productName} - Estado: ${product.status}`}
                                        />
                                    );
                                })}
                            </Box>
                        )}
                    </Grid>
                    <Grid item xs={12} md={4} textAlign={{ xs: 'left', md: 'right' }}>
                        <Box display="flex" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center" gap={1}>
                            <Chip 
                                label={getStatusLabel(client.status)}
                                color={getStatusColor(client.status)}
                                sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                            />
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                >
                    <Tab label="Información General" />
                    <Tab label="Servicios Adicionales" />
                    <Tab label="Productos" />
                    <Tab label="Instalaciones" />
                    <Tab label="Pagos" />
                    <Tab label="Historial CRM" />
                </Tabs>
            </Box>

            <TabPanel value={tabValue} index={0}>
                <ClientForm client={client} onSave={loadClient} />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
                <ServicesList clientId={client.id} />
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
                <ProductsList clientId={client.id} />
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
                <InstallationsList clientId={client.id} />
            </TabPanel>

            <TabPanel value={tabValue} index={4}>
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell>Fecha Vencimiento</TableCell>
                                <TableCell>Mes/Año / Detalle</TableCell>
                                <TableCell>Tipo</TableCell>
                                <TableCell>Monto</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell>Fecha Pago</TableCell>
                                <TableCell>Método</TableCell>
                                <TableCell>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {allPayments.map((payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{new Date(payment.dueDate).toLocaleDateString()}</TableCell>
                                    <TableCell>{payment.monthYear}</TableCell>
                                    <TableCell>{payment.type}</TableCell>
                                    <TableCell>
                                        {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(payment.amount)}
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={payment.status === 'paid' ? 'Pagado' : 
                                                   payment.status === 'pending' ? 'Pendiente' : 
                                                   payment.status === 'overdue' ? 'Vencido' : 'Cancelado'}
                                            color={payment.status === 'paid' ? 'success' : 
                                                   payment.status === 'pending' ? 'warning' : 
                                                   payment.status === 'overdue' ? 'error' : 'default'}
                                            size="small"
                                        />
                                    </TableCell>
                                    <TableCell>{payment.paymentDate ? new Date(payment.paymentDate).toLocaleDateString() : '-'}</TableCell>
                                    <TableCell>{payment.method || '-'}</TableCell>
                                    <TableCell>
                                        {!payment.isProduct && (
                                            <IconButton size="small" color="error" onClick={() => handleDeleteClick(payment.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {allPayments.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">No hay pagos registrados</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={5}>
                <ClientInteractionHistory clientId={client.id} />
            </TabPanel>
            
            <Dialog
                open={openDeleteDialog}
                onClose={() => setOpenDeleteDialog(false)}
            >
                <DialogTitle>Confirmar eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas eliminar este pago? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)} color="primary">
                        Cancelar
                    </Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};