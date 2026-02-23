import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Container,
    MenuItem,
    Grid,
    FormControl,
    InputLabel,
    Select,
    SelectChangeEvent,
    FormHelperText,
    FormControlLabel,
    Checkbox,
    Link as MuiLink
} from '@mui/material';
import { Send as SendIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import axios from 'axios';

interface ServicePlan {
    id: number;
    name: string;
    speedMbps: number;
    monthlyFee: string; // The API might return string or number
    installationFee: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const ServiceRequestForm: React.FC = () => {
    const [formData, setFormData] = useState({
        fullName: '',
        identificationNumber: '',
        installationAddress: '',
        city: 'Cali',
        primaryPhone: '',
        secondaryPhone: '',
        planId: ''
    });
    const [acceptDataPolicy, setAcceptDataPolicy] = useState(false);

    const [plans, setPlans] = useState<ServicePlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                const response = await axios.get(`${API_URL}/public/plans`);
                setPlans(response.data);
            } catch (err) {
                console.error('Error loading plans', err);
                setError('No se pudieron cargar los planes disponibles.');
            } finally {
                setLoadingPlans(false);
            }
        };

        fetchPlans();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        setFormData(prev => ({ ...prev, planId: e.target.value as string }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptDataPolicy) {
            setError('Debes autorizar el tratamiento de datos personales para continuar.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            await axios.post(`${API_URL}/public/register`, {
                ...formData,
                planId: parseInt(formData.planId),
                dataPolicyAccepted: acceptDataPolicy,
                policyUrl: '/Politica_Tratamiento_Datos_IMV.pdf'
            });
            setSuccess(true);
        } catch (err: any) {
            console.error('Error submitting form', err);
            setError(err.response?.data?.message || 'Error al enviar la solicitud. Por favor intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (val: string | number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(Number(val));
    };

    if (success) {
        return (
            <Box 
                sx={{ 
                    minHeight: '100vh', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    backgroundColor: '#f5f5f5',
                    p: 2
                }}
            >
                <Card sx={{ maxWidth: 600, width: '100%', textAlign: 'center', p: 4, boxShadow: 3 }}>
                    <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
                    <Typography variant="h4" gutterBottom color="primary" fontWeight="bold">
                        ¡Solicitud Recibida!
                    </Typography>
                    <Typography variant="body1" paragraph>
                        Gracias por registrar tus datos. Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo prontamente para coordinar la instalación.
                    </Typography>
                    <Button 
                        variant="contained" 
                        onClick={() => window.location.reload()}
                        sx={{ mt: 2 }}
                    >
                        Volver al formulario
                    </Button>
                </Card>
            </Box>
        );
    }

    return (
        <Box 
            sx={{ 
                minHeight: '100vh', 
                backgroundColor: '#f5f5f5', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                py: 4
            }}
        >
            <Container maxWidth="md">
                <Card sx={{ boxShadow: 3 }}>
                    <Box sx={{ bgcolor: 'primary.main', p: 3, color: 'white', textAlign: 'center' }}>
                        <Typography variant="h4" component="h1" fontWeight="bold">
                            Solicitud de Servicio
                        </Typography>
                        <Typography variant="subtitle1">
                            Completa el formulario para unirte a nuestra red
                        </Typography>
                    </Box>
                    <CardContent sx={{ p: 4 }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        Datos Personales
                                    </Typography>
                                </Grid>
                                
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Nombre Completo"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                        required
                                        variant="outlined"
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Número de Documento (C.C)"
                                        name="identificationNumber"
                                        value={formData.identificationNumber}
                                        onChange={handleChange}
                                        required
                                        variant="outlined"
                                        type="number"
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                        Ubicación e Instalación
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Dirección de Instalación"
                                        name="installationAddress"
                                        value={formData.installationAddress}
                                        onChange={handleChange}
                                        required
                                        variant="outlined"
                                        helperText="dirección, piso, casa/apto, barrio"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Ciudad / Municipio"
                                        name="city"
                                        value={formData.city}
                                        onChange={handleChange}
                                        required
                                        variant="outlined"
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                        Contacto
                                    </Typography>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Celular Principal"
                                        name="primaryPhone"
                                        value={formData.primaryPhone}
                                        onChange={handleChange}
                                        required
                                        variant="outlined"
                                        type="tel"
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Celular Secundario"
                                        name="secondaryPhone"
                                        value={formData.secondaryPhone}
                                        onChange={handleChange}
                                        required
                                        variant="outlined"
                                        type="tel"
                                    />
                                </Grid>

                                <Grid item xs={12}>
                                    <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                                        Plan de Internet
                                    </Typography>
                                </Grid>

                                <Grid item xs={12}>
                                    <FormControl fullWidth required error={loadingPlans && !plans.length}>
                                        <InputLabel>Selecciona tu Plan</InputLabel>
                                        <Select
                                            name="planId"
                                            value={formData.planId}
                                            label="Selecciona tu Plan"
                                            onChange={handleSelectChange}
                                            disabled={loadingPlans}
                                        >
                                            {plans.map((plan) => (
                                                <MenuItem key={plan.id} value={plan.id}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                                        <Typography variant="body1" fontWeight="bold">
                                                            {plan.name} ({plan.speedMbps} Mbps)
                                                        </Typography>
                                                        <Typography variant="body2" color="primary.main" fontWeight="bold">
                                                            {formatCurrency(plan.monthlyFee)}/mes
                                                        </Typography>
                                                    </Box>
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {loadingPlans ? (
                                            <FormHelperText>Cargando planes disponibles...</FormHelperText>
                                        ) : (
                                            <FormHelperText>
                                                Instalación: {plans.find(p => p.id === Number(formData.planId)) ? formatCurrency(plans.find(p => p.id === Number(formData.planId))!.installationFee) : 'Consultar'}
                                            </FormHelperText>
                                        )}
                                    </FormControl>
                                </Grid>

                                <Grid item xs={12} sx={{ mt: 2, textAlign: 'center' }}>
                                    <Box sx={{ textAlign: 'left', mb: 2 }}>
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={acceptDataPolicy}
                                                    onChange={(e) => setAcceptDataPolicy(e.target.checked)}
                                                    required
                                                />
                                            }
                                            label={
                                                <Typography variant="body2" color="text.secondary">
                                                    Autorizo de manera libre, previa, expresa e informada a IMV Internet para el tratamiento de mis datos personales conforme a la{' '}
                                                    <MuiLink
                                                        href="/Politica_Tratamiento_Datos_IMV.pdf"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Política de Tratamiento de Datos Personales
                                                    </MuiLink>
                                                    , incluyendo el contacto por WhatsApp y otros medios electrónicos para fines contractuales y comerciales.
                                                </Typography>
                                            }
                                        />
                                    </Box>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        endIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                        disabled={submitting}
                                        sx={{ minWidth: 200, py: 1.5, fontSize: '1.1rem' }}
                                    >
                                        {submitting ? 'Enviando...' : 'Enviar Solicitud'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </CardContent>
                </Card>
                <Box textAlign="center" mt={4}>
                    <Typography variant="body2" color="text.secondary">
                        &copy; {new Date().getFullYear()} IMV Networks CRM
                    </Typography>
                </Box>
            </Container>
        </Box>
    );
};

export default ServiceRequestForm;
