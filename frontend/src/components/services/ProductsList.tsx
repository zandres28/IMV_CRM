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
    Grid,
    useMediaQuery,
    useTheme,
    Divider,
    Card,
    CardContent
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
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
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

            {isMobile ? (
                <Box>
                    {products.map((product) => (
                        <Card 
                            key={product.id} 
                            sx={{ 
                                mb: 2, 
                                borderRadius: 2,
                                borderLeft: `4px solid ${product.status === 'completed' ? '#1cc88a' : '#f6c23e'}`,
                                boxShadow: '0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.1)'
                            }}
                        >
                            <CardContent sx={{ p: '12px !important' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                    <Typography sx={{ fontWeight: 800, fontSize: '0.85rem', color: '#4e73df' }}>
                                        {product.productName}
                                    </Typography>
                                    <Chip
                                        label={product.status === 'completed' ? 'PAGADO' : 'PENDIENTE'}
                                        color={product.status === 'completed' ? 'success' : 'warning'}
                                        size="small"
                                        sx={{ height: 20, fontSize: '0.6rem', fontWeight: 800 }}
                                    />
                                </Box>
                                
                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Total</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#1cc88a' }}>{formatCurrency(product.totalAmount)}</Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>Cuotas</Typography>
                                        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>{product.installments}</Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 1, opacity: 0.5 }} />

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Button 
                                        size="small" 
                                        onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                                        startIcon={expandedProduct === product.id ? <CollapseIcon /> : <ExpandIcon />}
                                        sx={{ fontSize: '0.7rem', textTransform: 'none' }}
                                    >
                                        Detalle Cuotas
                                    </Button>
                                    <Box>
                                        <IconButton size="small" onClick={() => handleEditProduct(product)} sx={{ color: '#4e73df' }}><EditIcon fontSize="small" /></IconButton>
                                        <IconButton size="small" onClick={() => handleDeleteProduct(product)} color="error"><DeleteIcon fontSize="small" /></IconButton>
                                    </Box>
                                </Box>

                                <Collapse in={expandedProduct === product.id} timeout="auto" unmountOnExit>
                                    <Box sx={{ mt: 2 }}>
                                        {product.installmentPayments.map((installment) => (
                                            <Paper key={installment.id} sx={{ p: 1, mb: 1, bgcolor: '#f8f9fc', border: '1px solid #e3e6f0' }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>Cuota {installment.installmentNumber}</Typography>
                                                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{formatCurrency(installment.amount)}</Typography>
                                                </Box>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                                                    <Typography variant="caption" color="textSecondary">Vence: {formatDate(installment.dueDate)}</Typography>
                                                    {installment.status === 'completed' ? (
                                                        <Chip label="Pagado" color="success" size="small" sx={{ height: 16, fontSize: '0.55rem' }} />
                                                    ) : (
                                                        <IconButton 
                                                            size="small" 
                                                            color="primary" 
                                                            onClick={() => handleInstallmentPayment(installment)}
                                                            sx={{ p: 0 }}
                                                        >
                                                            <CheckIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Box>
                                            </Paper>
                                        ))}
                                    </Box>
                                </Collapse>
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : (
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#4e73df' }}>
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
                                            backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fc',
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
                                                sx={{ color: '#4e73df' }}
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
            )}

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