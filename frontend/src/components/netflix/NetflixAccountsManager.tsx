import React, { useState, useEffect, useCallback } from 'react';
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
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
    Tooltip,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    LiveTv as LiveTvIcon,
    Lock as LockIcon,
    PersonAdd as PersonAddIcon,
    Close as CloseIcon,
    ContentCopy as ContentCopyIcon,
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
        setAssignDialog({ slot, clientId: null, profileName: slot.profileName, pin: slot.pin });
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
            await NetflixAccountService.assignSlot(
                assignDialog.slot.id,
                assignDialog.clientId,
                assignDialog.pin.trim() || undefined,
                assignDialog.profileName.trim() || undefined
            );
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

    const copyPin = async (pin: string) => {
        try {
            await navigator.clipboard.writeText(pin);
        } catch {
            /* clipboard no disponible */
        }
    };

    const MetaRow = ({ label, value }: { label: string; value: string }) => (
        <Box sx={{ display: 'flex', gap: 1, py: 0.25 }}>
            <Typography
                sx={{
                    flex: '0 0 86px',
                    fontSize: '0.62rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: tokens.muted,
                    pt: 0.3,
                }}
            >
                {label}
            </Typography>
            <Typography sx={{ fontSize: '0.8rem', color: tokens.inkSoft, minWidth: 0 }}>{value}</Typography>
        </Box>
    );

    const renderSlotRow = (slot: NetflixSlot) => (
        <Box
            key={slot.id}
            sx={{
                py: 1.25,
                px: 1.5,
                borderRadius: 2,
                border: `1px solid ${slot.free ? tokens.border : 'rgba(0,212,166,0.25)'}`,
                backgroundColor: slot.free ? tokens.sunken : 'rgba(0,212,166,0.06)',
                transition: 'border-color 150ms ease, background-color 150ms ease',
                '&:hover': {
                    borderColor: slot.free ? 'rgba(45,91,255,0.35)' : 'rgba(0,212,166,0.45)',
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Typography sx={{ fontWeight: 700, color: tokens.muted, fontSize: '0.72rem', minWidth: 24, fontFamily: 'JetBrains Mono, monospace' }}>
                    #{slot.slotIndex}
                </Typography>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                        sx={{ fontWeight: 600, fontSize: '0.83rem', color: tokens.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={slot.profileName}
                    >
                        {slot.profileName || `Perfil ${slot.slotIndex}`}
                    </Typography>
                    <Stack direction="row" spacing={0.5} alignItems="center" component="button"
                        onClick={() => copyPin(slot.pin)}
                        aria-label={`Copiar PIN ${slot.pin}`}
                        sx={{ p: 0, m: 0, background: 'none', border: 'none', cursor: 'pointer', mt: 0.25, alignItems: 'center' }}>
                        <LockIcon sx={{ fontSize: 12, color: tokens.muted }} />
                        <Typography sx={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', color: tokens.inkSoft, letterSpacing: '0.06em' }}>
                            {slot.pin}
                        </Typography>
                        <ContentCopyIcon sx={{ fontSize: 11, color: tokens.muted, opacity: 0.65 }} />
                    </Stack>
                </Box>
                <IconButton size="small" onClick={() => openEditSlot(slot)} aria-label={`Editar perfil ${slot.profileName}`}>
                    <EditIcon fontSize="small" />
                </IconButton>
            </Box>
            {slot.free ? (
                <Button
                    size="small"
                    variant="contained"
                    startIcon={<PersonAddIcon />}
                    onClick={() => openAssign(slot)}
                    sx={{ mt: 1, width: '100%' }}
                >
                    Asignar
                </Button>
            ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, mt: 1 }}>
                    <Tooltip title={slot.client?.fullName || 'Asignado'}>
                        <Chip
                            size="small"
                            label={slot.client?.fullName || 'Asignado'}
                            sx={{
                                flex: 1,
                                minWidth: 0,
                                backgroundColor: 'rgba(0,212,166,0.12)',
                                color: '#009F80',
                                fontWeight: 600,
                                fontSize: '0.72rem',
                                '& .MuiChip-label': { overflow: 'hidden', textOverflow: 'ellipsis' },
                            }}
                        />
                    </Tooltip>
                    <IconButton size="small" onClick={() => handleRelease(slot)} color="error" aria-label={`Liberar perfil ${slot.profileName}`}>
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Box>
            )}
        </Box>
    );

    return (
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'flex-start' }, gap: 2, mb: 2.5 }}>
                <Box sx={{ minWidth: 0 }}>
                    <Typography
                        sx={{
                            fontFamily: 'Bricolage Grotesque, sans-serif',
                            fontWeight: 700,
                            letterSpacing: '-0.02em',
                            fontSize: 'clamp(1.35rem, 2.5vw, 1.65rem)',
                            lineHeight: 1.2,
                            color: tokens.ink,
                        }}
                    >
                        Cuentas Netflix
                    </Typography>
                    <Typography sx={{ color: tokens.muted, fontSize: '0.85rem', mt: 0.25 }}>
                        Administra perfiles compartidos entre clientes del CRM.
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={openCreate}
                    sx={{ alignSelf: { xs: 'stretch', sm: 'auto' }, whiteSpace: 'nowrap' }}
                >
                    Nueva Cuenta
                </Button>
            </Box>

            <Stack direction="row" sx={{ mb: 3, gap: 1, flexWrap: 'wrap' }}>
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
                                    display: 'flex',
                                    flexDirection: 'column',
                                    border: `1px solid ${account.full ? 'rgba(229,72,77,0.35)' : tokens.border}`,
                                    transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
                                    '&:hover': {
                                        borderColor: 'rgba(45,91,255,0.35)',
                                        boxShadow: '0 1px 0 rgba(14,19,48,0.06), 0 16px 32px -18px rgba(14,19,48,0.28)',
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1.5 }}>
                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Tooltip title={account.email}>
                                            <Typography
                                                sx={{ fontWeight: 700, fontSize: '0.92rem', color: tokens.ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                            >
                                                {account.email}
                                            </Typography>
                                        </Tooltip>
                                        <Box sx={{ mt: 1 }}>
                                            <MetaRow label="Perfiles" value={`${account.occupiedSlots} de ${account.maxSlots} ocupados`} />
                                            {account.paymentMethod ? <MetaRow label="Pago" value={account.paymentMethod} /> : null}
                                            {account.notes ? <MetaRow label="Notas" value={account.notes} /> : null}
                                        </Box>
                                    </Box>
                                    <Stack direction="row" spacing={0.25}>
                                        <IconButton size="small" onClick={() => openEdit(account)} aria-label={`Editar cuenta ${account.email}`}>
                                            <EditIcon fontSize="small" />
                                        </IconButton>
                                        <IconButton size="small" color="error" onClick={() => setDeleteTarget(account)} aria-label={`Eliminar cuenta ${account.email}`}>
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Stack>
                                </Box>
                                <Divider sx={{ my: 1.5 }} />
                                <Chip
                                    size="small"
                                    label={account.full ? 'Completa' : `${account.freeSlots} libre${account.freeSlots === 1 ? '' : 's'}`}
                                    sx={{
                                        alignSelf: 'flex-start',
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
            <Dialog open={accountOpen} onClose={() => setAccountOpen(false)} maxWidth="xs" fullWidth scroll="paper">
                <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>
                    {editingAccount ? 'Editar cuenta' : 'Nueva cuenta de Netflix'}
                </DialogTitle>
                <DialogContent sx={{ overflowY: 'auto' }}>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <Divider />
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
            <Dialog open={!!assignDialog} onClose={() => setAssignDialog(null)} maxWidth="xs" fullWidth scroll="paper">
                {assignDialog && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>
                            Asignar perfil #{assignDialog.slot.slotIndex}
                        </DialogTitle>
                        <DialogContent sx={{ overflowY: 'auto' }}>
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
                                    label="PIN de 4 dígitos"
                                    value={assignDialog.pin}
                                    onChange={(e) =>
                                        setAssignDialog((s) =>
                                            s ? { ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 4) } : s
                                        )
                                    }
                                    inputProps={{ maxLength: 4 }}
                                    fullWidth
                                    size="small"
                                    helperText="Ya trae el PIN actual del perfil; cámbialo solo si es necesario."
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
            <Dialog open={!!editSlotDialog} onClose={() => setEditSlotDialog(null)} maxWidth="xs" fullWidth scroll="paper">
                {editSlotDialog && (
                    <>
                        <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>
                            Editar perfil #{editSlotDialog.slot.slotIndex}
                        </DialogTitle>
                        <DialogContent sx={{ overflowY: 'auto' }}>
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
            <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth scroll="paper">
                <DialogTitle sx={{ fontFamily: 'Bricolage Grotesque, sans-serif', fontWeight: 700 }}>Eliminar cuenta</DialogTitle>
                <DialogContent sx={{ overflowY: 'auto' }}>
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