import React, { useState, useEffect } from 'react';
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
    Chip
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { AdditionalService } from '../../types/AdditionalServices';
import { AdditionalServiceService } from '../../services/AdditionalServiceService';
import { AdditionalServiceForm } from './AdditionalServiceForm';
import { formatLocalDate } from '../../utils/dateUtils';

interface ServicesListProps {
    clientId: number;
}

export const ServicesList: React.FC<ServicesListProps> = ({ clientId }) => {
    const [services, setServices] = useState<AdditionalService[]>([]);
    const [openForm, setOpenForm] = useState(false);
    const [selectedService, setSelectedService] = useState<AdditionalService | undefined>();

    const loadServices = React.useCallback(async () => {
        try {
            const data = await AdditionalServiceService.getByClient(clientId);
            setServices(data);
        } catch (error) {
            console.error('Error al cargar los servicios:', error);
        }
    }, [clientId]);

    useEffect(() => {
        loadServices();
    }, [loadServices]);

    const handleEdit = (service: AdditionalService) => {
        setSelectedService(service);
        setOpenForm(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Está seguro de eliminar este servicio?')) {
            try {
                await AdditionalServiceService.delete(id);
                loadServices();
            } catch (error) {
                console.error('Error al eliminar el servicio:', error);
            }
        }
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date);
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Servicios Adicionales</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        setSelectedService(undefined);
                        setOpenForm(true);
                    }}
                >
                    Nuevo Servicio
                </Button>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#1976d2' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Servicio</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Tarifa Mensual</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Inicio</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fin</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {services.map((service, index) => (
                            <TableRow 
                                key={service.id}
                                sx={{ 
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                    '&:hover': {
                                        backgroundColor: '#e3f2fd'
                                    }
                                }}
                            >
                                <TableCell>{service.serviceName}</TableCell>
                                <TableCell>${service.monthlyFee}</TableCell>
                                <TableCell>{formatDate(service.startDate)}</TableCell>
                                <TableCell>
                                    {service.endDate ? formatDate(service.endDate) : '-'}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={service.status === 'active' ? 'Activo' : 'Inactivo'}
                                        color={service.status === 'active' ? 'success' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <IconButton size="small" onClick={() => handleEdit(service)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton
                                        size="small"
                                        color="error"
                                        onClick={() => handleDelete(service.id)}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <AdditionalServiceForm
                open={openForm}
                onClose={() => setOpenForm(false)}
                clientId={clientId}
                service={selectedService}
                onSave={loadServices}
            />
        </Paper>
    );
};