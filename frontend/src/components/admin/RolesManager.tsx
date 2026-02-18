import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    IconButton,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    CircularProgress,
    Alert,
    FormControlLabel,
    Switch,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Grid,
    Checkbox,
    Divider
} from '@mui/material';
import {
    Add as AddIcon,
    Edit as EditIcon,
    Delete as DeleteIcon,
    ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import RoleService, { Role, Permission } from '../../services/RoleService';

interface PermissionGroup {
    name: string;
    permissions: Permission[];
}

const RolesManager: React.FC = () => {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        permissions: [] as string[],
        isActive: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [rolesData, permsData] = await Promise.all([
                RoleService.getAll(),
                RoleService.getAvailablePermissions()
            ]);
            setRoles(rolesData);
            setPermissions(permsData);
        } catch (err: any) {
            setError('Error al cargar datos. ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    // Agrupar permisos por grupo para mostrar en el acordeón
    const groupedPermissions = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
        const group = perm.group || 'GENERAL';
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {});

    const handleOpenDialog = (role?: Role) => {
        if (role) {
            setEditingRole(role);
            // Asegurarse de que permissions sea un array de strings (a veces viene como JSON string desde BD si no se parseó bien)
            let currentPerms: string[] = [];
            if (Array.isArray(role.permissions)) {
                currentPerms = role.permissions;
            } else if (typeof role.permissions === 'string') {
                try {
                    currentPerms = JSON.parse(role.permissions);
                } catch (e) {
                    currentPerms = [];
                }
            }

            setFormData({
                name: role.name,
                description: role.description || '',
                permissions: currentPerms,
                isActive: role.isActive
            });
        } else {
            setEditingRole(null);
            setFormData({
                name: '',
                description: '',
                permissions: [],
                isActive: true
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingRole(null);
        setError('');
    };

    const handleSave = async () => {
        try {
            if (editingRole) {
                await RoleService.update(editingRole.id, formData);
            } else {
                await RoleService.create(formData);
            }
            handleCloseDialog();
            loadData();
        } catch (err: any) {
            setError('Error al guardar: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar este rol?')) {
            try {
                await RoleService.delete(id);
                loadData();
            } catch (err: any) {
                setError('Error al eliminar: ' + (err.response?.data?.message || err.message));
            }
        }
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => {
            const hasPerm = prev.permissions.includes(permId);
            if (hasPerm) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
            } else {
                return { ...prev, permissions: [...prev.permissions, permId] };
            }
        });
    };

    const toggleGroup = (groupName: string, groupPerms: Permission[]) => {
        const allGroupIds = groupPerms.map(p => p.id);
        const hasAll = allGroupIds.every(id => formData.permissions.includes(id));
        
        if (hasAll) {
            // Quitar todos del grupo
            setFormData(prev => ({
                ...prev,
                permissions: prev.permissions.filter(p => !allGroupIds.includes(p))
            }));
        } else {
            // Añadir todos los que falten del grupo
            // Usamos Array.from(new Set(...)) para evitar error TS2802 con target es5
            setFormData(prev => ({
                ...prev,
                permissions: Array.from(new Set([...prev.permissions, ...allGroupIds]))
            }));
        }
    };

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Gestión de Roles</Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                >
                    Nuevo Rol
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Nombre</TableCell>
                                <TableCell>Descripción</TableCell>
                                <TableCell>Permisos</TableCell>
                                <TableCell>Estado</TableCell>
                                <TableCell align="right">Acciones</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {roles.map((role) => (
                                <TableRow key={role.id}>
                                    <TableCell component="th" scope="row">
                                        <Typography fontWeight="bold">{role.name}</Typography>
                                    </TableCell>
                                    <TableCell>{role.description}</TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={`${Array.isArray(role.permissions) ? role.permissions.length : 0} permisos`} 
                                            size="small" 
                                            color="info" 
                                            variant="outlined" 
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip 
                                            label={role.isActive ? "Activo" : "Inactivo"} 
                                            color={role.isActive ? "success" : "default"} 
                                            size="small" 
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <IconButton 
                                            color="primary" 
                                            onClick={() => handleOpenDialog(role)}
                                            disabled={role.name === 'admin'} // Admin no editable o parcialmente editable
                                        >
                                            <EditIcon />
                                        </IconButton>
                                        <IconButton 
                                            color="error" 
                                            onClick={() => handleDelete(role.id)}
                                            disabled={role.name === 'admin'}
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
                <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                autoFocus
                                margin="dense"
                                label="Nombre del Rol"
                                fullWidth
                                value={formData.name}
                                onChange={(e) => setFormData({...formData, name: e.target.value})}
                                disabled={editingRole?.name === 'admin'}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                margin="dense"
                                label="Descripción"
                                fullWidth
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                                        disabled={editingRole?.name === 'admin'}
                                    />
                                }
                                label="Rol Activo"
                            />
                        </Grid>
                        
                        <Grid item xs={12}>
                            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>Permisos del Sistema</Typography>
                            <Divider sx={{ mb: 2 }} />
                            
                            {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => (
                                <Accordion key={groupName} defaultExpanded>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Box display="flex" alignItems="center" width="100%" justifyContent="space-between">
                                            <Typography fontWeight="bold">{groupName.toUpperCase().replace(/\./g, ' ')}</Typography>
                                            <Button 
                                                size="small" 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleGroup(groupName, groupPerms);
                                                }}
                                            >
                                                Seleccionar Todo
                                            </Button>
                                        </Box>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container>
                                            {groupPerms.map(perm => (
                                                <Grid item xs={12} sm={6} md={4} key={perm.id}>
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={formData.permissions.includes(perm.id)}
                                                                onChange={() => togglePermission(perm.id)}
                                                                disabled={editingRole?.name === 'admin'} // Evitar quitar permisos a admin por error? O permitirlo? Mejor permitirlo pero con cuidado.
                                                                // Dejamos editable para admin, pero backend protege el nombre.
                                                            />
                                                        }
                                                        label={
                                                            <Typography variant="body2" title={perm.id}>
                                                                {perm.label.split('.').pop()} 
                                                                <Typography component="span" variant="caption" color="textSecondary" display="block">
                                                                    ({perm.id})
                                                                </Typography>
                                                            </Typography>
                                                        }
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                            ))}
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">Generar Cambios</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default RolesManager;
