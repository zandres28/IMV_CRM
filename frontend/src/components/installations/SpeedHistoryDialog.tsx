import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    ListItemText,
    Typography,
    IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { SpeedHistory } from '../../services/InstallationService';

interface SpeedHistoryDialogProps {
    open: boolean;
    onClose: () => void;
    speedHistory: SpeedHistory[];
}

export const SpeedHistoryDialog: React.FC<SpeedHistoryDialogProps> = ({
    open,
    onClose,
    speedHistory
}) => {
    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    Historial de Cambios de Velocidad
                </Typography>
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent>
                <List>
                    {speedHistory.map((history) => (
                        <ListItem key={history.id} divider>
                            <ListItemText
                                primary={
                                    <Typography variant="body1">
                                        {history.previousSpeed} Mbps → {history.newSpeed} Mbps
                                    </Typography>
                                }
                                secondary={
                                    <>
                                        <Typography variant="body2" color="textSecondary">
                                            Fecha: {formatDate(history.changeDate)}
                                        </Typography>
                                        {history.reason && (
                                            <Typography variant="body2" color="textSecondary">
                                                Razón: {history.reason}
                                            </Typography>
                                        )}
                                    </>
                                }
                            />
                        </ListItem>
                    ))}
                    {speedHistory.length === 0 && (
                        <ListItem>
                            <ListItemText
                                primary={
                                    <Typography variant="body1" color="textSecondary">
                                        No hay cambios de velocidad registrados
                                    </Typography>
                                }
                            />
                        </ListItem>
                    )}
                </List>
            </DialogContent>
        </Dialog>
    );
};