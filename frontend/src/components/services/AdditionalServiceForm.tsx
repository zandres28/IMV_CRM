import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid
} from '@mui/material';
import { AdditionalService } from '../../types/AdditionalServices';
import { AdditionalServiceService } from '../../services/AdditionalServiceService';

interface AdditionalServiceFormProps {
    open: boolean;
    onClose: () => void;
    clientId: number;
    service?: AdditionalService;
    onSave: () => void;
}

export const AdditionalServiceForm: React.FC<AdditionalServiceFormProps> = ({
    open,
    onClose,
    clientId,
    service,
    onSave
}) => {
    const [formData, setFormData] = useState({
        serviceName: '',
        monthlyFee: '',
        startDate: '',
        endDate: '',
        notes: ''
    });

    useEffect(() => {
        if (service) {
            setFormData({
                serviceName: service.serviceName,
                monthlyFee: service.monthlyFee.toString(),
                startDate: service.startDate.split('T')[0],
                endDate: service.endDate ? service.endDate.split('T')[0] : '',
                notes: service.notes || ''
            });
        }
    }, [service]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (service) {
                await AdditionalServiceService.update(service.id, {
                    ...formData,
                    monthlyFee: parseFloat(formData.monthlyFee)
                });
            } else {
                await AdditionalServiceService.create({
                    ...formData,
                    clientId,
                    monthlyFee: parseFloat(formData.monthlyFee)
                });
            }
            onSave();
            onClose();
        } catch (error) {
            console.error('Error al guardar el servicio:', error);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                {service ? 'Editar Servicio Adicional' : 'Nuevo Servicio Adicional'}
            </DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel id="service-name-label">Servicio</InputLabel>
                                <Select
                                    labelId="service-name-label"
                                    name="serviceName"
                                    value={formData.serviceName}
                                    onChange={(e) => handleChange(e as any)}
                                    required
                                >
                                    <MenuItem value="Netflix">Netflix</MenuItem>
                                    <MenuItem value="Tele Latino">Tele Latino</MenuItem>
                                    <MenuItem value="Otro">Otro</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Tarifa Mensual"
                                name="monthlyFee"
                                type="number"
                                value={formData.monthlyFee}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Fecha de Inicio"
                                name="startDate"
                                type="date"
                                value={formData.startDate}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Fecha de Fin"
                                name="endDate"
                                type="date"
                                value={formData.endDate}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Notas"
                                name="notes"
                                multiline
                                rows={4}
                                value={formData.notes}
                                onChange={handleChange}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={onClose}>Cancelar</Button>
                    <Button type="submit" variant="contained" color="primary">
                        Guardar
                    </Button>
                </DialogActions>
            </form>
        </Dialog>
    );
};