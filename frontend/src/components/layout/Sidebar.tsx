import React, { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Lan as NetworkIcon,
  Search as SearchIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
  Circle as DotIcon,
} from '@mui/icons-material';
import { tokens } from '../../theme';
import AuthService from '../../services/AuthService';

type Permission = string;

interface NavLeaf {
  kind: 'leaf';
  label: string;
  to: string;
  icon: React.ReactElement<{ sx?: any }>;
  permission?: Permission;
  external?: boolean;
}

interface NavGroup {
  kind: 'group';
  key: string;
  label: string;
  icon: React.ReactElement<{ sx?: any }>;
  permission?: Permission;
  children: NavLeaf[];
}

type NavItem = NavLeaf | NavGroup;

const NAV: NavItem[] = [
  { kind: 'leaf', label: 'Inicio', to: '/dashboard', icon: <DashboardIcon /> },
  {
    kind: 'group',
    key: 'clientes',
    label: 'Clientes',
    icon: <PeopleIcon />,
    children: [
      { kind: 'leaf', label: 'Clientes', to: '/clients', icon: <DotIcon />, permission: 'clients.list.view' },
      { kind: 'leaf', label: 'Instalaciones', to: '/installation-billing', icon: <DotIcon />, permission: 'installations.view' },
      { kind: 'leaf', label: 'Agenda', to: '/installations/agenda', icon: <DotIcon />, permission: 'installations.view' },
      { kind: 'leaf', label: 'Solicitudes CRM', to: '/interactions', icon: <DotIcon />, permission: 'clients.crm.view' },
      { kind: 'leaf', label: 'Caídas de Servicio', to: '/service-outages', icon: <DotIcon />, permission: 'clients.outages.view' },
      { kind: 'leaf', label: 'Traslados', to: '/service-transfers', icon: <DotIcon /> },
      { kind: 'leaf', label: 'Facturación', to: '/billing', icon: <DotIcon />, permission: 'billing.view' },
      { kind: 'leaf', label: 'Formulario Web', to: '/solicitud', icon: <DotIcon />, external: true },
    ],
  },
  {
    kind: 'group',
    key: 'infra',
    label: 'Infraestructura',
    icon: <NetworkIcon />,
    children: [
      { kind: 'leaf', label: 'Monitor MikroTik', to: '/network/mikrotik', icon: <DotIcon /> },
      { kind: 'leaf', label: 'Dispositivos de Red', to: '/network/devices', icon: <DotIcon /> },
    ],
  },
  { kind: 'leaf', label: 'Consultas', to: '/consultas', icon: <SearchIcon /> },
  {
    kind: 'group',
    key: 'admin',
    label: 'Administración',
    icon: <SettingsIcon />,
    children: [
      { kind: 'leaf', label: 'Usuarios', to: '/admin/users', icon: <DotIcon />, permission: 'admin.users.view' },
      { kind: 'leaf', label: 'Roles y Permisos', to: '/admin/roles', icon: <DotIcon />, permission: 'admin.permissions.manage' },
      { kind: 'leaf', label: 'Accesos API', to: '/admin/api-access', icon: <DotIcon /> },
      { kind: 'leaf', label: 'Ajustes Generales', to: '/admin/settings', icon: <DotIcon /> },
      { kind: 'leaf', label: 'Imágenes Promocionales', to: '/admin/promotions', icon: <DotIcon /> },
      { kind: 'leaf', label: 'Avisos Masivos', to: '/admin/avisos', icon: <DotIcon /> },
      { kind: 'leaf', label: 'Planes de Servicio', to: '/admin/service-plans', icon: <DotIcon />, permission: 'admin.plans.view' },
      { kind: 'leaf', label: 'Técnicos', to: '/admin/technicians', icon: <DotIcon />, permission: 'admin.technicians.view' },
    ],
  },
];

const canSee = (perm?: Permission) => {
  if (!perm) return true;
  try {
    return AuthService.hasPermission(perm);
  } catch {
    return false;
  }
};

const isActive = (pathname: string, to: string) => {
  if (to === '/dashboard') return pathname === '/dashboard';
  return pathname === to || pathname.startsWith(`${to}/`);
};

const hasActiveChild = (pathname: string, children: NavLeaf[]) =>
  children.some((c) => isActive(pathname, c.to));

interface NavRowProps {
  item: NavLeaf;
  pathname: string;
  onNavigate: () => void;
  depth?: number;
}

const NavRow: React.FC<NavRowProps> = ({ item, pathname, onNavigate, depth = 0 }) => {
  if (!canSee(item.permission)) return null;
  const active = isActive(pathname, item.to);
  return (
    <ListItem disablePadding sx={{ display: 'block' }}>
      <ListItemButton
        component={item.external ? 'a' : Link}
        {...(item.external
          ? { href: item.to, target: '_blank', rel: 'noopener' }
          : { to: item.to })}
        selected={active}
        onClick={onNavigate}
        sx={{
          minHeight: 38,
          pl: depth ? 4.5 : 2.25,
          pr: 1.5,
          borderRadius: '10px',
          mx: 1,
          my: 0.25,
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 28,
            color: active ? 'primary.main' : 'rgba(230,233,245,0.55)',
          }}
        >
          {React.cloneElement(item.icon, { sx: { fontSize: depth ? 12 : 18 } })}
        </ListItemIcon>
        <ListItemText
          primary={item.label}
          primaryTypographyProps={{
            sx: {
              fontSize: depth ? '0.78rem' : '0.85rem',
              fontWeight: active ? 600 : 500,
              letterSpacing: '0.01em',
              color: active ? '#fff' : tokens.nightInk,
            },
          }}
        />
      </ListItemButton>
    </ListItem>
  );
};

interface NavGroupRowProps {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

const NavGroupRow: React.FC<NavGroupRowProps> = ({ group, pathname, onNavigate, isOpen, onToggle }) => {
  const visibleChildren = group.children.filter((c) => canSee(c.permission));
  if (visibleChildren.length === 0) return null;

  const groupActive = hasActiveChild(pathname, visibleChildren);

  return (
    <>
      <ListItem disablePadding sx={{ display: 'block' }}>
        <ListItemButton
          onClick={onToggle}
          sx={{
            minHeight: 40,
            pl: 2.25,
            pr: 1.5,
            borderRadius: '10px',
            mx: 1,
            my: 0.5,
            backgroundColor: groupActive ? 'rgba(45,91,255,0.10)' : 'transparent',
            '&:hover': { backgroundColor: 'rgba(255,255,255,0.04)' },
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 28,
              color: groupActive ? 'primary.main' : 'rgba(230,233,245,0.55)',
            }}
          >
            {React.cloneElement(group.icon, { sx: { fontSize: 18 } })}
          </ListItemIcon>
          <ListItemText
            primary={group.label}
            primaryTypographyProps={{
              sx: { fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: tokens.nightInk },
            }}
          />
          {isOpen ? <ExpandLess sx={{ fontSize: 16 }} /> : <ExpandMore sx={{ fontSize: 16 }} />}
        </ListItemButton>
      </ListItem>
      <Collapse in={isOpen} timeout="auto" unmountOnExit>
        <List disablePadding>
          {visibleChildren.map((child) => (
            <NavRow key={child.to} item={child} pathname={pathname} onNavigate={onNavigate} depth={1} />
          ))}
        </List>
      </Collapse>
    </>
  );
};

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
  const { pathname } = useLocation();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setOpen((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of NAV) {
        if (item.kind === 'group' && hasActiveChild(pathname, item.children)) {
          if (!next[item.key]) {
            next[item.key] = true;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [pathname]);

  const handleNav = () => {
    if (onNavigate) onNavigate();
  };

  const items = useMemo(() => NAV, []);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: 72,
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Box
          component="img"
          src="/nexum_logo.png"
          alt="Nexum"
          sx={{ maxHeight: 48, maxWidth: '100%', objectFit: 'contain' }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 2 }} />

      <List sx={{ px: 0, py: 1, flex: 1, overflowY: 'auto' }} dense>
        {items.map((item) => {
          if (item.kind === 'leaf') {
            return <NavRow key={item.to} item={item} pathname={pathname} onNavigate={handleNav} />;
          }
          return (
            <NavGroupRow
              key={item.key}
              group={item}
              pathname={pathname}
              onNavigate={handleNav}
              isOpen={!!open[item.key]}
              onToggle={() => setOpen((o) => ({ ...o, [item.key]: !o[item.key] }))}
            />
          );
        })}
      </List>

      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Tooltip title="Sistema operativo" placement="right" arrow>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              opacity: 0.55,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: 'success.main',
                boxShadow: '0 0 0 3px rgba(0,212,166,0.18)',
              }}
            />
          </Box>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default Sidebar;
