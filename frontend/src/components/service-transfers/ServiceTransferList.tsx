import React, { useEffect, useState, useCallback } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Autocomplete
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { ServiceTransfer, ServiceTransferService } from '../../services/ServiceTransferService';
import { ClientService } from '../../services/ClientService';
import { Client } from '../../types/Client';
import { Technician } from '../../types/Technician';
import axios from 'axios'; // For technicians if no service exists
import { formatLocalDate } from '../../utils/dateUtils';

// Assuming TechnicianService exists or we fetch from endpoint
const getTechnicians = async () => {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
    const res = await axios.get(`${apiUrl}/technicians`);
    return res.data;
};

export const ServiceTransferList: React.FC = () => {
    const [transfers, setTransfers] = useState<ServiceTransfer[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingTransfer, setEditingTransfer] = useState<ServiceTransfer | null>(null);

    // Form state
    const [formData, setFormData] = useState({
        clientId: 0,
        newAddress: '',
        requestDate: new Date().toISOString().split('T')[0],
        scheduledDate: '',
        completionDate: '',
        status: 'pending',
        cost: 0,
        technicianId: '',
        notes: ''
    });

    const loadData = useCallback(async () => {
        try {
            const [transfersData, clientsData, techniciansData] = await Promise.all([
                ServiceTransferService.getAll(),
                ClientService.getAll(),
                getTechnicians()
            ]);
            setTransfers(transfersData);
            setClients(clientsData);
            setTechnicians(techniciansData);
        } catch (error) {
            console.error("Error loading data", error);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleOpenDialog = (transfer?: ServiceTransfer) => {
        if (transfer) {
            setEditingTransfer(transfer);
            setFormData({
                clientId: transfer.clientId,
                newAddress: transfer.newAddress,
                requestDate: transfer.requestDate ? transfer.requestDate.toString().split('T')[0] : '',
                scheduledDate: transfer.scheduledDate ? transfer.scheduledDate.toString().split('T')[0] : '',
                completionDate: transfer.completionDate ? transfer.completionDate.toString().split('T')[0] : '',
                status: transfer.status,
                cost: transfer.cost,
                technicianId: transfer.technicianId ? transfer.technicianId.toString() : '',
                notes: transfer.notes || ''
            });
        } else {
            setEditingTransfer(null);
            setFormData({
                clientId: 0,
                newAddress: '',
                requestDate: new Date().toISOString().split('T')[0],
                scheduledDate: '',
                completionDate: '',
                status: 'pending',
                cost: 0,
                technicianId: '',
                notes: ''
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingTransfer(null);
    };

    const handleSubmit = async () => {
        try {
            const payload: any = {
                ...formData,
                technicianId: formData.technicianId ? parseInt(formData.technicianId) : null,
                scheduledDate: formData.scheduledDate || null,
                completionDate: formData.completionDate || null
            };

            if (editingTransfer) {
                await ServiceTransferService.update(editingTransfer.id, payload);
            } else {
                await ServiceTransferService.create(payload);
            }
            handleCloseDialog();
            loadData();
        } catch (error) {
            console.error("Error saving transfer", error);
            alert("Error al guardar el traslado");
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm("¿Estás seguro de eliminar este traslado?")) {
            try {
                await ServiceTransferService.delete(id);
                loadData();
            } catch (error) {
                console.error("Error deleting transfer", error);
            }
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'warning';
            case 'in_progress': return 'info';
            case 'completed': return 'success';
            case 'cancelled': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente';
            case 'in_progress': return 'En Progreso';
            case 'completed': return 'Completado';
            case 'cancelled': return 'Cancelado';
            default: return status;
        }
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Traslados de Servicio</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Nuevo Traslado
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                            <TableCell>Cliente</TableCell>
                            <TableCell>Dirección Anterior</TableCell>
                            <TableCell>Nueva Dirección</TableCell>
                            <TableCell>Fecha Solicitud</TableCell>
                            <TableCell>Estado</TableCell>
                            <TableCell>Costo</TableCell>
                            <TableCell>Técnico</TableCell>
                            <TableCell>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transfers.map((transfer) => (
                            <TableRow key={transfer.id}>
                                <TableCell>{transfer.client?.fullName}</TableCell>
                                <TableCell>{transfer.previousAddress}</TableCell>
                                <TableCell>{transfer.newAddress}</TableCell>
                                <TableCell>{formatLocalDate(transfer.requestDate)}</TableCell>
                                <TableCell>
                                    <Chip 
                                        label={getStatusLabel(transfer.status)} 
                                        color={getStatusColor(transfer.status) as any}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>${transfer.cost}</TableCell>
                                <TableCell>{transfer.technician?.name || '-'}</TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => handleOpenDialog(transfer)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(transfer.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                        {transfers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={8} align="center">
                                    No hay traslados registrados
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingTransfer ? 'Editar Traslado' : 'Nuevo Traslado'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        {!editingTransfer && (
                            <Autocomplete
                                options={clients}
                                getOptionLabel={(option) => `${option.fullName} - ${option.identificationNumber}`}
                                onChange={(_, newValue) => {
                                    setFormData({
                                        ...formData,
                                        clientId: newValue ? newValue.id : 0,
                                        // Pre-fill current address if available?
                                        // The backend handles previousAddress automatically on create, 
                                        // but we could show it here if we wanted.
                                    });
                                }}
                                renderInput={(params) => <TextField {...params} label="Cliente" fullWidth />}
                            />
                        )}
                        
                        <TextField
                            label="Nueva Dirección"
                            fullWidth
                            value={formData.newAddress}
                            onChange={(e) => setFormData({ ...formData, newAddress: e.target.value })}
                        />

                        <Box display="flex" gap={2}>
                            <TextField
                                label="Fecha Solicitud"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.requestDate}
                                onChange={(e) => setFormData({ ...formData, requestDate: e.target.value })}
                            />
                            <TextField
                                label="Fecha Programada"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={formData.scheduledDate}
                                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                            />
                        </Box>

                        <Box display="flex" gap={2}>
                            <FormControl fullWidth>
                                <InputLabel>Estado</InputLabel>
                                <Select
                                    value={formData.status}
                                    label="Estado"
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <MenuItem value="pending">Pendiente</MenuItem>
                                    <MenuItem value="in_progress">En Progreso</MenuItem>
                                    <MenuItem value="completed">Completado</MenuItem>
                                    <MenuItem value="cancelled">Cancelado</MenuItem>
                                </Select>
                            </FormControl>

                            <TextField
                                label="Costo"
                                type="number"
                                fullWidth
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
                            />
                        </Box>

                        <Box display="flex" gap={2}>
                            <FormControl fullWidth>
                                <InputLabel>Técnico Asignado</InputLabel>
                                <Select
                                    value={formData.technicianId}
                                    label="Técnico Asignado"
                                    onChange={(e) => setFormData({ ...formData, technicianId: e.target.value })}
                                >
                                    <MenuItem value=""><em>Ninguno</em></MenuItem>
                                    {technicians.map((tech) => (
                                        <MenuItem key={tech.id} value={tech.id}>{tech.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            
                            {formData.status === 'completed' && (
                                <TextField
                                    label="Fecha Completado"
                                    type="date"
                                    fullWidth
                                    InputLabelProps={{ shrink: true }}
                                    value={formData.completionDate}
                                    onChange={(e) => setFormData({ ...formData, completionDate: e.target.value })}
                                />
                            )}
                        </Box>

                        <TextField
                            label="Notas"
                            multiline
                            rows={3}
                            fullWidth
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button onClick={handleSubmit} variant="contained" color="primary">
                        Guardar
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
