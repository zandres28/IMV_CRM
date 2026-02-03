import React from 'react';
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
import { ProductSold } from '../../types/AdditionalServices';
import { toInputDateString } from '../../utils/dateUtils';

interface EditProductDialogProps {
    open: boolean;
    onClose: () => void;
    product: ProductSold | null;
    onSave: (productId: number, updatedData: Partial<ProductSold>) => void;
}

export const EditProductDialog: React.FC<EditProductDialogProps> = ({
    open,
    onClose,
    product,
    onSave
}) => {
    const [formData, setFormData] = React.useState<{
        productName: string;
        notes: string;
        status: 'pending' | 'completed';
        totalAmount: number;
        installments: number;
        saleDate: string;
    }>({
        productName: '',
        notes: '',
        status: 'pending',
        totalAmount: 0,
        installments: 1,
        saleDate: toInputDateString(new Date())
    });

    React.useEffect(() => {
        if (product) {
            setFormData({
                productName: product.productName,
                notes: product.notes || '',
                status: product.status,
                totalAmount: product.totalAmount || 0,
                installments: product.installments || 1,
                saleDate: toInputDateString(product.saleDate)
            });
        }
    }, [product]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (product) {
            onSave(product.id, formData);
        }
        onClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        // Manejo especial para campos numéricos
        if (name === 'totalAmount' || name === 'installments') {
            setFormData({
                ...formData,
                [name]: Number(value)
            });
        } else {
            setFormData({
                ...formData,
                [name]: value
            });
        }
    };

    const handleStatusChange = (e: { target: { value: string } }) => {
        const statusValue = e.target.value as 'pending' | 'completed';
        setFormData({
            ...formData,
            status: statusValue
        });
    };

    if (!product) return null;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Editar Producto</DialogTitle>
            <form onSubmit={handleSubmit}>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                label="Nombre del Producto"
                                name="productName"
                                value={formData.productName}
                                onChange={handleChange}
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Monto Total"
                                name="totalAmount"
                                type="number"
                                value={formData.totalAmount}
                                onChange={handleChange}
                                required
                                inputProps={{ min: 0 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Número de Cuotas"
                                name="installments"
                                type="number"
                                value={formData.installments}
                                onChange={handleChange}
                                required
                                inputProps={{ min: 1 }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                label="Fecha de Venta"
                                name="saleDate"
                                type="date"
                                value={formData.saleDate}
                                onChange={handleChange}
                                required
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth>
                                <InputLabel>Estado</InputLabel>
                                <Select
                                    value={formData.status}
                                    onChange={handleStatusChange}
                                    label="Estado"
                                >
                                    <MenuItem value="pending">Pendiente</MenuItem>
                                    <MenuItem value="completed">Completado</MenuItem>
                                </Select>
                            </FormControl>
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