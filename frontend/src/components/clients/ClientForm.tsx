import React, { useState, useEffect } from 'react';
import {
    TextField,
    Button,
    Grid,
    Paper,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent,
    Box,
    IconButton,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon } from '@mui/icons-material';
import { Client } from '../../types/Client';
import { ClientService } from '../../services/ClientService';
import { useNavigate } from 'react-router-dom';
import { formatPhoneForDisplay } from '../../utils/formatters';

interface ClientFormProps {
    client?: Client;
    onSave: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ client, onSave }) => {
    const navigate = useNavigate();
    const [isEditable, setIsEditable] = useState(!client);
    const [formData, setFormData] = useState({
        fullName: '',
        identificationNumber: '',
        installationAddress: '',
        city: 'Cali',
        primaryPhone: '',
        secondaryPhone: '',
        email: '',
        status: 'active',
        suspension_extension_date: ''
    });

    useEffect(() => {
        if (client) {
            console.log('Actualizando formulario con datos del cliente:', client);
            setFormData({
                fullName: client.fullName || '',
                identificationNumber: client.identificationNumber || '',
                installationAddress: client.installationAddress || '',
                city: client.city || 'Cali',
                primaryPhone: formatPhoneForDisplay(client.primaryPhone),
                secondaryPhone: formatPhoneForDisplay(client.secondaryPhone),
                email: client.email || '',
                status: client.status || 'active',
                // Asegurar formato YYYY-MM-DD si viene fecha ISO completa
                suspension_extension_date: client.suspension_extension_date ? client.suspension_extension_date.split('T')[0] : ''
            });
            setIsEditable(false);
        } else {
            setIsEditable(true);
        }
    }, [client]);

    const handleCancel = () => {
        if (client) {
            setFormData({
                fullName: client.fullName || '',
                identificationNumber: client.identificationNumber || '',
                installationAddress: client.installationAddress || '',
                city: client.city || 'Cali',
                primaryPhone: formatPhoneForDisplay(client.primaryPhone),
                secondaryPhone: formatPhoneForDisplay(client.secondaryPhone),
                email: client.email || '',
                status: client.status || 'active',
                suspension_extension_date: client.suspension_extension_date ? client.suspension_extension_date.split('T')[0] : ''
            });
            setIsEditable(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Helper para asegurar prefijo 57
        const formatPhone = (phone: string) => {
            if (!phone) return phone;
            const clean = phone.replace(/\D/g, '');
            // Si tiene 10 dígitos (ej: 3001234567), agregar 57
            if (clean.length === 10) return `57${clean}`;
            // Si ya tiene 12 y empieza con 57, está bien
            if (clean.length === 12 && clean.startsWith('57')) return clean;
            return clean || phone;
        };

        const dataToSave = {
            ...formData,
            primaryPhone: formatPhone(formData.primaryPhone),
            secondaryPhone: formatPhone(formData.secondaryPhone)
        };

        try {
            if (client) {
                await ClientService.update(client.id, dataToSave);
                onSave();
                setIsEditable(false);
                // No navegar, quedarse en la vista
            } else {
                const newClient = await ClientService.create(dataToSave);
                // Después de crear, navegar a detalles del cliente con tab de instalaciones abierto
                navigate(`/clients/${newClient.id}`, { state: { openTabIndex: 3 } });
            }
        } catch (error) {
            console.error('Error al guardar el cliente:', error);
            // Aquí podrías mostrar una notificación de error
        }
    };

    return (
        <Paper style={{ padding: '2rem' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">
                    {client ? 'Información del Cliente' : 'Nuevo Cliente'}
                </Typography>
                {client && !isEditable && (
                    <Button
                        startIcon={<EditIcon />}
                        variant="contained"
                        onClick={() => setIsEditable(true)}
                    >
                        Editar
                    </Button>
                )}
            </Box>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            required
                            name="fullName"
                            label="Nombre Completo"
                            value={formData.fullName}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            required
                            name="identificationNumber"
                            label="No. Cédula"
                            value={formData.identificationNumber}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                        />
                    </Grid>

                    <Grid item xs={12}>
                        <TextField
                            fullWidth
                            required
                            name="installationAddress"
                            label="dirección, piso, casa/apto, barrio"
                            value={formData.installationAddress}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            required
                            name="city"
                            label="Ciudad"
                            value={formData.city}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            required
                            name="primaryPhone"
                            label="Celular 1"
                            value={formData.primaryPhone}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            required
                            name="secondaryPhone"
                            label="Celular 2"
                            value={formData.secondaryPhone}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                            helperText="Segundo número obligatorio"
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            required
                            name="email"
                            label="Correo Electrónico"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                        />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth disabled={!isEditable}>
                            <InputLabel>Estado</InputLabel>
                            <Select
                                labelId="status-label"
                                name="status"
                                value={formData.status}
                                onChange={handleSelectChange}
                                label="Estado"
                            >
                                <MenuItem value="active">Activo</MenuItem>
                                <MenuItem value="suspended">Suspendido</MenuItem>
                                <MenuItem value="cancelled">Cancelado</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            name="suspension_extension_date"
                            label="Extender Susp. Hasta"
                            type="date"
                            value={formData.suspension_extension_date}
                            onChange={handleInputChange}
                            disabled={!isEditable}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            helperText="Fecha límite antes del corte automático"
                        />
                    </Grid>

                    {isEditable && (
                        <Grid item xs={12} sx={{ display: 'flex', gap: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                startIcon={<SaveIcon />}
                            >
                                {client ? 'Guardar Cambios' : 'Crear Cliente'}
                            </Button>
                            {client && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleCancel}
                                    startIcon={<CancelIcon />}
                                >
                                    Cancelar
                                </Button>
                            )}
                        </Grid>
                    )}
                </Grid>
            </form>
        </Paper>
    );
};