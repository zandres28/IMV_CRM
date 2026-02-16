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
  Collapse
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
  AdminPanelSettings as AdminIcon,
  ExpandLess,
  ExpandMore
} from '@mui/icons-material';
import AuthService from './services/AuthService';

import SessionTimeoutHandler from './components/SessionTimeoutHandler';

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clientsMenuAnchor, setClientsMenuAnchor] = useState<null | HTMLElement>(null);
  const [adminMenuAnchor, setAdminMenuAnchor] = useState<null | HTMLElement>(null);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Mobile menu states
  const [mobileClientsOpen, setMobileClientsOpen] = useState(false);
  const [mobileAdminOpen, setMobileAdminOpen] = useState(false);

  const user = AuthService.getCurrentUser();

  useEffect(() => {
    const verify = async () => {
      try {
        const API_AUTH = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/auth/me`;
        await axios.get(API_AUTH);
      } catch (err) {
        // If verification fails, force logout and redirect to login
        AuthService.logout();
        window.location.href = '/login';
      }
    };

    // Verify on mount
    verify();

    // Verify when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === 'visible') verify();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => document.removeEventListener('visibilitychange', onVisibility);
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

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          NetFlow CRM
        </Typography>
      </Box>
      <Divider />
      <List>
        <ListItem button component={Link} to="/dashboard" onClick={handleDrawerToggle}>
          <ListItemIcon><DashboardIcon /></ListItemIcon>
          <ListItemText primary="Tablero" />
        </ListItem>

        {AuthService.hasPermission('clients.list.view') && (
          <>
            <ListItem button onClick={() => setMobileClientsOpen(!mobileClientsOpen)}>
              <ListItemIcon><PeopleIcon /></ListItemIcon>
              <ListItemText primary="Clientes" />
              {mobileClientsOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={mobileClientsOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                <ListItem button sx={{ pl: 4 }} component={Link} to="/clients" onClick={handleDrawerToggle}>
                  <ListItemText primary="Lista de Clientes" />
                </ListItem>
                {AuthService.hasPermission('clients.crm.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/interactions" onClick={handleDrawerToggle}>
                    <ListItemText primary="Interacciones CRM" />
                  </ListItem>
                )}
                {AuthService.hasPermission('clients.outages.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/service-outages" onClick={handleDrawerToggle}>
                    <ListItemText primary="Caídas de Servicio" />
                  </ListItem>
                )}
                <ListItem button sx={{ pl: 4 }} component={Link} to="/service-transfers" onClick={handleDrawerToggle}>
                  <ListItemText primary="Traslados" />
                </ListItem>
                <ListItem button sx={{ pl: 4 }} component={Link} to="/solicitud" target="_blank" onClick={handleDrawerToggle}>
                  <ListItemText primary="Formulario Web Solicitud" />
                </ListItem>
              </List>
            </Collapse>
          </>
        )}

        {AuthService.hasPermission('billing.view') && (
          <ListItem button component={Link} to="/billing" onClick={handleDrawerToggle}>
            <ListItemIcon><ReceiptIcon /></ListItemIcon>
            <ListItemText primary="Facturación" />
          </ListItem>
        )}

        {AuthService.hasPermission('installations.view') && (
          <ListItem button component={Link} to="/installation-billing" onClick={handleDrawerToggle}>
            <ListItemIcon><RouterIcon /></ListItemIcon>
            <ListItemText primary="Instalaciones" />
          </ListItem>
        )}

        {AuthService.hasPermission('queries.view') && (
          <ListItem button component={Link} to="/consultas" onClick={handleDrawerToggle}>
            <ListItemIcon><SearchIcon /></ListItemIcon>
            <ListItemText primary="Consultas" />
          </ListItem>
        )}

        {(AuthService.hasPermission('admin.users.view') || 
          AuthService.hasPermission('admin.plans.view') || 
          AuthService.hasPermission('admin.technicians.view')) && (
          <>
            <ListItem button onClick={() => setMobileAdminOpen(!mobileAdminOpen)}>
              <ListItemIcon><AdminIcon /></ListItemIcon>
              <ListItemText primary="Administración" />
              {mobileAdminOpen ? <ExpandLess /> : <ExpandMore />}
            </ListItem>
            <Collapse in={mobileAdminOpen} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {AuthService.hasPermission('admin.users.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/users" onClick={handleDrawerToggle}>
                    <ListItemText primary="Usuarios" />
                  </ListItem>
                )}
                <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/api-access" onClick={handleDrawerToggle}>
                  <ListItemText primary="Acceso API" />
                </ListItem>
                <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/settings" onClick={handleDrawerToggle}>
                  <ListItemText primary="Configuración" />
                </ListItem>
                {AuthService.hasPermission('manage_interaction_types') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/interaction-types" onClick={handleDrawerToggle}>
                    <ListItemText primary="Tipos de Interacción" />
                  </ListItem>
                )}
                {AuthService.hasPermission('admin.plans.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/service-plans" onClick={handleDrawerToggle}>
                    <ListItemText primary="Planes de Servicio" />
                  </ListItem>
                )}
                {AuthService.hasPermission('admin.technicians.view') && (
                  <ListItem button sx={{ pl: 4 }} component={Link} to="/admin/technicians" onClick={handleDrawerToggle}>
                    <ListItemText primary="Técnicos" />
                  </ListItem>
                )}
              </List>
            </Collapse>
          </>
        )}
      </List>
      <Divider />
      <List>
        <ListItem>
          <ListItemText 
            primary={`${user?.firstName} ${user?.lastName}`} 
            secondary={user?.email} 
          />
        </ListItem>
        <ListItem button onClick={() => { handleLogout(); handleDrawerToggle(); }}>
          <ListItemIcon><Logout /></ListItemIcon>
          <ListItemText primary="Cerrar Sesión" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <SessionTimeoutHandler />
      <AppBar position="static">
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NetFlow CRM
          </Typography>

          {!isMobile && (
            <>
              {/* Dashboard General */}
              <Button 
                color="inherit" 
                component={Link} 
                to="/dashboard"
                startIcon={<DashboardIcon />}
                sx={{ mr: 1, backgroundColor: location.pathname.startsWith('/dashboard') ? 'rgba(255,255,255,0.1)' : 'transparent' }}
              >
                Tablero
              </Button>
              
              {/* Menú Clientes */}
              {AuthService.hasPermission('clients.list.view') && (
                <>
                  <Button 
                    color="inherit"
                    onClick={handleClientsMenuOpen}
                    endIcon={<KeyboardArrowDown />}
                    sx={{ backgroundColor: isClientsActive ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  >
                    Clientes
                  </Button>
                  <Menu
                    anchorEl={clientsMenuAnchor}
                    open={Boolean(clientsMenuAnchor)}
                    onClose={handleClientsMenuClose}
                  >
                    <MenuItem 
                      component={Link} 
                      to="/clients" 
                      onClick={handleClientsMenuClose}
                    >
                      Lista de Clientes
                    </MenuItem>
                    {AuthService.hasPermission('clients.crm.view') && (
                      <MenuItem 
                        component={Link} 
                        to="/interactions" 
                        onClick={handleClientsMenuClose}
                      >
                        Interacciones CRM
                      </MenuItem>
                    )}
                    {AuthService.hasPermission('clients.outages.view') && (
                      <MenuItem 
                        component={Link} 
                        to="/service-outages" 
                        onClick={handleClientsMenuClose}
                      >
                        Caídas de Servicio
                      </MenuItem>
                    )}
                    <MenuItem 
                      component={Link} 
                      to="/service-transfers" 
                      onClick={handleClientsMenuClose}
                    >
                      Traslados
                    </MenuItem>
                    <MenuItem 
                      component={Link} 
                      to="/solicitud" 
                      target="_blank"
                      onClick={handleClientsMenuClose}
                    >
                      Formulario Web Solicitud
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* Facturación Mensual */}
              {AuthService.hasPermission('billing.view') && (
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/billing"
                  sx={{ ml: 1, backgroundColor: location.pathname.startsWith('/billing') ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  Facturación
                </Button>
              )}

              {/* Instalaciones */}
              {AuthService.hasPermission('installations.view') && (
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/installation-billing"
                  sx={{ ml: 1, backgroundColor: location.pathname.startsWith('/installation-billing') ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  Instalaciones
                </Button>
              )}

              {/* Consultas */}
              {AuthService.hasPermission('queries.view') && (
                <Button 
                  color="inherit" 
                  component={Link} 
                  to="/consultas"
                  sx={{ ml: 1, backgroundColor: location.pathname.startsWith('/consultas') ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                >
                  Consultas
                </Button>
              )}

              {/* Menú Administración */}
              {(AuthService.hasPermission('admin.users.view') || 
                AuthService.hasPermission('admin.plans.view') || 
                AuthService.hasPermission('admin.technicians.view')) && (
                <>
                  <Button 
                    color="inherit"
                    onClick={handleAdminMenuOpen}
                    endIcon={<KeyboardArrowDown />}
                    sx={{ ml: 1, backgroundColor: isAdminActive ? 'rgba(255,255,255,0.1)' : 'transparent' }}
                  >
                    Administración
                  </Button>
                  <Menu
                    anchorEl={adminMenuAnchor}
                    open={Boolean(adminMenuAnchor)}
                    onClose={handleAdminMenuClose}
                  >
                    {AuthService.hasPermission('admin.users.view') && (
                      <MenuItem 
                        component={Link} 
                        to="/admin/users" 
                        onClick={handleAdminMenuClose}
                      >
                        Usuarios
                      </MenuItem>
                    )}
                    <MenuItem 
                      component={Link} 
                      to="/admin/api-access" 
                      onClick={handleAdminMenuClose}
                    >
                      Acceso API
                    </MenuItem>
                    <MenuItem 
                      component={Link} 
                      to="/admin/settings" 
                      onClick={handleAdminMenuClose}
                    >
                      Configuración
                    </MenuItem>
                    {AuthService.hasPermission('manage_interaction_types') && (
                      <MenuItem 
                        component={Link} 
                        to="/admin/interaction-types" 
                        onClick={handleAdminMenuClose}
                      >
                        Tipos de Interacción
                      </MenuItem>
                    )}
                    {AuthService.hasPermission('admin.plans.view') && (
                      <MenuItem 
                        component={Link} 
                        to="/admin/service-plans" 
                        onClick={handleAdminMenuClose}
                      >
                        Planes de Servicio
                      </MenuItem>
                    )}
                    {AuthService.hasPermission('admin.technicians.view') && (
                      <MenuItem 
                        component={Link} 
                        to="/admin/technicians" 
                        onClick={handleAdminMenuClose}
                      >
                        Técnicos
                      </MenuItem>
                    )}
                  </Menu>
                </>
              )}

              {/* Usuario y Logout */}
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                <IconButton
                  color="inherit"
                  onClick={handleUserMenuOpen}
                  sx={{ ml: 2 }}
                >
                  <AccountCircle />
                </IconButton>
                <Menu
                  anchorEl={userMenuAnchor}
                  open={Boolean(userMenuAnchor)}
                  onClose={handleUserMenuClose}
                >
                  <MenuItem disabled>
                    <Typography variant="body2">
                      {user?.firstName} {user?.lastName}
                    </Typography>
                  </MenuItem>
                  <MenuItem disabled>
                    <Typography variant="caption" color="text.secondary">
                      {user?.email}
                    </Typography>
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <Logout fontSize="small" sx={{ mr: 1 }} />
                    Cerrar Sesión
                  </MenuItem>
                </Menu>
              </Box>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 250 },
        }}
      >
        {drawer}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Container maxWidth="lg">
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}

export default App;
