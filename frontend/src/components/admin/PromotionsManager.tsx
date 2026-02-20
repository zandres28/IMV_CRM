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
    TextField,
    Typography, 
    Alert,
    CircularProgress,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from '@mui/material';
import { 
    Delete as DeleteIcon, 
    CloudUpload as CloudUploadIcon,
    ContentCopy as ContentCopyIcon,
    Image as ImageIcon,
    Add as AddIcon
} from '@mui/icons-material';
import { PromotionService, PromotionImage } from '../../services/PromotionService';

export const PromotionsManager: React.FC = () => {
    const [images, setImages] = useState<PromotionImage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Upload Form State
    const [openUpload, setOpenUpload] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [description, setDescription] = useState('');

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

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('Solo se permiten archivos de imagen');
                return;
            }
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!selectedFile) return;

        setUploading(true);
        setError(null);
        setSuccess(null);

        try {
            await PromotionService.upload(selectedFile, description);
            setSuccess('Imagen subida correctamente');
            setOpenUpload(false);
            resetForm();
            loadImages();
        } catch (err) {
            console.error(err);
            setError('Error al subir la imagen');
        } finally {
            setUploading(false);
        }
    };

    const resetForm = () => {
        setSelectedFile(null);
        setPreviewUrl(null);
        setDescription('');
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

    const copyToClipboard = (relativePath: string) => {
        const fullUrl = PromotionService.getImageUrl(relativePath);
        navigator.clipboard.writeText(fullUrl);
        setSuccess('URL copiada: ' + fullUrl);
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
                    startIcon={<AddIcon />}
                    onClick={() => setOpenUpload(true)}
                >
                    Nueva Promoción
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
                        <Grid item xs={12} sm={6} md={4} key={img.id || img.filename}>
                            <Card>
                                <CardMedia
                                    component="img"
                                    height="200"
                                    image={PromotionService.getImageUrl(img.path || `/uploads/promotions/${img.filename}`)}
                                    alt={img.filename}
                                    sx={{ objectFit: 'contain', bgcolor: '#f5f5f5' }}
                                />
                                <CardContent>
                                    <Typography variant="subtitle2" noWrap title={img.filename}>
                                        {img.filename}
                                    </Typography>

                                    {img.description && (
                                        <Typography 
                                            variant="body2" 
                                            color="text.primary" 
                                            sx={{ mt: 1, mb: 1, fontStyle: 'italic', bgcolor: '#f0f0f0', p: 1, borderRadius: 1 }}
                                        >
                                            "{img.description}"
                                        </Typography>
                                    )}

                                    <Typography variant="caption" display="block" color="text.secondary">
                                        {formatBytes(img.size)} • {new Date(img.createdAt).toLocaleDateString()}
                                    </Typography>
                                    
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                                        <Tooltip title="Copiar URL">
                                            <Button 
                                                size="small" 
                                                startIcon={<ContentCopyIcon />} 
                                                onClick={() => copyToClipboard(img.path || `/uploads/promotions/${img.filename}`)}
                                            >
                                                Copiar URL
                                            </Button>
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

            {/* Dialogo de Subida */}
            <Dialog open={openUpload} onClose={() => setOpenUpload(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Subir Nueva Promoción</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Button
                            variant="outlined"
                            component="label"
                            startIcon={<CloudUploadIcon />}
                            fullWidth
                            sx={{ mb: 2, height: 100, borderStyle: 'dashed' }}
                        >
                            {selectedFile ? selectedFile.name : 'Seleccionar Imagen'}
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleFileSelect}
                            />
                        </Button>

                        {previewUrl && (
                            <Box sx={{ mb: 2 }}>
                                <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }} />
                            </Box>
                        )}

                        <TextField
                            fullWidth
                            label="Texto de la Promoción (Opcional)"
                            placeholder="Ej: ¡Oferta especial por tiempo limitado!"
                            multiline
                            rows={3}
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenUpload(false)}>Cancelar</Button>
                    <Button 
                        onClick={handleUpload} 
                        variant="contained" 
                        disabled={!selectedFile || uploading}
                    >
                        {uploading ? 'Subiendo...' : 'Guardar Promoción'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};
