import React, { useState, useEffect, useCallback } from "react";
import {
    Box,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Switch,
    FormControlLabel,
    Alert,
    CircularProgress,
    Tooltip
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RouterIcon from "@mui/icons-material/Router";
import WifiTetheringIcon from "@mui/icons-material/WifiTethering";
import NetworkCheckIcon from "@mui/icons-material/NetworkCheck";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import {
    NetworkDevice,
    NetworkDeviceForm,
    DeviceType,
    NetworkDeviceService,
    TestConnectionResult
} from "../../services/NetworkDeviceService";

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
    mikrotik: "MikroTik",
    olt: "OLT GPON",
    switch: "Switch",
    other: "Otro"
};

const DEVICE_TYPE_COLORS: Record<DeviceType, "primary" | "secondary" | "warning" | "default"> = {
    mikrotik: "primary",
    olt: "secondary",
    switch: "warning",
    other: "default"
};

const DEFAULT_FORM: NetworkDeviceForm = {
    name: "",
    type: "mikrotik",
    host: "",
    port: 80,
    username: "",
    password: "",
    description: "",
    enabled: true
};

const DEFAULT_PORTS: Record<DeviceType, number> = {
    mikrotik: 80,
    olt: 8080,
    switch: 22,
    other: 80
};

export function NetworkDevicesManager() {
    const [devices, setDevices] = useState<NetworkDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editingDevice, setEditingDevice] = useState<NetworkDevice | null>(null);
    const [deletingDevice, setDeletingDevice] = useState<NetworkDevice | null>(null);
    const [form, setForm] = useState<NetworkDeviceForm>(DEFAULT_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [testResults, setTestResults] = useState<Record<number, TestConnectionResult & { testing?: boolean }>>({});

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const data = await NetworkDeviceService.getAll();
            setDevices(data);
        } catch {
            setError("Error al cargar dispositivos");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const openCreate = () => {
        setEditingDevice(null);
        setForm(DEFAULT_FORM);
        setError(null);
        setDialogOpen(true);
    };

    const openEdit = (device: NetworkDevice) => {
        setEditingDevice(device);
        setForm({
            name: device.name,
            type: device.type,
            host: device.host,
            port: device.port,
            username: device.username || "",
            password: "",
            description: device.description || "",
            enabled: device.enabled
        });
        setError(null);
        setDialogOpen(true);
    };

    const openDelete = (device: NetworkDevice) => {
        setDeletingDevice(device);
        setDeleteDialogOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.host.trim()) {
            setError("Nombre y host son obligatorios");
            return;
        }
        setSaving(true);
        setError(null);
        try {
            if (editingDevice) {
                await NetworkDeviceService.update(editingDevice.id, form);
            } else {
                await NetworkDeviceService.create(form);
            }
            setDialogOpen(false);
            await load();
        } catch (err: any) {
            setError(err.response?.data?.message || "Error al guardar dispositivo");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deletingDevice) return;
        try {
            await NetworkDeviceService.delete(deletingDevice.id);
            setDeleteDialogOpen(false);
            setDeletingDevice(null);
            await load();
        } catch {
            setError("Error al eliminar dispositivo");
        }
    };

    const handleTest = async (device: NetworkDevice) => {
        setTestResults(prev => ({ ...prev, [device.id]: { ok: false, latency: null, message: "", testing: true } }));
        try {
            const result = await NetworkDeviceService.testConnection(device.id);
            setTestResults(prev => ({ ...prev, [device.id]: { ...result, testing: false } }));
        } catch {
            setTestResults(prev => ({
                ...prev,
                [device.id]: { ok: false, latency: null, message: "Error al probar conexion", testing: false }
            }));
        }
    };

    const handleTypeChange = (type: DeviceType) => {
        setForm(prev => ({ ...prev, type, port: DEFAULT_PORTS[type] }));
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                    <RouterIcon color="primary" />
                    <Typography variant="h5" fontWeight={600}>
                        Dispositivos de Red
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Agregar Dispositivo
                </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
                Configura aqui los dispositivos de red (MikroTik, OLT, Switches) para que el aplicativo pueda conectarse a ellos a traves del tunel VPN.
            </Alert>

            {loading ? (
                <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead>
                            <TableRow sx={{ bgcolor: "grey.50" }}>
                                <TableCell><strong>Nombre</strong></TableCell>
                                <TableCell><strong>Tipo</strong></TableCell>
                                <TableCell><strong>Host / Puerto</strong></TableCell>
                                <TableCell><strong>Usuario</strong></TableCell>
                                <TableCell><strong>Estado</strong></TableCell>
                                <TableCell><strong>Conexion</strong></TableCell>
                                <TableCell align="right"><strong>Acciones</strong></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {devices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: "text.secondary" }}>
                                        No hay dispositivos configurados
                                    </TableCell>
                                </TableRow>
                            ) : devices.map(device => {
                                const test = testResults[device.id];
                                return (
                                    <TableRow key={device.id} hover>
                                        <TableCell>
                                            <Box>
                                                <Typography fontWeight={500}>{device.name}</Typography>
                                                {device.description && (
                                                    <Typography variant="caption" color="text.secondary">
                                                        {device.description}
                                                    </Typography>
                                                )}
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={DEVICE_TYPE_LABELS[device.type]}
                                                color={DEVICE_TYPE_COLORS[device.type]}
                                                icon={<WifiTetheringIcon />}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Typography fontFamily="monospace" fontSize={13}>
                                                {device.host}:{device.port}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{device.username || "—"}</TableCell>
                                        <TableCell>
                                            <Chip
                                                size="small"
                                                label={device.enabled ? "Activo" : "Inactivo"}
                                                color={device.enabled ? "success" : "default"}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {test?.testing ? (
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <CircularProgress size={16} />
                                                    <Typography variant="caption">Probando...</Typography>
                                                </Box>
                                            ) : test ? (
                                                <Tooltip title={`${test.message}${test.latency ? ` (${test.latency}ms)` : ""}`}>
                                                    <Box display="flex" alignItems="center" gap={0.5}>
                                                        {test.ok
                                                            ? <CheckCircleIcon fontSize="small" color="success" />
                                                            : <ErrorIcon fontSize="small" color="error" />}
                                                        <Typography variant="caption" color={test.ok ? "success.main" : "error"}>
                                                            {test.ok ? `OK ${test.latency}ms` : "Sin conexion"}
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            ) : (
                                                <Typography variant="caption" color="text.disabled">—</Typography>
                                            )}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Box display="flex" justifyContent="flex-end" gap={0.5}>
                                                <Tooltip title="Probar conexion">
                                                    <IconButton size="small" onClick={() => handleTest(device)} color="info">
                                                        <NetworkCheckIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Editar">
                                                    <IconButton size="small" onClick={() => openEdit(device)}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Eliminar">
                                                    <IconButton size="small" onClick={() => openDelete(device)} color="error">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </Box>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Dialog: Crear / Editar */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingDevice ? "Editar Dispositivo" : "Agregar Dispositivo"}
                </DialogTitle>
                <DialogContent dividers>
                    {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                    <Box display="flex" flexDirection="column" gap={2} pt={1}>
                        <TextField
                            label="Nombre del dispositivo"
                            value={form.name}
                            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                            fullWidth
                            placeholder="Ej: MikroTik Sede Principal"
                        />
                        <FormControl fullWidth>
                            <InputLabel>Tipo de dispositivo</InputLabel>
                            <Select
                                value={form.type}
                                label="Tipo de dispositivo"
                                onChange={e => handleTypeChange(e.target.value as DeviceType)}
                            >
                                <MenuItem value="mikrotik">MikroTik</MenuItem>
                                <MenuItem value="olt">OLT GPON</MenuItem>
                                <MenuItem value="switch">Switch</MenuItem>
                                <MenuItem value="other">Otro</MenuItem>
                            </Select>
                        </FormControl>
                        <Box display="flex" gap={2}>
                            <TextField
                                label="Host / IP"
                                value={form.host}
                                onChange={e => setForm(p => ({ ...p, host: e.target.value }))}
                                fullWidth
                                placeholder="192.168.40.10"
                                inputProps={{ style: { fontFamily: "monospace" } }}
                            />
                            <TextField
                                label="Puerto"
                                type="number"
                                value={form.port}
                                onChange={e => setForm(p => ({ ...p, port: Number(e.target.value) }))}
                                sx={{ width: 120 }}
                            />
                        </Box>
                        <Box display="flex" gap={2}>
                            <TextField
                                label="Usuario"
                                value={form.username}
                                onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                                fullWidth
                                placeholder="admin"
                            />
                            <TextField
                                label={editingDevice ? "Contraseña (dejar en blanco para no cambiar)" : "Contraseña"}
                                type="password"
                                value={form.password}
                                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                                fullWidth
                            />
                        </Box>
                        <TextField
                            label="Descripcion"
                            value={form.description}
                            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                            fullWidth
                            multiline
                            rows={2}
                            placeholder="Descripcion opcional del dispositivo..."
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={form.enabled}
                                    onChange={e => setForm(p => ({ ...p, enabled: e.target.checked }))}
                                    color="success"
                                />
                            }
                            label="Dispositivo habilitado"
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? <CircularProgress size={20} /> : editingDevice ? "Guardar cambios" : "Crear dispositivo"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Dialog: Confirmar eliminacion */}
            <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
                <DialogTitle>Eliminar dispositivo</DialogTitle>
                <DialogContent>
                    <Typography>
                        ¿Estas seguro de eliminar <strong>{deletingDevice?.name}</strong>?
                        Esta accion no se puede deshacer.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
