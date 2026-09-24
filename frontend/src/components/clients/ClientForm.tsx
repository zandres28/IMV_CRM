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
    Tooltip,
} from '@mui/material';
import { Edit as EditIcon, Save as SaveIcon, Cancel as CancelIcon, ContentCopy as CopyIcon, Check as CheckIcon } from '@mui/icons-material';
import { Client } from '../../types/Client';
import { ClientService } from '../../services/ClientService';
import { useNavigate } from 'react-router-dom';
import { formatPhoneForDisplay } from '../../utils/formatters';
import AuthService from '../../services/AuthService';

// Fila de dato en la tarjeta: etiqueta en label + valor + botón de copiar (si aplica)
interface InfoRowProps {
    label: string;
    value?: string | null;
    copyable?: boolean;
    onCopied?: () => void;
}

const statusLabel = (status?: string): string => {
    const map: Record<string, string> = {
        activo: 'Activo',
        suspendido: 'Suspendido',
        retirado: 'Retirado',
        inactivo: 'Inactivo',
        pendiente_instalacion: 'Pendiente Instalación'
    };
    return map[status || ''] || status || '-';
};

const InfoRow: React.FC<InfoRowProps> = ({ label, value, copyable, onCopied }) => (
    <Box>
        <Typography sx={{ color: '#6B7290', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem', mb: 0.25 }}>
            {label}
        </Typography>
        <Box display="flex" alignItems="center" gap={0.5} minHeight={28}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#0E1330', wordBreak: 'break-word' }}>
                {value || '-'}
            </Typography>
            {copyable && value && (
                <Tooltip title={`Copiar ${label.toLowerCase()}`}>
                    <IconButton size="small" onClick={onCopied} sx={{ p: 0.25 }}>
                        <CopyIcon fontSize="small" sx={{ fontSize: 14, color: '#6B7290' }} />
                    </IconButton>
                </Tooltip>
            )}
        </Box>
    </Box>
);

interface ClientFormProps {
    client?: Client;
    onSave: () => void;
}

export const ClientForm: React.FC<ClientFormProps> = ({ client, onSave }) => {
    const navigate = useNavigate();
    const [isEditable, setIsEditable] = useState(!client);
    const [copiedField, setCopiedField] = useState<string | null>(null);
    const currentUser = AuthService.getCurrentUser();
    const [formData, setFormData] = useState({
        fullName: '',
        identificationNumber: '',
        installationAddress: '',
        city: 'Cali',
        primaryPhone: '',
        secondaryPhone: '',
        email: '',
        status: 'activo',
        suspension_extension_date: '',
        sucursal: currentUser?.sucursal || 'CALI'
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
                status: client.status || 'activo',
                // Asegurar formato YYYY-MM-DD si viene fecha ISO completa
                suspension_extension_date: client.suspension_extension_date ? client.suspension_extension_date.split('T')[0] : '',
                sucursal: client.sucursal || currentUser?.sucursal || 'CALI'
            });
            setIsEditable(false);
        } else {
            setIsEditable(true);
        }
    }, [client, currentUser?.sucursal]);

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
                status: client.status || 'activo',
                suspension_extension_date: client.suspension_extension_date ? client.suspension_extension_date.split('T')[0] : '',
                sucursal: client.sucursal || currentUser?.sucursal || 'CALI'
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

    const handleCopy = (field: string, value?: string | null) => {
        if (!value) return;
        navigator.clipboard?.writeText(value).catch(() => {});
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1500);
    };

    const copyButton = (field: string, value?: string | null) => {
        if (copiedField === field) {
            return <CheckIcon fontSize="small" sx={{ fontSize: 14, color: '#00D4A6' }} />;
        }
        return <CopyIcon fontSize="small" sx={{ fontSize: 14, color: '#6B7290' }} />;
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
                navigate(`/clients/${newClient.id}`, { state: { openTabIndex: 1 } });
            }
        } catch (error) {
            console.error('Error al guardar el cliente:', error);
            // Aquí podrías mostrar una notificación de error
        }
    };

    return (
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: '16px', border: '1px solid #E2E6F0', boxShadow: '0 1px 0 rgba(14,19,48,0.04), 0 8px 24px -16px rgba(14,19,48,0.18)' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h5">
                    {client ? 'Información del Cliente' : 'Nuevo Cliente'}
                </Typography>
                {client && !isEditable && !AuthService.hasRole('tecnico') && (
                    <Button
                        startIcon={<EditIcon />}
                        variant="contained"
                        onClick={() => setIsEditable(true)}
                    >
                        Editar
                    </Button>
                )}
            </Box>

            {client && !isEditable ? (
                <Grid container spacing={3}>
                    <Grid item xs={12} sm={6}>
                        <InfoRow
                            label="Nombres y Apellidos"
                            value={client.fullName}
                            copyable
                            onCopied={() => handleCopy('fullName', client.fullName)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow label="No. Cédula" value={client.identificationNumber} />
                    </Grid>
                    <Grid item xs={12}>
                        <InfoRow
                            label="Dirección"
                            value={client.installationAddress && client.city ? `${client.installationAddress}, ${client.city}` : client.installationAddress || client.city}
                            copyable
                            onCopied={() => handleCopy('address', client.installationAddress && client.city ? `${client.installationAddress}, ${client.city}` : client.installationAddress || client.city)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow label="Ciudad" value={client.city} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow label="Sucursal" value={client.sucursal} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow
                            label="Celular 1"
                            value={formatPhoneForDisplay(client.primaryPhone)}
                            copyable
                            onCopied={() => handleCopy('primaryPhone', formatPhoneForDisplay(client.primaryPhone))}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow
                            label="Celular 2"
                            value={formatPhoneForDisplay(client.secondaryPhone)}
                            copyable
                            onCopied={() => handleCopy('secondaryPhone', formatPhoneForDisplay(client.secondaryPhone))}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow label="Correo Electrónico" value={client.email} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <InfoRow label="Estado" value={statusLabel(client.status)} />
                    </Grid>
                    {client.suspension_extension_date && (
                        <Grid item xs={12} sm={6}>
                            <InfoRow label="Extender Susp. Hasta" value={client.suspension_extension_date.split('T')[0]} />
                        </Grid>
                    )}
                </Grid>
            ) : (
                <form onSubmit={handleSubmit}>
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                required
                                name="fullName"
                                label="Nombres y Apellidos Completos"
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
                        <FormControl fullWidth disabled={!isEditable || !!currentUser?.sucursal}>
                            <InputLabel>Sucursal</InputLabel>
                            <Select
                                name="sucursal"
                                value={formData.sucursal}
                                onChange={handleSelectChange}
                                label="Sucursal"
                            >
                                <MenuItem value="CALI">Cali</MenuItem>
                                <MenuItem value="PASTO">Pasto</MenuItem>
                                <MenuItem value="OTRA">Otra</MenuItem>
                            </Select>
                        </FormControl>
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
                                <MenuItem value="activo">Activo</MenuItem>
                                <MenuItem value="suspendido">Suspendido</MenuItem>
                                <MenuItem value="retirado">Retirado</MenuItem>
                                <MenuItem value="inactivo">Inactivo</MenuItem>
                                <MenuItem value="pendiente_instalacion">Pendiente Inst.</MenuItem>
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

                    {/* Boton Editar: Solo si no es técnico */}
                    {isEditable && (
                        <Grid item xs={12} sx={{ display: 'flex', gap: 2, mt: 2 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                color="primary"
                                startIcon={<SaveIcon />}
                                fullWidth
                            >
                                {client ? 'Guardar Cambios' : 'Crear Cliente'}
                            </Button>
                            {client && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={handleCancel}
                                    startIcon={<CancelIcon />}
                                    fullWidth
                                >
                                    Cancelar
                                </Button>
                            )}
                        </Grid>
                    )}
                    </Grid>
                </form>
            )}
        </Paper>
    );
};
