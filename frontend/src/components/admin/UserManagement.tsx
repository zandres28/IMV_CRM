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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Alert,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import UserService, { User, Role, CreateUserData, UpdateUserData } from '../../services/UserService';

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    roleIds: [] as number[],
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [usersData, rolesData] = await Promise.all([
        UserService.getAll(),
        UserService.getAllRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '',
        firstName: user.firstName,
        lastName: user.lastName,
        roleIds: user.roles.map(r => r.id),
        isActive: user.isActive
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        roleIds: [],
        isActive: true
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      roleIds: [],
      isActive: true
    });
  };

  const handleSubmit = async () => {
    try {
      setError('');
      if (editingUser) {
        const updateData: UpdateUserData = {
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roleIds: formData.roleIds,
          isActive: formData.isActive
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await UserService.update(editingUser.id, updateData);
      } else {
        const createData: CreateUserData = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          roleIds: formData.roleIds
        };
        await UserService.create(createData);
      }
      handleCloseDialog();
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al guardar usuario');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de desactivar este usuario?')) {
      try {
        setError('');
        await UserService.delete(id);
        loadData();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al desactivar usuario');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Gestión de Usuarios</Typography>
        <Box>
          <IconButton onClick={loadData} sx={{ mr: 1 }}>
            <RefreshIcon />
          </IconButton>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Nuevo Usuario
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Roles</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Fecha Creación</TableCell>
              <TableCell align="right">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.roles.map((role) => (
                    <Chip
                      key={role.id}
                      label={role.name}
                      size="small"
                      sx={{ mr: 0.5 }}
                      color={
                        role.name === 'admin' ? 'error' :
                        role.name === 'operador' ? 'primary' :
                        role.name === 'tecnico' ? 'success' :
                        'default'
                      }
                    />
                  ))}
                </TableCell>
                <TableCell>
                  <Chip
                    label={user.isActive ? 'Activo' : 'Inactivo'}
                    color={user.isActive ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell align="right">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenDialog(user)}
                    color="primary"
                  >
                    <EditIcon />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDelete(user.id)}
                    color="error"
                    disabled={!user.isActive}
                  >
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog para crear/editar usuario */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <TextField
              fullWidth
              label="Nombre"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Apellido"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label={editingUser ? 'Nueva Contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              margin="normal"
              required={!editingUser}
              helperText={editingUser ? 'Solo completa si deseas cambiar la contraseña' : 'Mínimo 6 caracteres'}
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Roles</InputLabel>
              <Select
                multiple
                value={formData.roleIds}
                onChange={(e) => setFormData({ ...formData, roleIds: e.target.value as number[] })}
                input={<OutlinedInput label="Roles" />}
                renderValue={(selected) =>
                  roles
                    .filter((role) => selected.includes(role.id))
                    .map((role) => role.name)
                    .join(', ')
                }
              >
                {roles.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    <Checkbox checked={formData.roleIds.includes(role.id)} />
                    <ListItemText primary={role.name} secondary={role.description} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {editingUser && (
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                }
                label="Usuario Activo"
                sx={{ mt: 2 }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              !formData.firstName ||
              !formData.lastName ||
              !formData.email ||
              (!editingUser && !formData.password) ||
              formData.roleIds.length === 0
            }
          >
            {editingUser ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagement;
