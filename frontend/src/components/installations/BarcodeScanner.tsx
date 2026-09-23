import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Typography } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
    open: boolean;
    onClose: () => void;
    onScan: (code: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ open, onClose, onScan }) => {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [error, setError] = useState<string>('');
    const containerId = 'barcode-reader-container';

    const cleanup = useCallback(() => {
        if (scannerRef.current) {
            try { scannerRef.current.stop(); } catch {}
            try { scannerRef.current.clear(); } catch {}
            scannerRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!open) return;

        const timer = setTimeout(() => {
            try {
                const el = document.getElementById(containerId);
                if (!el) {
                    setError('Contenedor no encontrado');
                    return;
                }
                el.innerHTML = '';

                const scanner = new Html5Qrcode(containerId);
                scannerRef.current = scanner;

                scanner.start(
                    { facingMode: 'environment' },
                    { fps: 5, qrbox: { width: 250, height: 100 } },
                    (decodedText) => {
                        cleanup();
                        onScan(decodedText);
                        onClose();
                    },
                    () => {}
                ).catch((err: any) => {
                    const msg = typeof err === 'string' ? err : err?.message || err?.toString() || 'Error al acceder a la cámara';
                    setError(msg);
                });
            } catch (e: any) {
                setError(e?.message || 'Error al iniciar escáner');
            }
        }, 300);

        return () => {
            clearTimeout(timer);
            cleanup();
            setError('');
        };
    }, [open, onScan, onClose, cleanup]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{ sx: { overflow: 'visible' } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    Escanear código de barras
                </Typography>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </DialogTitle>
            <DialogContent sx={{ p: 1, overflow: 'visible' }}>
                {error ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="error" sx={{ mb: 1 }}>{error}</Typography>
                        <Typography variant="caption" color="textSecondary">
                            Asegúrate de permitir el acceso a la cámara en tu navegador.
                        </Typography>
                    </Box>
                ) : (
                    <Box sx={{ width: '100%', minHeight: 250 }}>
                        <div id={containerId} style={{ width: '100%' }} />
                    </Box>
                )}
            </DialogContent>
        </Dialog>
    );
};
