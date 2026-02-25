import React, { useState } from 'react';
import { 
    Box, 
    Typography, 
    Paper, 
    TextField, 
    Button, 
    Snackbar, 
    Alert, 
    Accordion, 
    AccordionSummary, 
    AccordionDetails, 
    Chip,
    Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import AuthService from '../../services/AuthService';

const ApiAccess: React.FC = () => {
    const [token, setToken] = useState(AuthService.getAccessToken() || '');
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

    const handleCopyToken = () => {
        navigator.clipboard.writeText(token);
        setSnackbarMessage('Token copiado al portapapeles');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
    };

    const handleRefreshToken = async () => {
        try {
            const newToken = await AuthService.refreshAccessToken();
            if (newToken) {
                setToken(newToken);
                setSnackbarMessage('Token regenerado exitosamente');
                setSnackbarSeverity('success');
            } else {
                setSnackbarMessage('No se pudo regenerar el token. Tu sesión puede haber expirado.');
                setSnackbarSeverity('error');
            }
        } catch (error) {
            setSnackbarMessage('Error al regenerar el token');
            setSnackbarSeverity('error');
        }
        setSnackbarOpen(true);
    };

    const endpoints = [
        // --- AUTH ---
        {
            method: 'POST',
            path: '/api/auth/login',
            description: 'Iniciar sesión (Obtener Token)',
            body: `{
  "email": "admin@example.com",
  "password": "password123"
}`,
            example: `curl -X POST "http://localhost:3001/api/auth/login" \\
-H "Content-Type: application/json" \\
-d '{
  "email": "admin@example.com",
  "password": "password123"
}'`
        },
        {
            method: 'GET',
            path: '/api/auth/me',
            description: 'Obtener información del usuario actual',
            example: `curl -X GET "http://localhost:3001/api/auth/me" \\
-H "Authorization: Bearer ${token}"`
        },

        // --- CLIENTS ---
        {
            method: 'GET',
            path: '/api/clients',
            description: 'Obtener lista de clientes paginada',
            params: 'page (number), limit (number), search (string, por nombre/cedula), status (active, suspended, retired)',
            example: `curl -X GET "http://localhost:3001/api/clients?page=1&limit=10&search=Juan&status=active" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'GET',
            path: '/api/clients/:id',
            description: 'Obtener detalle de un cliente (por ID o Cédula)',
            example: `curl -X GET "http://localhost:3001/api/clients/123456789" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'POST',
            path: '/api/clients',
            description: 'Crear un nuevo cliente',
            body: `{
  "firstName": "Juan",
  "lastName": "Perez",
  "documentNumber": "123456789",
  "phone": "3001234567",
  "email": "juan@example.com",
  "address": "Calle 123 # 45-67",
  "city": "Bogotá",
  "servicePlanId": 1,
  "ipAddress": "192.168.1.100"
}`,
            example: `curl -X POST "http://localhost:3001/api/clients" \\
-H "Authorization: Bearer ${token}" \\
-H "Content-Type: application/json" \\
-d '{
  "firstName": "Juan",
  "lastName": "Perez",
  "documentNumber": "123456789",
  "phone": "3001234567",
  "email": "juan@example.com",
  "address": "Calle 123 # 45-67",
  "city": "Bogotá",
  "servicePlanId": 1,
  "ipAddress": "192.168.1.100"
}'`
        },
        {
            method: 'PUT',
            path: '/api/clients/:id',
            description: 'Actualizar un cliente existente',
            body: `{
  "phone": "3009999999",
  "status": "suspended"
}`,
            example: `curl -X PUT "http://localhost:3001/api/clients/1" \\
-H "Authorization: Bearer ${token}" \\
-H "Content-Type: application/json" \\
-d '{
  "phone": "3009999999",
  "status": "suspended"
}'`
        },

        // --- BILLING ---
        {
            method: 'GET',
            path: '/api/monthly-billing',
            description: 'Obtener facturación mensual',
            params: 'month (nombre o index), year (YYYY), status (pending, overdue, paid), viewMode (cumulative: acumula deudas pasadas)',
            example: `curl -X GET "http://localhost:3001/api/monthly-billing?month=Febrero&year=2025&status=pending&viewMode=cumulative" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'GET',
            path: '/api/monthly-billing/client/:id/pending',
            description: 'Obtener pagos pendientes de un cliente (por ID o Cédula)',
            example: `curl -X GET "http://localhost:3001/api/monthly-billing/client/123456789/pending" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'GET',
            path: '/api/public/billing/:identificationNumber',
            description: 'Consulta pública de facturación (Sin Token)',
            example: `curl -X GET "http://localhost:3001/api/public/billing/123456789"`
        },
        {
            method: 'PUT',
            path: '/api/monthly-billing/:id/pay',
            description: 'Registrar pago de una factura',
            body: `{
  "amount": 50000,
  "paymentMethod": "cash",
  "reference": "REF123"
}`,
            example: `curl -X PUT "http://localhost:3001/api/monthly-billing/105/pay" \\
-H "Authorization: Bearer ${token}" \\
-H "Content-Type: application/json" \\
-d '{
  "amount": 50000,
  "paymentMethod": "cash",
  "reference": "REF123"
}'`
        },

        // --- INSTALLATIONS ---
        {
            method: 'GET',
            path: '/api/installations',
            description: 'Obtener lista de instalaciones',
            params: 'status (pending, completed, cancelled)',
            example: `curl -X GET "http://localhost:3001/api/installations?status=pending" \\
-H "Authorization: Bearer ${token}"`
        },

        // --- SERVICE PLANS ---
        {
            method: 'GET',
            path: '/api/service-plans/active',
            description: 'Obtener planes de servicio activos',
            example: `curl -X GET "http://localhost:3001/api/service-plans/active" \\
-H "Authorization: Bearer ${token}"`
        },

        // --- SERVICE OUTAGES ---
        {
            method: 'GET',
            path: '/api/service-outages',
            description: 'Listar reportes de fallas',
            example: `curl -X GET "http://localhost:3001/api/service-outages" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'POST',
            path: '/api/service-outages',
            description: 'Reportar una nueva falla',
            body: `{
  "clientId": 1,
  "type": "No Internet",
  "description": "Cliente reporta sin servicio desde ayer",
  "startTime": "2025-11-26T10:00:00Z"
}`,
            example: `curl -X POST "http://localhost:3001/api/service-outages" \\
-H "Authorization: Bearer ${token}" \\
-H "Content-Type: application/json" \\
-d '{
  "clientId": 1,
  "type": "No Internet",
  "description": "Cliente reporta sin servicio desde ayer",
  "startTime": "2025-11-26T10:00:00Z"
}'`
        },

        // --- DASHBOARD ---
        {
            method: 'GET',
            path: '/api/dashboard/stats',
            description: 'Obtener estadísticas del tablero',
            params: 'month (0-11), year (YYYY)',
            example: `curl -X GET "http://localhost:3001/api/dashboard/stats?month=10&year=2025" \\
-H "Authorization: Bearer ${token}"`
        },

        // --- N8N INTEGRATION ---
        {
            method: 'GET',
            path: '/api/n8n/payment-reminders',
            description: '[N8N] Listar clientes/saldos para notificaciones de cobranza (WhatsApp)',
            params: 'paymentStatus (pay [pendientes+vencidos] | paid | all), clientStatus (active | inactive | all), sentFilter (true/false: excluir si ya enviado este mes), month (Ej: FEBRERO), year (2026)',
            example: `curl -X GET "http://localhost:3001/api/n8n/payment-reminders?paymentStatus=pay&sentFilter=false&month=FEBRERO&year=2026" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'POST',
            path: '/api/n8n/mark-sent',
            description: '[N8N] Marcar recordatorio como enviado',
            body: `{
  "clientId": 1,
  "type": "whatsapp",
  "result": "success"
}`,
            example: `curl -X POST "http://localhost:3001/api/n8n/mark-sent" \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer ${token}" \\
-d '{
  "clientId": 1,
  "type": "whatsapp",
  "result": "success"
}'`
        },
        {
            method: 'GET',
            path: '/api/n8n/suspension-candidates',
            description: '[N8N] Obtener clientes para suspensión automática (día 6)',
            example: `curl -X GET "http://localhost:3001/api/n8n/suspension-candidates" \\
-H "Authorization: Bearer ${token}"`
        },
        {
            method: 'POST',
            path: '/api/n8n/register-payment',
            description: '[WEBHOOK] Registrar pago (Requiere Phone para identificar cliente)',
            body: `{
  "phone": "573001234567",
  "amount": 50000,
  "reference": "REF123", 
  "paymentMethod": "nequi",
  "date": "2025-02-20T10:00:00Z"
}`,
            example: `curl -X POST "http://localhost:3001/api/n8n/register-payment" \\
-H "Content-Type: application/json" \\
-H "x-api-key: TU_API_KEY_N8N" \\
-d '{
  "phone": "573001234567",
  "amount": 50000,
  "reference": "REF123",
  "paymentMethod": "nequi"
}'`
        },

        // --- OLT CONTROL ---
        {
            method: 'POST',
            path: '/api/olt/service/:id',
            description: '[N8N/MANUAL] Activar o Suspender servicio en OLT',
            params: ':id (Installation ID)',
            body: `{
  "action": "enable" // o "disable"
}`,
            example: `curl -X POST "http://localhost:3001/api/olt/service/123" \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer ${token}" \\
-d '{
  "action": "disable"
}'`
        },
        {
            method: 'POST',
            path: '/api/olt/reboot/:id',
            description: '[N8N/MANUAL] Reiniciar ONU en OLT',
            params: ':id (Installation ID)',
            example: `curl -X POST "http://localhost:3001/api/olt/reboot/123" \\
-H "Authorization: Bearer ${token}"`
        }
    ];

    const getMethodColor = (method: string) => {
        switch (method) {
            case 'GET': return 'primary';
            case 'POST': return 'success';
            case 'PUT': return 'warning';
            case 'DELETE': return 'error';
            default: return 'default';
        }
    };

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Acceso API y Documentación
            </Typography>
            
            <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                    Tu Token de Acceso (Bearer Token)
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                    Utiliza este token en el encabezado <code>Authorization</code> de tus peticiones HTTP.
                    El formato debe ser: <code>Bearer TU_TOKEN</code>.
                </Typography>
                
                <Box display="flex" gap={2} alignItems="center">
                    <TextField
                        fullWidth
                        value={token}
                        InputProps={{
                            readOnly: true,
                        }}
                        variant="outlined"
                        size="small"
                    />
                    <Button 
                        variant="contained" 
                        startIcon={<ContentCopyIcon />}
                        onClick={handleCopyToken}
                        sx={{ minWidth: 120 }}
                    >
                        Copiar
                    </Button>
                    <Button 
                        variant="outlined" 
                        color="secondary"
                        startIcon={<RefreshIcon />}
                        onClick={handleRefreshToken}
                        sx={{ minWidth: 140 }}
                    >
                        Regenerar
                    </Button>
                </Box>
            </Paper>

            <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>
                Endpoints Disponibles
            </Typography>

            {endpoints.map((endpoint, index) => (
                <Accordion key={index}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                            <Chip 
                                label={endpoint.method} 
                                color={getMethodColor(endpoint.method) as any} 
                                size="small" 
                                sx={{ minWidth: 60, fontWeight: 'bold' }}
                            />
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                {endpoint.path}
                            </Typography>
                            <Typography color="textSecondary" sx={{ ml: 'auto', mr: 2 }}>
                                {endpoint.description}
                            </Typography>
                        </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {endpoint.params && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>Parámetros Query:</Typography>
                                    <Paper variant="outlined" sx={{ p: 1, bgcolor: '#f5f5f5' }}>
                                        <code>{endpoint.params}</code>
                                    </Paper>
                                </Box>
                            )}
                            
                            {endpoint.body && (
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>Cuerpo de la Petición (JSON):</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', overflowX: 'auto' }}>
                                        <pre style={{ margin: 0 }}>{endpoint.body}</pre>
                                    </Paper>
                                </Box>
                            )}

                            <Box>
                                <Typography variant="subtitle2" gutterBottom>Ejemplo cURL:</Typography>
                                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#1e1e1e', color: '#d4d4d4', overflowX: 'auto' }}>
                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{endpoint.example}</pre>
                                </Paper>
                            </Box>
                        </Box>
                    </AccordionDetails>
                </Accordion>
            ))}

            <Snackbar 
                open={snackbarOpen} 
                autoHideDuration={3000} 
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSnackbarOpen(false)} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ApiAccess;
