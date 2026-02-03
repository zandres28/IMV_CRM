import React, { useState } from 'react';
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
    MenuItem
} from '@mui/material';
import { ProductSold } from '../../types/AdditionalServices';
import { ProductService } from '../../services/ProductService';

interface ProductFormProps {
    open: boolean;
    onClose: () => void;
    clientId: number;
    onSave: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
    open,
    onClose,
    clientId,
    onSave
}) => {
    const [formData, setFormData] = useState({
        productName: '',
        totalAmount: '',
        installments: '3',
        saleDate: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await ProductService.create({
                ...formData,
                clientId,
                totalAmount: parseFloat(formData.totalAmount),
                installments: parseInt(formData.installments)
            });
            onSave();
            onClose();
        } catch (error) {
            console.error('Error al guardar el producto:', error);
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
            <DialogTitle>Nuevo Producto</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <FormControl fullWidth>
                                <InputLabel id="product-name-label">Producto</InputLabel>
                                <Select
                                    labelId="product-name-label"
                                    name="productName"
                                    value={formData.productName}
                                    onChange={(e) => handleChange(e as any)}
                                    required
                                >
                                    <MenuItem value="TVBOX">TVBOX</MenuItem>
                                    <MenuItem value="Router">Router</MenuItem>
                                    <MenuItem value="Otro">Otro</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="Monto Total"
                                name="totalAmount"
                                type="number"
                                value={formData.totalAmount}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth>
                                <InputLabel id="installments-label">Cuotas</InputLabel>
                                <Select
                                    labelId="installments-label"
                                    name="installments"
                                    value={formData.installments}
                                    onChange={(e) => handleChange(e as any)}
                                    required
                                >
                                    <MenuItem value="1">1 cuota</MenuItem>
                                    <MenuItem value="2">2 cuotas</MenuItem>
                                    <MenuItem value="3">3 cuotas</MenuItem>
                                    <MenuItem value="6">6 cuotas</MenuItem>
                                    <MenuItem value="12">12 cuotas</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Fecha de Venta"
                                name="saleDate"
                                type="date"
                                value={formData.saleDate}
                                onChange={handleChange}
                                InputLabelProps={{ shrink: true }}
                                required
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