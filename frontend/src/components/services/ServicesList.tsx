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
    Chip,
    useMediaQuery,
    useTheme,
    Card,
    CardContent,
    Divider,
    Grid
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

            {isMobile ? (
                <Box>
                    {services.map((service) => (
                        <Card 
                            key={service.id} 
                            sx={{ 
                                mb: 2, 
                                borderRadius: 2,
                                borderLeft: `4px solid ${service.status === 'active' ? '#1cc88a' : '#858796'}`,
                                boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.1)'
                            }}
                        >
                            <CardContent sx={{ p: '12px !important' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#4e73df' }}>
                                        {service.serviceName}
                                    </Typography>
                                    <Chip
                                        label={service.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                                        color={service.status === 'active' ? 'success' : 'default'}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.6rem', fontWeight: 800 }}
                                    />
                                </Box>
                                
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Tarifa</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#1cc88a' }}>${service.monthlyFee}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Inicio</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{formatDate(service.startDate)}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1, opacity: 0.5 }} />

                                <Box display="flex" justifyContent="flex-end" gap={1}>
                                    <IconButton size="small" onClick={() => handleEdit(service)} sx={{ color: '#4e73df' }}><EditIcon fontSize="small" /></IconButton>
                                    <IconButton size="small" onClick={() => handleDelete(service.id)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                </Box>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#4e73df' }}>
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
                                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fc',
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
                                        <IconButton size="small" onClick={() => handleEdit(service)} sx={{ color: '#4e73df' }}>
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
            )}

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