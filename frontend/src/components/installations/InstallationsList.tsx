import React, { useState, useEffect, useCallback } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Typography,
    Box,
    Chip,
    Snackbar,
    Alert,
    TablePagination,
    TextField,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider,
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    Delete as DeleteIcon,
    RestartAlt as RestartAltIcon
} from '@mui/icons-material';
import { Installation, InstallationService } from '../../services/InstallationService';
import { InstallationForm } from './InstallationForm';
import { SpeedHistoryDialog } from './SpeedHistoryDialog';
import { formatLocalDate } from '../../utils/dateUtils';

interface InstallationsListProps {
    clientId: number;
}

export const InstallationsList: React.FC<InstallationsListProps> = ({ clientId }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [installations, setInstallations] = useState<Installation[]>([]);
    const [filteredInstallations, setFilteredInstallations] = useState<Installation[]>([]);
    const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
    const [openForm, setOpenForm] = useState(false);
    const [openSpeedHistory, setOpenSpeedHistory] = useState(false);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [searchTerm, setSearchTerm] = useState('');

    const [notificationOpen, setNotificationOpen] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [notificationSeverity, setNotificationSeverity] = useState<'success' | 'error' | 'info' | 'warning'>('success');

    const loadInstallations = useCallback(async (showDeleted = false) => {
        try {
            const data = await InstallationService.getByClient(clientId, { includeDeleted: showDeleted });
            setInstallations(data);
            setFilteredInstallations(data);
            
            // Si no hay instalaciones, abrir formulario automáticamente para cliente nuevo
            if (data.length === 0) {
                setOpenForm(true);
            }
        } catch (error: any) {
            console.error('Error al cargar las instalaciones:', error);
            const msg = error?.response?.data?.message || error?.message || 'Error al cargar las instalaciones';
            setNotificationMessage(msg);
            setNotificationSeverity('error');
            setNotificationOpen(true);
        }
    }, [clientId]);

    useEffect(() => {
        loadInstallations(false);
    }, [loadInstallations]);

    const filterInstallations = useCallback(() => {
        const filtered = installations.filter((inst) => {
            const searchLower = searchTerm.toLowerCase();
            return (
                inst.serviceType.toLowerCase().includes(searchLower) ||
                inst.technician.toLowerCase().includes(searchLower) ||
                inst.serviceStatus.toLowerCase().includes(searchLower) ||
                inst.speedMbps.toString().includes(searchLower)
            );
        });
        setFilteredInstallations(filtered);
        setPage(0);
    }, [installations, searchTerm]);

    useEffect(() => {
        filterInstallations();
    }, [filterInstallations]);

    const handleChangePage = (_event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleCreateInstallation = async (installation: Partial<Installation>) => {
        try {
            await InstallationService.create(installation);
            setNotificationMessage('Instalación creada correctamente');
            setNotificationSeverity('success');
            setNotificationOpen(true);
            loadInstallations();
        } catch (error: any) {
            console.error('Error al crear la instalación:', error);
            const msg = error?.response?.data?.message || 'Error al crear la instalación';
            setNotificationMessage(msg);
            setNotificationSeverity('error');
            setNotificationOpen(true);
        }
    };

    const handleUpdateInstallation = async (installation: Partial<Installation>) => {
        try {
            if (selectedInstallation) {
                await InstallationService.update(selectedInstallation.id, installation);
                setNotificationMessage('Instalación actualizada correctamente');
                setNotificationSeverity('success');
                setNotificationOpen(true);
                loadInstallations();
            }
        } catch (error: any) {
            console.error('Error al actualizar la instalación:', error);
            const msg = error?.response?.data?.message || 'Error al actualizar la instalación';
            setNotificationMessage(msg);
            setNotificationSeverity('error');
            setNotificationOpen(true);
        }
    };

    const handleEdit = (installation: Installation) => {
        setSelectedInstallation(installation);
        setOpenForm(true);
    };

    const handleViewSpeedHistory = (installation: Installation) => {
        setSelectedInstallation(installation);
        setOpenSpeedHistory(true);
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(amount);
    };

    const handleDelete = async (installation: Installation) => {
        const confirmed = window.confirm('¿Eliminar esta instalación? Esta acción no se puede deshacer.');
        if (!confirmed) return;

        try {
            await InstallationService.delete(installation.id);
            setNotificationMessage('Instalación eliminada (soft) correctamente');
            setNotificationSeverity('success');
            setNotificationOpen(true);
            await loadInstallations(false);
        } catch (error: any) {
            console.error('Error al eliminar la instalación:', error);
            const data = error?.response?.data;
            const base = data?.message || 'Error al eliminar la instalación';
            const hint = data?.hint ? ` (${data.hint})` : '';
            setNotificationMessage(`${base}${hint}`);
            setNotificationSeverity('error');
            setNotificationOpen(true);
        }
    };

    const handleRestore = async (installation: Installation) => {
        const confirmed = window.confirm('¿Restaurar esta instalación?');
        if (!confirmed) return;
        try {
            await InstallationService.restore(installation.id);
            setNotificationMessage('Instalación restaurada correctamente');
            setNotificationSeverity('success');
            setNotificationOpen(true);
            await loadInstallations(false);
        } catch (error: any) {
            console.error('Error al restaurar instalación:', error);
            const msg = error?.response?.data?.message || 'Error al restaurar la instalación';
            setNotificationMessage(msg);
            setNotificationSeverity('error');
            setNotificationOpen(true);
        }
    };

    const handleReboot = async (installationId: number) => {
        const confirmed = window.confirm('¿Estás seguro de que deseas reiniciar la ONU?');
        if (!confirmed) return;

        try {
            setNotificationMessage('Iniciando reinicio de ONU...');
            setNotificationSeverity('info');
            setNotificationOpen(true);

            await InstallationService.rebootOnu(installationId);

            setNotificationMessage('Comando de reinicio enviado correctamente.');
            setNotificationSeverity('success');
            setNotificationOpen(true);
        } catch (error: any) {
            console.error('Error al reiniciar la ONU:', error);
            const msg = error?.response?.data?.message || 'Error al conectar con la OLT o enviar el comando.';
            setNotificationMessage(msg);
            setNotificationSeverity('error');
            setNotificationOpen(true);
        }
    };

    const getStatusChipProps = (status: string) => {
        const statusMap: Record<string, { label: string; color: 'success' | 'warning' | 'error' }> = {
            active: { label: 'Activo', color: 'success' },
            suspended: { label: 'Suspendido', color: 'warning' },
            cancelled: { label: 'Cancelado', color: 'error' }
        };
        return statusMap[status] || { label: status, color: 'default' };
    };

    const paginatedInstallations = filteredInstallations.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Paper sx={{ p: 0, borderRadius: 2, boxShadow: '0 .15rem 1.75rem 0 rgba(58,59,69,.15)', overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e3e6f0', bgcolor: '#f8f9fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#4e73df', textTransform: 'uppercase', fontSize: '0.75rem' }}>Listado de Instalaciones</Typography>
                <Box display="flex" gap={1}>
                    <TextField
                        placeholder="Buscar..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: '#d1d3e2', fontSize: 18 }} />,
                            sx: { fontSize: '0.75rem', bgcolor: '#fff' }
                        }}
                        sx={{ width: 200 }}
                    />
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setSelectedInstallation(null);
                            setOpenForm(true);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                    >
                        Nueva
                    </Button>
                </Box>
            </Box>

            {isMobile ? (
                <Box sx={{ p: 1, bgcolor: '#f8f9fc' }}>
                    {paginatedInstallations.map((installation) => (
                        <Card 
                            key={installation.id} 
                            sx={{ 
                                mb: 2, 
                                borderRadius: 2,
                                borderLeft: `4px solid ${installation.isDeleted ? '#e74a3b' : (installation.serviceStatus === 'active' ? '#1cc88a' : (installation.serviceStatus === 'suspended' ? '#f6c23e' : '#e74a3b'))}`,
                                boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.1)'
                            }}
                        >
                            <CardContent sx={{ p: '12px !important' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#4e73df' }}>
                                        {installation.serviceType}
                                    </Typography>
                                    <Chip
                                        label={installation.isDeleted ? "ELIMINADA" : getStatusChipProps(installation.serviceStatus).label.toUpperCase()}
                                        size="small"
                                        sx={{ 
                                            height: 20, 
                                            fontSize: '0.6rem', 
                                            fontWeight: 800,
                                            bgcolor: installation.isDeleted ? '#e74a3b' : (installation.serviceStatus === 'active' ? '#1cc88a20' : '#f6c23e20'),
                                            color: installation.isDeleted ? 'white' : (installation.serviceStatus === 'active' ? '#1cc88a' : '#f6c23e'),
                                            border: installation.isDeleted ? 'none' : `1px solid ${installation.serviceStatus === 'active' ? '#1cc88a' : '#f6c23e'}`
                                        }}
                                    />
                                </Box>
                                
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>ONU SN</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#5a5c69' }}>{installation.onuSerialNumber || '-'}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>NAP</Typography>
                                        <Box>{installation.napLabel ? <Chip label={installation.napLabel} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 800, borderColor: '#4e73df', color: '#4e73df' }} /> : '-'}</Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Mensual</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#1cc88a' }}>{formatCurrency(installation.monthlyFee)}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>ID (P/O)</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 600 }}>{installation.ponId}/{installation.onuId}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1, opacity: 0.5 }} />

                                <Box display="flex" justifyContent="flex-end" gap={0.5}>
                                    <IconButton size="small" onClick={() => handleEdit(installation)} disabled={installation.isDeleted} sx={{ color: '#4e73df' }} title="Editar"><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleViewSpeedHistory(installation)} disabled={installation.isDeleted} sx={{ color: '#36b9cc' }} title="Historial"><HistoryIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleReboot(installation.id)} disabled={installation.isDeleted || !installation.onuSerialNumber} sx={{ color: '#f6c23e' }} title="Reiniciar ONU"><RestartAltIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(installation)} disabled={installation.isDeleted} sx={{ color: '#e74a3b' }} title="Eliminar"><DeleteIcon fontSize="small" /></IconButton>
                                    {installation.isDeleted && (
                                        <Button size="small" variant="outlined" onClick={() => handleRestore(installation)} sx={{ fontSize: '0.6rem', py: 0 }}>Restaurar</Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25]}
                        component="div"
                        count={filteredInstallations.length}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        labelRowsPerPage=""
                    />
                </Box>
            ) : (
                <TableContainer>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8f9fc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Servicio</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>ONU SN</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>NAP</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Fecha</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Técnico</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>ID (P/O)</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Mensual</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Costo</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Estado</TableCell>
                            <TableCell sx={{ fontWeight: 800, fontSize: '0.65rem', color: '#4e73df', textTransform: 'uppercase' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedInstallations.map((installation, index) => (
                            <TableRow 
                                key={installation.id}
                                sx={{ 
                                    backgroundColor: installation.isDeleted ? '#ffebee' : 'transparent',
                                    '&:hover': {
                                        backgroundColor: '#f8f9fc'
                                    },
                                    borderBottom: '1px solid #e3e6f0'
                                }}
                            >
                                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#5a5c69' }}>{installation.serviceType}</TableCell>
                                <TableCell sx={{ fontSize: '0.7rem', color: '#4e73df', fontWeight: 600 }}>{installation.onuSerialNumber || '-'}</TableCell>
                                <TableCell sx={{ fontSize: '0.7rem' }}>
                                    {installation.napLabel ? <Chip label={installation.napLabel} size="small" variant="outlined" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, borderColor: '#4e73df', color: '#4e73df' }} /> : '-'}
                                </TableCell>
                                <TableCell sx={{ fontSize: '0.7rem' }}>{formatDate(installation.installationDate)}</TableCell>
                                <TableCell sx={{ fontSize: '0.7rem' }}>{installation.technician}</TableCell>
                                <TableCell sx={{ fontSize: '0.7rem' }}>{installation.ponId}/{installation.onuId}</TableCell>
                                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>{formatCurrency(installation.monthlyFee)}</TableCell>
                                <TableCell sx={{ fontSize: '0.7rem', fontWeight: 700 }}>{formatCurrency(installation.installationFee || 0)}</TableCell>
                                <TableCell>
                                    {installation.isDeleted ? (
                                        <Chip label="ELIMINADA" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 800, bgcolor: '#e74a3b', color: 'white' }} size="small" />
                                    ) : (
                                        <Chip
                                            label={getStatusChipProps(installation.serviceStatus).label.toUpperCase()}
                                            sx={{ 
                                                height: 18, 
                                                fontSize: '0.6rem', 
                                                fontWeight: 800,
                                                bgcolor: installation.serviceStatus === 'active' ? '#1cc88a20' : installation.serviceStatus === 'suspended' ? '#f6c23e20' : '#e74a3b20',
                                                color: installation.serviceStatus === 'active' ? '#1cc88a' : installation.serviceStatus === 'suspended' ? '#f6c23e' : '#e74a3b',
                                                border: `1px solid ${installation.serviceStatus === 'active' ? '#1cc88a' : installation.serviceStatus === 'suspended' ? '#f6c23e' : '#e74a3b'}`
                                            }}
                                            size="small"
                                        />
                                    )}
                                </TableCell>
                                <TableCell sx={{ py: 0.5 }}>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleEdit(installation)}
                                        title="Editar"
                                        disabled={installation.isDeleted}
                                        sx={{ color: '#4e73df' }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleViewSpeedHistory(installation)}
                                        title="Historial de Velocidad"
                                        disabled={installation.isDeleted}
                                        sx={{ color: '#36b9cc' }}
                                    >
                                        <HistoryIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleReboot(installation.id)}
                                        title="Reiniciar ONU"
                                        disabled={installation.isDeleted || !installation.onuSerialNumber}
                                        sx={{ color: '#f6c23e' }}
                                    >
                                        <RestartAltIcon fontSize="small" />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(installation)}
                                        title="Eliminar"
                                        disabled={installation.isDeleted}
                                        sx={{ color: '#e74a3b' }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                    {installation.isDeleted && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleRestore(installation)}
                                            sx={{ ml: 1, fontSize: '0.65rem' }}
                                        >Restaurar</Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredInstallations.length}
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

            <InstallationForm
                open={openForm}
                onClose={() => {
                    setOpenForm(false);
                    setSelectedInstallation(null);
                }}
                onSave={selectedInstallation ? handleUpdateInstallation : handleCreateInstallation}
                installation={selectedInstallation || undefined}
                clientId={clientId}
            />

            <Snackbar
                open={notificationOpen}
                autoHideDuration={4000}
                onClose={() => setNotificationOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setNotificationOpen(false)} severity={notificationSeverity} sx={{ width: '100%' }}>
                    {notificationMessage}
                </Alert>
            </Snackbar>

            {selectedInstallation && (
                <SpeedHistoryDialog
                    open={openSpeedHistory}
                    onClose={() => setOpenSpeedHistory(false)}
                    speedHistory={selectedInstallation.speedHistory || []}
                />
            )}
        </Paper>
    );
};