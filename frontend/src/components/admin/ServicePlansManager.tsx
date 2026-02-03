import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Box, TablePagination } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { ServicePlanService, ServicePlan } from '../../services/ServicePlanService';

export const ServicePlansManager: React.FC = () => {
    const [plans, setPlans] = useState<ServicePlan[]>([]);
    const [filteredPlans, setFilteredPlans] = useState<ServicePlan[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ServicePlan | null>(null);
    const [form, setForm] = useState<Partial<ServicePlan>>({ name: '', speedMbps: 0, monthlyFee: 0, installationFee: 0 });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        const res = await ServicePlanService.getAll();
        setPlans(res);
        setFilteredPlans(res);
    }, []);

    const filterPlans = useCallback(() => {
        const filtered = plans.filter((plan) => {
            const searchLower = searchTerm.toLowerCase();
            return (
                plan.name.toLowerCase().includes(searchLower) ||
                plan.speedMbps.toString().includes(searchLower)
            );
        });
        setFilteredPlans(filtered);
        setPage(0);
    }, [plans, searchTerm]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => { filterPlans(); }, [filterPlans]);

    const handleOpenNew = () => { setEditing(null); setForm({ name: '', speedMbps: 0, monthlyFee: 0, installationFee: 0 }); setOpen(true); };
    const handleEdit = (p: ServicePlan) => { setEditing(p); setForm(p); setOpen(true); };

    const handleSave = async () => {
        try {
            if (editing) {
                await ServicePlanService.update(editing.id, form);
            } else {
                await ServicePlanService.create(form as any);
            }
            setOpen(false);
            load();
        } catch (err) {
            console.error(err);
            alert('Error al guardar el plan');
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Desactivar plan?')) return;
        await ServicePlanService.delete(id);
        load();
    };

    const paginatedPlans = filteredPlans.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>Nuevo Plan</Button>
                <TextField
                    placeholder="Buscar planes..."
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />
                    }}
                    sx={{ width: 300 }}
                />
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow sx={{ backgroundColor: '#1976d2' }}>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Plan</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Velocidad (Mbps)</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vr. del plan</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Vr. de Instalación</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedPlans.map((p, index) => (
                            <TableRow 
                                key={p.id}
                                sx={{ 
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                    '&:hover': {
                                        backgroundColor: '#e3f2fd'
                                    }
                                }}
                            >
                                <TableCell>{p.name}</TableCell>
                                <TableCell>{p.speedMbps}</TableCell>
                                <TableCell>{p.monthlyFee}</TableCell>
                                <TableCell>{p.installationFee}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleEdit(p)}><EditIcon/></IconButton>
                                    <IconButton onClick={() => handleDelete(p.id)}><DeleteIcon/></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredPlans.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(_event, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(event) => {
                        setRowsPerPage(parseInt(event.target.value, 10));
                        setPage(0);
                    }}
                    labelRowsPerPage="Filas por página:"
                    labelDisplayedRows={({ from, to, count }) => 
                        `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                    }
                />
            </TableContainer>

            <Dialog open={open} onClose={() => setOpen(false)}>
                <DialogTitle>{editing ? 'Editar Plan' : 'Nuevo Plan'}</DialogTitle>
                <DialogContent>
                    <TextField label="Nombre" fullWidth value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} sx={{ mt: 1 }} />
                    <TextField label="Velocidad (Mbps)" type="number" fullWidth value={form.speedMbps || 0} onChange={e => setForm(f => ({...f, speedMbps: Number(e.target.value)}))} sx={{ mt: 1 }} />
                    <TextField label="Vr. del plan" type="number" fullWidth value={form.monthlyFee || 0} onChange={e => setForm(f => ({...f, monthlyFee: Number(e.target.value)}))} sx={{ mt: 1 }} />
                    <TextField label="Vr. de Instalación" type="number" fullWidth value={form.installationFee || 0} onChange={e => setForm(f => ({...f, installationFee: Number(e.target.value)}))} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
