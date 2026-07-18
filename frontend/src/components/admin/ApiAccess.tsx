import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Snackbar,
  Alert,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  InputAdornment,
  Divider,
  Tooltip,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  Refresh as RefreshIcon,
  VpnKey as VpnKeyIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Router as RouterIcon,
  Dashboard as DashboardIcon,
  Hub as HubIcon,
  SettingsRemote as OltIcon,
  CardMembership as PlanIcon,
  ReportProblem as OutageIcon,
  ExpandMore as ExpandMoreIcon,
  Lock as LockIcon,
  Key as KeyIcon,
  Public as PublicIcon,
} from '@mui/icons-material';
import AuthService from '../../services/AuthService';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

type ParamRow = { param: string; values: string; description: string };
type ResponseField = { field: string; type: string; description: string };

type Endpoint = {
  method: HttpMethod;
  path: string;
  description: string;
  auth?: 'jwt' | 'apiKey' | 'public';
  params?: string;
  paramTable?: ParamRow[];
  responseFields?: ResponseField[];
  body?: string;
  example: string;
};

type Service = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactElement<{ sx?: any }>;
  accent: string;
  endpoints: Endpoint[];
};

const API_BASE = 'https://imvcrm-bknd.duckdns.org';

const SERVICES: Service[] = [
  {
    id: 'auth',
    name: 'Autenticación',
    description: 'Inicio de sesión y datos del usuario actual',
    icon: <VpnKeyIcon />,
    accent: '#2D5BFF',
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Iniciar sesión (obtener token JWT)',
        auth: 'public',
        body: `{
  "email": "admin@example.com",
  "password": "password123"
}`,
        example: `curl -X POST "${API_BASE}/api/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'`,
      },
      {
        method: 'GET',
        path: '/api/auth/me',
        description: 'Obtener información del usuario actual',
        auth: 'jwt',
        example: `curl -X GET "${API_BASE}/api/auth/me" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
    ],
  },
  {
    id: 'clients',
    name: 'Clientes',
    description: 'CRUD y consultas sobre clientes',
    icon: <PeopleIcon />,
    accent: '#00D4A6',
    endpoints: [
      {
        method: 'GET',
        path: '/api/clients',
        description: 'Lista paginada de clientes',
        auth: 'jwt',
        params: 'page (number), limit (number), search (string, nombre/cédula), status (active | suspended | retired)',
        example: `curl -X GET "${API_BASE}/api/clients?page=1&limit=10&search=Juan&status=active" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'GET',
        path: '/api/clients/:id',
        description: 'Detalle de un cliente (por ID o cédula)',
        auth: 'jwt',
        example: `curl -X GET "${API_BASE}/api/clients/123456789" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'POST',
        path: '/api/clients',
        description: 'Crear un nuevo cliente',
        auth: 'jwt',
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
        example: `curl -X POST "${API_BASE}/api/clients" \\
  -H "Authorization: Bearer \${TOKEN}" \\
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
  }'`,
      },
      {
        method: 'PUT',
        path: '/api/clients/:id',
        description: 'Actualizar un cliente existente',
        auth: 'jwt',
        body: `{
  "phone": "3009999999",
  "status": "suspendido"
}`,
        example: `curl -X PUT "${API_BASE}/api/clients/1" \
  -H "Authorization: Bearer \${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "3009999999",
    "status": "suspendido"
  }'`,
      },
    ],
  },
  {
    id: 'billing',
    name: 'Facturación',
    description: 'Facturación mensual, pagos y consulta pública',
    icon: <ReceiptIcon />,
    accent: '#F0A23A',
    endpoints: [
      {
        method: 'GET',
        path: '/api/monthly-billing',
        description: 'Facturación mensual',
        auth: 'jwt',
        params: 'month (nombre o index), year (YYYY), status (pending | overdue | paid), viewMode (cumulative)',
        example: `curl -X GET "${API_BASE}/api/monthly-billing?month=Febrero&year=2025&status=pending&viewMode=cumulative" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'GET',
        path: '/api/monthly-billing/client/:id/pending',
        description: 'Pagos pendientes de un cliente (por ID o cédula)',
        auth: 'jwt',
        example: `curl -X GET "${API_BASE}/api/monthly-billing/client/123456789/pending" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'GET',
        path: '/api/public/billing/:identificationNumber',
        description: 'Consulta pública de facturación (sin token)',
        auth: 'public',
        example: `curl -X GET "${API_BASE}/api/public/billing/123456789"`,
      },
      {
        method: 'PUT',
        path: '/api/monthly-billing/:id/pay',
        description: 'Registrar pago de una factura',
        auth: 'jwt',
        body: `{
  "amount": 50000,
  "paymentMethod": "cash",
  "reference": "REF123"
}`,
        example: `curl -X PUT "${API_BASE}/api/monthly-billing/105/pay" \\
  -H "Authorization: Bearer \${TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 50000,
    "paymentMethod": "cash",
    "reference": "REF123"
  }'`,
      },
    ],
  },
  {
    id: 'installations',
    name: 'Instalaciones',
    description: 'Gestión y búsqueda de instalaciones',
    icon: <RouterIcon />,
    accent: '#3DA5F5',
    endpoints: [
      {
        method: 'GET',
        path: '/api/installations',
        description: 'Lista de instalaciones',
        auth: 'jwt',
        params: 'status (pending | completed | cancelled)',
        example: `curl -X GET "${API_BASE}/api/installations?status=pending" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'GET',
        path: '/api/installations/search/onu/:serial',
        description: 'Buscar instalación por serial de ONU',
        auth: 'jwt',
        params: ':serial (String exacto del serial ONU)',
        example: `curl -X GET "${API_BASE}/api/installations/search/onu/DF51A6B759A5" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'GET',
        path: '/api/installations/search/label/:label',
        description: 'Buscar instalaciones por etiqueta NAP',
        auth: 'jwt',
        params: ':label (String parcial o exacto de la etiqueta)',
        example: `curl -X GET "${API_BASE}/api/installations/search/label/Caja-15" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
    ],
  },
  {
    id: 'plans',
    name: 'Planes de servicio',
    description: 'Planes activos del sistema',
    icon: <PlanIcon />,
    accent: '#8B5CF6',
    endpoints: [
      {
        method: 'GET',
        path: '/api/service-plans/active',
        description: 'Listar planes de servicio activos',
        auth: 'jwt',
        example: `curl -X GET "${API_BASE}/api/service-plans/active" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
    ],
  },
  {
    id: 'outages',
    name: 'Caídas de servicio',
    description: 'Reportes de fallas de clientes',
    icon: <OutageIcon />,
    accent: '#E5484D',
    endpoints: [
      {
        method: 'GET',
        path: '/api/service-outages',
        description: 'Listar reportes de fallas',
        auth: 'jwt',
        example: `curl -X GET "${API_BASE}/api/service-outages" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
      {
        method: 'POST',
        path: '/api/service-outages',
        description: 'Reportar una nueva falla',
        auth: 'jwt',
        body: `{
  "clientId": 1,
  "type": "No Internet",
  "description": "Cliente reporta sin servicio desde ayer",
  "startTime": "2025-11-26T10:00:00Z"
}`,
        example: `curl -X POST "${API_BASE}/api/service-outages" \\
  -H "Authorization: Bearer \${TOKEN}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": 1,
    "type": "No Internet",
    "description": "Cliente reporta sin servicio desde ayer",
    "startTime": "2025-11-26T10:00:00Z"
  }'`,
      },
    ],
  },
  {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Estadísticas del tablero principal',
    icon: <DashboardIcon />,
    accent: '#2D5BFF',
    endpoints: [
      {
        method: 'GET',
        path: '/api/dashboard/stats',
        description: 'Obtener estadísticas del tablero',
        auth: 'jwt',
        params: 'month (0-11), year (YYYY)',
        example: `curl -X GET "${API_BASE}/api/dashboard/stats?month=10&year=2025" \\
  -H "Authorization: Bearer \${TOKEN}"`,
      },
    ],
  },
  {
    id: 'n8n',
    name: 'N8N / Webhooks',
    description: 'Integraciones con N8N (requieren header x-api-key)',
    icon: <HubIcon />,
    accent: '#EC4899',
    endpoints: [
      {
        method: 'GET',
        path: '/api/n8n/payment-reminders',
        description: 'Clientes y saldos para recordatorios de cobranza (WhatsApp)',
        auth: 'apiKey',
        params: 'reminderType, paymentStatus, clientStatus, sentFilter, month, year',
        paramTable: [
          { param: 'reminderType', values: 'PROXIMO | VENCIDO | ULTIMO | PAGADO', description: 'Filtra por tipo de recordatorio. PROXIMO aún no vence, VENCIDO dentro del rango, ULTIMO muy atrasado, PAGADO ya cancelado.' },
          { param: 'paymentStatus', values: 'pending | overdue | paid', description: 'pending: no pagados. overdue: superaron la fecha límite. paid/approved: ya pagados.' },
          { param: 'clientStatus', values: 'active (default) | inactive | all', description: 'Estado del cliente. Por defecto solo activos.' },
          { param: 'sentFilter', values: 'YES / NO', description: 'YES: ya recibieron recordatorio. NO: aún no.' },
          { param: 'month', values: 'ENERO, FEBRERO ... DICIEMBRE', description: 'Mes a consultar en mayúsculas. Por defecto: mes actual.' },
          { param: 'year', values: 'Ej: 2026', description: 'Año a consultar. Por defecto: año actual.' },
        ],
        responseFields: [
          { field: 'ID Cliente', type: 'string', description: 'Identificador CL-XXXX del cliente.' },
          { field: 'Nombre Completo', type: 'string', description: 'Nombre completo del cliente.' },
          { field: 'Celular 1 / Celular 2', type: 'string', description: 'Teléfonos con código 57 (formato WhatsApp).' },
          { field: 'PLAN', type: 'string', description: 'Nombre del plan de servicio.' },
          { field: 'MES / FECHA_LIMITE', type: 'string', description: 'Mes de facturación y fecha límite de pago.' },
          { field: 'DIAS', type: 'number', description: 'Días transcurridos desde el vencimiento. 0 si ya pagó.' },
          { field: 'VALOR', type: 'number', description: 'Valor de la mensualidad (posiblemente prorrateado).' },
          { field: 'ADICIONAL', type: 'number', description: 'Suma de servicios adicionales + cuotas pendientes.' },
          { field: 'DETALLE_ADICIONAL', type: 'string', description: 'Nombres de servicios/productos adicionales.' },
          { field: 'TIPO', type: 'string', description: 'PROXIMO | VENCIDO | ULTIMO | PAGADO.' },
          { field: 'DESCUENTO_CORTE', type: 'number', description: 'Descuento en $ por caídas de servicio del mes.' },
          { field: 'DIAS_CORTE', type: 'number', description: 'Total de días sin servicio en el mes.' },
          { field: 'DETALLE_CORTE', type: 'string', description: 'Detalle de cada caída con fechas y monto.' },
          { field: 'ENVIADO', type: 'string', description: 'YES si ya se envió, NO si aún no.' },
          { field: 'estado_pago', type: 'string', description: 'pending | overdue | approved | paid.' },
          { field: 'installation_id', type: 'number', description: 'ID de la instalación asociada.' },
        ],
        example: `# Vencidos sin recordatorio:
curl -X GET "${API_BASE}/api/n8n/payment-reminders?reminderType=VENCIDO&sentFilter=NO" \\
  -H "x-api-key: TU_API_KEY_N8N"

# No pagados del mes actual:
curl -X GET "${API_BASE}/api/n8n/payment-reminders?paymentStatus=overdue" \\
  -H "x-api-key: TU_API_KEY_N8N"

# Mes específico:
curl -X GET "${API_BASE}/api/n8n/payment-reminders?month=FEBRERO&year=2026&paymentStatus=pending" \\
  -H "x-api-key: TU_API_KEY_N8N"`,
      },
      {
        method: 'POST',
        path: '/api/n8n/mark-sent',
        description: 'Marcar recordatorio como enviado',
        auth: 'apiKey',
        body: `{
  "clientId": 1,
  "type": "whatsapp",
  "result": "success"
}`,
        example: `curl -X POST "${API_BASE}/api/n8n/mark-sent" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: TU_API_KEY_N8N" \\
  -d '{
    "clientId": 1,
    "type": "whatsapp",
    "result": "success"
  }'`,
      },
      {
        method: 'GET',
        path: '/api/n8n/suspension-candidates',
        description: 'Clientes para suspensión automática (día 6)',
        auth: 'apiKey',
        example: `curl -X GET "${API_BASE}/api/n8n/suspension-candidates" \\
  -H "x-api-key: TU_API_KEY_N8N"`,
      },
      {
        method: 'POST',
        path: '/api/n8n/register-payment',
        description: 'Registrar pago (requiere phone para identificar cliente)',
        auth: 'apiKey',
        body: `{
  "phone": "573001234567",
  "amount": 50000,
  "reference": "REF123",
  "paymentMethod": "nequi",
  "date": "2025-02-20T10:00:00Z"
}`,
        example: `curl -X POST "${API_BASE}/api/n8n/register-payment" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: TU_API_KEY_N8N" \\
  -d '{
    "phone": "573001234567",
    "amount": 50000,
    "reference": "REF123",
    "paymentMethod": "nequi"
  }'`,
      },
    ],
  },
  {
    id: 'olt',
    name: 'OLT Control',
    description: 'Activación, suspensión y reinicio de ONUs',
    icon: <OltIcon />,
    accent: '#14B8A6',
    endpoints: [
      {
        method: 'POST',
        path: '/api/olt/service/:id',
        description: 'Activar o suspender servicio en OLT',
        auth: 'apiKey',
        params: ':id (Installation ID)',
        body: `{
  "action": "enable" // o "disable"
}`,
        example: `curl -X POST "${API_BASE}/api/olt/service/123" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: TU_API_KEY_N8N" \\
  -d '{
    "action": "disable"
  }'`,
      },
      {
        method: 'POST',
        path: '/api/olt/reboot/:id',
        description: 'Reiniciar ONU en OLT',
        auth: 'apiKey',
        params: ':id (Installation ID)',
        example: `curl -X POST "${API_BASE}/api/olt/reboot/123" \\
  -H "x-api-key: TU_API_KEY_N8N"`,
      },
    ],
  },
];

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE'];

const methodStyles: Record<HttpMethod, { bg: string; color: string; border: string }> = {
  GET:    { bg: 'rgba(61,165,245,0.12)',  color: '#1E6FB8', border: 'rgba(61,165,245,0.35)' },
  POST:   { bg: 'rgba(0,212,166,0.14)',   color: '#0E8C6E', border: 'rgba(0,212,166,0.40)' },
  PUT:    { bg: 'rgba(240,162,58,0.14)',  color: '#B3680F', border: 'rgba(240,162,58,0.40)' },
  DELETE: { bg: 'rgba(229,72,77,0.14)',   color: '#B7202A', border: 'rgba(229,72,77,0.40)' },
  PATCH:  { bg: 'rgba(139,92,246,0.14)',  color: '#6B3FC9', border: 'rgba(139,92,246,0.40)' },
};

const authBadge = (auth: Endpoint['auth']) => {
  if (auth === 'apiKey') return { label: 'API KEY', icon: <KeyIcon sx={{ fontSize: 12 }} />, color: '#EC4899' };
  if (auth === 'public') return { label: 'PÚBLICO', icon: <PublicIcon sx={{ fontSize: 12 }} />, color: '#6B7290' };
  return { label: 'JWT', icon: <LockIcon sx={{ fontSize: 12 }} />, color: '#2D5BFF' };
};

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <Box
      sx={{
        position: 'relative',
        bgcolor: '#0B1020',
        color: '#E6E9F5',
        borderRadius: 2,
        border: '1px solid rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, py: 0.5, bgcolor: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.65rem', color: 'rgba(230,233,245,0.55)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {language ?? 'cURL'}
        </Typography>
        <Tooltip title={copied ? 'Copiado' : 'Copiar al portapapeles'}>
          <IconButton size="small" onClick={handleCopy} sx={{ color: 'rgba(230,233,245,0.7)' }}>
            <ContentCopyIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box sx={{ p: 1.5, overflowX: 'auto' }}>
        <pre style={{ margin: 0, fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem', lineHeight: 1.55, whiteSpace: 'pre' }}>
          {code}
        </pre>
      </Box>
    </Box>
  );
};

const MethodChip: React.FC<{ method: HttpMethod }> = ({ method }) => {
  const s = methodStyles[method];
  return (
    <Chip
      label={method}
      size="small"
      sx={{
        bgcolor: s.bg,
        color: s.color,
        border: `1px solid ${s.border}`,
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        fontSize: '0.65rem',
        height: 22,
        letterSpacing: '0.04em',
        minWidth: 56,
      }}
    />
  );
};

const AuthBadge: React.FC<{ auth: Endpoint['auth'] }> = ({ auth }) => {
  const b = authBadge(auth);
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        px: 0.9,
        py: 0.3,
        borderRadius: 999,
        bgcolor: `${b.color}14`,
        border: `1px solid ${b.color}33`,
        color: b.color,
        fontSize: '0.62rem',
        fontWeight: 700,
        letterSpacing: '0.1em',
      }}
    >
      {b.icon}
      {b.label}
    </Box>
  );
};

const EndpointRow: React.FC<{ endpoint: Endpoint; defaultOpen?: boolean }> = ({ endpoint, defaultOpen = false }) => {
  const [open, setOpen] = useState(defaultOpen);
  const m = methodStyles[endpoint.method];
  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: open ? `${m.border}` : 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        transition: 'border-color 160ms ease, box-shadow 160ms ease',
        '&:hover': { borderColor: `${m.border}` },
      }}
    >
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2,
          py: 1.25,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <MethodChip method={endpoint.method} />
        <Typography
          sx={{
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '0.82rem',
            fontWeight: 600,
            color: 'text.primary',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {endpoint.path}
        </Typography>
        <AuthBadge auth={endpoint.auth} />
        <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'none', md: 'block' }, maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {endpoint.description}
        </Typography>
        <ExpandMoreIcon
          sx={{
            transition: 'transform 160ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'text.secondary',
            fontSize: 20,
          }}
        />
      </Box>
      <Collapse in={open} unmountOnExit>
        <Divider />
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: 'rgba(45,91,255,0.02)' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{endpoint.description}</Typography>

          {endpoint.params && (
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Parámetros</Typography>
              <Paper variant="outlined" sx={{ p: 1.5, mt: 0.5, bgcolor: 'rgba(45,91,255,0.03)', borderStyle: 'dashed' }}>
                <Typography component="code" sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                  {endpoint.params}
                </Typography>
              </Paper>
            </Box>
          )}

          {endpoint.paramTable && (
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Detalle de parámetros</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(45,91,255,0.04)' }}>
                      <TableCell sx={{ fontWeight: 700, width: 160 }}>Parámetro</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 260 }}>Valores</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {endpoint.paramTable.map((row, i) => (
                      <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><code style={{ color: '#2D5BFF', fontWeight: 600 }}>{row.param}</code></TableCell>
                        <TableCell><code style={{ fontSize: '0.78rem' }}>{row.values}</code></TableCell>
                        <TableCell><Typography variant="body2">{row.description}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {endpoint.body && (
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Cuerpo de la petición (JSON)</Typography>
              <Box sx={{ mt: 0.5 }}>
                <CodeBlock code={endpoint.body} language="JSON" />
              </Box>
            </Box>
          )}

          {endpoint.responseFields && (
            <Box>
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>Campos de la respuesta</Typography>
              <TableContainer component={Paper} variant="outlined" sx={{ mt: 0.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'rgba(0,212,166,0.05)' }}>
                      <TableCell sx={{ fontWeight: 700, width: 200 }}>Campo</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 100 }}>Tipo</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Descripción</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {endpoint.responseFields.map((row, i) => (
                      <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell><code style={{ color: '#0E8C6E', fontWeight: 600 }}>{row.field}</code></TableCell>
                        <TableCell><code style={{ fontSize: '0.78rem', color: '#6B3FC9' }}>{row.type}</code></TableCell>
                        <TableCell><Typography variant="body2">{row.description}</Typography></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Box>
            <Typography variant="overline" sx={{ color: 'text.secondary' }}>Ejemplo cURL</Typography>
            <Box sx={{ mt: 0.5 }}>
              <CodeBlock code={endpoint.example} language="cURL" />
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
};

const ServiceCard: React.FC<{ service: Service; defaultOpen?: boolean }> = ({ service, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen);
  const count = service.endpoints.length;
  return (
    <Paper
      sx={{
        p: 0,
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        backgroundImage: 'none',
      }}
    >
      <Box
        onClick={() => setOpen(!open)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: 2.5,
          py: 2,
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: open ? '1px solid' : 'none',
          borderColor: 'divider',
          transition: 'background 160ms ease',
          '&:hover': { bgcolor: 'rgba(45,91,255,0.03)' },
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: `${service.accent}14`,
            color: service.accent,
            border: `1px solid ${service.accent}33`,
            flexShrink: 0,
          }}
        >
          {React.cloneElement(service.icon, { sx: { fontSize: 22 } })}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 700 }}>{service.name}</Typography>
            <Chip
              label={`${count} endpoint${count === 1 ? '' : 's'}`}
              size="small"
              sx={{
                bgcolor: `${service.accent}14`,
                color: service.accent,
                border: `1px solid ${service.accent}33`,
                height: 20,
                fontSize: '0.65rem',
                fontWeight: 700,
                letterSpacing: '0.04em',
              }}
            />
          </Box>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>{service.description}</Typography>
        </Box>
        <ExpandMoreIcon
          sx={{
            transition: 'transform 160ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            color: 'text.secondary',
          }}
        />
      </Box>
      <Collapse in={open} unmountOnExit>
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.25, bgcolor: 'rgba(14,19,48,0.015)' }}>
          {service.endpoints.map((ep, i) => (
            <EndpointRow key={i} endpoint={ep} defaultOpen={false} />
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
};

const ApiAccess: React.FC = () => {
  const [token, setToken] = useState(AuthService.getAccessToken() || '');
  const [snackbar, setSnackbar] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({ open: false, msg: '', severity: 'success' });
  const [search, setSearch] = useState('');
  const [methodFilters, setMethodFilters] = useState<Set<HttpMethod>>(new Set());

  const handleCopyToken = () => {
    navigator.clipboard.writeText(token);
    setSnackbar({ open: true, msg: 'Token copiado al portapapeles', severity: 'success' });
  };

  const handleRefreshToken = async () => {
    try {
      const newToken = await AuthService.refreshAccessToken();
      if (newToken) {
        setToken(newToken);
        setSnackbar({ open: true, msg: 'Token regenerado exitosamente', severity: 'success' });
      } else {
        setSnackbar({ open: true, msg: 'No se pudo regenerar el token. Tu sesión puede haber expirado.', severity: 'error' });
      }
    } catch {
      setSnackbar({ open: true, msg: 'Error al regenerar el token', severity: 'error' });
    }
  };

  const toggleMethod = (m: HttpMethod) => {
    setMethodFilters((prev) => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m); else next.add(m);
      return next;
    });
  };

  const filteredServices = useMemo(() => {
    const q = search.trim().toLowerCase();
    return SERVICES
      .map((s) => ({
        ...s,
        endpoints: s.endpoints.filter((e) => {
          if (methodFilters.size > 0 && !methodFilters.has(e.method)) return false;
          if (!q) return true;
          return (
            e.path.toLowerCase().includes(q) ||
            e.description.toLowerCase().includes(q) ||
            s.name.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((s) => s.endpoints.length > 0);
  }, [search, methodFilters]);

  const totalEndpoints = SERVICES.reduce((acc, s) => acc + s.endpoints.length, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header */}
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Acceso API</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
          Documentación de los {totalEndpoints} endpoints disponibles en {SERVICES.length} servicios.
        </Typography>
      </Box>

      {/* Token card */}
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, display: 'grid', placeItems: 'center', bgcolor: 'rgba(45,91,255,0.10)', color: 'primary.main' }}>
            <VpnKeyIcon sx={{ fontSize: 20 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontSize: '0.95rem', fontWeight: 700 }}>Bearer Token</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Úsalo en el header <code>Authorization: Bearer &lt;token&gt;</code>
            </Typography>
          </Box>
        </Box>
        <TextField
          fullWidth
          value={token}
          InputProps={{
            readOnly: true,
            sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' },
          }}
          variant="outlined"
          size="small"
        />
        <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
          <Button variant="contained" startIcon={<ContentCopyIcon />} onClick={handleCopyToken}>
            Copiar token
          </Button>
          <Button variant="outlined" color="secondary" startIcon={<RefreshIcon />} onClick={handleRefreshToken}>
            Regenerar
          </Button>
        </Box>
      </Paper>

      {/* Search + filter */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            placeholder="Buscar por path, servicio o descripción…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flex: 1, minWidth: 240 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
          <Box sx={{ display: 'flex', gap: 0.75, alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5, fontWeight: 600 }}>Método:</Typography>
            {METHODS.map((m) => {
              const active = methodFilters.has(m);
              const s = methodStyles[m];
              return (
                <Chip
                  key={m}
                  label={m}
                  onClick={() => toggleMethod(m)}
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontWeight: 700,
                    fontSize: '0.65rem',
                    height: 26,
                    cursor: 'pointer',
                    bgcolor: active ? s.color : s.bg,
                    color: active ? '#fff' : s.color,
                    border: `1px solid ${s.border}`,
                    '&:hover': { bgcolor: active ? s.color : `${s.color}22` },
                    transition: 'all 140ms ease',
                  }}
                />
              );
            })}
            {(search || methodFilters.size > 0) && (
              <Button size="small" onClick={() => { setSearch(''); setMethodFilters(new Set()); }} sx={{ ml: 0.5 }}>
                Limpiar
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Services list */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {filteredServices.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              No se encontraron endpoints con los filtros actuales.
            </Typography>
          </Paper>
        ) : (
          filteredServices.map((service) => <ServiceCard key={service.id} service={service} />)
        )}
      </Box>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ApiAccess;
