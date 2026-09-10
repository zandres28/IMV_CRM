import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    InputLabel,
    Paper,
    TextField,
    Typography,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    LiveTv as LiveTvIcon,
    Lock as LockIcon,
    PersonAdd as PersonAddIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { NetflixAccountService } from '../../services/NetflixAccountService';
import { ClientService } from '../../services/ClientService';
import { NetflixAccount, NetflixSlot, ClientOption } from '../../types/NetflixAccount';
import { tokens } from '../../theme';

interface AssignDialogState {
    slot: NetflixSlot;
    clientId: number | null;
    profileName: string;
    pin: string;
}

interface EditSlotDialogState {
    slot: NetflixSlot;
    profileName: string;
    pin: string;
}

export const NetflixAccountsManager: React.FC = () => {
    const [accounts, setAccounts] = useState<NetflixAccount[]>([]);
    const [clients, setClients] = useState<ClientOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ── Diálogo crear / editar cuenta ──
    const [accountOpen, setAccountOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<NetflixAccount | null>(null);
    const [formEmail, setFormEmail] = useState('');
    const [formMaxSlots, setFormMaxSlots] = useState<number>(5);
    const [formNotes, setFormNotes] = useState('');
    const [formPaymentMethod, setFormPaymentMethod] = useState('');
    const [saving, setSaving] = useState(false);

    // ── Diálogo asignar slot ──
    const [assignDialog, setAssignDialog] = useState<AssignDialogState | null>(null);

    // ── Diálogo editar slot ──
    const [editSlotDialog, setEditSlotDialog] = useState<EditSlotDialogState | null>(null);

    // ── Confirmación de borrado ──
    const [deleteTarget, setDeleteTarget] = useState<NetflixAccount | null>(null);

    const loadAccounts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await NetflixAccountService.getAll();
            setAccounts(data);
            setError(null);
        } catch {
            setError('Error al cargar las cuentas de Netflix');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAccounts();
        ClientService.getAll()
            .then((data) =>
                setClients(
                    data.map((c) => ({ id: c.id, fullName: c.fullName || '', primaryPhone: c.primaryPhone || '' }))
                )
            )
            .catch(() => {});
    }, [loadAccounts]);

    const clearBanners = () => {
        setError(null);
        setSuccess(null);
    };

    const openCreate = () => {
        clearBanners();
        setEditingAccount(null);
        setFormEmail('');
        setFormMaxSlots(5);
        setFormNotes('');
        setFormPaymentMethod('');
        setAccountOpen(true);
    };

    const openEdit = (account: NetflixAccount) => {
        clearBanners();
        setEditingAccount(account);
        setFormEmail(account.email);
        setFormMaxSlots(account.maxSlots);
        setFormNotes(account.notes || '');
        setFormPaymentMethod(account.paymentMethod || '');
        setAccountOpen(true);
    };

    const handleSaveAccount = async () => {
        if (!formEmail.trim()) {
            setError('El email de la cuenta es obligatorio');
            return;
        }
        setSaving(true);
        try {
            if (editingAccount) {
                await NetflixAccountService.update(editingAccount.id, {
                    email: formEmail.trim(),
                    maxSlots: formMaxSlots,
                    notes: formNotes.trim() || undefined,
                    paymentMethod: formPaymentMethod.trim() || undefined,
                });
                setSuccess('Cuenta actualizada correctamente');
            } else {
                await NetflixAccountService.create({
                    email: formEmail.trim(),
                    maxSlots: formMaxSlots,
                    notes: formNotes.trim() || undefined,
                    paymentMethod: formPaymentMethod.trim() || undefined,
                });
                setSuccess('Cuenta creada correctamente');
            }
            setAccountOpen(false);
            await loadAccounts();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error al guardar la cuenta');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSaving(true);
        try {
            await NetflixAccountService.remove(deleteTarget.id);
            setSuccess('Cuenta eliminada');
            setDeleteTarget(null);
            await loadAccounts();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error al eliminar la cuenta');
        } finally {
            setSaving(false);
        }
    };

    const openAssign = (slot: NetflixSlot) => {
        clearBanners();
        setAssignDialog({ slot, clientId: null, profileName: '', pin: '' });
    };

    const openEditSlot = (slot: NetflixSlot) => {
        clearBanners();
        setEditSlotDialog({ slot, profileName: slot.profileName, pin: slot.pin });
    };

    const handleAssign = async () => {
        if (!assignDialog) return;
        if (!assignDialog.clientId) {
            setError('Selecciona el cliente que recibirá el perfil');
            return;
        }
        setSaving(true);
        try {
            await NetflixAccountService.assignSlot(assignDialog.slot.id, assignDialog.clientId, assignDialog.pin.trim() || undefined);
            setSuccess('Perfil asignado');
            setAssignDialog(null);
            await loadAccounts();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error al asignar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleRelease = async (slot: NetflixSlot) => {
        clearBanners();
        setSaving(true);
        try {
            await NetflixAccountService.releaseSlot(slot.id);
            setSuccess('Perfil liberado');
            await loadAccounts();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error al liberar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSlot = async () => {
        if (!editSlotDialog) return;
        setSaving(true);
        try {
            await NetflixAccountService.updateSlot(editSlotDialog.slot.id, {
                profileName: editSlotDialog.profileName.trim() || undefined,
                pin: editSlotDialog.pin.trim() || undefined,
            });
            setSuccess('Perfil actualizado');
            setEditSlotDialog(null);
            await loadAccounts();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Error al actualizar el perfil');
        } finally {
            setSaving(false);
        }
    };

    const totalFree = accounts.reduce((acc, a) => acc + a.freeSlots, 0);
    const totalOccupied = accounts.reduce((acc, a) => acc + a.occupiedSlots, 0);

    const renderSlotRow = (slot: NetflixSlot) => (
        <Box
            key={slot.id}
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1,
                px: 1.5,
                borderRadius: 2,
                border: `1px solid ${slot.free ? tokens.border : 'rgba(0,212,166,0.25)'}`,
                backgroundColor: slot.free ? tokens.sunken : 'rgba(0,212,166,0.06)',
            }}
        >
            <Typography sx={{ fontWeight: 700, color: tokens.muted, fontSize: '0.75rem', minWidth: 22 }}>
                #{slot.slotIndex}
            </Typography>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: '0.82rem', color: tokens.ink }}>
                    {slot.profileName || `Perfil ${slot.slotIndex}`}
                </Typography>
                <Stack direction="row" spacing={0.5} alignItems="center">
                    <LockIcon sx={{ fontSize: 12, color: tokens.muted }} />
                    <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: tokens.inkSoft }}>
                        {slot.pin}
                    </Typography>
                </Stack>
            </Box>
            {slot.free ? (
                <Button size="small" variant="contained" startIcon={<PersonAddIcon />} onClick={() => openAssign(slot)}>
                    Asignar
                </Button>
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Chip
                        size="small"
                        label={slot.client?.fullName || 'Asignado'}
                        sx={{
                            backgroundColor: 'rgba(0,212,166,0.12)',
                            color: '#009F80',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                            maxWidth: 180,
                        }}
                    />
                    <IconButton size="small" onClick={() => handleRelease(slot)} color="error">
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}
            <IconButton size="small" onClick={() => openEditSlot(slot)}>
                <EditIcon fontSize="small" />
            </IconButton>
        </Box>
    );

    return (
        <Container maxWidth="lg" sx={{ px: 3, py: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography
                        sx={{
                            fontFamily: 'Bricolage Grotesque, sans-serif',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            fontSize: '1.4rem',
                            color: tokens.ink,
                        }}
                    >
                        Cuentas Netflix
                    </Typography>
                    <Typography sx={{ color: tokens.muted, fontSize: '0.85rem' }}>
                        Administra perfiles generosamente compartidos entre clientes del CRM.
                    </Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Nueva Cuenta
                </Button>
            </Box>

            <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
                <Chip
                    icon={<LiveTvIcon />}
                    label={`${accounts.length} cuenta${accounts.length === 1 ? '' : 's'}`}
                    sx={{ backgroundColor: 'rgba(45,91,255,0.12)', color: tokens.brand, fontWeight: 600 }}
                />
                <Chip
                    label={`${totalFree} perfil${totalFree === 1 ? '' : 'es'} libre${totalFree === 1 ? '' : 's'}`}
                    sx={{ backgroundColor: 'rgba(0,212,166,0.12)', color: '#009F80', fontWeight: 600 }}
                />
                <Chip
                    label={`${totalOccupied} perfil${totalOccupied === 1 ? '' : 'es'} ocupado${totalOccupied === 1 ? '' : 's'}`}
                    sx={{ backgroundColor: 'rgba(229,72,77,0.10)', color: tokens.danger, fontWeight: 600 }}
                />
            </Stack>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                    {success}
                </Alert>
            )}

            {loading && accounts.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                    <CircularProgress />
                </Box>
            ) : accounts.length === 0 ? (
                <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 4 }}>
                    <LiveTvIcon sx={{ fontSize: 48, color: tokens.muted, mb: 1 }} />
                    <Typography sx={{ fontWeight: 600, color: tokens.inkSoft }}>Aún no hay cuentas de Netflix</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ mt: 2 }}>
                        Crear la primera cuenta
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {accounts.map((account) => (
                        <Grid item xs={12} md={6} xl={4} key={account.id}>
                            <Paper
                                sx={{
                                    p: 2.5,
                                    height: '100%',
                                    border: `1px solid ${account.full ? 'rgba(229,72,77,0.3)' : tokens.border}`,
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: tokens.ink }} noWrap>
                                            {account.email}
                                        </Typography>
                                        <Typography sx={{ fontSize: '0.75rem', color: tokens.muted }}>
                                            {account.occupiedSlots} de {account.maxSlots} perfiles ocupados
                                            {account.paymentMethod ? ` · ${account.paymentMethod}` : ''}
                                            {account.notes ? ` · ${account.notes}` : ''}
                                        </Typography>
                                    </Box>
                                    <Stack direction="row" spacing={0.5}>
                                        <IconButton size="small" onClick={() => openEdit(account)}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(account)}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Box>
                                <Chip
                                    size="small"
                                    label={account.full ? 'Completa' : `${account.freeSlots} libre${account.freeSlots === 1 ? '' : 's'}`}
                                    sx={{
                                        mb: 2,
                                        backgroundColor: account.full ? 'rgba(229,72,77,0.10)' : 'rgba(0,212,166,0.12)',
                                        color: account.full ? tokens.danger : '#009F80',
                                        fontWeight: 700,
                                        fontSize: '0.7rem',
                                    }}
                                />
                                <Stack spacing={1}>{account.slots.map(renderSlotRow)}</Stack>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* ── Diálogo crear / editar cuenta ── */}
            <Dialog open={accountOpen} onClose={() => setAccountOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>
                    {editingAccount ? 'Editar cuenta' : 'Nueva cuenta de Netflix'}
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Email de la cuenta"
                            value={formEmail}
                            onChange={(e) => setFormEmail(e.target.value)}
                            fullWidth
                            size="small"
                            placeholder="netflix@correo.com"
                        />
                        <Box>
                            <InputLabel sx={{ mb: 0.5 }}>Perfiles (clientes por cuenta)</InputLabel>
                            <TextField
                                type="number"
                                value={formMaxSlots}
                                onChange={(e) => {
                                    const v = parseInt(e.target.value, 10);
                                    setFormMaxSlots(Number.isFinite(v) ? Math.min(8, Math.max(1, v)) : 5);
                                }}
                                inputProps={{ min: 1, max: 8 }}
                                fullWidth
                                size="small"
                            />
                        </Box>
                        <TextField
                            label="Notas (opcional)"
                            value={formNotes}
                            onChange={(e) => setFormNotes(e.target.value)}
                            fullWidth
                            size="small"
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Método de pago (NU, Nequi, Rappi, BBVA, Littio…)"
                            value={formPaymentMethod}
                            onChange={(e) => setFormPaymentMethod(e.target.value)}
                            fullWidth
                            size="small"
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAccountOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSaveAccount} disabled={saving}>
                        {saving ? 'Guardando…' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Diálogo asignar ── */}
            <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="xs" fullWidth>
                {assignDialog && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>
                            Asignar perfil #{assignDialog.slot.slotIndex}
                        </DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <Autocomplete
                                    options={clients}
                                    getOptionLabel={(o) => `${o.fullName}${o.primaryPhone ? ` · ${o.primaryPhone}` : ''}`}
                                    onChange={(_, v) => setAssignDialog((s) => (s ? { ...s, clientId: v?.id ?? null } : s))}
                                    renderInput={(params) => <TextField {...params} label="Cliente" size="small" />}
                                />
                                <TextField
                                    label="Nombre del perfil (opcional)"
                                    value={assignDialog.profileName}
                                    onChange={(e) => setAssignDialog((s) => (s ? { ...s, profileName: e.target.value } : s))}
                                    fullWidth
                                    size="small"
                                />
                                <TextField
                                    label="PIN de 4 dígitos (opcional)"
                                    value={assignDialog.pin}
                                    onChange={(e) =>
                                        setAssignDialog((s) =>
                                            s ? { ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 4) } : s
                                        )
                                    }
                                    inputProps={{ maxLength: 4 }}
                                    fullWidth
                                    size="small"
                                    placeholder="Se genera automáticamente si se deja vacío"
                                />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setAssignDialog(null)}>Cancelar</Button>
                            <Button variant="contained" onClick={handleAssign} disabled={saving}>
                                {saving ? 'Asignando…' : 'Asignar'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ── Diálogo editar slot ── */}
            <Dialog open={!!editSlotDialog} onClose={() => setEditSlotDialog(null)} maxWidth="xs" fullWidth>
                {editSlotDialog && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>
                            Editar perfil #{editSlotDialog.slot.slotIndex}
                        </DialogTitle>
                        <DialogContent>
                            <Stack spacing={2} sx={{ mt: 1 }}>
                                <TextField
                                    label="Nombre del perfil"
                                    value={editSlotDialog.profileName}
                                    onChange={(e) => setEditSlotDialog((s) => (s ? { ...s, profileName: e.target.value } : s))}
                                    fullWidth
                                    size="small"
                                />
                                <TextField
                                    label="PIN de 4 dígitos"
                                    value={editSlotDialog.pin}
                                    onChange={(e) =>
                                        setEditSlotDialog((s) =>
                                            s ? { ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 4) } : s
                                        )
                                    }
                                    inputProps={{ maxLength: 4 }}
                                    fullWidth
                                    size="small"
                                />
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setEditSlotDialog(null)}>Cancelar</Button>
                            <Button variant="contained" onClick={handleSaveSlot} disabled={saving}>
                                {saving ? 'Guardando…' : 'Guardar'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* ── Confirmación de borrado ── */}
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>Eliminar cuenta</DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: tokens.inkSoft, fontSize: '0.85rem' }}>
                        ¿Eliminar la cuenta <b>{deleteTarget?.email}</b>? También se liberarán sus{' '}
                        {deleteTarget?.occupiedSlots} perfiles ocupados.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteTarget(null)}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={handleDelete} disabled={saving}>
                        {saving ? 'Eliminando…' : 'Eliminar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};