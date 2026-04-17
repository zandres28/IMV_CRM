import React, { useState, useEffect } from 'react';
import {
    Box, Paper, Typography, TextField, Button, Alert, CircularProgress,
    Chip, Divider, IconButton, Stack, Tooltip
} from '@mui/material';
import { Save as SaveIcon, Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { SystemSettingService } from '../../services/SystemSettingService';

interface ClientStatus {
    value: string;
    label: string;
}

const DEFAULT_CITIES = ['Cali'];
const DEFAULT_STATUSES: ClientStatus[] = [
    { value: 'active', label: 'Activo' },
    { value: 'pendiente_instalacion', label: 'Instalación Pendiente' },
    { value: 'suspended', label: 'Suspendido' },
    { value: 'cancelled', label: 'Cancelado' },
    { value: 'retired', label: 'Retirado' },
];

export const SystemSettingsConfig: React.FC = () => {
    const [timeout, setTimeoutVal] = useState<string>('5');
    const [reminderVencidoMin, setReminderVencidoMin] = useState<string>('0');
    const [reminderVencidoMax, setReminderVencidoMax] = useState<string>('15');

    // Parametrización de clientes
    const [cities, setCities] = useState<string[]>(DEFAULT_CITIES);
    const [newCity, setNewCity] = useState('');
    const [clientStatuses, setClientStatuses] = useState<ClientStatus[]>(DEFAULT_STATUSES);
    const [newStatusValue, setNewStatusValue] = useState('');
    const [newStatusLabel, setNewStatusLabel] = useState('');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const settings = await SystemSettingService.getAll();

            const timeoutSetting = settings.find((s: any) => s.key === 'session_timeout_minutes');
            if (timeoutSetting) setTimeoutVal(timeoutSetting.value);

            const minSetting = settings.find((s: any) => s.key === 'reminder_vencido_min');
            if (minSetting) setReminderVencidoMin(minSetting.value);

            const maxSetting = settings.find((s: any) => s.key === 'reminder_vencido_max');
            if (maxSetting) setReminderVencidoMax(maxSetting.value);

            const citiesSetting = settings.find((s: any) => s.key === 'client_cities');
            if (citiesSetting?.value) {
                try { setCities(JSON.parse(citiesSetting.value)); } catch (e) { /* usar default */ }
            }

            const statusesSetting = settings.find((s: any) => s.key === 'client_statuses');
            if (statusesSetting?.value) {
                try { setClientStatuses(JSON.parse(statusesSetting.value)); } catch (e) { /* usar default */ }
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCity = () => {
        const trimmed = newCity.trim();
        if (!trimmed || cities.includes(trimmed)) return;
        setCities(prev => [...prev, trimmed]);
        setNewCity('');
    };

    const handleRemoveCity = (city: string) => {
        setCities(prev => prev.filter(c => c !== city));
    };

    const handleAddStatus = () => {
        const val = newStatusValue.trim().toLowerCase().replace(/\s+/g, '_');
        const lbl = newStatusLabel.trim();
        if (!val || !lbl || clientStatuses.some(s => s.value === val)) return;
        setClientStatuses(prev => [...prev, { value: val, label: lbl }]);
        setNewStatusValue('');
        setNewStatusLabel('');
    };

    const handleRemoveStatus = (value: string) => {
        setClientStatuses(prev => prev.filter(s => s.value !== value));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await Promise.all([
                SystemSettingService.updateSetting('session_timeout_minutes', timeout),
                SystemSettingService.updateSetting('reminder_vencido_min', reminderVencidoMin),
                SystemSettingService.updateSetting('reminder_vencido_max', reminderVencidoMax),
                SystemSettingService.updateSetting('client_cities', JSON.stringify(cities)),
                SystemSettingService.updateSetting('client_statuses', JSON.stringify(clientStatuses)),
            ]);

            setMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
        } catch (error) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Error al guardar la configuración' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <CircularProgress />;

    return (
        <Paper sx={{ p: 3, maxWidth: 700, mx: 'auto', mt: 4 }}>
            <Typography variant="h5" gutterBottom>
                Configuración del Sistema
            </Typography>

            {message && (
                <Alert severity={message.type} sx={{ mb: 2 }}>
                    {message.text}
                </Alert>
            )}

            <Box component="form" noValidate autoComplete="off">
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                    Seguridad
                </Typography>

                <TextField
                    label="Tiempo de inactividad para cierre de sesión (minutos)"
                    type="number"
                    value={timeout}
                    onChange={(e) => setTimeoutVal(e.target.value)}
                    fullWidth
                    margin="normal"
                    helperText="Si el usuario no realiza ninguna acción por este tiempo, la sesión se cerrará automáticamente."
                    InputProps={{ inputProps: { min: 1 } }}
                />

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 4 }}>
                    Configuración de Recordatorios (Días de Vencimiento)
                </Typography>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        label="Días Mínimo para Vencido"
                        type="number"
                        value={reminderVencidoMin}
                        onChange={(e) => setReminderVencidoMin(e.target.value)}
                        fullWidth
                        margin="normal"
                        helperText="Por debajo de este valor es 'PRÓXIMO'."
                    />
                    <TextField
                        label="Días Máximo para Vencido"
                        type="number"
                        value={reminderVencidoMax}
                        onChange={(e) => setReminderVencidoMax(e.target.value)}
                        fullWidth
                        margin="normal"
                        helperText="Por encima de este valor es 'ÚLTIMO'."
                    />
                </Box>
                <Typography variant="caption" color="textSecondary" display="block" sx={{ mb: 2 }}>
                    El rango definido (inclusive) se considerará estado 'VENCIDO'.
                    Ej: Min=0, Max=15 significa que desde el día del vencimiento hasta 15 días después es 'VENCIDO'.
                </Typography>

                <Divider sx={{ my: 3 }} />

                {/* ─── PARAMETRIZACIÓN DE CLIENTES ─── */}
                <Typography variant="h6" gutterBottom>
                    Parametrización de Clientes
                </Typography>

                {/* Ciudades */}
                <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
                    Ciudades disponibles
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {cities.map(city => (
                        <Chip
                            key={city}
                            label={city}
                            onDelete={cities.length > 1 ? () => handleRemoveCity(city) : undefined}
                            color="primary"
                            variant="outlined"
                            size="small"
                        />
                    ))}
                </Stack>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <TextField
                        size="small"
                        label="Nueva ciudad"
                        value={newCity}
                        onChange={(e) => setNewCity(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCity())}
                        sx={{ flex: 1 }}
                    />
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddCity}
                        disabled={!newCity.trim()}
                    >
                        Agregar
                    </Button>
                </Box>

                {/* Estados del cliente */}
                <Typography variant="subtitle2" sx={{ mt: 3, mb: 1 }}>
                    Estados del cliente
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                    {clientStatuses.map(s => (
                        <Chip
                            key={s.value}
                            label={s.label}
                            title={`Valor: ${s.value}`}
                            onDelete={clientStatuses.length > 1 ? () => handleRemoveStatus(s.value) : undefined}
                            color="secondary"
                            variant="outlined"
                            size="small"
                        />
                    ))}
                </Stack>
                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <TextField
                        size="small"
                        label="Etiqueta (ej: Moroso)"
                        value={newStatusLabel}
                        onChange={(e) => setNewStatusLabel(e.target.value)}
                        sx={{ flex: 2 }}
                    />
                    <TextField
                        size="small"
                        label="Clave interna (ej: moroso)"
                        value={newStatusValue}
                        onChange={(e) => setNewStatusValue(e.target.value)}
                        sx={{ flex: 2 }}
                        helperText="Sin espacios"
                    />
                    <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={handleAddStatus}
                        disabled={!newStatusValue.trim() || !newStatusLabel.trim()}
                        sx={{ alignSelf: 'flex-start', mt: '8px' }}
                    >
                        Agregar
                    </Button>
                </Box>

                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ mt: 4 }}
                >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </Box>
        </Paper>
    );
};
