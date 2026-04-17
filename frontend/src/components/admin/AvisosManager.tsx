import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    TextField,
    ToggleButton,
    ToggleButtonGroup,
    Tooltip,
    Typography,
    Alert,
    Stack,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    Send as SendIcon,
    Campaign as CampaignIcon,
} from '@mui/icons-material';
import { AvisoService, AvisoTemplate, AvisoCategory, AvisoFilters, CATEGORY_LABELS, CATEGORY_COLORS } from '../../services/AvisoService';
import { ServicePlanService, ServicePlan } from '../../services/ServicePlanService';

// ────────────────────────────────────────────────────────────────────────────
// Tipos de filtro de destinatarios
// ────────────────────────────────────────────────────────────────────────────
type FilterMode = 'all' | 'pon' | 'date' | 'plan';

const N8N_WEBHOOK_URL = process.env.REACT_APP_N8N_NOTIFICATIONS_WEBHOOK || '';

// ────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ────────────────────────────────────────────────────────────────────────────
export const AvisosManager: React.FC = () => {
    const [templates, setTemplates] = useState<AvisoTemplate[]>([]);
    const [plans, setPlans] = useState<ServicePlan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // ── Diálogo crear / editar ──
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<AvisoTemplate | null>(null);
    const [formTitle, setFormTitle] = useState('');
    const [formCategory, setFormCategory] = useState<AvisoCategory>('general');
    const [formMessage, setFormMessage] = useState('');
    const [saving, setSaving] = useState(false);

    // ── Diálogo de envío ──
    const [sendOpen, setSendOpen] = useState(false);
    const [sendTemplate, setSendTemplate] = useState<AvisoTemplate | null>(null);
    const [filterMode, setFilterMode] = useState<FilterMode>('all');
    const [filterPon, setFilterPon] = useState('');
    const [filterPlanId, setFilterPlanId] = useState<number | ''>('');
    const [filterDateFrom, setFilterDateFrom] = useState('');
    const [filterDateTo, setFilterDateTo] = useState('');
    const [previewCount, setPreviewCount] = useState<number | null>(null);
    const [previewSample, setPreviewSample] = useState<string[]>([]);
    const [previewing, setPreviewing] = useState(false);
    const [sending, setSending] = useState(false);
    const [customMessage, setCustomMessage] = useState('');

    // ────────────────────────────────────────────────────────────────────────
    // Data loading
    // ────────────────────────────────────────────────────────────────────────
    const loadTemplates = useCallback(async () => {
        setLoading(true);
        try {
            const data = await AvisoService.getAll();
            setTemplates(data);
            setError(null);
        } catch {
            setError('Error al cargar los avisos');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
        ServicePlanService.getActive().then(setPlans).catch(() => {});
    }, [loadTemplates]);

    // ────────────────────────────────────────────────────────────────────────
    // CRUD helpers
    // ────────────────────────────────────────────────────────────────────────
    const openCreate = () => {
        setEditTarget(null);
        setFormTitle('');
        setFormCategory('general');
        setFormMessage('');
        setEditOpen(true);
    };

    const openEdit = (t: AvisoTemplate) => {
        setEditTarget(t);
        setFormTitle(t.title);
        setFormCategory(t.category);
        setFormMessage(t.message);
        setEditOpen(true);
    };

    const handleSave = async () => {
        if (!formTitle.trim() || !formMessage.trim()) {
            setError('El título y el mensaje son obligatorios');
            return;
        }
        setSaving(true);
        try {
            if (editTarget) {
                await AvisoService.update(editTarget.id, { title: formTitle, category: formCategory, message: formMessage });
                setSuccess('Aviso actualizado correctamente');
            } else {
                await AvisoService.create({ title: formTitle, category: formCategory, message: formMessage, isActive: true });
                setSuccess('Aviso creado correctamente');
            }
            setEditOpen(false);
            loadTemplates();
        } catch {
            setError('Error al guardar el aviso');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (t: AvisoTemplate) => {
        if (!window.confirm(`¿Eliminar el aviso "${t.title}"?`)) return;
        try {
            await AvisoService.delete(t.id);
            setSuccess('Aviso eliminado');
            loadTemplates();
        } catch {
            setError('Error al eliminar el aviso');
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // Envío via n8n
    // ────────────────────────────────────────────────────────────────────────
    const openSend = (t: AvisoTemplate) => {
        setSendTemplate(t);
        setCustomMessage(t.message);
        setFilterMode('all');
        setFilterPon('');
        setFilterPlanId('');
        setFilterDateFrom('');
        setFilterDateTo(new Date().toISOString().slice(0, 10));
        setPreviewCount(null);
        setPreviewSample([]);
        setSendOpen(true);
    };

    const buildFilters = (): AvisoFilters => {
        const f: AvisoFilters = {};
        if (filterMode === 'pon' && filterPon.trim()) f.ponId = filterPon.trim();
        if (filterMode === 'plan' && filterPlanId) f.planId = filterPlanId as number;
        if (filterMode === 'date') {
            if (filterDateFrom) f.installationDateFrom = filterDateFrom;
            if (filterDateTo) f.installationDateTo = filterDateTo;
        }
        return f;
    };

    const handlePreview = async () => {
        setPreviewing(true);
        setPreviewCount(null);
        setPreviewSample([]);
        try {
            const result = await AvisoService.preview(buildFilters());
            setPreviewCount(result.count);
            setPreviewSample(result.sample);
        } catch {
            setError('Error al obtener vista previa de destinatarios');
        } finally {
            setPreviewing(false);
        }
    };

    const handleSend = async () => {
        if (!sendTemplate) return;
        if (!customMessage.trim()) {
            setError('El mensaje no puede estar vacío');
            return;
        }
        if (!N8N_WEBHOOK_URL) {
            setError('La URL del webhook de n8n no está configurada (REACT_APP_N8N_NOTIFICATIONS_WEBHOOK)');
            return;
        }
        setSending(true);
        try {
            await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: customMessage.trim(),
                    templateId: sendTemplate.id,
                    category: sendTemplate.category,
                    ...buildFilters(),
                }),
            });
            setSuccess(`✅ Aviso "${sendTemplate.title}" enviado a n8n correctamente`);
            setSendOpen(false);
        } catch {
            setError('Error al llamar al webhook de n8n');
        } finally {
            setSending(false);
        }
    };

    // ────────────────────────────────────────────────────────────────────────
    // Agrupación por categoría
    // ────────────────────────────────────────────────────────────────────────
    const ORDER: AvisoCategory[] = ['emergency', 'maintenance', 'outage', 'general'];
    const grouped = ORDER.reduce<Record<AvisoCategory, AvisoTemplate[]>>((acc, cat) => {
        acc[cat] = templates.filter(t => t.category === cat);
        return acc;
    }, { emergency: [], maintenance: [], outage: [], general: [] });

    // ────────────────────────────────────────────────────────────────────────
    // RENDER
    // ────────────────────────────────────────────────────────────────────────
    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            {/* Cabecera */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CampaignIcon color="primary" sx={{ fontSize: 32 }} />
                    <Typography variant="h5" fontWeight={700}>Avisos Masivos WhatsApp</Typography>
                </Box>
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Nuevo Aviso
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>
            ) : (
                <Stack spacing={4}>
                    {ORDER.map(cat => {
                        const items = grouped[cat];
                        if (items.length === 0) return null;
                        return (
                            <Box key={cat}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                    <Chip
                                        label={CATEGORY_LABELS[cat]}
                                        color={CATEGORY_COLORS[cat]}
                                        size="small"
                                        sx={{ fontWeight: 700, fontSize: '0.8rem' }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        {items.length} plantilla{items.length !== 1 ? 's' : ''}
                                    </Typography>
                                </Box>
                                <Grid container spacing={2}>
                                    {items.map(t => (
                                        <Grid item xs={12} md={6} lg={4} key={t.id}>
                                            <Paper
                                                variant="outlined"
                                                sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                    <Typography variant="subtitle1" fontWeight={600} sx={{ flex: 1, mr: 1 }}>
                                                        {t.title}
                                                    </Typography>
                                                    <Box>
                                                        <Tooltip title="Editar">
                                                            <IconButton size="small" onClick={() => openEdit(t)}>
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="Eliminar">
                                                            <IconButton size="small" color="error" onClick={() => handleDelete(t)}>
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>
                                                </Box>

                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{
                                                        flex: 1,
                                                        whiteSpace: 'pre-wrap',
                                                        bgcolor: 'grey.50',
                                                        p: 1,
                                                        borderRadius: 1,
                                                        fontSize: '0.82rem',
                                                        maxHeight: 120,
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    {t.message}
                                                </Typography>

                                                <Button
                                                    variant="contained"
                                                    color={CATEGORY_COLORS[cat]}
                                                    startIcon={<SendIcon />}
                                                    fullWidth
                                                    size="small"
                                                    onClick={() => openSend(t)}
                                                >
                                                    Enviar por WhatsApp
                                                </Button>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Box>
                        );
                    })}

                    {templates.length === 0 && (
                        <Paper sx={{ p: 6, textAlign: 'center' }}>
                            <CampaignIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
                            <Typography color="text.secondary">
                                No hay plantillas de avisos. Crea la primera haciendo clic en "Nuevo Aviso".
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            )}

            {/* ── Diálogo Crear / Editar ── */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editTarget ? 'Editar Aviso' : 'Nuevo Aviso'}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        <TextField
                            label="Título del aviso"
                            fullWidth
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            inputProps={{ maxLength: 150 }}
                            helperText={`${formTitle.length}/150`}
                        />

                        <FormControl fullWidth>
                            <InputLabel>Categoría</InputLabel>
                            <Select
                                label="Categoría"
                                value={formCategory}
                                onChange={e => setFormCategory(e.target.value as AvisoCategory)}
                            >
                                {(Object.keys(CATEGORY_LABELS) as AvisoCategory[]).map(cat => (
                                    <MenuItem key={cat} value={cat}>{CATEGORY_LABELS[cat]}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            label="Mensaje (soporta emojis 😊)"
                            fullWidth
                            multiline
                            rows={6}
                            value={formMessage}
                            onChange={e => setFormMessage(e.target.value)}
                            placeholder="Ej: 🚨 Estimado cliente, informamos que se presentará una interrupción en el servicio..."
                        />
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
                    <Button variant="contained" onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ── Diálogo de Envío ── */}
            <Dialog open={sendOpen} onClose={() => setSendOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SendIcon color="primary" />
                        Enviar Aviso por WhatsApp
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={3} sx={{ mt: 1 }}>
                        {sendTemplate && (
                            <Chip
                                label={CATEGORY_LABELS[sendTemplate.category]}
                                color={CATEGORY_COLORS[sendTemplate.category]}
                                size="small"
                            />
                        )}

                        {/* Mensaje personalizable */}
                        <TextField
                            label="Mensaje a enviar (editable)"
                            fullWidth
                            multiline
                            rows={5}
                            value={customMessage}
                            onChange={e => setCustomMessage(e.target.value)}
                            helperText="Puedes modificar el mensaje antes de enviarlo. Soporta emojis 😊"
                        />

                        <Divider />

                        {/* Filtro de destinatarios */}
                        <Box>
                            <Typography variant="subtitle2" gutterBottom>
                                Filtrar destinatarios
                            </Typography>
                            <ToggleButtonGroup
                                value={filterMode}
                                exclusive
                                onChange={(_, v) => { if (v) { setFilterMode(v); setPreviewCount(null); } }}
                                size="small"
                                sx={{ flexWrap: 'wrap', gap: 0.5 }}
                            >
                                <ToggleButton value="all">Todos</ToggleButton>
                                <ToggleButton value="pon">Por PON ID</ToggleButton>
                                <ToggleButton value="date">Por fecha instalación</ToggleButton>
                                <ToggleButton value="plan">Por plan</ToggleButton>
                            </ToggleButtonGroup>
                        </Box>

                        {/* Campos extra según modo */}
                        {filterMode === 'pon' && (
                            <TextField
                                label="PON ID (ej: 0/0/1)"
                                fullWidth
                                value={filterPon}
                                onChange={e => { setFilterPon(e.target.value); setPreviewCount(null); }}
                                size="small"
                            />
                        )}

                        {filterMode === 'date' && (
                            <Grid container spacing={2}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Desde"
                                        type="date"
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        value={filterDateFrom}
                                        onChange={e => { setFilterDateFrom(e.target.value); setPreviewCount(null); }}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Hasta"
                                        type="date"
                                        fullWidth
                                        size="small"
                                        InputLabelProps={{ shrink: true }}
                                        value={filterDateTo}
                                        onChange={e => { setFilterDateTo(e.target.value); setPreviewCount(null); }}
                                    />
                                </Grid>
                            </Grid>
                        )}

                        {filterMode === 'plan' && (
                            <FormControl fullWidth size="small">
                                <InputLabel>Plan de servicio</InputLabel>
                                <Select
                                    label="Plan de servicio"
                                    value={filterPlanId}
                                    onChange={e => { setFilterPlanId(e.target.value as number | ''); setPreviewCount(null); }}
                                >
                                    <MenuItem value="">— Seleccionar —</MenuItem>
                                    {plans.map(p => (
                                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        )}

                        {/* Vista previa de destinatarios */}
                        <Box>
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={handlePreview}
                                disabled={previewing}
                                startIcon={previewing ? <CircularProgress size={14} /> : undefined}
                            >
                                {previewing ? 'Calculando...' : 'Ver destinatarios'}
                            </Button>

                            {previewCount !== null && (
                                <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'grey.100', borderRadius: 1 }}>
                                    <Typography variant="body2" fontWeight={700}>
                                        {previewCount} cliente{previewCount !== 1 ? 's' : ''} recibirán este mensaje
                                    </Typography>
                                    {previewSample.length > 0 && (
                                        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
                                            Muestra: {previewSample.join(', ')}{previewCount > previewSample.length ? '...' : ''}
                                        </Typography>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSendOpen(false)}>Cancelar</Button>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                        onClick={handleSend}
                        disabled={sending || !customMessage.trim()}
                    >
                        {sending ? 'Enviando...' : 'Confirmar y Enviar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};
