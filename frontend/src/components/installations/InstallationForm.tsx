import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    SelectChangeEvent
} from '@mui/material';
import { Installation } from '../../services/InstallationService';
import { ServicePlanService, ServicePlan } from '../../services/ServicePlanService';
import { TechnicianService, Technician } from '../../services/TechnicianService';
import { toInputDateString } from '../../utils/dateUtils';

interface InstallationFormProps {
    open: boolean;
    onClose: () => void;
    onSave: (installation: Partial<Installation>) => void;
    installation?: Installation;
    clientId?: number;
}

export const InstallationForm: React.FC<InstallationFormProps> = ({
    open,
    onClose,
    onSave,
    installation,
    clientId
}) => {
    const [plans, setPlans] = React.useState<ServicePlan[]>([]);
    const [technicians, setTechnicians] = React.useState<Technician[]>([]);
    const [plansLoading, setPlansLoading] = React.useState<boolean>(true);
    const [techsLoading, setTechsLoading] = React.useState<boolean>(true);

    const [formData, setFormData] = React.useState<Partial<Installation>>({
        servicePlanId: undefined,
        serviceType: '',
        speedMbps: 0,
        routerModel: '',
        onuSerialNumber: '',
        ponId: '',
        onuId: '',
        ipAddress: '',
        technician: '',
        notes: '',
        monthlyFee: 0,
        installationFee: 0,
        serviceStatus: 'active',
        installationDate: new Date().toISOString().split('T')[0],
        retirementDate: ''
    });

    React.useEffect(() => {
        if (installation) {
            const initial: any = {
                ...installation,
                // normalizar fecha usando helper para evitar desfase
                installationDate: toInputDateString(installation.installationDate),
                retirementDate: installation.retirementDate ? toInputDateString(installation.retirementDate) : '',
                // Normalizar campos opcionales para evitar null/undefined en inputs controlados
                ponId: installation.ponId || '',
                onuId: installation.onuId || '',
                routerModel: installation.routerModel || '',
                onuSerialNumber: installation.onuSerialNumber || '',
                ipAddress: installation.ipAddress || '',
                notes: installation.notes || '',
                installationFee: installation.installationFee || 0
            };
            // Preferir ID del plan si viene en la instalación
            if (installation.servicePlan?.id) {
                initial.servicePlanId = installation.servicePlan.id;
                initial.serviceType = installation.servicePlan.name;
            } else {
                // fallback: inferir por nombre (por compatibilidad)
                const found = plans.find(p => p.name === installation.serviceType);
                if (found) initial.servicePlanId = found.id;
            }
            setFormData(initial);
        } else {
            setFormData({
                servicePlanId: undefined,
                serviceType: '',
                speedMbps: 0,
                routerModel: '',
                onuSerialNumber: '',
                ponId: '',
                onuId: '',
                ipAddress: '',
                technician: '',
                notes: '',
                monthlyFee: 0,
                installationFee: 40000,
                serviceStatus: 'active',
                installationDate: toInputDateString(new Date())
            });
        }
    }, [installation, plans]);

    React.useEffect(() => {
        // fetch plans and technicians
        ServicePlanService.getActive()
            .then(async (active) => {
                if (Array.isArray(active) && active.length > 0) {
                    setPlans(active);
                } else {
                    // Fallback: intentar cargar todos si no hay activos
                    try {
                        const all = await ServicePlanService.getAll();
                        setPlans(all || []);
                    } catch (e) {
                        console.error('Error loading all plans', e);
                    }
                }
                setPlansLoading(false);
            })
            .catch(err => { console.error('Error loading plans', err); setPlansLoading(false); });

        TechnicianService.getAll()
            .then(res => { setTechnicians(res); setTechsLoading(false); })
            .catch(err => { console.error('Error loading technicians', err); setTechsLoading(false); });
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name) {
            const newValue = e.target.type === 'number' ? Number(value) : value;
            setFormData(prev => ({
                ...prev,
                [name]: newValue
            }));
        }
    };

    const handleSelectChange = (e: SelectChangeEvent) => {
        const name = e.target.name as string;
        const value = e.target.value as string;
        if (!name) return;

        // Si se selecciona un plan, autocompletar velocidad y cuota usando service plans
        if (name === 'servicePlanId') {
            const planId = Number(value);
            const plan = plans.find(p => p.id === planId) as ServicePlan | undefined;
            if (plan) {
                setFormData(prev => ({
                    ...prev,
                    serviceType: plan.name,
                    servicePlanId: plan.id,
                    speedMbps: plan.speedMbps,
                    monthlyFee: Number(plan.monthlyFee),
                    installationFee: Number(plan.installationFee)
                }));
                return;
            }
        }

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const installationData: any = {
            ...formData
        };
        if (!installation) {
            // En creación enviar clientId como número (backend espera clientId)
            installationData.clientId = clientId;
        }
        onSave(installationData);
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <form onSubmit={handleSubmit}>
                <DialogTitle>
                    {installation ? 'Editar Instalación' : 'Nueva Instalación'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Plan de Servicio</InputLabel>
                                <Select
                                    value={(formData as any).servicePlanId ? String((formData as any).servicePlanId) : ''}
                                    name="servicePlanId"
                                    onChange={handleSelectChange}
                                    label="Plan de Servicio"
                                    displayEmpty
                                    disabled={plansLoading}
                                    required={!plansLoading}
                                >
                                    {plansLoading && (
                                        <MenuItem value="">Cargando planes...</MenuItem>
                                    )}
                                    {!plansLoading && plans.length === 0 && (
                                        <MenuItem value="">
                                            {installation?.servicePlan?.name || installation?.serviceType ? `${installation?.servicePlan?.name || installation?.serviceType} (no listado)` : 'Sin planes disponibles'}
                                        </MenuItem>
                                    )}
                                    {!plansLoading && plans.length > 0 && installation?.servicePlan?.id && !plans.some(p => p.id === installation.servicePlan!.id) && (
                                        <MenuItem value={String(installation.servicePlan.id)}>{`${installation.servicePlan.name} (inactivo)`}</MenuItem>
                                    )}
                                    {plans.map(p => (
                                        <MenuItem key={p.id} value={String(p.id)}>{`${p.name} - ${p.speedMbps} Mbps`}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Velocidad (Mbps)"
                                name="speedMbps"
                                type="number"
                                value={formData.speedMbps}
                                onChange={handleInputChange}
                                required
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Modelo de Router"
                                name="routerModel"
                                value={formData.routerModel}
                                onChange={handleInputChange}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="ONU-SN"
                                name="onuSerialNumber"
                                value={(formData as any).onuSerialNumber || ''}
                                onChange={handleInputChange}
                                required
                                inputProps={{ minLength: 10 }}
                                helperText="Debe ser único. Mínimo 10 caracteres."
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Etiqueta NAP"
                                name="napLabel"
                                value={(formData as any).napLabel || ''}
                                onChange={handleInputChange}
                                placeholder="Ej: NAP-01-04"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="PON ID"
                                name="ponId"
                                value={(formData as any).ponId || ''}
                                onChange={handleInputChange}
                                placeholder="Ej: 0/0/1"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="ONU ID"
                                name="onuId"
                                value={(formData as any).onuId || ''}
                                onChange={handleInputChange}
                                placeholder="Ej: 15"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Dirección IP"
                                name="ipAddress"
                                value={formData.ipAddress}
                                onChange={handleInputChange}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth required>
                                <InputLabel>Técnico Instalador</InputLabel>
                                <Select
                                    value={formData.technician || ''}
                                    name="technician"
                                    onChange={handleSelectChange}
                                    label="Técnico Instalador"
                                    displayEmpty
                                    disabled={techsLoading}
                                    required={!techsLoading}
                                >
                                    {techsLoading && (
                                        <MenuItem value="">Cargando técnicos...</MenuItem>
                                    )}
                                    {!techsLoading && technicians.length === 0 && (formData.technician ? (
                                        <MenuItem value={formData.technician}>{`${formData.technician} (no listado)`}</MenuItem>
                                    ) : (
                                        <MenuItem value="">Sin técnicos disponibles</MenuItem>
                                    ))}
                                    {technicians.map(t => (
                                        <MenuItem key={t.id} value={t.name}>{t.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Cuota Mensual"
                                name="monthlyFee"
                                type="number"
                                value={formData.monthlyFee}
                                onChange={handleInputChange}
                                required
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Costo de Instalación"
                                name="installationFee"
                                type="number"
                                value={(formData as any).installationFee || 0}
                                onChange={handleInputChange}
                                inputProps={{ min: 0 }}
                                helperText="Se cobrará inmediatamente al crear la instalación"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Fecha de Instalación"
                                name="installationDate"
                                type="date"
                                value={formData.installationDate}
                                onChange={handleInputChange}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Fecha de Retiro"
                                name="retirementDate"
                                type="date"
                                value={formData.retirementDate || ''}
                                onChange={handleInputChange}
                                InputLabelProps={{ shrink: true }}
                                helperText="Dejar vacío si el servicio continúa activo"
                            />
                        </Grid>
                        {installation && (
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Estado del Servicio</InputLabel>
                                    <Select
                                        value={formData.serviceStatus}
                                        name="serviceStatus"
                                        onChange={handleSelectChange}
                                        label="Estado del Servicio"
                                    >
                                        <MenuItem value="active">Activo</MenuItem>
                                        <MenuItem value="suspended">Suspendido</MenuItem>
                                        <MenuItem value="cancelled">Cancelado</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        )}
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notas"
                                name="notes"
                                multiline
                                rows={4}
                                value={formData.notes}
                                onChange={handleInputChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" color="primary">
                        {installation ? 'Actualizar' : 'Crear'}
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};