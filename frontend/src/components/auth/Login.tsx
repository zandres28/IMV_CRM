import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Stack,
} from '@mui/material';
import AuthService from '../../services/AuthService';
import { tokens } from '../../theme';

const LOGO_BG = '#181618';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.body.style.paddingRight = '0px';
    const strayBackdrops = document.querySelectorAll('.MuiBackdrop-root');
    if (strayBackdrops.length > 0) {
      strayBackdrops.forEach(el => el.remove());
    }
    const root = document.getElementById('root');
    if (root) {
        root.style.opacity = '1';
        root.style.pointerEvents = 'auto';
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthService.login({ email, password });
      navigate('/clients');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: tokens.canvas,
        p: 2,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Card
          sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            border: `1px solid ${tokens.border}`,
            boxShadow: '0 24px 48px -12px rgba(14,19,48,0.4)',
            '&:hover': { transform: 'none', boxShadow: '0 24px 48px -12px rgba(14,19,48,0.4)', borderColor: tokens.border },
          }}
        >
          <Box
            sx={{
              backgroundColor: LOGO_BG,
              textAlign: 'center',
              py: 4,
              px: 4,
            }}
          >
            <Box
              component="img"
              src="/nexum_logo.png"
              alt="Nexum"
              sx={{
                width: 'auto',
                height: 48,
                maxWidth: '100%',
                display: 'block',
                mx: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>

          <CardContent sx={{ p: 4 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              <Stack spacing={2.5}>
                <TextField
                  label="Email"
                  type="email"
                  fullWidth
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  disabled={loading}
                  size="small"
                />
                <TextField
                  label="Contraseña"
                  type="password"
                  fullWidth
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  size="small"
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  sx={{ py: 1.3, mt: 0.5 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Entrar'}
                </Button>
              </Stack>
            </form>

            <Typography variant="caption" sx={{ color: tokens.muted, display: 'block', textAlign: 'center', mt: 3 }}>
              Acceso seguro para personal autorizado
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Login;
