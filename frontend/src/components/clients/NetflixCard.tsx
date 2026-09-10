import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Chip, CircularProgress, Typography } from '@mui/material';
import { LiveTv as LiveTvIcon } from '@mui/icons-material';
import { NetflixAccountService } from '../../services/NetflixAccountService';
import { ClientNetflixSlot } from '../../types/NetflixAccount';
import { Client } from '../../types/Client';

interface Props {
    client: Client;
}

export const NetflixCard: React.FC<Props> = ({ client }) => {
    const [slots, setSlots] = useState<ClientNetflixSlot[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        NetflixAccountService.getByClient(client.id)
            .then((data) => mounted && setSlots(data))
            .catch(() => mounted && setSlots([]))
            .finally(() => mounted && setLoading(false));
        return () => {
            mounted = false;
        };
    }, [client.id]);

    return (
        <Card sx={{ mb: 2, borderRadius: 3, boxShadow: '0 1px 0 rgba(14,19,48,0.04), 0 8px 24px -16px rgba(14,19,48,0.18)' }}>
            <CardContent sx={{ p: '16px !important' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <LiveTvIcon sx={{ color: '#E50914', fontSize: 20 }} />
                        <Typography sx={{ fontWeight: 800, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0E1330' }}>
                            Netflix
                        </Typography>
                    </Box>
                    <Chip
                        size="small"
                        label={loading ? '…' : `${slots.length} perfil${slots.length === 1 ? '' : 'es'}`}
                        sx={{
                            backgroundColor: slots.length > 0 ? 'rgba(0,212,166,0.12)' : 'rgba(107,114,144,0.12)',
                            color: slots.length > 0 ? '#009F80' : '#6B7290',
                            fontWeight: 700,
                            fontSize: '0.7rem',
                            height: 22,
                        }}
                    />
                </Box>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                        <CircularProgress size={20} />
                    </Box>
                ) : slots.length === 0 ? (
                    <Typography variant="body2" color="textSecondary" sx={{ fontSize: '0.8rem' }}>
                        Este cliente no tiene perfiles de Netflix asignados.
                    </Typography>
                ) : (
                    slots.map((slot) => (
                        <Box
                            key={slot.id}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                py: 1,
                                px: 1.5,
                                mb: 1,
                                borderRadius: 2,
                                border: '1px solid rgba(0,212,166,0.25)',
                                backgroundColor: 'rgba(0,212,166,0.06)',
                            }}
                        >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography sx={{ fontWeight: 700, fontSize: '0.8rem', color: '#0E1330' }}>
                                    {slot.profileName || `Perfil ${slot.slotIndex}`}
                                </Typography>
                                <Typography sx={{ fontSize: '0.72rem', color: '#6B7290' }} noWrap>
                                    {slot.account.email}
                                </Typography>
                            </Box>
                            <Chip
                                size="small"
                                label={`PIN: ${slot.pin}`}
                                sx={{ backgroundColor: 'rgba(45,91,255,0.08)', color: '#2D5BFF', fontWeight: 700, fontSize: '0.7rem' }}
                            />
                        </Box>
                    ))
                )}
            </CardContent>
        </Card>
    );
};