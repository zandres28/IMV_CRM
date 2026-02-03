import React, { useState, useEffect } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Typography,
    Box,
    Chip,
    Collapse,
    Grid
} from '@mui/material';
import {
    Add as AddIcon,
    KeyboardArrowDown as ExpandIcon,
    KeyboardArrowUp as CollapseIcon,
    Check as CheckIcon,
    Edit as EditIcon,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { ProductSold, ProductInstallment } from '../../types/AdditionalServices';
import { ProductService } from '../../services/ProductService';
import { formatLocalDate } from '../../utils/dateUtils';
import { ProductForm } from './ProductForm';
import { EditProductDialog } from './EditProductDialog';

interface ProductsListProps {
    clientId: number;
}

export const ProductsList: React.FC<ProductsListProps> = ({ clientId }) => {
    const [products, setProducts] = useState<ProductSold[]>([]);
    const [openForm, setOpenForm] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<ProductSold | null>(null);
    const [expandedProduct, setExpandedProduct] = useState<number | null>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const loadProducts = React.useCallback(async () => {
        try {
            const data = await ProductService.getByClient(clientId);
            setProducts(data);
        } catch (error) {
            console.error('Error al cargar los productos:', error);
        }
    }, [clientId]);

    useEffect(() => {
        loadProducts();
    }, [loadProducts]);

    const handleInstallmentPayment = async (installment: ProductInstallment) => {
        try {
            await ProductService.updateInstallment(installment.id, {
                status: 'completed',
                paymentDate: new Date().toISOString()
            });
            loadProducts();
        } catch (error) {
            console.error('Error al actualizar la cuota:', error);
        }
    };

    const handleEditProduct = (product: ProductSold) => {
        setSelectedProduct(product);
        setEditDialogOpen(true);
    };

    const handleDeleteProduct = async (product: ProductSold) => {
        if (window.confirm(`¿Estás seguro de eliminar el producto "${product.productName}"? esta acción no se puede deshacer.`)) {
            try {
                await ProductService.deleteProduct(product.id);
                loadProducts();
            } catch (error) {
                console.error('Error al eliminar el producto:', error);
                alert('Error al eliminar el producto');
            }
        }
    };

    const handleSaveProduct = async (productId: number, updatedData: Partial<ProductSold>) => {
        try {
            await ProductService.updateProduct(productId, updatedData);
            loadProducts();
        } catch (error) {
            console.error('Error al actualizar el producto:', error);
        }
    };

    const formatDate = (date: string) => {
        return formatLocalDate(date);
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP'
        }).format(amount);
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Productos Vendidos</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setOpenForm(true)}
                >
                    Nuevo Producto
                </Button>
            </Box>

            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#1976d2' }}>
                            <TableCell padding="checkbox" />
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Producto</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Monto Total</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Cuotas</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Fecha Venta</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Estado</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.map((product, index) => (
                            <React.Fragment key={product.id}>
                                <TableRow
                                    sx={{ 
                                        backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                        '&:hover': {
                                            backgroundColor: '#e3f2fd'
                                        }
                                    }}
                                >
                                    <TableCell padding="checkbox">
                                        <IconButton
                                            size="small"
                                            onClick={() =>
                                                setExpandedProduct(
                                                    expandedProduct === product.id ? null : product.id
                                                )
                                            }
                                        >
                                            {expandedProduct === product.id ? (
                                                <CollapseIcon />
                                            ) : (
                                                <ExpandIcon />
                                            )}
                                        </IconButton>
                                    </TableCell>
                                    <TableCell>{product.productName}</TableCell>
                                    <TableCell>{formatCurrency(product.totalAmount)}</TableCell>
                                    <TableCell>{product.installments}</TableCell>
                                    <TableCell>{formatDate(product.saleDate)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={
                                                product.status === 'completed'
                                                    ? 'Completado'
                                                    : 'Pendiente'
                                            }
                                            color={
                                                product.status === 'completed'
                                                    ? 'success'
                                                    : 'warning'
                                            }
                                            size="small"
                                            onClick={() => handleEditProduct(product)}
                                            style={{ cursor: 'pointer' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleEditProduct(product)}
                                            title="Editar producto"
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleDeleteProduct(product)}
                                            color="error"
                                            title="Eliminar producto"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                                <TableRow
                                    sx={{ 
                                        backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5'
                                    }}
                                >
                                    <TableCell
                                        style={{ paddingBottom: 0, paddingTop: 0 }}
                                        colSpan={7}
                                    >
                                        <Collapse
                                            in={expandedProduct === product.id}
                                            timeout="auto"
                                            unmountOnExit
                                        >
                                            <Box sx={{ margin: 1 }}>
                                                <Typography variant="h6" gutterBottom component="div">
                                                    Cuotas
                                                </Typography>
                                                <Grid container spacing={2}>
                                                    {product.installmentPayments.map((installment) => (
                                                        <Grid item xs={12} sm={6} md={4} key={installment.id}>
                                                            <Paper
                                                                sx={{
                                                                    p: 2,
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: 1
                                                                }}
                                                            >
                                                                <Typography variant="subtitle1">
                                                                    Cuota {installment.installmentNumber}
                                                                </Typography>
                                                                <Typography>
                                                                    Monto: {formatCurrency(installment.amount)}
                                                                </Typography>
                                                                <Typography>
                                                                    Vencimiento: {formatDate(installment.dueDate)}
                                                                </Typography>
                                                                {installment.status === 'completed' ? (
                                                                    <Chip
                                                                        label="Pagado"
                                                                        color="success"
                                                                        size="small"
                                                                    />
                                                                ) : (
                                                                    <Button
                                                                        variant="outlined"
                                                                        startIcon={<CheckIcon />}
                                                                        onClick={() =>
                                                                            handleInstallmentPayment(installment)
                                                                        }
                                                                        size="small"
                                                                    >
                                                                        Marcar como Pagado
                                                                    </Button>
                                                                )}
                                                            </Paper>
                                                        </Grid>
                                                    ))}
                                                </Grid>
                                            </Box>
                                        </Collapse>
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <ProductForm
                open={openForm}
                onClose={() => setOpenForm(false)}
                clientId={clientId}
                onSave={loadProducts}
            />

            <EditProductDialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                product={selectedProduct}
                onSave={handleSaveProduct}
            />
        </Paper>
    );
};