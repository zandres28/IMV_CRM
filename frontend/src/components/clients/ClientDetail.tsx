import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Tab, Tabs, Chip, Grid, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Tooltip, CircularProgress, Alert } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { ClientForm } from './ClientForm';
import { ClientRetirementDialog } from './ClientRetirementDialog';
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
import AuthService from '../../services/AuthService';
import { LocationOn as LocationIcon, Speed as SpeedIcon, ArrowBack as ArrowBackIcon, Restore as RestoreIcon, PowerSettingsNew as PowerIcon, RestartAlt as RestartIcon } from '@mui/icons-material';

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

const getTabIndexFromParam = (tabParam: string | null, isTechnician: boolean): number | null => {
    if (!tabParam) return null;
    const normalized = tabParam.toLowerCase();
    const technicianMapping: Record<string, number> = {
        instalaciones: 0,
        servicios: 1,
        productos: 2,
        crm: 3,
        historial: 3,
        interacciones: 3
    };
    const defaultMapping: Record<string, number> = {
        general: 0,
        servicios: 1,
        productos: 2,
        instalaciones: 3,
        pagos: 4,
        crm: 5,
        historial: 5,
        interacciones: 5
    };

    const mapping = isTechnician ? technicianMapping : defaultMapping;
    return mapping[normalized] ?? null;
};

export const ClientDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isTechnician = AuthService.hasRole('tecnico');
    const [client, setClient] = useState<Client | null>(null);
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [additionalServices, setAdditionalServices] = useState<AdditionalService[]>([]);
    const [products, setProducts] = useState<ProductSold[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [tabValue, setTabValue] = useState<number>(() => {
        const stateTab = (location.state && (location.state as any).openTabIndex);
        if (typeof stateTab === 'number') {
            return stateTab;
        }
        const params = new URLSearchParams(location.search);
        const mapped = getTabIndexFromParam(params.get('tab'), isTechnician);
        return mapped ?? 0;
    });
    const [hasUserChangedTab, setHasUserChangedTab] = useState(false);
    const [openRetireDialog, setOpenRetireDialog] = useState(false);

    const interactionIdParam = new URLSearchParams(location.search).get('interactionId');
    const parsedInteractionId = interactionIdParam ? parseInt(interactionIdParam, 10) : undefined;
    const focusInteractionId = parsedInteractionId !== undefined && !Number.isNaN(parsedInteractionId)
        ? parsedInteractionId
        : undefined;
    const crmTabIndex = isTechnician ? 3 : 5;

    // Estado para confirmación de eliminación
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);
    const [loadingAction, setLoadingAction] = useState(false);

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

    useEffect(() => {
        setHasUserChangedTab(false);
    }, [id]);

    useEffect(() => {
        if (hasUserChangedTab) {
            return;
        }

        const stateTab = (location.state && (location.state as any).openTabIndex);
        if (typeof stateTab === 'number') {
            if (stateTab !== tabValue) {
                setTabValue(stateTab);
            }
            return;
        }

        const params = new URLSearchParams(location.search);
        const mapped = getTabIndexFromParam(params.get('tab'), isTechnician);
        if (mapped !== null && mapped !== tabValue) {
            setTabValue(mapped);
        }
    }, [location.state, location.search, isTechnician, tabValue, hasUserChangedTab]);

    useEffect(() => {
        if (!focusInteractionId || hasUserChangedTab) {
            return;
        }
        setTabValue((currentTab) => (currentTab === crmTabIndex ? currentTab : crmTabIndex));
    }, [focusInteractionId, crmTabIndex, hasUserChangedTab]);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setHasUserChangedTab(true);
        setTabValue(newValue);
    };

    const formatCurrency = (value?: number | string | null) => {
        if (value === undefined || value === null) return null;
        const numericValue = typeof value === 'string' ? Number(value) : value;
        if (Number.isNaN(numericValue)) return null;
        return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(numericValue);
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
            navigate('/billing');
        } else {
            navigate('/clients');
        }
    };

    // --- ACCIONES RÁPIDAS (OLT / ESTADO) ---
    // Buscar la instalación principal (prioridad: activa > suspendida > la primera que no esté eliminada)
    const activeInstallation = installations.find(i => i.serviceStatus === 'active' && !i.isDeleted) 
                            || installations.find(i => i.serviceStatus === 'suspended' && !i.isDeleted)
                            || installations.find(i => !i.isDeleted) 
                            || null;

    const handleRebootOnu = async () => {
        if (!activeInstallation) return;
        if (!window.confirm('¿Reiniciar ONU del cliente? Esto interrumpirá el servicio momentáneamente.')) return;
        setLoadingAction(true);
        try {
            await InstallationService.rebootOnu(activeInstallation.id);
            alert('Comando enviado a la OLT con éxito. Si la ONU ya estaba activa, no se realizaron cambios.');
        } catch (error) {
            console.error(error);
            alert('Error al reiniciar la ONU. Verifique conexión.');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleToggleServiceStatus = async () => {
        if (!activeInstallation) return;
        const currentStatus = activeInstallation.serviceStatus;
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
        const actionText = newStatus === 'active' ? 'ACTIVAR' : 'SUSPENDER';

        if (!window.confirm(`¿Seguro que deseas ${actionText} el servicio de este cliente? Esto ejecutará la orden en la OLT.`)) return;

        setLoadingAction(true);
        try {
            // Llamar a la API real de la OLT
            await InstallationService.toggleOltService(activeInstallation.id, newStatus === 'active' ? 'enable' : 'disable');
            // Recargar todo para actualizar estado
            await loadInstallations();
            await loadClient();
            if (newStatus === 'active') {
                alert('ONU activada correctamente. Si el dispositivo ya estaba activo, no se realizaron cambios.');
            } else {
                alert('ONU deshabilitada correctamente. Si el dispositivo ya estaba suspendido, no se realizaron cambios.');
            }
        } catch (error) {
            console.error(error);
            alert(`Error al intentar ${newStatus === 'active' ? 'activar' : 'suspender'} la ONU.`);
        } finally {
            setLoadingAction(false);
        }
    };

    // Definición de pestañas según rol
    // Orden normal: 0:General, 1:Servicios, 2:Productos, 3:Instalaciones, 4:Pagos, 5:Historial
    // Orden Técnico: Instalaciones, Servicios, Productos, Historial
    
    // Mapeo de índices lógicos a contenido real para mantener correspondencia con TabPanel sin romper hook rules
    // Pero como TabPanel usa index, es difícil reordenar visualmente sin reordenar lógica.
    // Lo más fácil es renderizar condicionalmente los Tabs y los TabPanels.
    
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
                        {!AuthService.hasRole('tecnico') && (
                            <Typography variant="body1" color="textSecondary" gutterBottom>
                                CC: {client.identificationNumber}
                            </Typography>
                        )}
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
                        {client.requestedPlanName && (
                            <Alert severity="info" sx={{ mt: 2 }}>
                                Solicitud web: <strong>{client.requestedPlanName}</strong>
                                {client.requestedPlanSpeedMbps ? ` (${client.requestedPlanSpeedMbps} Mbps)` : ''}. Cuota sugerida: {formatCurrency(client.requestedPlanMonthlyFee) || 'N/D'} · Instalación: {formatCurrency(client.requestedInstallationFee) || 'N/D'}.
                            </Alert>
                        )}
                    </Grid>
                    <Grid item xs={12} md={4} textAlign={{ xs: 'left', md: 'right' }}>
                        <Box display="flex" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center" gap={1}>
                            <Chip 
                                label={getStatusLabel(client.status)}
                                color={getStatusColor(client.status)}
                                sx={{ fontSize: '0.9rem', fontWeight: 'bold' }}
                            />
                            
                            {/* --- BOTONES DE ACCIÓN RÁPIDA (OLT) --- */}
                            {/* Ajuste para técnico: Solo reiniciar ONU, no suspender/activar */}
                            {activeInstallation && (
                                <Box display="flex" alignItems="center" gap={1} ml={1}>
                                    <Tooltip title="Reiniciar ONU">
                                        <IconButton 
                                            onClick={handleRebootOnu} 
                                            disabled={loadingAction}
                                            color="warning"
                                            size="small"
                                            sx={{ border: '1px solid', borderColor: 'warning.main' }}
                                        >
                                            <RestartIcon />
                                        </IconButton>
                                    </Tooltip>

                                    {!AuthService.hasRole('tecnico') && (
                                        <Tooltip title={activeInstallation.serviceStatus === 'active' ? 'Suspender Servicio' : 'Activar Servicio'}>
                                            <IconButton 
                                                onClick={handleToggleServiceStatus}
                                                disabled={loadingAction}
                                                color={activeInstallation.serviceStatus === 'active' ? 'error' : 'success'}
                                                size="small"
                                                sx={{ border: '1px solid', borderColor: activeInstallation.serviceStatus === 'active' ? 'error.main' : 'success.main' }}
                                            >
                                                <PowerIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            )}
                            {/* ------------------------------------- */}

                            {client.status === 'cancelled' && (
                                <Box ml={2} textAlign="right">
                                    <Typography variant="caption" display="block">Retiro: {client.retirementDate ? new Date(client.retirementDate).toLocaleDateString() : '-'}</Typography>
                                    {client.retirementReason && (
                                        <Typography variant="caption" color="text.secondary" display="block">Motivo: {client.retirementReason}</Typography>
                                    )}
                                </Box>
                            )}
                            {!AuthService.hasRole('tecnico') && (
                            <Button
                                variant="outlined"
                                color={client.status === 'cancelled' ? 'secondary' : 'error'}
                                sx={{ ml: 1 }}
                                onClick={() => setOpenRetireDialog(true)}
                            >
                                {client.status === 'cancelled' ? 'Editar Retiro' : 'Retirar'}
                            </Button>
                            )}
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
                    {AuthService.hasRole('tecnico') ? (
                        [
                            <Tab key="tech-inst" label="Instalaciones" />,
                            <Tab key="tech-serv" label="Servicios Adicionales" />,
                            <Tab key="tech-prod" label="Productos" />,
                            <Tab key="tech-hist" label="Historial CRM" />
                        ]
                    ) : (
                        [
                            <Tab key="gen" label="Información General" />,
                            <Tab key="serv" label="Servicios Adicionales" />,
                            <Tab key="prod" label="Productos" />,
                            <Tab key="inst" label="Instalaciones" />,
                            <Tab key="pagos" label="Pagos" />,
                            <Tab key="hist" label="Historial CRM" />
                        ]
                    )}
                </Tabs>
            </Box>

            {AuthService.hasRole('tecnico') ? (
                <>
                    <Box hidden={tabValue !== 0} role="tabpanel">
                        {tabValue === 0 && <InstallationsList clientId={client.id} client={client} />}
                    </Box>

                    <Box hidden={tabValue !== 1} role="tabpanel">
                        {tabValue === 1 && <ServicesList clientId={client.id} />}
                    </Box>

                    <Box hidden={tabValue !== 2} role="tabpanel">
                        {tabValue === 2 && <ProductsList clientId={client.id} />}
                    </Box>

                    <Box hidden={tabValue !== 3} role="tabpanel">
                        {tabValue === 3 && (
                            <ClientInteractionHistory
                                clientId={client.id}
                                focusInteractionId={focusInteractionId}
                            />
                        )}
                    </Box>
                </>
            ) : (
                <>
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
                        <InstallationsList clientId={client.id} client={client} />
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
                        <ClientInteractionHistory
                            clientId={client.id}
                            focusInteractionId={focusInteractionId}
                        />
                    </TabPanel>
                </>
            )}
            
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

            <ClientRetirementDialog
                open={openRetireDialog}
                onClose={() => setOpenRetireDialog(false)}
                client={client}
                onSuccess={() => { setOpenRetireDialog(false); loadClient(); }}
            />

        </Box>
    );
};