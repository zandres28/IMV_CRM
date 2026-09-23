import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { Box, Paper, Typography, Tab, Tabs, Chip, Grid, Button, IconButton, Tooltip, Alert, Drawer } from '@mui/material';
import { ClientForm } from './ClientForm';
import { ClientRetirementDialog } from './ClientRetirementDialog';
import { ClientServicesOverview } from './ClientServicesOverview';
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
import { LocationOn as LocationIcon, Speed as SpeedIcon, ArrowBack as ArrowBackIcon, PowerSettingsNew as PowerIcon, RestartAlt as RestartIcon, Close as CloseIcon } from '@mui/icons-material';
import { AdditionalServiceForm } from '../services/AdditionalServiceForm';
import { InstallationForm } from '../installations/InstallationForm';
import { ProductForm } from '../services/ProductForm';
import { EditProductDialog } from '../services/EditProductDialog';

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
        servicios: 0,
        productos: 0,
        crm: 1,
        historial: 1,
        interacciones: 1
    };
    const defaultMapping: Record<string, number> = {
        general: 0,
        servicios: 1,
        productos: 1,
        instalaciones: 1,
        pagos: 1,
        crm: 2,
        historial: 2,
        interacciones: 2
    };

    const mapping = isTechnician ? technicianMapping : defaultMapping;
    return mapping[normalized] ?? null;
};

// Los tabs reales son: técnico = 2 (0,1), operador/admin = 3 (0,1,2).
// value fuera de rango (p.ej. openTabIndex:3 del layout viejo) dejaba la página en blanco.
const normalizeTabValue = (raw: number, isTechnician: boolean): number => {
    if (!Number.isInteger(raw)) return 0;
    const max = isTechnician ? 1 : 2;
    return Math.min(Math.max(raw, 0), max);
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
            return normalizeTabValue(stateTab, isTechnician);
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
    const crmTabIndex = isTechnician ? 1 : 2;

    const [loadingAction, setLoadingAction] = useState(false);

    // Estado para Drawer de vista detallada
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerType, setDrawerType] = useState<'installation' | 'service' | 'product'>('installation');
    const [drawerItem, setDrawerItem] = useState<Installation | AdditionalService | ProductSold | null>(null);

    // Estado para forms de edición a nivel raíz (sin nested dialogs)
    const [editFormOpen, setEditFormOpen] = useState(false);
    const [editFormType, setEditFormType] = useState<'installation' | 'service' | 'product' | 'product-edit'>('installation');
    const [editFormItem, setEditFormItem] = useState<Installation | AdditionalService | ProductSold | null>(null);

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
            const normalized = normalizeTabValue(stateTab, isTechnician);
            if (normalized !== tabValue) {
                setTabValue(normalized);
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

    const getStatusColor = (status: string) => {
        const statusMap: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
            activo: 'success',
            suspendido: 'warning',
            retirado: 'error',
            inactivo: 'default',
            pendiente_instalacion: 'info'
        };
        return statusMap[status] || 'default';
    };

    const getStatusLabel = (status: string) => {
        const statusMap: Record<string, string> = {
            activo: 'Activo',
            suspendido: 'Suspendido',
            retirado: 'Retirado',
            inactivo: 'Inactivo',
            pendiente_instalacion: 'Pendiente Instalación'
        };
        return statusMap[status] || status;
    };

    // --- Handlers para ClientServicesOverview ---
    const handleViewInstallation = (inst: Installation) => {
        setDrawerItem(inst);
        setDrawerType('installation');
        setDrawerOpen(true);
    };

    const handleEditInstallation = (inst: Installation) => {
        setEditFormItem(inst);
        setEditFormType('installation');
        setEditFormOpen(true);
    };

    const handleViewService = (svc: AdditionalService) => {
        setDrawerItem(svc);
        setDrawerType('service');
        setDrawerOpen(true);
    };

    const handleEditService = (svc: AdditionalService) => {
        setEditFormItem(svc);
        setEditFormType('service');
        setEditFormOpen(true);
    };

    const handleViewProduct = (prod: ProductSold) => {
        setDrawerItem(prod);
        setDrawerType('product');
        setDrawerOpen(true);
    };

    const handleEditProduct = (prod: ProductSold) => {
        setEditFormItem(prod);
        setEditFormType('product-edit');
        setEditFormOpen(true);
    };

    const handleToggleOltFromOverview = async (inst: Installation) => {
        if (!activeInstallation) return;
        const currentStatus = inst.serviceStatus;
        const newStatus = currentStatus === 'activo' ? 'suspendido' : 'activo';
        const actionText = newStatus === 'activo' ? 'ACTIVAR' : 'SUSPENDER';
        if (!window.confirm(`¿Seguro que deseas ${actionText} el servicio de este cliente? Esto ejecutará la orden en la OLT.`)) return;
        setLoadingAction(true);
        try {
            await InstallationService.toggleOltService(inst.id, newStatus === 'activo' ? 'enable' : 'disable');
            await loadInstallations();
            await loadClient();
            alert(newStatus === 'activo' ? 'ONU activada correctamente.' : 'ONU deshabilitada correctamente.');
        } catch (error) {
            console.error(error);
            alert(`Error al intentar ${newStatus === 'activo' ? 'activar' : 'suspender'} la ONU.`);
        } finally {
            setLoadingAction(false);
        }
    };

    const handleRebootOnuFromOverview = async (inst: Installation) => {
        if (!window.confirm('¿Reiniciar ONU del cliente? Esto interrumpirá el servicio momentáneamente.')) return;
        setLoadingAction(true);
        try {
            await InstallationService.rebootOnu(inst.id);
            alert('Comando enviado a la OLT con éxito.');
        } catch (error) {
            console.error(error);
            alert('Error al reiniciar la ONU. Verifique conexión.');
        } finally {
            setLoadingAction(false);
        }
    };

    const handleAddInstallation = () => {
        setEditFormItem(null);
        setEditFormType('installation');
        setEditFormOpen(true);
    };

    const handleAddService = () => {
        setEditFormItem(null);
        setEditFormType('service');
        setEditFormOpen(true);
    };

    const handleAddProduct = () => {
        setEditFormItem(null);
        setEditFormType('product');
        setEditFormOpen(true);
    };

    const handleFormSave = () => {
        setEditFormOpen(false);
        loadInstallations();
        loadAdditionalServices();
        loadProducts();
        loadClient();
    };

    if (!client) {
        return <Typography>Cargando...</Typography>;
    }

    // Obtener planes con su estado de instalación
    // Se muestran instalaciones activas Y suspendidas (no canceladas ni eliminadas)
    const plansWithStatus = installations
        .filter(inst => !inst.isDeleted && inst.serviceStatus !== 'retirado')
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
    const activeInstallation = installations.find(i => i.serviceStatus === 'activo' && !i.isDeleted) 
                            || installations.find(i => i.serviceStatus === 'suspendido' && !i.isDeleted)
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
        const newStatus = currentStatus === 'activo' ? 'suspendido' : 'activo';
        const actionText = newStatus === 'activo' ? 'ACTIVAR' : 'SUSPENDER';

        if (!window.confirm(`¿Seguro que deseas ${actionText} el servicio de este cliente? Esto ejecutará la orden en la OLT.`)) return;

        setLoadingAction(true);
        try {
            // Llamar a la API real de la OLT
            await InstallationService.toggleOltService(activeInstallation.id, newStatus === 'activo' ? 'enable' : 'disable');
            // Recargar todo para actualizar estado
            await loadInstallations();
            await loadClient();
            if (newStatus === 'activo') {
                alert('ONU activada correctamente. Si el dispositivo ya estaba activo, no se realizaron cambios.');
            } else {
                alert('ONU deshabilitada correctamente. Si el dispositivo ya estaba suspendido, no se realizaron cambios.');
            }
        } catch (error) {
            console.error(error);
            alert(`Error al intentar ${newStatus === 'activo' ? 'activar' : 'suspender'} la ONU.`);
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
                    borderColor: client.status === 'activo' ? 'success.main' : 
                                 client.status === 'suspendido' ? 'warning.main' : 
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
                                    const activeServices = additionalServices.filter(s => s.status === 'activo');
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
                                        <Tooltip title={activeInstallation.serviceStatus === 'activo' ? 'Suspender Servicio' : 'Activar Servicio'}>
                                            <IconButton 
                                                onClick={handleToggleServiceStatus}
                                                disabled={loadingAction}
                                                color={activeInstallation.serviceStatus === 'activo' ? 'error' : 'success'}
                                                size="small"
                                                sx={{ border: '1px solid', borderColor: activeInstallation.serviceStatus === 'activo' ? 'error.main' : 'success.main' }}
                                            >
                                                <PowerIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            )}
                            {/* ------------------------------------- */}

                            {client.status === 'retirado' && (
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
                                color={client.status === 'retirado' ? 'secondary' : 'error'}
                                sx={{ ml: 1 }}
                                onClick={() => setOpenRetireDialog(true)}
                            >
                                {client.status === 'retirado' ? 'Editar Retiro' : 'Retirar'}
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
                            <Tab key="tech-serv" label="Servicios" />,
                            <Tab key="tech-hist" label="Historial CRM" />
                        ]
                    ) : (
                        [
                            <Tab key="gen" label="Información General" />,
                            <Tab key="serv" label="Servicios" />,
                            <Tab key="hist" label="Historial CRM" />
                        ]
                    )}
                </Tabs>
            </Box>

            {AuthService.hasRole('tecnico') ? (
                <>
                    <Box hidden={tabValue !== 0} role="tabpanel">
                        {tabValue === 0 && (
                            <Box sx={{ p: 3 }}>
                                <ClientServicesOverview
                                    client={client}
                                    installations={installations}
                                    additionalServices={additionalServices}
                                    products={products}
                                    payments={payments}
                                    onViewInstallation={handleViewInstallation}
                                    onEditInstallation={handleEditInstallation}
                                    onViewService={handleViewService}
                                    onEditService={handleEditService}
                                    onViewProduct={handleViewProduct}
                                    onEditProduct={handleEditProduct}
                                    onToggleOltService={handleToggleOltFromOverview}
                                    onRebootOnu={handleRebootOnuFromOverview}
                                    onAddInstallation={handleAddInstallation}
                                    onAddService={handleAddService}
                                    onAddProduct={handleAddProduct}
                                />
                            </Box>
                        )}
                    </Box>

                    <Box hidden={tabValue !== 1} role="tabpanel">
                        {tabValue === 1 && (
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
                        <ClientForm client={client} onSave={() => { loadClient(); loadInstallations(); }} />
                    </TabPanel>

                    <TabPanel value={tabValue} index={1}>
                        <ClientServicesOverview
                            client={client}
                            installations={installations}
                            additionalServices={additionalServices}
                            products={products}
                            payments={payments}
                            onViewInstallation={handleViewInstallation}
                            onEditInstallation={handleEditInstallation}
                            onViewService={handleViewService}
                            onEditService={handleEditService}
                            onViewProduct={handleViewProduct}
                            onEditProduct={handleEditProduct}
                            onToggleOltService={handleToggleOltFromOverview}
                            onRebootOnu={handleRebootOnuFromOverview}
                            onAddInstallation={handleAddInstallation}
                            onAddService={handleAddService}
                            onAddProduct={handleAddProduct}
                        />
                    </TabPanel>

                    <TabPanel value={tabValue} index={2}>
                        <ClientInteractionHistory
                            clientId={client.id}
                            focusInteractionId={focusInteractionId}
                        />
                    </TabPanel>
                </>
            )}
            
            <ClientRetirementDialog
                open={openRetireDialog}
                onClose={() => setOpenRetireDialog(false)}
                client={client}
                onSuccess={() => { setOpenRetireDialog(false); loadClient(); }}
            />

            {/* Drawer para vista detallada */}
            <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                PaperProps={{ sx: { width: { xs: '100%', sm: 500 }, p: 0 } }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #E2E6F0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        {drawerType === 'installation' ? 'Instalación' : drawerType === 'service' ? 'Servicio Adicional' : 'Producto'}
                    </Typography>
                    <IconButton onClick={() => setDrawerOpen(false)} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
                <Box sx={{ overflow: 'auto', height: 'calc(100% - 64px)' }}>
                    {drawerType === 'installation' && (
                        <InstallationsList clientId={client.id} client={client} onChange={() => { loadInstallations(); loadClient(); }} />
                    )}
                    {drawerType === 'service' && (
                        <ServicesList clientId={client.id} />
                    )}
                    {drawerType === 'product' && (
                        <ProductsList clientId={client.id} />
                    )}
                </Box>
            </Drawer>

            {/* Forms de edición a nivel raíz (sin nested dialogs) */}
            {editFormType === 'installation' && (
                <InstallationForm
                    open={editFormOpen}
                    onClose={() => setEditFormOpen(false)}
                    onSave={handleFormSave}
                    installation={editFormItem as Installation | undefined}
                    clientId={client.id}
                />
            )}
            {editFormType === 'service' && (
                <AdditionalServiceForm
                    open={editFormOpen}
                    onClose={() => setEditFormOpen(false)}
                    clientId={client.id}
                    service={editFormItem as AdditionalService | undefined}
                    onSave={handleFormSave}
                />
            )}
            {editFormType === 'product' && (
                <ProductForm
                    open={editFormOpen}
                    onClose={() => setEditFormOpen(false)}
                    clientId={client.id}
                    onSave={handleFormSave}
                />
            )}
            {editFormType === 'product-edit' && (
                <EditProductDialog
                    open={editFormOpen}
                    onClose={() => setEditFormOpen(false)}
                    product={editFormItem as ProductSold | null}
                    onSave={(productId, data) => {
                        ProductService.updateProduct(productId, data).then(() => {
                            handleFormSave();
                        });
                    }}
                />
            )}

        </Box>
    );
};
