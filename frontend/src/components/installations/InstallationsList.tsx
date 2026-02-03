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
    TextField
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    History as HistoryIcon,
    Search as SearchIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { Installation, InstallationService } from '../../services/InstallationService';
import { InstallationForm } from './InstallationForm';
import { SpeedHistoryDialog } from './SpeedHistoryDialog';
import { formatLocalDate } from '../../utils/dateUtils';

interface InstallationsListProps {
    clientId: number;
}

export const InstallationsList: React.FC<InstallationsListProps> = ({ clientId }) => {
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
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Instalaciones</Typography>
                <Box display="flex" gap={2}>
                    <TextField
                        placeholder="Buscar..."
                        variant="outlined"
                        size="small"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        InputProps={{
                            startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                        }}
                        sx={{ width: 250 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => {
                            setSelectedInstallation(null);
                            setOpenForm(true);
                        }}
                    >
                        Nueva Instalación
                    </Button>
                </Box>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#1976d2' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tipo de Servicio</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ONU SN</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha Instalación</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Técnico</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>PON ID</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ONU ID</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cuota Mensual</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Costo Instalación</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedInstallations.map((installation, index) => (
                            <TableRow 
                                key={installation.id}
                                sx={{ 
                                    backgroundColor: installation.isDeleted ? '#ffebee' : (index % 2 === 0 ? 'white' : '#f5f5f5'),
                                    '&:hover': {
                                        backgroundColor: installation.isDeleted ? '#ffcdd2' : '#e3f2fd'
                                    }
                                }}
                            >
                                <TableCell>{installation.serviceType}</TableCell>
                                <TableCell>{installation.onuSerialNumber || '-'}</TableCell>
                                <TableCell>{formatDate(installation.installationDate)}</TableCell>
                                <TableCell>{installation.technician}</TableCell>
                                <TableCell>{installation.ponId || '-'}</TableCell>
                                <TableCell>{installation.onuId || '-'}</TableCell>
                                <TableCell>{formatCurrency(installation.monthlyFee)}</TableCell>
                                <TableCell>{formatCurrency(installation.installationFee || 0)}</TableCell>
                                <TableCell>
                                    {installation.isDeleted ? (
                                        <Chip label="Eliminada" color="error" size="small" />
                                    ) : (
                                        <Chip
                                            label={getStatusChipProps(installation.serviceStatus).label}
                                            color={getStatusChipProps(installation.serviceStatus).color}
                                            size="small"
                                        />
                                    )}
                                </TableCell>
                                <TableCell>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleEdit(installation)}
                                        title="Editar"
                                        disabled={installation.isDeleted}
                                    >
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleViewSpeedHistory(installation)}
                                        title="Historial de Velocidad"
                                        disabled={installation.isDeleted}
                                    >
                                        <HistoryIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        onClick={() => handleDelete(installation)}
                                        title="Eliminar"
                                        color="error"
                                        disabled={installation.isDeleted}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                    {installation.isDeleted && (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            onClick={() => handleRestore(installation)}
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