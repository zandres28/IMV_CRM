import { createTheme } from '@mui/material/styles';

const palette = {
  brand: '#2D5BFF',
  brandDeep: '#1B3FCC',
  accent: '#00D4A6',
  warn: '#F0A23A',
  danger: '#E5484D',
  info: '#3DA5F5',
  ink: '#0E1330',
  inkSoft: '#3A4163',
  muted: '#6B7290',
  surface: '#FFFFFF',
  canvas: '#F4F6FB',
  sunken: '#EDF0F7',
  border: '#E2E6F0',
  nightCanvas: '#0B1020',
  nightSurface: '#121833',
  nightInk: '#E6E9F5',
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: palette.brand,
      dark: palette.brandDeep,
      contrastText: '#fff',
    },
    secondary: {
      main: palette.accent,
      contrastText: palette.ink,
    },
    success: { main: palette.accent },
    info: { main: palette.info },
    warning: { main: palette.warn },
    error: { main: palette.danger },
    background: {
      default: palette.canvas,
      paper: palette.surface,
    },
    text: {
      primary: palette.ink,
      secondary: palette.muted,
    },
    divider: palette.border,
  },
  typography: {
    fontFamily: '"DM Sans", "Inter", system-ui, sans-serif',
    h1: {
      fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: 'clamp(1.8rem, 3.5vw, 3rem)',
      lineHeight: 1.1,
    },
    h2: {
      fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
      lineHeight: 1.2,
    },
    h3: {
      fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
      fontWeight: 700,
      letterSpacing: '-0.015em',
      fontSize: 'clamp(1rem, 1.5vw, 1.25rem)',
      lineHeight: 1.3,
    },
    h4: {
      fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: palette.ink,
      fontSize: '1.1rem',
    },
    h5: {
      fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      color: palette.ink,
      fontSize: '1rem',
    },
    h6: {
      fontFamily: '"Bricolage Grotesque", "DM Sans", sans-serif',
      fontWeight: 600,
      color: palette.ink,
      fontSize: '0.9rem',
    },
    subtitle1: { fontWeight: 600, color: palette.inkSoft, fontSize: '0.85rem' },
    subtitle2: {
      fontWeight: 600,
      color: palette.muted,
      textTransform: 'uppercase',
      letterSpacing: '0.08em',
      fontSize: '0.7rem',
    },
    body1: { fontWeight: 400, color: palette.inkSoft, fontSize: '0.875rem', lineHeight: 1.5 },
    body2: { fontWeight: 400, color: palette.muted, fontSize: '0.8rem' },
    overline: {
      fontWeight: 600,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      fontSize: '0.65rem',
      lineHeight: 1.2,
    },
    button: { textTransform: 'none', fontWeight: 600, letterSpacing: '0' },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: palette.canvas,
          backgroundImage:
            'radial-gradient(1200px 600px at 10% -10%, rgba(45,91,255,0.08), transparent 60%), radial-gradient(900px 500px at 100% 0%, rgba(0,212,166,0.06), transparent 55%)',
          backgroundAttachment: 'fixed',
        },
        '*::selection': { background: 'rgba(45,91,255,0.18)' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 14, paddingBlock: 8 },
        containedPrimary: {
          background: `linear-gradient(135deg, ${palette.brand} 0%, ${palette.brandDeep} 100%)`,
          boxShadow: '0 8px 20px -10px rgba(45,91,255,0.6)',
          '&:hover': {
            background: `linear-gradient(135deg, ${palette.brandDeep} 0%, #142FAA 100%)`,
            boxShadow: '0 12px 24px -10px rgba(45,91,255,0.7)',
          },
        },
        outlined: { borderColor: palette.border },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: `1px solid ${palette.border}`,
          boxShadow: '0 1px 0 rgba(14,19,48,0.04), 0 8px 24px -16px rgba(14,19,48,0.18)',
          transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 1px 0 rgba(14,19,48,0.06), 0 16px 32px -18px rgba(14,19,48,0.28)',
            borderColor: 'rgba(45,91,255,0.35)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { borderRadius: 16, border: `1px solid ${palette.border}` },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: palette.nightSurface,
          color: palette.nightInk,
          boxShadow: '0 1px 0 rgba(255,255,255,0.06)',
          borderBottom: `1px solid rgba(255,255,255,0.06)`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: palette.nightCanvas,
          color: palette.nightInk,
          borderRight: 'none',
          backgroundImage:
            'radial-gradient(600px 300px at -10% 0%, rgba(45,91,255,0.25), transparent 55%), radial-gradient(500px 280px at 110% 100%, rgba(0,212,166,0.18), transparent 60%)',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          margin: '2px 8px',
          paddingInline: 12,
          '&.Mui-selected': {
            backgroundColor: 'rgba(45,91,255,0.18)',
            color: '#fff',
            boxShadow: 'inset 0 0 0 1px rgba(45,91,255,0.35)',
            '& .MuiListItemIcon-root': { color: '#fff' },
          },
          '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: { color: 'rgba(230,233,245,0.55)', minWidth: 36 },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.85rem',
          fontWeight: 500,
          letterSpacing: '0.01em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, fontSize: '0.75rem' },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: palette.ink,
          fontSize: '0.72rem',
          padding: '6px 10px',
          borderRadius: 8,
        },
        arrow: { color: palette.ink },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 24,
          border: `1px solid ${palette.border}`,
          boxShadow: '0 24px 48px -12px rgba(14,19,48,0.4)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        notchedOutline: {
          borderColor: palette.border,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiSelect: {
      styleOverrides: {
        outlined: {
          borderRadius: 8,
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          borderCollapse: 'separate',
          borderSpacing: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: palette.sunken,
            color: palette.brand,
            fontWeight: 800,
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            borderBottom: `1px solid ${palette.border}`,
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: 'rgba(45,91,255,0.04)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(45,91,255,0.08)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: `1px solid ${palette.border}`,
          fontSize: '0.85rem',
          color: palette.inkSoft,
          padding: '10px 16px',
        },
        head: {
          padding: '8px 16px',
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          borderTop: `1px solid ${palette.border}`,
        },
      },
    },
  },
});

export const tokens = palette;
export default theme;