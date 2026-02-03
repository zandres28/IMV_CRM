import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';
import { SystemSettingService } from '../../services/SystemSettingService';

export const SystemSettingsConfig: React.FC = () => {
    const [timeout, setTimeoutVal] = useState<string>('5');
    const [reminderVencidoMin, setReminderVencidoMin] = useState<string>('0');
    const [reminderVencidoMax, setReminderVencidoMax] = useState<string>('15');
    
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

        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await Promise.all([
                SystemSettingService.updateSetting('session_timeout_minutes', timeout),
                SystemSettingService.updateSetting('reminder_vencido_min', reminderVencidoMin),
                SystemSettingService.updateSetting('reminder_vencido_max', reminderVencidoMax)
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
        <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
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

                <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving}
                    sx={{ mt: 3 }}
                >
                    {saving ? 'Guardando...' : 'Guardar Configuración'}
                </Button>
            </Box>
        </Paper>
    );
};
