import React from 'react';
import {
    Box, Typography, Paper, Chip, IconButton, Tooltip, useMediaQuery, useTheme,
    Card, CardContent, Grid, Button
} from '@mui/material';
import {
    Visibility as ViewIcon,
    Edit as EditIcon,
    PowerSettingsNew as PowerIcon,
    RestartAlt as RestartIcon,
    Wifi as WifiIcon,
    Tv as TvIcon,
    ShoppingBag as ProductIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { Installation } from '../../services/InstallationService';
import { AdditionalService, ProductSold } from '../../types/AdditionalServices';
import { Payment } from '../../services/MonthlyBillingService';
import { Client } from '../../types/Client';
import AuthService from '../../services/AuthService';
import { IptvCard } from './IptvCard';
import { NetflixCard } from './NetflixCard';

interface ClientServicesOverviewProps {
    client: Client;
    installations: Installation[];
    additionalServices: AdditionalService[];
    products: ProductSold[];
    payments: Payment[];
    onViewInstallation: (installation: Installation) => void;
    onEditInstallation: (installation: Installation) => void;
    onViewService: (service: AdditionalService) => void;
    onEditService: (service: AdditionalService) => void;
    onViewProduct: (product: ProductSold) => void;
    onEditProduct: (product: ProductSold) => void;
    onToggleOltService: (installation: Installation) => void;
    onRebootOnu: (installation: Installation) => void;
    onAddInstallation: () => void;
    onAddService: () => void;
    onAddProduct: () => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
};

const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusColor = (status: string): 'success' | 'warning' | 'error' | 'default' | 'info' => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default' | 'info'> = {
        activo: 'success',
        suspendido: 'warning',
        retirado: 'error',
        inactivo: 'default',
        pendiente: 'warning',
        completado: 'success',
        pagado: 'success',
        vencido: 'error',
        anulado: 'default'
    };
    return map[status] || 'default';
};

const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
        activo: 'Activo',
        suspendido: 'Suspendido',
        retirado: 'Retirado',
        inactivo: 'Inactivo',
        pendiente: 'Pendiente',
        completado: 'Pagado',
        pagado: 'Pagado',
        vencido: 'Vencido',
        anulado: 'Anulado'
    };
    return map[status] || status;
};

const SectionHeader: React.FC<{ title: string; count: number; onAdd?: () => void; addLabel?: string }> = ({ title, count, onAdd, addLabel }) => (
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5} mt={3}>
        <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0E1330' }}>
                {title}
            </Typography>
            <Chip label={count} size="small" sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: '#EDF0F7', color: '#3A4163' }} />
        </Box>
        {onAdd && (
            <Button size="small" startIcon={<AddIcon />} onClick={onAdd} sx={{ textTransform: 'none', fontSize: '0.75rem' }}>
                {addLabel || 'Agregar'}
            </Button>
        )}
    </Box>
);

export const ClientServicesOverview: React.FC<ClientServicesOverviewProps> = ({
    client,
    installations,
    additionalServices,
    products,
    payments,
    onViewInstallation,
    onEditInstallation,
    onViewService,
    onEditService,
    onViewProduct,
    onEditProduct,
    onToggleOltService,
    onRebootOnu,
    onAddInstallation,
    onAddService,
    onAddProduct
}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const isAdmin = !AuthService.hasRole('tecnico');

    const activeInstallations = installations.filter(i => !i.isDeleted && i.serviceStatus !== 'retirado');
    const activeServices = additionalServices.filter(s => s.status === 'activo');
    const pendingProducts = products.filter(p => p.status === 'pendiente');
    const paidInstallments = products.flatMap(p => (p.installmentPayments || []).filter(ip => ip.status === 'completado'));

    const totalMonthly = activeInstallations.reduce((s, i) => s + Number(i.monthlyFee || 0), 0)
        + activeServices.reduce((s, s2) => s + Number(s2.monthlyFee || 0), 0);

    return (
        <Box>
            {/* Resumen */}
            <Paper sx={{ p: 2, mb: 2, borderLeft: 4, borderColor: '#2D5BFF' }}>
                <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                            Costo Mensual
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D5BFF' }}>
                            {formatCurrency(totalMonthly)}
                        </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                            Instalaciones
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0E1330' }}>
                            {activeInstallations.length}
                        </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                            Servicios Adicionales
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0E1330' }}>
                            {activeServices.length}
                        </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                        <Typography variant="caption" sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.65rem' }}>
                            Productos
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0E1330' }}>
                            {pendingProducts.length} pend.
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* IPTV */}
            <IptvCard client={client} />

            {/* Netflix */}
            <NetflixCard client={client} />

            {/* Instalaciones */}
            <SectionHeader title="Instalaciones" count={activeInstallations.length} onAdd={isAdmin ? onAddInstallation : undefined} addLabel="Nueva" />
            {activeInstallations.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1, mb: 2 }}>No hay instalaciones activas</Typography>
            ) : isMobile ? (
                activeInstallations.map(inst => (
                    <Card key={inst.id} sx={{ mb: 1.5, borderLeft: 4, borderColor: inst.serviceStatus === 'activo' ? '#00D4A6' : '#F0A23A', borderRadius: 2 }}>
                        <CardContent sx={{ p: '12px !important' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <WifiIcon sx={{ fontSize: 16, color: '#2D5BFF' }} />
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0E1330' }}>
                                        {inst.servicePlan?.name || inst.serviceType}
                                    </Typography>
                                </Box>
                                <Chip label={statusLabel(inst.serviceStatus)} color={statusColor(inst.serviceStatus)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                            </Box>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                {formatCurrency(inst.monthlyFee)}/mes · {inst.speedMbps} Mbps · {formatDate(inst.installationDate)}
                            </Typography>
                            {inst.onuSerialNumber && (
                                <Typography variant="caption" display="block" color="textSecondary" sx={{ fontSize: '0.65rem' }}>
                                    ONU: {inst.onuSerialNumber}
                                </Typography>
                            )}
                            <Box display="flex" justifyContent="flex-end" gap={0.5} mt={1}>
                                <Tooltip title="Ver / Editar">
                                    <IconButton size="small" onClick={() => onViewInstallation(inst)} sx={{ color: '#2D5BFF' }}>
                                        <ViewIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {isAdmin && (
                                    <Tooltip title="Editar">
                                        <IconButton size="small" onClick={() => onEditInstallation(inst)} sx={{ color: '#6B7290' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {isAdmin && (
                                    <Tooltip title="Reiniciar ONU">
                                        <IconButton size="small" onClick={() => onRebootOnu(inst)} sx={{ color: '#F0A23A' }}>
                                            <RestartIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                {isAdmin && (
                                    <Tooltip title={inst.serviceStatus === 'activo' ? 'Suspender' : 'Activar'}>
                                        <IconButton size="small" onClick={() => onToggleOltService(inst)} sx={{ color: inst.serviceStatus === 'activo' ? '#E5484D' : '#00D4A6' }}>
                                            <PowerIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Paper sx={{ overflow: 'hidden', mb: 1 }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                        <Box component="thead">
                            <Box component="tr" sx={{ bgcolor: '#EDF0F7' }}>
                                {['Plan', 'Velocidad', 'Mensual', 'Estado', 'Instalado', 'Acciones'].map(h => (
                                    <Box key={h} component="th" sx={{ px: 1.5, py: 1, fontSize: '0.65rem', fontWeight: 800, color: '#4e73df', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Acciones' ? 'right' : 'left' }}>
                                        {h}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {activeInstallations.map(inst => (
                                <Box component="tr" key={inst.id} sx={{ '&:hover': { bgcolor: '#f8f9fc' }, borderTop: '1px solid #E2E6F0' }}>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600 }}>{inst.servicePlan?.name || inst.serviceType}</Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem' }}>{inst.speedMbps} Mbps</Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600, color: '#00D4A6' }}>{formatCurrency(inst.monthlyFee)}</Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1 }}>
                                        <Chip label={statusLabel(inst.serviceStatus)} color={statusColor(inst.serviceStatus)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                                    </Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.75rem', color: '#6B7290' }}>{formatDate(inst.installationDate)}</Box>
                                    <Box component="td" sx={{ px: 1, py: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <Tooltip title="Ver / Editar">
                                            <IconButton size="small" onClick={() => onViewInstallation(inst)} sx={{ color: '#2D5BFF' }}><ViewIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                        {isAdmin && (
                                            <Tooltip title="Editar">
                                                <IconButton size="small" onClick={() => onEditInstallation(inst)} sx={{ color: '#6B7290' }}><EditIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {isAdmin && (
                                            <Tooltip title="Reiniciar ONU">
                                                <IconButton size="small" onClick={() => onRebootOnu(inst)} sx={{ color: '#F0A23A' }}><RestartIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                        {isAdmin && (
                                            <Tooltip title={inst.serviceStatus === 'activo' ? 'Suspender' : 'Activar'}>
                                                <IconButton size="small" onClick={() => onToggleOltService(inst)} sx={{ color: inst.serviceStatus === 'activo' ? '#E5484D' : '#00D4A6' }}><PowerIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Servicios Adicionales */}
            <SectionHeader title="Servicios Adicionales" count={additionalServices.length} onAdd={isAdmin ? onAddService : undefined} addLabel="Nuevo" />
            {additionalServices.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1, mb: 2 }}>No hay servicios adicionales</Typography>
            ) : isMobile ? (
                additionalServices.map(svc => (
                    <Card key={svc.id} sx={{ mb: 1.5, borderLeft: 4, borderColor: svc.status === 'activo' ? '#00D4A6' : '#858796', borderRadius: 2 }}>
                        <CardContent sx={{ p: '12px !important' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <TvIcon sx={{ fontSize: 16, color: '#E5484D' }} />
                                    <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0E1330' }}>
                                        {svc.serviceName}
                                    </Typography>
                                </Box>
                                <Chip label={statusLabel(svc.status)} color={statusColor(svc.status)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                            </Box>
                            <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                {formatCurrency(svc.monthlyFee)}/mes · Desde {formatDate(svc.startDate)}
                                {svc.endDate ? ` hasta ${formatDate(svc.endDate)}` : ''}
                            </Typography>
                            <Box display="flex" justifyContent="flex-end" gap={0.5} mt={1}>
                                <Tooltip title="Ver / Editar">
                                    <IconButton size="small" onClick={() => onViewService(svc)} sx={{ color: '#2D5BFF' }}>
                                        <ViewIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {isAdmin && (
                                    <Tooltip title="Editar">
                                        <IconButton size="small" onClick={() => onEditService(svc)} sx={{ color: '#6B7290' }}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Paper sx={{ overflow: 'hidden', mb: 1 }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                        <Box component="thead">
                            <Box component="tr" sx={{ bgcolor: '#EDF0F7' }}>
                                {['Servicio', 'Mensual', 'Estado', 'Desde', 'Acciones'].map(h => (
                                    <Box key={h} component="th" sx={{ px: 1.5, py: 1, fontSize: '0.65rem', fontWeight: 800, color: '#4e73df', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Acciones' ? 'right' : 'left' }}>
                                        {h}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {additionalServices.map(svc => (
                                <Box component="tr" key={svc.id} sx={{ '&:hover': { bgcolor: '#f8f9fc' }, borderTop: '1px solid #E2E6F0' }}>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600 }}>{svc.serviceName}</Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600, color: '#00D4A6' }}>{formatCurrency(svc.monthlyFee)}</Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1 }}>
                                        <Chip label={statusLabel(svc.status)} color={statusColor(svc.status)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                                    </Box>
                                    <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.75rem', color: '#6B7290' }}>{formatDate(svc.startDate)}</Box>
                                    <Box component="td" sx={{ px: 1, py: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                        <Tooltip title="Ver / Editar">
                                            <IconButton size="small" onClick={() => onViewService(svc)} sx={{ color: '#2D5BFF' }}><ViewIcon fontSize="small" /></IconButton>
                                        </Tooltip>
                                        {isAdmin && (
                                            <Tooltip title="Editar">
                                                <IconButton size="small" onClick={() => onEditService(svc)} sx={{ color: '#6B7290' }}><EditIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Productos */}
            <SectionHeader title="Productos" count={products.length} onAdd={isAdmin ? onAddProduct : undefined} addLabel="Nuevo" />
            {products.length === 0 ? (
                <Typography variant="body2" color="textSecondary" sx={{ ml: 1, mb: 2 }}>No hay productos registrados</Typography>
            ) : isMobile ? (
                products.map(prod => {
                    const paid = (prod.installmentPayments || []).filter(ip => ip.status === 'completado').length;
                    const total = prod.installments || 0;
                    return (
                        <Card key={prod.id} sx={{ mb: 1.5, borderLeft: 4, borderColor: prod.status === 'completado' ? '#00D4A6' : '#F0A23A', borderRadius: 2 }}>
                            <CardContent sx={{ p: '12px !important' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <ProductIcon sx={{ fontSize: 16, color: '#2D5BFF' }} />
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#0E1330' }}>
                                            {prod.productName}
                                        </Typography>
                                    </Box>
                                    <Chip label={statusLabel(prod.status)} color={statusColor(prod.status)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                                </Box>
                                <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                                    {formatCurrency(prod.totalAmount)} · {paid}/{total} cuotas pagadas · Venta: {formatDate(prod.saleDate)}
                                </Typography>
                                <Box display="flex" justifyContent="flex-end" gap={0.5} mt={1}>
                                    <Tooltip title="Ver / Editar">
                                        <IconButton size="small" onClick={() => onViewProduct(prod)} sx={{ color: '#2D5BFF' }}>
                                            <ViewIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                    {isAdmin && (
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => onEditProduct(prod)} sx={{ color: '#6B7290' }}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    );
                })
            ) : (
                <Paper sx={{ overflow: 'hidden', mb: 1 }}>
                    <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                        <Box component="thead">
                            <Box component="tr" sx={{ bgcolor: '#EDF0F7' }}>
                                {['Producto', 'Total', 'Cuotas', 'Estado', 'Venta', 'Acciones'].map(h => (
                                    <Box key={h} component="th" sx={{ px: 1.5, py: 1, fontSize: '0.65rem', fontWeight: 800, color: '#4e73df', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: h === 'Acciones' ? 'right' : 'left' }}>
                                        {h}
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                        <Box component="tbody">
                            {products.map(prod => {
                                const paid = (prod.installmentPayments || []).filter(ip => ip.status === 'completado').length;
                                const total = prod.installments || 0;
                                return (
                                    <Box component="tr" key={prod.id} sx={{ '&:hover': { bgcolor: '#f8f9fc' }, borderTop: '1px solid #E2E6F0' }}>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600 }}>{prod.productName}</Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600, color: '#00D4A6' }}>{formatCurrency(prod.totalAmount)}</Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem' }}>{paid}/{total}</Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1 }}>
                                            <Chip label={statusLabel(prod.status)} color={statusColor(prod.status)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                                        </Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.75rem', color: '#6B7290' }}>{formatDate(prod.saleDate)}</Box>
                                        <Box component="td" sx={{ px: 1, py: 1, textAlign: 'right', whiteSpace: 'nowrap' }}>
                                            <Tooltip title="Ver / Editar">
                                                <IconButton size="small" onClick={() => onViewProduct(prod)} sx={{ color: '#2D5BFF' }}><ViewIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                            {isAdmin && (
                                                <Tooltip title="Editar">
                                                    <IconButton size="small" onClick={() => onEditProduct(prod)} sx={{ color: '#6B7290' }}><EditIcon fontSize="small" /></IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>
                                );
                            })}
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Últimos pagos */}
            {payments.length > 0 && (
                <>
                    <SectionHeader title="Últimos Pagos" count={Math.min(payments.length, 5)} />
                    <Paper sx={{ overflow: 'hidden' }}>
                        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                            <Box component="thead">
                                <Box component="tr" sx={{ bgcolor: '#EDF0F7' }}>
                                    {['Período', 'Tipo', 'Monto', 'Estado'].map(h => (
                                        <Box key={h} component="th" sx={{ px: 1.5, py: 1, fontSize: '0.65rem', fontWeight: 800, color: '#4e73df', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                            {h}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                            <Box component="tbody">
                                {payments.slice(0, 5).map(pmt => (
                                    <Box component="tr" key={pmt.id} sx={{ '&:hover': { bgcolor: '#f8f9fc' }, borderTop: '1px solid #E2E6F0' }}>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize' }}>
                                            {pmt.paymentMonth} {pmt.paymentYear}
                                        </Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.75rem', color: '#6B7290' }}>
                                            {pmt.paymentType === 'monthly' ? 'Mensualidad' : pmt.paymentType === 'installation' ? 'Instalación' : 'Otro'}
                                        </Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1, fontSize: '0.8rem', fontWeight: 600 }}>
                                            {formatCurrency(pmt.amount)}
                                        </Box>
                                        <Box component="td" sx={{ px: 1.5, py: 1 }}>
                                            <Chip label={statusLabel(pmt.status)} color={statusColor(pmt.status)} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700 }} />
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    </Paper>
                </>
            )}
        </Box>
    );
};
