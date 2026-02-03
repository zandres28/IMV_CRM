import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Tooltip
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { InteractionTypeService, InteractionType } from '../../services/InteractionTypeService';

export const InteractionTypesManager: React.FC = () => {
    const [types, setTypes] = useState<InteractionType[]>([]);
    const [loading, setLoading] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // Form state
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');

    useEffect(() => {
        loadTypes();
    }, []);

    const loadTypes = async () => {
        setLoading(true);
        try {
            const data = await InteractionTypeService.getAll();
            setTypes(data);
        } catch (error) {
            console.error('Error loading types', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async () => {
        try {
            await InteractionTypeService.create({ name: newName, description: newDescription });
            setDialogOpen(false);
            setNewName('');
            setNewDescription('');
            loadTypes();
        } catch (error: any) {
            setError(error.response?.data?.message || 'Error al crear el tipo');
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar este tipo?')) {
            try {
                await InteractionTypeService.delete(id);
                loadTypes();
            } catch (error: any) {
                alert(error.response?.data?.message || 'Error al eliminar');
            }
        }
    };

    return (
        <Box maxWidth="800px" mx="auto" p={3}>
            <Typography variant="h5" gutterBottom>Gestión de Tipos de Interacción</Typography>
            
            <Box mb={2}>
                <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setDialogOpen(true)}
                >
                    Nuevo Tipo
                </Button>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell align="center">Sistema</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {types.map((type) => (
                            <TableRow key={type.id}>
                                <TableCell>{type.name}</TableCell>
                                <TableCell>{type.description || '-'}</TableCell>
                                <TableCell align="center">
                                    {type.isSystem ? 'Sí' : 'No'}
                                </TableCell>
                                <TableCell align="right">
                                    {!type.isSystem && (
                                        <Tooltip title="Eliminar">
                                            <IconButton color="error" onClick={() => handleDelete(type.id)}>
                                                <DeleteIcon />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
                <DialogTitle>Nuevo Tipo de Interacción</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Nombre (Identificador)"
                        fullWidth
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        helperText="Ej: 'felicitacion' (sin espacios preferiblemente)"
                    />
                    <TextField
                        margin="dense"
                        label="Descripción"
                        fullWidth
                        value={newDescription}
                        onChange={(e) => setNewDescription(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} variant="contained">Crear</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};
