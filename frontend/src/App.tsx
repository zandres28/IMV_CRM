import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  Drawer,
  Divider,
  useTheme,
  useMediaQuery,
  Chip,
  Tooltip,
  Avatar,
  Badge,
} from '@mui/material';
import {
  Logout,
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import AuthService from './services/AuthService';
import NotificationService, { Notification } from './services/NotificationService';

import SessionTimeoutHandler from './components/SessionTimeoutHandler';
import Sidebar from './components/layout/Sidebar';
import { jwtDecode } from 'jwt-decode';
import { tokens } from './theme';

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
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  // Environment state (default to prod or from localStorage)
  const [currentEnv] = useState(() => {
    const saved = localStorage.getItem('crm_env');
    return ENVIRONMENTS.find(e => e.id === saved) || ENVIRONMENTS[0];
  });

  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const user = AuthService.getCurrentUser();

  const fetchNotifications = async () => {
      try {
          if (AuthService.getCurrentUser()) {
              const list = await NotificationService.getAll();
              setNotifications(list);
          const unreadTotal = list.filter(n => !n.isRead).length;
          setUnreadCount(unreadTotal);
          }
      } catch (e) {
          console.error("Error fetching notifications", e);
      }
  };

  useEffect(() => {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
      return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
      setNotificationAnchor(event.currentTarget);
      fetchNotifications(); // Refresh on open
  };

  const handleNotificationClose = () => {
      setNotificationAnchor(null);
  };

  const handleNotificationItemClick = async (notification: Notification) => {
      try {
        const wasUnread = !notification.isRead;
        await NotificationService.markAsRead(notification.id);
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        if (wasUnread) {
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
          handleNotificationClose();
          if (notification.link) {
              // If link is like /clients/:id, we might need to pass state to open specific tab
              // The backend sets link as `/clients/${client.id}`
              // But for technician we want to open Installations tab.
              // By default ClientDetail opens installations tab for technician role (I fixed this in previous turn).
              // So just navigating is enough.
              navigate(notification.link);
          }
      } catch (error) {
          console.error(error);
      }
  };

    const handleDeleteNotification = async (event: React.MouseEvent<HTMLElement>, notification: Notification) => {
      event.stopPropagation();
      try {
        await NotificationService.delete(notification.id);
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        if (!notification.isRead) {
          setUnreadCount(prev => Math.max(prev - 1, 0));
        }
      } catch (error) {
        console.error('Error deleting notification', error);
      }
    };

  const getPageTitle = (path: string) => {
    if (path.includes('/dashboard')) return 'Panel Principal';
    if (path.includes('/clients')) return 'Gestión de Clientes';
    if (path.includes('/installation-billing')) return 'Facturación de Instalaciones';
    if (path.includes('/interactions')) return 'Solicitudes CRM';
    if (path.includes('/service-outages')) return 'Caídas de Servicio';
    if (path.includes('/service-transfers')) return 'Traslados';
    if (path.includes('/network/mikrotik')) return 'Monitor Mikrotik';
    if (path.includes('/network/devices')) return 'Dispositivos de Red';
    if (path.includes('/billing')) return 'Centro de Facturación';
    if (path.includes('/consultas')) return 'Consultas Avanzadas';
    if (path.includes('/admin/users')) return 'Gestión de Usuarios';
    if (path.includes('/admin/roles')) return 'Roles y Permisos';
    if (path.includes('/admin/settings')) return 'Configuración del Sistema';
    if (path.includes('/admin/api-access')) return 'Accesos API';
    if (path.includes('/admin/service-plans')) return 'Planes de Servicio';
    if (path.includes('/admin/technicians')) return 'Gestión de Técnicos';
    if (path.includes('/admin/promotions')) return 'Gestor de Imágenes Promocionales';
    if (path.includes('/admin/avisos')) return 'Avisos Masivos WhatsApp';
    if (path.includes('/installations/agenda')) return 'Agenda de Instalaciones';
    if (path.includes('/admin/interaction-types')) return 'Tipos de Interacción';
    
    return 'Nexum CRM';
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
        const decoded: any = jwtDecode(token);
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

  const drawerWidth = drawerCollapsed ? 0 : 240;

  const drawer = (
    <Sidebar onNavigate={handleDrawerToggle} />
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: tokens.canvas,
        backgroundImage:
          'radial-gradient(1000px 420px at 15% 0%, rgba(45,91,255,0.08), transparent 58%), radial-gradient(900px 360px at 100% 0%, rgba(0,212,166,0.06), transparent 55%)',
      }}
    >
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
            backgroundColor: tokens.nightCanvas,
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
          bgcolor: tokens.nightSurface, 
          color: tokens.nightInk, 
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
          height: 70, 
          justifyContent: 'center',
          boxShadow: '0 12px 28px -24px rgba(14,19,48,0.36)',
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
              <Typography variant="h6" sx={{ fontWeight: 800, color: tokens.nightInk, fontSize: '1rem', display: { xs: 'none', md: 'block' } }}>
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
                  bgcolor: currentEnv.id === 'prod' ? 'rgba(229,72,77,0.14)' : 'rgba(45,91,255,0.12)',
                  color: currentEnv.id === 'prod' ? tokens.danger : tokens.brand,
                  border: `1px solid ${currentEnv.id === 'prod' ? 'rgba(229,72,77,0.25)' : 'rgba(45,91,255,0.22)'}`,
                  textTransform: 'uppercase'
                }}
              />
              
              <IconButton size="small" sx={{ color: tokens.nightInk }} onClick={handleNotificationClick}>
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon fontSize="small" />
                </Badge>
              </IconButton>
              
              <Menu
                  anchorEl={notificationAnchor}
                  open={Boolean(notificationAnchor)}
                  onClose={handleNotificationClose}
                  PaperProps={{
                      style: {
                          maxHeight: 300,
                          width: '350px',
                      },
                  }}
              >
                  {notifications.length === 0 ? (
                      <MenuItem onClick={handleNotificationClose}>No tienes notificaciones nuevas</MenuItem>
                  ) : (
                      notifications.map((notification) => (
                          <MenuItem 
                            key={notification.id} 
                            onClick={() => handleNotificationItemClick(notification)}
                            sx={{ whiteSpace: 'normal', fontSize: '0.8rem', borderBottom: `1px solid ${tokens.border}` }}
                          >
                          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', gap: 1 }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: notification.isRead ? 'normal' : 'bold' }}>
                                {notification.message}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(notification.createdAt).toLocaleString()}
                              </Typography>
                            </Box>
                            <Tooltip title="Eliminar notificación">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={(event) => handleDeleteNotification(event, notification)}
                              >
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                          </MenuItem>
                      ))
                  )}
              </Menu>
              
              <Divider orientation="vertical" flexItem sx={{ mx: 1, height: 32, alignSelf: 'center', borderColor: tokens.border }} />
              
              <Box sx={{ ml: 1, display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={handleUserMenuOpen}>
                <Box sx={{ textAlign: 'right', mr: 1, display: { xs: 'none', sm: 'block' } }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1, fontSize: '0.8rem', color: tokens.nightInk }}>{user?.firstName || 'Usuario'}</Typography>
                </Box>
                <Avatar sx={{ width: 32, height: 32, bgcolor: tokens.brand, fontSize: '0.8rem', fontWeight: 700 }}>
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
