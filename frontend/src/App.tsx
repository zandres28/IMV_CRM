import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  Typography, 
  Container, 
  Button, 
  Menu, 
  MenuItem, 
  IconButton, 
  Drawer, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon, 
  Divider, 
  useTheme, 
  useMediaQuery,
  Collapse,
  Chip,
  ListSubheader,
  Tooltip,
  Avatar,
  InputBase
} from '@mui/material';
import { 
  KeyboardArrowDown, 
  AccountCircle, 
  Logout, 
  Dashboard as DashboardIcon, 
  Menu as MenuIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Router as RouterIcon,
  Search as SearchIcon,
  ExpandLess,
  ExpandMore,
  Settings as SettingsIcon,
  AccountTree as EnvironmentIcon,
  Notifications as NotificationsIcon,
  HelpOutline as HelpIcon,
  Lan as NetworkIcon,
  BarChart as ReportsIcon,
  SupportAgent as SupportIcon,
  Inventory as ProductsIcon,
  Payment as PaymentIcon,
  PointOfSale as FastSaleIcon,
  Settings as SystemIcon,
  Home as HomeIcon,
  ArrowForwardIos as ArrowIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  SyncAlt as TransferIcon,
  Build as ParameterIcon,
  PeopleAlt as UsersIcon,
  Handyman as TechnicianIcon,
  Assessment as ChartIcon,
  Code as ApiIcon,
  Image as ImageIcon
} from '@mui/icons-material';
import AuthService from './services/AuthService';
import axios from 'axios';

import SessionTimeoutHandler from './components/SessionTimeoutHandler';
import jwt_decode from 'jwt-decode';

const ENVIRONMENTS = [
  { id: 'prod', name: 'Producción (IMV)', color: '#1976d2' },
  { id: 'test', name: 'Entorno de Pruebas', color: '#ed6c02' },
  { id: 'dev', name: 'Desarrollo Local', color: '#9c27b0' }
];

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [clientsMenuAnchor, setClientsMenuAnchor] = useState<null | HTMLElement>(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Environment state (default to prod or from localStorage)
  const [currentEnv, setCurrentEnv] = useState(() => {
    const saved = localStorage.getItem('crm_env');
    return ENVIRONMENTS.find(e => e.id === saved) || ENVIRONMENTS[0];
  });
  
  // Mobile menu states
  const [mobileClientsOpen, setMobileClientsOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);
  const [paramsOpen, setParamsOpen] = useState(false);

  const user = AuthService.getCurrentUser();

  const getPageTitle = (path: string) => {
    if (path.includes('/dashboard')) return 'Panel Principal';
    if (path.includes('/clients')) return 'Gestión de Clientes';
    if (path.includes('/installation-billing')) return 'Facturación de Instalaciones';
    if (path.includes('/interactions')) return 'Solicitudes CRM';
    if (path.includes('/service-outages')) return 'Caídas de Servicio';
    if (path.includes('/service-transfers')) return 'Traslados';
    if (path.includes('/network/mikrotik')) return 'Monitor Mikrotik';
    if (path.includes('/billing')) return 'Centro de Facturación';
    if (path.includes('/consultas')) return 'Consultas Avanzadas';
    if (path.includes('/admin/users')) return 'Gestión de Usuarios';
    if (path.includes('/admin/roles')) return 'Roles y Permisos';
    if (path.includes('/admin/settings')) return 'Configuración del Sistema';
    if (path.includes('/admin/api-access')) return 'Accesos API';
    if (path.includes('/admin/service-plans')) return 'Planes de Servicio';
    if (path.includes('/admin/technicians')) return 'Gestión de Técnicos';
    if (path.includes('/admin/promotions')) return 'Gestor de Imágenes Promocionales';
    if (path.includes('/admin/interaction-types')) return 'Tipos de Interacción';
    
    return 'Nexum CRM';
  };

  const handleEnvChange = (env: typeof ENVIRONMENTS[0]) => {
    setCurrentEnv(env);
    localStorage.setItem('crm_env', env.id);
    handleAdminMenuClose();
    // Opcional: recargar datos o mostrar notificación
  };

  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = AuthService.getAccessToken();
      if (!token) {
        AuthService.logout();
        window.location.href = '/login';
        return;
      }
      try {
        const decoded: any = jwt_decode(token);
        if (decoded.exp && Date.now() >= decoded.exp * 1000) {
          AuthService.logout();
          window.location.href = '/login';
        }
      } catch (e) {
        AuthService.logout();
        window.location.href = '/login';
      }
    };

    checkTokenExpiry();

    // Verificar cuando la pestaña se vuelve visible o al navegar
    const onVisibility = () => {
      if (document.visibilityState === 'visible') checkTokenExpiry();
    };
    window.addEventListener('focus', checkTokenExpiry);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', checkTokenExpiry);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleClientsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setClientsMenuAnchor(event.currentTarget);
  };

  const handleClientsMenuClose = () => {
    setClientsMenuAnchor(null);
  };

  const handleAdminMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAdminMenuAnchor(event.currentTarget);
  };

  const handleAdminMenuClose = () => {
    setAdminMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const isClientsActive = location.pathname.startsWith('/clients') || 
                          location.pathname.startsWith('/interactions') ||
                          location.pathname.startsWith('/service-outages');

  const isAdminActive = location.pathname.startsWith('/admin');

  const drawerWidth = drawerCollapsed ? 0 : 240;

  const drawer = (
    <Box sx={{ p: 0, height: '100%', overflowX: 'hidden' }}>
      {/* Brand Logo sticky */}
      <Box sx={{ 
        p: 2, 
        mb: 2, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        height: 70,
        position: 'sticky',
        top: 0,
        zIndex: 2,
        bgcolor: 'background.default'
      }}>
        <Box 
          component="img" 
          src="/nexum_logo.png" 
          alt="Nexum Logo" 
          sx={{ maxHeight: 50, maxWidth: '100%', objectFit: 'contain' }} 
        />
      </Box

      <List sx={{ px: 1 }}>
        <ListItem button component={Link} to="/dashboard" onClick={handleDrawerToggle} selected={location.pathname === '/dashboard'}>
          <ListItemIcon><DashboardIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="INICIO" primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 700 } }} />
        </ListItem>
        {/* La subcabecera CLIENTES ya no es sticky, solo normal */}
        <ListSubheader sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: '0.65rem', mt: 2, mb: 1, position: 'static' }}>
          CLIENTES
        </ListSubheader>
        
        {AuthService.hasPermission('clients.list.view') && (
          <ListItem button component={Link} to="/clients" onClick={handleDrawerToggle} selected={location.pathname === '/clients'}>
            <ListItemIcon><PeopleIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Clientes" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          </ListItem>
        )}

        {AuthService.hasPermission('installations.view') && (
          <ListItem button component={Link} to="/installation-billing" onClick={handleDrawerToggle} selected={location.pathname === '/installation-billing'}>
            <ListItemIcon><RouterIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Instalaciones" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          </ListItem>
        )}

        {AuthService.hasPermission('clients.crm.view') && (
          <ListItem button component={Link} to="/interactions" onClick={handleDrawerToggle} selected={location.pathname === '/interactions'}>
            <ListItemIcon><SupportIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Solicitudes CRM" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          </ListItem>
        )}

        {AuthService.hasPermission('clients.outages.view') && (
          <ListItem button component={Link} to="/service-outages" onClick={handleDrawerToggle} selected={location.pathname === '/service-outages'}>
            <ListItemIcon><WarningIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Caidas de Servicio" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          </ListItem>
        )}

        <ListItem button component={Link} to="/service-transfers" onClick={handleDrawerToggle} selected={location.pathname === '/service-transfers'}>
          <ListItemIcon><TransferIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="Traslados" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
        </ListItem>

        <ListItem button component={Link} to="/solicitud" target="_blank" onClick={handleDrawerToggle}>
          <ListItemIcon><AssignmentIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="Formulario Web Solicitud" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
        </ListItem>

        <ListSubheader sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: '0.65rem', mt: 2, mb: 1 }}>
          INFRAESTRUCTURA
        </ListSubheader>

        <ListItem button component={Link} to="/network/mikrotik" onClick={handleDrawerToggle} selected={location.pathname === '/network/mikrotik'}>
          <ListItemIcon><NetworkIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="Monitor Mikrotik" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
        </ListItem>

        <ListSubheader sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: '0.65rem', mt: 2, mb: 1 }}>
          FACTURACIÓN
        </ListSubheader>
        
        {AuthService.hasPermission('billing.view') && (
          <ListItem button component={Link} to="/billing" onClick={handleDrawerToggle} selected={location.pathname === '/billing'}>
            <ListItemIcon><ReceiptIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Generar Cobros" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          </ListItem>
        )}

        <Divider sx={{ my: 2, borderColor: 'rgba(255,255,255,0.05)' }} />

        <ListItem button component={Link} to="/consultas" onClick={handleDrawerToggle} selected={location.pathname === '/consultas'}>
          <ListItemIcon><SearchIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="CONSULTAS" primaryTypographyProps={{ sx: { fontSize: '0.85rem', fontWeight: 700 } }} />
        </ListItem>

        <ListSubheader sx={{ bgcolor: 'transparent', color: 'rgba(255,255,255,0.3)', fontWeight: 800, fontSize: '0.65rem', mt: 2, mb: 1 }}>
          ADMINISTRACIÓN
        </ListSubheader>
        
        {AuthService.hasPermission('admin.users.view') && (
          <ListItem button component={Link} to="/admin/users" onClick={handleDrawerToggle} selected={location.pathname === '/admin/users'}>
            <ListItemIcon><UsersIcon sx={{ fontSize: 18 }} /></ListItemIcon>
            <ListItemText primary="Usuarios" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          </ListItem>
        )}


        {/* Submenú Configuración */}
        <ListItem button onClick={() => setConfigOpen(!configOpen)}>
          <ListItemIcon><SettingsIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="Configuración" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
          {configOpen ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
        </ListItem>
        <Collapse in={configOpen} timeout="auto" unmountOnExit>
          <List component="div" disablePadding sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
            {AuthService.hasPermission('admin.permissions.manage') && (
              <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/roles" onClick={handleDrawerToggle} selected={location.pathname === '/admin/roles'}>
                <ListItemIcon><AssignmentIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                <ListItemText primary="Roles y Permisos" primaryTypographyProps={{ sx: { fontSize: '0.75rem' } }} />
              </ListItem>
            )}
            <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/api-access" onClick={handleDrawerToggle} selected={location.pathname === '/admin/api-access'}>
              <ListItemIcon><ApiIcon sx={{ fontSize: 16 }} /></ListItemIcon>
              <ListItemText primary="Accesos API" primaryTypographyProps={{ sx: { fontSize: '0.75rem' } }} />
            </ListItem>
            <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/settings" onClick={handleDrawerToggle} selected={location.pathname === '/admin/settings'}>
              <ListItemIcon><SystemIcon sx={{ fontSize: 16 }} /></ListItemIcon>
              <ListItemText primary="Ajustes Generales" primaryTypographyProps={{ sx: { fontSize: '0.75rem' } }} />
            </ListItem>
          </List>
        </Collapse>

        <ListItem button component={Link} to="/admin/promotions" onClick={handleDrawerToggle} selected={location.pathname === '/admin/promotions'}>
          <ListItemIcon><ImageIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primary="Imágenes Promocionales" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
        </ListItem>

        {(AuthService.hasPermission('admin.plans.view') || AuthService.hasPermission('admin.technicians.view')) && (
          <>
            <ListItem button onClick={() => setParamsOpen(!paramsOpen)}>
              <ListItemIcon><ParameterIcon sx={{ fontSize: 18 }} /></ListItemIcon>
              <ListItemText primary="Parametrización" primaryTypographyProps={{ sx: { fontSize: '0.8rem' } }} />
              {paramsOpen ? <ExpandLess sx={{ fontSize: 14 }} /> : <ExpandMore sx={{ fontSize: 14 }} />}
            </ListItem>
            <Collapse in={paramsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                {AuthService.hasPermission('admin.plans.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/service-plans" onClick={handleDrawerToggle} selected={location.pathname === '/admin/service-plans'}>
                    <ListItemIcon><EnvironmentIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                    <ListItemText primary="Planes de servicio" primaryTypographyProps={{ sx: { fontSize: '0.75rem' } }} />
                  </ListItem>
                )}
                {AuthService.hasPermission('admin.technicians.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/technicians" onClick={handleDrawerToggle} selected={location.pathname === '/admin/technicians'}>
                    <ListItemIcon><TechnicianIcon sx={{ fontSize: 16 }} /></ListItemIcon>
                    <ListItemText primary="Técnicos" primaryTypographyProps={{ sx: { fontSize: '0.75rem' } }} />
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}
      </List>
      
      <Box sx={{ position: 'absolute', bottom: 10, left: 10, opacity: 0.3 }}>
        <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>ArgusBlack v3.1.5 (Nexum)</Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8f9fc' }}>
      <SessionTimeoutHandler />
      
      {/* Sidebar - Desktop Permanent, Mobile Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        open={isMobile ? mobileOpen : !drawerCollapsed}
        onClose={handleDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          flexShrink: 0,
          width: isMobile ? 'auto' : drawerWidth,
          [`& .MuiDrawer-paper`]: { 
            width: isMobile ? 240 : drawerWidth, 
            boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
          display: isMobile ? 'block' : (drawerCollapsed ? 'none' : 'flex')
        }}
      >
        {drawer}
      </Drawer>

      <Box sx={{ 
        flexGrow: 1, 
        display: 'flex', 
        flexDirection: 'column',
        width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}>
        {/* Top Header */}
        <AppBar position="static" elevation={0} sx={{ 
          bgcolor: '#fff', 
          color: '#5a5c69', 
          borderBottom: '1px solid #e3e6f0',
          height: 70, 
          justifyContent: 'center',
          boxShadow: '0 .15rem 1.75rem 0 rgba(58,59,69,.15)'
        }}>
          <Toolbar sx={{ px: 3 }}>
            <IconButton 
              color="inherit" 
              onClick={isMobile ? handleDrawerToggle : () => setDrawerCollapsed(!drawerCollapsed)} 
              edge="start" 
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#5a5c69', fontSize: '1rem', display: { xs: 'none', md: 'block' } }}>
                {getPageTitle(location.pathname)}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip 
                label={currentEnv.name} 
                size="small"
                sx={{ 
                  mr: 1, 
                  fontWeight: 800, 
                  fontSize: '0.6rem', 
                  bgcolor: currentEnv.id === 'prod' ? '#e74a3b20' : '#4e73df20',
                  color: currentEnv.id === 'prod' ? '#e74a3b' : '#4e73df',
                  border: `1px solid ${currentEnv.id === 'prod' ? '#e74a3b' : '#4e73df'}`,
                  textTransform: 'uppercase'
                }}
              />
              
              <IconButton size="small" sx={{ color: '#d1d3e2' }}>
                <NotificationsIcon fontSize="small" />
                <Box sx={{ position: 'absolute', top: 5, right: 5, width: 8, height: 8, bgcolor: '#e74a3b', borderRadius: '50%', border: '2px solid #fff' }} />
              </IconButton>
              
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 32, alignSelf: 'center', borderColor: '#e3e6f0' }} />
              
              <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleUserMenuOpen}>
                <Box sx={{ textAlign: 'right', mr: 1, display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1, fontSize: '0.8rem', color: '#5a5c69' }}>{user?.firstName || 'Usuario'}</Typography>
                </Box>
                <Avatar sx={{ width: 32, height: 32, bgcolor: '#4e73df', fontSize: '0.8rem', fontWeight: 700 }}>
                  {user?.firstName?.charAt(0) || 'U'}
                </Avatar>
              </Box>

              <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleUserMenuClose}>
                <MenuItem onClick={handleLogout} sx={{ fontSize: '0.85rem' }}>
                  <Logout fontSize="small" sx={{ mr: 1 }} /> Cerrar Sesión
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ p: { xs: 2, md: 4 }, flexGrow: 1 }}>
           <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

export default App;
