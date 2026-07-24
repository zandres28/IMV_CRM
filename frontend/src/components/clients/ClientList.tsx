import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Button,
    Typography,
    TablePagination,
    TextField,
    Box,
    TableSortLabel,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Alert,
    List,
    ListItem,
    ListItemText,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    useTheme,
    useMediaQuery,
    Card,
    CardContent,
    CardActions,
    Divider,
    FormControlLabel,
    Switch
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Search as SearchIcon, FilterListOff as FilterListOffIcon, Phone as PhoneIcon, LocationOn as LocationOnIcon, ReportProblem as ReportProblemIcon } from '@mui/icons-material';
import { Client } from '../../types/Client';
import { ClientService } from '../../services/ClientService';
import { parseLocalDate, formatLocalDate } from '../../utils/dateUtils';
import { formatPhoneForDisplay } from '../../utils/formatters';
import { AdditionalService, ProductSold } from '../../types/AdditionalServices';
import { AdditionalServiceService } from '../../services/AdditionalServiceService';
import { ProductService } from '../../services/ProductService';
import { InstallationService, Installation } from '../../services/InstallationService';
import AuthService from '../../services/AuthService';

type Order = 'asc' | 'desc';
type OrderBy = keyof Client;

export const ClientList: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [clients, setClients] = useState<Client[]>([]);
    const [filteredClients, setFilteredClients] = useState<Client[]>([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const currentUser = AuthService.getCurrentUser();
    const isGlobalAdmin = currentUser && !currentUser.sucursal;
    const [statusFilter, setStatusFilter] = useState('all');
    const [cityFilter, setCityFilter] = useState('all');
    const [sucursalFilter, setSucursalFilter] = useState('all');
    const [pendingFilter, setPendingFilter] = useState(false);
    const [dateFilter, setDateFilter] = useState<{ month: number | null, year: number | null }>({ month: null, year: null });
    const [order, setOrder] = useState<Order>('desc');
    const [orderBy, setOrderBy] = useState<OrderBy>('latestInstallationDate');
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [deleteError, setDeleteError] = useState<{
        open: boolean;
        message: string;
        hint?: string;
        installations?: any[];
        pendingPayments?: any[];
    }>({ open: false, message: '' });

    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Refs para la sincronización del scroll
    const tableContainerRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const [tableScrollWidth, setTableScrollWidth] = useState(0);

    // Initial load from URL params
    useEffect(() => {
        const statusParam = searchParams.get('status');
        const searchParam = searchParams.get('search');
        const monthParam = searchParams.get('month');
        const yearParam = searchParams.get('year');

        if (statusParam) setStatusFilter(statusParam);
        if (searchParam) setSearchTerm(searchParam);
        if (monthParam !== null && yearParam !== null) {
            setDateFilter({ month: parseInt(monthParam), year: parseInt(yearParam) });
        }
    }, [searchParams]);

    // Sincronizar scroll horizontal
    const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
        if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    };

    // Actualizar el ancho del scroll superior cuando cambian los datos o el tamaño
    useEffect(() => {
        const updateScrollWidth = () => {
            if (tableContainerRef.current) {
                setTableScrollWidth(tableContainerRef.current.scrollWidth);
            }
        };

        // Pequeño delay para asegurar que el DOM se ha actualizado
        const timeoutId = setTimeout(updateScrollWidth, 100);
        window.addEventListener('resize', updateScrollWidth);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', updateScrollWidth);
        };
    }, [clients, filteredClients, rowsPerPage]);

    // Estado para servicios/productos/instalaciones por cliente
    const [clientServices, setClientServices] = useState<Record<number, {
        additionalServices: AdditionalService[];
        products: ProductSold[];
        installations: Installation[];
    }>>({});

    const loadClients = useCallback(async () => {
        try {
            const data = await ClientService.getAll(true);
            setClients(data);
        } catch (error) {
            console.error('Error al cargar los clientes:', error);
            // Aquí podrías mostrar una notificación de error
        }
    }, []);

    const filterAndSortClients = useCallback(() => {
        let filtered = clients.filter((client) => {
            const searchLower = searchTerm.toLowerCase();
            const clientDetails = clientServices[client.id];

            // 1. Search Matches (Name, ID, City, Email, Phone OR Services)
            const matchesBasicSearch = (
                client.fullName.toLowerCase().includes(searchLower) ||
                client.identificationNumber.toLowerCase().includes(searchLower) ||
                client.city.toLowerCase().includes(searchLower) ||
                client.email.toLowerCase().includes(searchLower) ||
                client.primaryPhone.toLowerCase().includes(searchLower)
            );

            // Check if any additional service name matches the search term
            const matchesServiceSearch = clientDetails?.additionalServices.some(s =>
                s.serviceName?.toLowerCase().includes(searchLower) && s.status === 'activo'
            );

            const matchesSearch = matchesBasicSearch || matchesServiceSearch;

            // 2. Status Matches
            const matchesStatus = (() => {
                if (statusFilter === 'deleted') {
                    return !!client.deletedAt;
                }
                if (client.deletedAt) {
                    return false;
                }
                // Lógica mejorada para "Pendiente Inst.":
                // 1. Estado explícito 'pendiente_instalacion'
                // 2. Estado 'active' PERO sin instalaciones registradas
                if (statusFilter === 'pendiente_instalacion') {
                    const hasActiveInstallations = clientDetails?.installations && clientDetails.installations.length > 0;
                    return client.status === 'pendiente_instalacion' || (client.status === 'activo' && !hasActiveInstallations);
                }
                
                return statusFilter === 'all' || client.status === statusFilter;
            })();

            // 3. City Matches
            const matchesCity = cityFilter === 'all' || client.city?.toUpperCase() === cityFilter;

            // 3b. Sucursal Matches (solo aplica para admin global)
            const matchesSucursal = !isGlobalAdmin || sucursalFilter === 'all' || (client.sucursal?.toUpperCase() === sucursalFilter);

            // 4. Pending Filter
            const matchesPending = !pendingFilter || (client.pendingInteractionsCount || 0) > 0;

            // 5. Date Matches (Installation Date in Month/Year)
            // If dateFilter is set, we check if ANY installation happened in that period
            // OR if the client was created in that period (fallback for older records)
            const matchesDate = (() => {
                if (dateFilter.month === null || dateFilter.year === null) return true;

                // Check installations first
                if (clientDetails?.installations && clientDetails.installations.length > 0) {
                    return clientDetails.installations.some(inst => {
                        const d = parseLocalDate(inst.installationDate);
                        return d.getMonth() === dateFilter.month && d.getFullYear() === dateFilter.year;
                    });
                }

                // Fallback to client create date or latestInstallationDate property
                const d = parseLocalDate(client.latestInstallationDate || client.created_at);
                return d.getMonth() === dateFilter.month && d.getFullYear() === dateFilter.year;
            })();

            return matchesSearch && matchesStatus && matchesCity && matchesSucursal && matchesDate && matchesPending;
        });

        filtered.sort((a, b) => {
            const aValue = a[orderBy];
            const bValue = b[orderBy];

            if (aValue === undefined || aValue === null) return 1;
            if (bValue === undefined || bValue === null) return -1;

            // Ordenar por fecha de instalación más reciente o fecha de creación
            if (orderBy === 'latestInstallationDate' || orderBy === 'created_at') {
                const aDate = orderBy === 'latestInstallationDate' && a.latestInstallationDate
                    ? parseLocalDate(a.latestInstallationDate).getTime()
                    : parseLocalDate(a.created_at).getTime();
                const bDate = orderBy === 'latestInstallationDate' && b.latestInstallationDate
                    ? parseLocalDate(b.latestInstallationDate).getTime()
                    : parseLocalDate(b.created_at).getTime();
                return order === 'asc' ? aDate - bDate : bDate - aDate;
            }

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return order === 'asc'
                    ? aValue.localeCompare(bValue)
                    : bValue.localeCompare(aValue);
            }

            return order === 'asc'
                ? (aValue < bValue ? -1 : 1)
                : (bValue < aValue ? -1 : 1);
        });

        setFilteredClients(filtered);
        setPage(0);
    }, [clients, clientServices, searchTerm, statusFilter, cityFilter, sucursalFilter, dateFilter, pendingFilter, order, orderBy, isGlobalAdmin]);


    // Cargar clientes y luego servicios/productos/instalaciones para cada uno
    useEffect(() => {
        const fetchAll = async () => {
            await loadClients();
        };
        fetchAll();
    }, [loadClients]);

    useEffect(() => {
        // Cuando cambian los clientes, cargar servicios/productos/instalaciones
        const fetchDetails = async () => {
            const newMap: Record<number, { additionalServices: AdditionalService[]; products: ProductSold[]; installations: Installation[] }> = {};
            await Promise.all(clients.map(async (client) => {
                try {
                    const [additionalServices, products, installations] = await Promise.all([
                        AdditionalServiceService.getByClient(client.id),
                        ProductService.getByClient(client.id),
                        InstallationService.getByClient(client.id)
                    ]);
                    newMap[client.id] = { additionalServices, products, installations };
                } catch (e) {
                    newMap[client.id] = { additionalServices: [], products: [], installations: [] };
                }
            }));
            setClientServices(newMap);
        };
        if (clients.length > 0) fetchDetails();
    }, [clients]);

    useEffect(() => {
        filterAndSortClients();
    }, [filterAndSortClients]);

    const handleRequestSort = (property: OrderBy) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleClearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setCityFilter('all');
        setSucursalFilter('all');
        setPendingFilter(false);
        setDateFilter({ month: null, year: null });
        setPage(0);
    };

    const uniqueCities = Array.from(new Set(clients.map(c => c.city?.toUpperCase()))).filter(Boolean).sort();

    const handleDelete = async (id: number) => {
        try {
            await ClientService.delete(id);
            setClients(clients.filter(client => client.id !== id));
        } catch (error: any) {
            console.error('Error al eliminar el cliente:', error);

            if (error.response?.data) {
                const errorData = error.response.data;
                setDeleteError({
                    open: true,
                    message: errorData.message || 'Error al eliminar el cliente',
                    hint: errorData.hint,
                    installations: errorData.installations,
                    pendingPayments: errorData.pendingPayments
                });
            } else {
                setDeleteError({
                    open: true,
                    message: 'Error al eliminar el cliente. Por favor, intenta nuevamente.',
                });
            }
        }
    };

    const paginatedClients = filteredClients.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    const getStatusChipProps = (status: string) => {
        const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' | 'default' | 'info' }> = {
            activo: { label: 'Activo', color: 'success' },
            suspendido: { label: 'Suspendido', color: 'warning' },
            retirado: { label: 'Retirado', color: 'error' },
            inactivo: { label: 'Inactivo', color: 'default' },
            pendiente_instalacion: { label: 'Pendiente Inst.', color: 'info' }
        };
        return statusMap[status] || { label: status, color: 'default' };
    };

    return (
        <Box sx={{ width: '100%', maxWidth: '1800px', mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Clientes
            </Typography>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={2}>
                {!AuthService.hasRole('tecnico') && (
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={() => navigate('/clients/new')}
                        startIcon={<AddIcon />}
                    >
                        Nuevo Cliente
                    </Button>
                )}

                <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Estado</InputLabel>
                        <Select
                            value={statusFilter}
                            label="Estado"
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <MenuItem value="all">Todos</MenuItem>
                            <MenuItem value="activo">Activo</MenuItem>
                            <MenuItem value="suspendido">Suspendido</MenuItem>
                            <MenuItem value="retirado">Retirado</MenuItem>
                            <MenuItem value="inactivo">Inactivo</MenuItem>
                            <MenuItem value="pendiente_instalacion">Pendiente Inst.</MenuItem>
                            <MenuItem value="deleted">Eliminados</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Ciudad</InputLabel>
                        <Select
                            value={cityFilter}
                            label="Ciudad"
                            onChange={(e) => setCityFilter(e.target.value)}
                        >
                            <MenuItem value="all">Todas</MenuItem>
                            {uniqueCities.map(city => (
                                <MenuItem key={city} value={city}>{city}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {isGlobalAdmin && (
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Sucursal</InputLabel>
                            <Select
                                value={sucursalFilter}
                                label="Sucursal"
                                onChange={(e) => setSucursalFilter(e.target.value)}
                            >
                                <MenuItem value="all">Todas</MenuItem>
                                <MenuItem value="CALI">Cali</MenuItem>
                                <MenuItem value="PASTO">Pasto</MenuItem>
                                <MenuItem value="OTRA">Otra</MenuItem>
                            </Select>
                        </FormControl>
                    )}

                    <FormControlLabel
                        control={
                            <Switch
                                checked={pendingFilter}
                                onChange={(e) => setPendingFilter(e.target.checked)}
                                color="warning"
                            />
                        }
                        label="Solo Pendientes"
                    />

                    <TextField
                        placeholder="Buscar clientes..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                        }}
                        sx={{ width: 250 }}
                    />

                    <Box display="flex" gap={1} alignItems="center">
                        {dateFilter.month !== null && dateFilter.year !== null && (
                            <Chip
                                label={`Fecha: ${dateFilter.month + 1}/${dateFilter.year}`}
                                onDelete={() => setDateFilter({ month: null, year: null })}
                                color="secondary"
                            />
                        )}
                        {(searchTerm || statusFilter !== 'all' || cityFilter !== 'all' || sucursalFilter !== 'all' || pendingFilter || (dateFilter.month !== null)) && (
                            <Button
                                variant="outlined"
                                color="inherit"
                                onClick={handleClearFilters}
                                startIcon={<FilterListOffIcon />}
                                title="Limpiar filtros"
                            >
                                Limpiar
                            </Button>
                        )}
                    </Box>
                </Box>

                <Button
                    variant="outlined"
                    color="secondary"
                    onClick={() => { setOrder('desc'); setOrderBy('latestInstallationDate'); }}
                >
                    Ordenar por instalación
                </Button>
            </Box>



            {/* Barra de desplazamiento superior */}
            {!isMobile && (
                <div
                    ref={topScrollRef}
                    onScroll={handleTopScroll}
                    style={{
                        overflowX: 'auto',
                        marginBottom: '5px',
                        width: '100%'
                    }}
                >
                    <div style={{ width: tableScrollWidth, height: '1px' }} />
                </div>
            )}

            {isMobile ? (
                <Box>
                    {paginatedClients.map((client) => {
                        const services = clientServices[client.id];
                        const installations = services?.installations || [];
                        const instWithSerial = installations.find(inst => inst.isActive && inst.onuSerialNumber) || installations.find(inst => inst.onuSerialNumber);
                        return (
                            <Card key={client.id} sx={{ mb: 2 }}>
                                <CardContent onClick={() => navigate(`/clients/${client.id}`)} sx={{ cursor: 'pointer' }}>
                                    <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                        <Box>
                                            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
                                                {client.fullName}
                                            </Typography>
                                            {(client.pendingInteractionsCount || 0) > 0 && (
                                                <Box mb={0.5}>
                                                    <Chip
                                                        icon={<ReportProblemIcon style={{ width: 14, height: 14 }} />}
                                                        label={`${client.pendingInteractionsCount} CRM Pendientes`}
                                                        color="warning"
                                                        size="small"
                                                        sx={{ height: 20, fontSize: '0.70rem' }}
                                                    />
                                                </Box>
                                            )}
                                            <Typography variant="caption" color="text.secondary">
                                                {client.identificationNumber}
                                            </Typography>
                                        </Box>
                                        <Chip
                                            label={getStatusChipProps(client.status).label}
                                            color={getStatusChipProps(client.status).color}
                                            size="small"
                                        />
                                    </Box>

                                    <Divider sx={{ my: 1 }} />

                                    <Box display="flex" alignItems="flex-start" gap={1} mb={0.5}>
                                        <LocationOnIcon fontSize="small" color="action" sx={{ mt: 0.4 }} />
                                        <Box>
                                            <Typography variant="body2">
                                                <strong>Dirección:</strong> {client.installationAddress}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Ciudad:</strong> {client.city}
                                            </Typography>
                                        </Box>
                                    </Box>

                                    {instWithSerial?.napLabel && (
                                        <Box mb={1}>
                                            <Chip
                                                label={`Etiqueta NAP: ${instWithSerial.napLabel}`}
                                                size="small"
                                                color="info"
                                            />
                                        </Box>
                                    )}

                                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                                        <PhoneIcon fontSize="small" color="action" />
                                        <Typography variant="body2">
                                            {formatPhoneForDisplay(client.primaryPhone)} {client.secondaryPhone ? `/ ${formatPhoneForDisplay(client.secondaryPhone)}` : ''}
                                        </Typography>
                                    </Box>

                                    {client.status === 'retirado' && (
                                        <Box mb={1}>
                                            <Typography variant="caption" color="text.secondary">Retiro: {client.retirementDate ? new Date(client.retirementDate).toLocaleDateString() : '-'}</Typography>
                                            {client.retirementReason && (
                                                <Typography variant="caption" color="text.secondary" display="block">Motivo: {client.retirementReason}</Typography>
                                            )}
                                        </Box>
                                    )}

                                    <Box display="flex" flexWrap="wrap" gap={0.5} mt={1}>
                                        {!services ? (
                                            <Typography variant="caption" color="text.secondary">Cargando info...</Typography>
                                        ) : (
                                            <>
                                                {/* Planes activos */}
                                                {services.installations?.filter(inst => inst.isActive).map((inst) => (
                                                    <Chip
                                                        key={`plan-${inst.id}`}
                                                        label={inst.servicePlan?.name || inst.serviceType}
                                                        size="small"
                                                        color="primary"
                                                        variant="filled"
                                                        sx={{ fontWeight: 'bold' }}
                                                    />
                                                ))}
                                                {/* Servicios adicionales activos */}
                                                {(() => {
                                                    const activeServices = services.additionalServices.filter(s => s.status === 'activo');
                                                    const chips = [];
                                                    if (activeServices.some(s => /netflix/i.test(s.serviceName))) {
                                                        chips.push(<Chip key="svc-netflix" label="N" size="small" color="error" variant="filled" title="Netflix activo" sx={{ fontWeight: 'bold' }} />);
                                                    }
                                                    if (activeServices.some(s => /tele.?lat/i.test(s.serviceName.replace(/\s+/g, '')) || /tele\s+latino/i.test(s.serviceName))) {
                                                        chips.push(<Chip key="svc-telel" label="TeleL" size="small" color="secondary" variant="filled" title="Tele Latino activo" />);
                                                    }
                                                    if (activeServices.some(s => /tv\s*box/i.test(s.serviceName) || /tvbox/i.test(s.serviceName.replace(/\s+/g, '')))) {
                                                        chips.push(<Chip key="svc-tvbox" label="TVBox" size="small" color="info" variant="filled" title="TVBOX activo" />);
                                                    }
                                                    return chips;
                                                })()}
                                                {/* Productos vendidos */}
                                                {services.products?.map((product) => {
                                                    const productName = product.productName.toLowerCase();
                                                    let label = product.productName;
                                                    let color = 'default';
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
                                                            color={color as any}
                                                            variant="filled"
                                                            title={`Producto: ${product.productName} - Estado: ${product.status}`}
                                                        />
                                                    );
                                                })}
                                            </>
                                        )}
                                    </Box>
                                </CardContent>
                                <CardActions disableSpacing sx={{ justifyContent: 'flex-end', pt: 0 }}>
                                    {!AuthService.hasRole('tecnico') && (
                                        <>
                                            <IconButton
                                                color="primary"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/clients/${client.id}`);
                                                }}
                                            >
                                                <EditIcon />
                                            </IconButton>
                                            <IconButton
                                                color="primary"
                                                title="Agregar Instalación"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/clients/${client.id}`, { state: { openTabIndex: 3 } });
                                                }}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                            <IconButton
                                                color="error"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(client.id);
                                                }}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </>
                                    )}
                                </CardActions>
                            </Card>
                        );
                    })}
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={filteredClients.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Filas:"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                        }
                    />
                </Box>
            ) : (
                <TableContainer component={Paper} ref={tableContainerRef} onScroll={handleTableScroll}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'fullName'}
                                        direction={orderBy === 'fullName' ? order : 'asc'}
                                        onClick={() => handleRequestSort('fullName')}
                                    >
                                        Nombre Completo
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Servicios/Productos</TableCell>
                                <TableCell>Dirección</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'city'}
                                        direction={orderBy === 'city' ? order : 'asc'}
                                        onClick={() => handleRequestSort('city')}
                                    >
                                        Ciudad
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Etiqueta NAP</TableCell>
                                <TableCell>Celular 1</TableCell>
                                <TableCell>Celular 2</TableCell>
                                <TableCell>
                                    <TableSortLabel
                                        active={orderBy === 'status'}
                                        direction={orderBy === 'status' ? order : 'asc'}
                                        onClick={() => handleRequestSort('status')}
                                    >
                                        Estado
                                    </TableSortLabel>
                                </TableCell>
                                <TableCell>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedClients.map((client, index) => {
                                const services = clientServices[client.id];
                                const installations = services?.installations || [];
                                const instWithSerial = installations.find(inst => inst.isActive && inst.onuSerialNumber) || installations.find(inst => inst.onuSerialNumber);
                                return (
                                    <TableRow
                                        key={client.id}
                                        onClick={() => navigate(`/clients/${client.id}`)}
                                        sx={{ cursor: 'pointer' }}
                                    >
                                        <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '220px', py: 1 }}>
                                            <Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                        {client.fullName}
                                                    </Typography>
                                                    {(client.pendingInteractionsCount || 0) > 0 && (
                                                        <Chip
                                                            icon={<ReportProblemIcon style={{ width: 12, height: 12 }} />}
                                                            label={`${client.pendingInteractionsCount} CRM`}
                                                            color="warning"
                                                            size="small"
                                                            sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }}
                                                        />
                                                    )}
                                                </Box>
                                                {(() => {
                                                    // Si está retirado, mostrar Fecha de Retiro
                                                    if (client.status === 'retirado' && client.retirementDate) {
                                                        return (
                                                            <Typography variant="caption" color="error" sx={{ display: 'block', fontWeight: 'bold' }}>
                                                                Retirado: {formatLocalDate(client.retirementDate)}
                                                            </Typography>
                                                        );
                                                    }

                                                    const baseDateStr = client.latestInstallationDate || client.created_at;
                                                    if (!baseDateStr) return null;
                                                    const dateObj = parseLocalDate(baseDateStr);
                                                    const now = new Date();
                                                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                                    const diffMs = endOfMonth.getTime() - dateObj.getTime();
                                                    // Conteo inclusivo hasta fin del mes actual
                                                    const days = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1 : 0;

                                                    // Días máximos a mostrar: hasta fin del mes de la fecha base (instalación/creación)
                                                    const endOfBaseMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
                                                    const diffBaseMs = endOfBaseMonth.getTime() - dateObj.getTime();
                                                    const maxDaysFromBaseMonth = diffBaseMs >= 0 ? Math.floor(diffBaseMs / (1000 * 60 * 60 * 24)) + 1 : 0;
                                                    const showDays = days > 0 && days <= maxDaysFromBaseMonth;

                                                    const label = client.latestInstallationDate ? 'Instalación' : 'Creado';
                                                    return (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {label}: {formatLocalDate(baseDateStr)}{showDays ? ` · ${days} días` : ''}
                                                        </Typography>
                                                    );
                                                })()}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                {/* Chip de Retiro si aplica */}
                                                {client.status === 'retirado' && (
                                                    <Chip
                                                        label="RETIRADO"
                                                        size="small"
                                                        color="error"
                                                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }}
                                                    />
                                                )}
                                                {/* Planes activos */}
                                                {services?.installations?.filter(inst => inst.isActive).map((inst) => (
                                                    <Chip
                                                        key={`plan-${inst.id}`}
                                                        label={(inst.servicePlan?.name || inst.serviceType).toUpperCase()}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }}
                                                    />
                                                ))}
                                                {/* Servicios adicionales activos */}
                                                {(() => {
                                                    if (!services) return null;
                                                    const activeServices = services.additionalServices.filter(s => s.status === 'activo');
                                                    const chips = [];
                                                    if (activeServices.some(s => /netflix/i.test(s.serviceName))) {
                                                        chips.push(<Chip key="svc-netflix" label="N" size="small" color="error" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} title="Netflix activo" />);
                                                    }
                                                    if (activeServices.some(s => /tele.?lat/i.test(s.serviceName.replace(/\s+/g, '')) || /tele\s+latino/i.test(s.serviceName))) {
                                                        chips.push(<Chip key="svc-telel" label="TeleL" size="small" variant="outlined" color="info" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} title="Tele Latino activo" />);
                                                    }
                                                    if (activeServices.some(s => /tv\s*box/i.test(s.serviceName) || /tvbox/i.test(s.serviceName.replace(/\s+/g, '')))) {
                                                        chips.push(<Chip key="svc-tvbox" label="TVBox" size="small" variant="outlined" color="info" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }} title="TVBOX activo" />);
                                                    }
                                                    return chips;
                                                })()}
                                                {/* Productos vendidos */}
                                                {services?.products?.map((product) => {
                                                    const productName = product.productName.toLowerCase();
                                                    let label = product.productName;
                                                    let chipColor: 'default' | 'info' | 'warning' = 'default';
                                                    if (/tv\s*box|tvbox/i.test(productName)) {
                                                        label = 'TVBox';
                                                        chipColor = 'info';
                                                    } else if (/router/i.test(productName)) {
                                                        label = 'Router';
                                                        chipColor = 'info';
                                                    } else if (/antena/i.test(productName)) {
                                                        label = 'Antena';
                                                        chipColor = 'warning';
                                                    }
                                                    return (
                                                        <Chip
                                                            key={`prod-${product.id}`}
                                                            label={label.toUpperCase()}
                                                            size="small"
                                                            color={chipColor}
                                                            variant={chipColor === 'default' ? 'filled' : 'outlined'}
                                                            sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }}
                                                            title={`Producto: ${product.productName} - Estado: ${product.status}`}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            {client.installationAddress}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{client.city}</TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>
                                            {instWithSerial?.napLabel || '-'}
                                        </TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{formatPhoneForDisplay(client.primaryPhone)}</TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{formatPhoneForDisplay(client.secondaryPhone)}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={client.status === 'activo' ? 'ACTIVO' : client.status === 'pendiente_instalacion' ? 'PEND. INST.' : 'INACTIVO'}
                                                color={client.status === 'activo' ? 'success' : client.status === 'pendiente_instalacion' ? 'info' : 'error'}
                                                size="small"
                                                sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800 }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ py: 0.5 }}>
                                            {!AuthService.hasRole('tecnico') && (
                                                <>
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/clients/${client.id}`);
                                                        }}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        title="Agregar Instalación"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/clients/${client.id}`, { state: { openTabIndex: 3 } });
                                                        }}
                                                    >
                                                        <AddIcon fontSize="small" />
                                                    </IconButton>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setConfirmDeleteId(client.id);
                                                        }}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={filteredClients.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage="Filas por página:"
                        labelDisplayedRows={({ from, to, count }) =>
                            `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                        }
                    />
                </TableContainer>
            )}

            {/* Dialogo de confirmación de eliminación */}
            <Dialog
                open={confirmDeleteId !== null}
                onClose={() => setConfirmDeleteId(null)}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Eliminar cliente</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Estás seguro de que deseas eliminar este cliente? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDeleteId(null)} color="inherit">
                        Cancelar
                    </Button>
                    <Button
                        onClick={() => {
                            if (confirmDeleteId !== null) handleDelete(confirmDeleteId);
                            setConfirmDeleteId(null);
                        }}
                        variant="contained"
                        color="error"
                    >
                        Eliminar
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog de error al eliminar */}
            <Dialog
                open={deleteError.open}
                onClose={() => setDeleteError({ open: false, message: '' })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ color: 'error.main' }}>
                    No se puede eliminar el cliente
                </DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {deleteError.message}
                    </Alert>

                    {deleteError.hint && (
                        <DialogContentText sx={{ mb: 2, fontStyle: 'italic' }}>
                            {deleteError.hint}
                        </DialogContentText>
                    )}

                    {deleteError.installations && deleteError.installations.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Instalaciones asociadas:
                            </Typography>
                            <List dense>
                                {deleteError.installations.map((inst: any) => (
                                    <ListItem key={inst.id}>
                                        <ListItemText
                                            primary={inst.serviceType || `Instalación #${inst.id}`}
                                            secondary={`Estado: ${inst.serviceStatus} | Fecha: ${formatLocalDate(inst.installationDate)}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}

                    {deleteError.pendingPayments && deleteError.pendingPayments.length > 0 && (
                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>
                                Pagos pendientes:
                            </Typography>
                            <List dense>
                                {deleteError.pendingPayments.map((payment: any) => (
                                    <ListItem key={payment.id}>
                                        <ListItemText
                                            primary={`${payment.paymentMonth} ${payment.paymentYear}`}
                                            secondary={`Monto: $${payment.amount.toLocaleString()} | Estado: ${payment.status}`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDeleteError({ open: false, message: '' })}
                        color="primary"
                    >
                        Entendido
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Scroll superior sincronizado */}
            <Box
                sx={{
                    display: 'none'
                }}
            >
                <Box sx={{ minWidth: tableScrollWidth }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
                                    Nombre Completo
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
                                    Retiro
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>Servicios/Productos</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>Dirección</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
                                    Ciudad
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>Etiqueta NAP</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>Celular 1</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>Celular 2</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>PON ID</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>ONU ID</TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
                                    Estado
                                </TableCell>
                                <TableCell sx={{ color: 'text.secondary', fontWeight: 'medium' }}>Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {paginatedClients.map((client, index) => {
                                const services = clientServices[client.id];
                                const installations = services?.installations || [];
                                const instWithSerial = installations.find(i => i.isActive && i.onuSerialNumber) || installations.find(i => i.onuSerialNumber);
                                return (
                                    <TableRow
                                        key={client.id}
                                        sx={{
                                            backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                            '&:hover': {
                                                backgroundColor: '#e3f2fd'
                                            }
                                        }}
                                    >
                                        <TableCell sx={{ whiteSpace: 'nowrap', minWidth: '220px' }}>
                                            <Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                        {client.fullName}
                                                    </Typography>
                                                    {(client.pendingInteractionsCount || 0) > 0 && (
                                                        <Chip
                                                            icon={<ReportProblemIcon style={{ width: 14, height: 14 }} />}
                                                            label={`${client.pendingInteractionsCount} CRM`}
                                                            color="warning"
                                                            size="small"
                                                            sx={{ height: 20, fontSize: '0.70rem', '& .MuiChip-label': { paddingLeft: 1, paddingRight: 1 } }}
                                                        />
                                                    )}
                                                </Box>
                                                {(() => {
                                                    const baseDateStr = client.latestInstallationDate || client.created_at;
                                                    if (!baseDateStr) return null;
                                                    const dateObj = parseLocalDate(baseDateStr);
                                                    const now = new Date();
                                                    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                                                    const diffMs = endOfMonth.getTime() - dateObj.getTime();
                                                    // Conteo inclusivo hasta fin del mes actual
                                                    const days = diffMs >= 0 ? Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1 : 0;

                                                    // Días máximos a mostrar: hasta fin del mes de la fecha base (instalación/creación)
                                                    const endOfBaseMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0);
                                                    const diffBaseMs = endOfBaseMonth.getTime() - dateObj.getTime();
                                                    const maxDaysFromBaseMonth = diffBaseMs >= 0 ? Math.floor(diffBaseMs / (1000 * 60 * 60 * 24)) + 1 : 0;
                                                    const showDays = days > 0 && days <= maxDaysFromBaseMonth;

                                                    const label = client.latestInstallationDate ? 'Instalación' : 'Creado';
                                                    return (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {label}: {formatLocalDate(baseDateStr)}{showDays ? ` · ${days} días` : ''}
                                                        </Typography>
                                                    );
                                                })()}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Box display="flex" flexWrap="wrap" gap={0.5}>
                                                {/* Planes activos */}
                                                {services?.installations?.filter(inst => inst.isActive).map((inst) => (
                                                    <Chip
                                                        key={`plan-${inst.id}`}
                                                        label={inst.servicePlan?.name || inst.serviceType}
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                ))}
                                                {/* Servicios adicionales activos */}
                                                {(() => {
                                                    if (!services) return null;
                                                    const activeServices = services.additionalServices.filter(s => s.status === 'activo');
                                                    const chips = [];
                                                    if (activeServices.some(s => /netflix/i.test(s.serviceName))) {
                                                        chips.push(<Chip key="svc-netflix" label="N" size="small" color="error" variant="filled" title="Netflix activo" sx={{ fontWeight: 'bold' }} />);
                                                    }
                                                    if (activeServices.some(s => /tele.?lat/i.test(s.serviceName.replace(/\s+/g, '')) || /tele\s+latino/i.test(s.serviceName))) {
                                                        chips.push(<Chip key="svc-telel" label="TeleL" size="small" color="secondary" variant="outlined" title="Tele Latino activo" />);
                                                    }
                                                    if (activeServices.some(s => /tv\s*box/i.test(s.serviceName) || /tvbox/i.test(s.serviceName.replace(/\s+/g, '')))) {
                                                        chips.push(<Chip key="svc-tvbox" label="TVBox" size="small" color="info" variant="outlined" title="TVBOX activo" />);
                                                    }
                                                    return chips;
                                                })()}
                                                {/* Productos vendidos */}
                                                {services?.products?.map((product) => {
                                                    const productName = product.productName.toLowerCase();
                                                    let label = product.productName;
                                                    let color = 'default';
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
                                                            color={color as any}
                                                            variant="filled"
                                                            title={`Producto: ${product.productName} - Estado: ${product.status}`}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </TableCell>
                                        <TableCell>{client.installationAddress}</TableCell>
                                        <TableCell>{client.city}</TableCell>
                                        <TableCell>{instWithSerial?.napLabel || '-'}</TableCell>
                                        <TableCell>{client.primaryPhone}</TableCell>
                                        <TableCell>{client.secondaryPhone}</TableCell>
                                        <TableCell>{instWithSerial?.ponId || '-'}</TableCell>
                                        <TableCell>{instWithSerial?.onuId || '-'}</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getStatusChipProps(client.status).label}
                                                color={getStatusChipProps(client.status).color}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {!AuthService.hasRole('tecnico') && (
                                                <>
                                                    <IconButton
                                                        color="primary"
                                                        onClick={() => navigate(`/clients/${client.id}`)}
                                                    >
                                                        <EditIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        color="primary"
                                                        title="Agregar Instalación"
                                                        onClick={() => navigate(`/clients/${client.id}`, { state: { openTabIndex: 3 } })}
                                                    >
                                                        <AddIcon />
                                                    </IconButton>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => handleDelete(client.id)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Box>
            </Box>
        </Box>
    );
};
