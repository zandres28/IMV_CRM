import React, { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    CircularProgress,
    Divider
} from '@mui/material';
import { Warning as WarningIcon, Router as RouterIcon } from '@mui/icons-material';
import { Client } from '../../types/Client';
import { ClientService } from '../../services/ClientService';

interface ClientRetirementDialogProps {
    open: boolean;
    onClose: () => void;
    client: Client;
    onSuccess: () => void;
}

export const ClientRetirementDialog: React.FC<ClientRetirementDialogProps> = ({
    open,
    onClose,
    client,
    onSuccess
}) => {
    const [loading, setLoading] = useState(false);
    const [retirementDate, setRetirementDate] = useState(
        client.retirementDate
            ? new Date(client.retirementDate).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0]
    );
    const [oltDisconnectTime, setOltDisconnectTime] = useState('08:00');
    const [reason, setReason] = useState(client.retirementReason || '');
    const [error, setError] = useState<string | null>(null);

    const isEditing = client.status === 'cancelled';

    // Determina si la fecha seleccionada es futura (desconexión programada) o hoy/pasada (inmediata)
    const isFutureDate = retirementDate > new Date().toISOString().split('T')[0];

    const handleConfirm = async () => {
        if (!reason.trim()) {
            setError('El motivo del retiro es obligatorio');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            await ClientService.retire(
                client.id,
                retirementDate,
                reason,
                isFutureDate ? oltDisconnectTime : undefined
            );
            onSuccess();
            onClose();
        } catch (err) {
            console.error('Error al retirar cliente:', err);
            setError('Error al procesar el retiro via API.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                <WarningIcon /> {isEditing ? 'Editar Retiro de Cliente' : 'Confirmar Retiro de Cliente'}
            </DialogTitle>
            <DialogContent>
                <DialogContentText paragraph>
                    {isEditing
                        ? <span>Estás editando la información de retiro del cliente <strong>{client.fullName}</strong>.</span>
                        : <span>Estás a punto de dar de baja al cliente <strong>{client.fullName}</strong>. Esta acción cancelará sus servicios activos y detendrá la facturación a partir de la fecha seleccionada.</span>
                    }
                </DialogContentText>

                <Box mt={2} display="flex" flexDirection="column" gap={3}>
                    <Box display="flex" gap={2}>
                        <TextField
                            label="Fecha de Retiro"
                            type="date"
                            fullWidth
                            value={retirementDate}
                            onChange={(e) => setRetirementDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            helperText="A partir de esta fecha no se generarán más cobros."
                        />
                        <TextField
                            label="Hora de desconexión ONU"
                            type="time"
                            sx={{ minWidth: 170 }}
                            value={oltDisconnectTime}
                            onChange={(e) => setOltDisconnectTime(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                            disabled={!isFutureDate}
                            helperText={isFutureDate ? 'Hora exacta en OLT' : 'Inmediata (hoy)'}
                        />
                    </Box>

                    <TextField
                        label="Motivo del Retiro"
                        multiline
                        rows={3}
                        fullWidth
                        required
                        value={reason}
                        onChange={(e) => {
                            setReason(e.target.value);
                            if (error) setError(null);
                        }}
                        placeholder="Ej: Cambio de domicilio, Inconformidad con el servicio, Problemas económicos..."
                        error={!!error}
                        helperText={error}
                    />
                </Box>

                <Box mt={2} p={2} bgcolor={isFutureDate ? '#e8f5e9' : '#fff3e0'} borderRadius={1} display="flex" alignItems="flex-start" gap={1}>
                    <RouterIcon fontSize="small" sx={{ color: isFutureDate ? 'success.main' : 'warning.main', mt: 0.1 }} />
                    <Typography variant="caption" color="text.secondary">
                        {isFutureDate
                            ? <>La ONU será desconectada automáticamente de la OLT el <strong>{retirementDate}</strong> a las <strong>{oltDisconnectTime}</strong>.</>
                            : <>La ONU será desconectada de la OLT <strong>inmediatamente</strong> al confirmar el retiro.</>
                        }
                    </Typography>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={loading} color="inherit">
                    Cancelar
                </Button>
                <Button
                    onClick={handleConfirm}
                    disabled={loading || !reason.trim()}
                    variant="contained"
                    color="error"
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <WarningIcon />}
                >
                    {loading ? 'Procesando...' : (isEditing ? 'Actualizar Retiro' : 'Confirmar Retiro')}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
