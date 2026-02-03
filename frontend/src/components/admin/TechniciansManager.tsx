import React, { useEffect, useState, useCallback } from 'react';
import { Paper, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Box, TablePagination } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { TechnicianService, Technician } from '../../services/TechnicianService';

export const TechniciansManager: React.FC = () => {
    const [techs, setTechs] = useState<Technician[]>([]);
    const [filteredTechs, setFilteredTechs] = useState<Technician[]>([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<Technician | null>(null);
    const [form, setForm] = useState<Partial<Technician>>({ name: '', phone: '', email: '' });
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => { 
        const res = await TechnicianService.getAll(); 
        setTechs(res);
        setFilteredTechs(res);
    }, []);
    
    const filterTechs = useCallback(() => {
        const filtered = techs.filter((tech) => {
            const searchLower = searchTerm.toLowerCase();
            return (
                tech.name.toLowerCase().includes(searchLower) ||
                (tech.phone && tech.phone.toLowerCase().includes(searchLower)) ||
                (tech.email && tech.email.toLowerCase().includes(searchLower))
            );
        });
        setFilteredTechs(filtered);
        setPage(0);
    }, [techs, searchTerm]);
    
    useEffect(() => { load(); }, [load]);
    useEffect(() => { filterTechs(); }, [filterTechs]);

    const handleOpenNew = () => { setEditing(null); setForm({ name: '', phone: '', email: '' }); setOpen(true); };
    const handleEdit = (t: Technician) => { setEditing(t); setForm(t); setOpen(true); };

    const handleSave = async () => {
        try {
            if (editing) await TechnicianService.update(editing.id, form as any);
            else await TechnicianService.create(form as any);
            setOpen(false); load();
        } catch (err) { console.error(err); alert('Error al guardar técnico'); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm('Desactivar técnico?')) return;
        await TechnicianService.delete(id);
        load();
    };

    const paginatedTechs = filteredTechs.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    return (
        <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenNew}>Nuevo Técnico</Button>
                <TextField
                    placeholder="Buscar técnicos..."
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
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Nombre</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Teléfono</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Email</TableCell>
                            <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {paginatedTechs.map((t, index) => (
                            <TableRow 
                                key={t.id}
                                sx={{ 
                                    backgroundColor: index % 2 === 0 ? 'white' : '#f5f5f5',
                                    '&:hover': {
                                        backgroundColor: '#e3f2fd'
                                    }
                                }}
                            >
                                <TableCell>{t.name}</TableCell>
                                <TableCell>{t.phone}</TableCell>
                                <TableCell>{t.email}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleEdit(t)}><EditIcon/></IconButton>
                                    <IconButton onClick={() => handleDelete(t.id)}><DeleteIcon/></IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredTechs.length}
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
                <DialogTitle>{editing ? 'Editar Técnico' : 'Nuevo Técnico'}</DialogTitle>
                <DialogContent>
                    <TextField label="Nombre" fullWidth value={form.name || ''} onChange={e => setForm(f => ({...f, name: e.target.value}))} sx={{ mt: 1 }} />
                    <TextField label="Teléfono" fullWidth value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} sx={{ mt: 1 }} />
                    <TextField label="Email" fullWidth value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} sx={{ mt: 1 }} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};
