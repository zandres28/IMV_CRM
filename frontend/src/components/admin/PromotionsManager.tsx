import React, { useState, useEffect } from 'react';
import { 
    Box, 
    Button, 
    Card, 
    CardContent, 
    CardMedia, 
    Container, 
    Grid, 
    IconButton, 
    Paper, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Typography, 
    Alert,
    CircularProgress,
    Tooltip
} from '@mui/material';
import { 
    Delete as DeleteIcon, 
    CloudUpload as CloudUploadIcon,
    ContentCopy as ContentCopyIcon,
    Image as ImageIcon
} from '@mui/icons-material';
import { PromotionService, PromotionImage } from '../../services/PromotionService';

export const PromotionsManager: React.FC = () => {
    const [images, setImages] = useState<PromotionImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    const loadImages = async () => {
        setLoading(true);
        try {
            const data = await PromotionService.getAll();
            setImages(data);
            setError(null);
        } catch (err) {
            console.error(err);
            setError('Error al cargar las imágenes');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadImages();
    }, []);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            
            // Validar tipo
            if (!file.type.startsWith('image/')) {
                setError('Solo se permiten archivos de imagen');
                return;
            }

            setUploading(true);
            setError(null);
            setSuccess(null);

            try {
                await PromotionService.upload(file);
                setSuccess('Imagen subida correctamente');
                loadImages();
            } catch (err) {
                console.error(err);
                setError('Error al subir la imagen');
            } finally {
                setUploading(false);
                // Limpiar input
                event.target.value = '';
            }
        }
    };

    const handleDelete = async (filename: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
            try {
                await PromotionService.delete(filename);
                setSuccess('Imagen eliminada correctamente');
                loadImages();
            } catch (err: any) {
                console.error(err);
                setError('Error al borrar la imagen: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const copyToClipboard = (url: string) => {
        navigator.clipboard.writeText(url);
        setSuccess('URL copiada al portapapeles: ' + url);
        setTimeout(() => setSuccess(null), 3000);
    };

    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4" component="h1">
                    Gestor de Imágenes Promocionales
                </Typography>
                
                <Button
                    variant="contained"
                    component="label"
                    startIcon={uploading ? <CircularProgress size={20} color="inherit" /> : <CloudUploadIcon />}
                    disabled={uploading}
                >
                    {uploading ? 'Subiendo...' : 'Subir Imagen'}
                    <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {images.length === 0 && (
                        <Grid item xs={12}>
                            <Paper sx={{ p: 4, textAlign: 'center' }}>
                                <ImageIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
                                <Typography variant="h6" color="text.secondary">
                                    No hay imágenes promocionales subidas
                                </Typography>
                            </Paper>
                        </Grid>
                    )}

                    {images.map((img) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={img.filename}>
                            <Card>
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={img.url}
                                    alt={img.filename}
                                    sx={{ objectFit: 'cover' }}
                                />
                                <CardContent>
                                    <Typography variant="caption" display="block" color="text.secondary" noWrap title={img.filename}>
                                        {img.filename}
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        {formatBytes(img.size)} • {new Date(img.createdAt).toLocaleDateString()}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                                        <Tooltip title="Copiar URL">
                                            <IconButton size="small" onClick={() => copyToClipboard(img.url)}>
                                                <ContentCopyIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        
                                        <Tooltip title="Eliminar">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(img.filename)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Container>
    );
};
