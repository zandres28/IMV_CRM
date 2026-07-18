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
  FormControlLabel,
  Checkbox,
  Link as MuiLink,
  Stack,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  WhatsApp as WhatsAppIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import axios from 'axios';

interface ServicePlan {
  id: number;
  name: string;
  speedMbps: number;
  monthlyFee: string;
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
    const [cities, setCities] = useState<string[]>(['Cali']);
    const [plans, setPlans] = useState<ServicePlan[]>([]);
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [whatsappUrl, setWhatsappUrl] = useState<string>('');

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const response = await axios.get(`${API_URL}/public/client-options`);
                if (response.data?.cities?.length) {
                    setCities(response.data.cities);
                    setFormData(prev => ({ ...prev, city: response.data.cities[0] }));
                }
            } catch (e) { /* usar default */ }
        };
        fetchOptions();
    }, []);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!acceptDataPolicy) {
            setError('Debes autorizar el tratamiento de datos personales para continuar.');
            return;
        }
        if (!formData.fullName.trim() || !formData.identificationNumber.trim() || !formData.primaryPhone.trim()) {
            setError('Completa los datos personales obligatorios antes de enviar la solicitud.');
            return;
        }
        const parsedPlanId = Number(formData.planId);
        if (!Number.isInteger(parsedPlanId) || parsedPlanId <= 0) {
            setError('Selecciona un plan válido antes de enviar la solicitud.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const response = await axios.post(`${API_URL}/public/register`, {
                ...formData,
                planId: parsedPlanId,
                dataPolicyAccepted: acceptDataPolicy,
                policyUrl: '/Politica_Tratamiento_Datos_IMV.pdf'
            });

            const waUrl = response.data?.whatsappUrl;
            if (waUrl && typeof waUrl === 'string') {
                setWhatsappUrl(waUrl);
                window.open(waUrl, '_blank', 'noopener,noreferrer');
            }

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
            currency: 'COP',
            maximumFractionDigits: 0,
        }).format(Number(val));
    };

    const selectedPlan = plans.find(p => p.id === Number(formData.planId));

    if (success) {
        return (
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', p: 2 }}>
                <Card sx={{ maxWidth: 480, width: '100%', textAlign: 'center', p: { xs: 3, sm: 5 }, borderRadius: 3 }}>
                    <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: 'success.main', color: 'white', display: 'grid', placeItems: 'center', mx: 'auto', mb: 2 }}>
                        <CheckCircleIcon sx={{ fontSize: 40 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                        ¡Solicitud Recibida!
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                        Gracias por registrar tus datos. Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo prontamente para coordinar la instalación.
                    </Typography>
                    {whatsappUrl && (
                        <Button variant="contained" color="success" startIcon={<WhatsAppIcon />} onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')} sx={{ mb: 1.5, px: 3 }}>
                            Abrir WhatsApp
                        </Button>
                    )}
                    <Box>
                        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => window.location.reload()}>
                            Enviar otra solicitud
                        </Button>
                    </Box>
                </Card>
            </Box>
        );
    }

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
            <Box sx={{ bgcolor: 'primary.dark', color: 'white', py: 3 }}>
                <Container maxWidth="sm">
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                        <Box component="img" src="/nexum_logo.png" alt="IMV" sx={{ height: 32, width: 'auto' }} />
                        <Typography variant="caption" sx={{ opacity: 0.7, letterSpacing: '0.15em' }}>IMV NETWORKS</Typography>
                    </Stack>
                    <Typography variant="h5" sx={{ fontWeight: 700, mt: 2 }}>
                        Solicita tu conexión a internet
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.8, mt: 0.5 }}>
                        Un asesor te contactará por WhatsApp en menos de 24 horas para coordinar la instalación.
                    </Typography>
                </Container>
            </Box>

            <Container maxWidth="sm" sx={{ py: 3 }}>
                <Card sx={{ borderRadius: 2, '&:hover': { transform: 'none', boxShadow: '0 1px 0 rgba(14,19,48,0.04), 0 8px 24px -16px rgba(14,19,48,0.18)', borderColor: 'divider' } }}>
                    <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                        {error && (
                            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }} onClose={() => setError(null)}>
                                {error}
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit}>
                            <Stack spacing={3}>
                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Datos personales
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField fullWidth label="Nombres y apellidos" name="fullName" value={formData.fullName} onChange={handleChange} required size="small" />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField fullWidth label="Número de documento" name="identificationNumber" value={formData.identificationNumber} onChange={handleChange} required type="number" size="small" inputProps={{ inputMode: 'numeric' }} />
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Ubicación
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={7}>
                                            <TextField fullWidth label="Dirección de instalación" name="installationAddress" value={formData.installationAddress} onChange={handleChange} required size="small" helperText="Calle, carrera, número, barrio" />
                                        </Grid>
                                        <Grid item xs={12} sm={5}>
                                            <FormControl fullWidth required size="small">
                                                <InputLabel>Ciudad / Municipio</InputLabel>
                                                <Select name="city" value={formData.city} label="Ciudad / Municipio" onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value as string }))}>
                                                    {cities.map(city => <MenuItem key={city} value={city}>{city}</MenuItem>)}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Contacto
                                    </Typography>
                                    <Grid container spacing={2}>
                                        <Grid item xs={12} sm={6}>
                                            <TextField fullWidth label="Celular principal" name="primaryPhone" value={formData.primaryPhone} onChange={handleChange} required type="tel" size="small" inputProps={{ inputMode: 'tel' }} helperText="Te contactaremos por WhatsApp" />
                                        </Grid>
                                        <Grid item xs={12} sm={6}>
                                            <TextField fullWidth label="Celular secundario" name="secondaryPhone" value={formData.secondaryPhone} onChange={handleChange} type="tel" size="small" inputProps={{ inputMode: 'tel' }} helperText="Opcional" />
                                        </Grid>
                                    </Grid>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.8rem', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Plan de internet
                                    </Typography>
                                    {loadingPlans ? (
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2, color: 'text.secondary' }}>
                                            <CircularProgress size={18} />
                                            <Typography variant="body2">Cargando planes disponibles…</Typography>
                                        </Box>
                                    ) : plans.length === 0 ? (
                                        <Alert severity="warning">No hay planes disponibles en este momento.</Alert>
                                    ) : (
                                        <Grid container spacing={1.5}>
                                            {plans.map((plan) => {
                                                const isSelected = Number(formData.planId) === plan.id;
                                                return (
                                                    <Grid item xs={12} sm={6} key={plan.id}>
                                                        <Box
                                                            onClick={() => setFormData(prev => ({ ...prev, planId: String(plan.id) }))}
                                                            sx={{
                                                                p: 2,
                                                                border: '2px solid',
                                                                borderColor: isSelected ? 'primary.main' : 'divider',
                                                                borderRadius: 2,
                                                                cursor: 'pointer',
                                                                bgcolor: isSelected ? 'rgba(45,91,255,0.04)' : 'transparent',
                                                                transition: 'border-color 160ms ease',
                                                                '&:hover': { borderColor: isSelected ? 'primary.main' : 'rgba(45,91,255,0.35)' },
                                                            }}
                                                        >
                                                            <Typography variant="overline" sx={{ color: 'text.secondary', fontSize: '0.6rem' }}>
                                                                {plan.speedMbps} Mbps
                                                            </Typography>
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2, mb: 1 }}>
                                                                {plan.name}
                                                            </Typography>
                                                            <Typography variant="h6" sx={{ fontWeight: 800, color: 'primary.main', lineHeight: 1.2 }}>
                                                                {formatCurrency(plan.monthlyFee)}
                                                                <Typography component="span" variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>/mes</Typography>
                                                            </Typography>
                                                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                                Instalación: {formatCurrency(plan.installationFee)}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                );
                                            })}
                                        </Grid>
                                    )}
                                </Box>

                                <Box>
                                    <FormControlLabel
                                        control={<Checkbox checked={acceptDataPolicy} onChange={(e) => setAcceptDataPolicy(e.target.checked)} required size="small" />}
                                        label={
                                            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                                Autorizo el tratamiento de mis datos personales conforme a la{' '}
                                                <MuiLink href="/Politica_Tratamiento_Datos_IMV.pdf" target="_blank" rel="noopener noreferrer" sx={{ fontWeight: 600 }}>
                                                    Política de Tratamiento de Datos
                                                </MuiLink>
                                                , incluyendo contacto por WhatsApp.
                                            </Typography>
                                        }
                                    />
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        fullWidth
                                        endIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                                        disabled={submitting}
                                        sx={{ mt: 2, py: 1.5, fontWeight: 700 }}
                                    >
                                        {submitting ? 'Enviando solicitud…' : 'Enviar solicitud'}
                                    </Button>
                                </Box>
                            </Stack>
                        </form>
                    </CardContent>
                </Card>

                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', textAlign: 'center', mt: 3 }}>
                    © {new Date().getFullYear()} IMV Networks · Hecho con cariño en Colombia
                </Typography>
            </Container>
        </Box>
    );
};

export default ServiceRequestForm;
