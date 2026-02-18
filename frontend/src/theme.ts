import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#4e73df', // Blue matching the logo and buttons in image
      contrastText: '#fff',
    },
    secondary: {
      main: '#858796',
    },
    background: {
      default: '#f8f9fc', // Light gray background in main area
      paper: '#ffffff',
    },
    text: {
      primary: '#5a5c69',
      secondary: '#858796',
    },
    success: {
        main: '#1cc88a',
    },
    info: {
        main: '#36b9cc',
    },
    warning: {
        main: '#f6c23e',
    },
    error: {
        main: '#e74a3b',
    },
  },
  typography: {
    fontFamily: '"Nunito", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 800,
      color: '#5a5c69',
    },
    h5: {
      fontWeight: 700,
      color: '#5a5c69',
    },
    h6: {
      fontWeight: 700,
      color: '#5a5c69',
    },
    subtitle1: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 'bold',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        containedPrimary: {
          backgroundColor: '#4e73df',
          '&:hover': {
            backgroundColor: '#2e59d9',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 .15rem 1.75rem 0 rgba(58,59,69,.15) !important',
        },
      },
    },
    MuiPaper: {
       styleOverrides: {
          root: {
             borderRadius: 12,
          }
       }
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          color: '#5a5c69',
          boxShadow: '0 .15rem 1.75rem 0 rgba(58,59,69,.15) !important',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0b1120', // Dark sidebar background
          color: '#ffffff',
          borderRight: 'none',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            borderLeft: '4px solid #4e73df',
            color: '#fff',
            '& .MuiListItemIcon-root': {
              color: '#fff',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.04)',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          color: 'rgba(255, 255, 255, 0.5)',
          minWidth: 40,
        },
      },
    },
    MuiListItemText: {
      styleOverrides: {
        primary: {
          fontSize: '0.85rem',
          fontWeight: 600,
        },
      },
    },
  },
});

export default theme;
