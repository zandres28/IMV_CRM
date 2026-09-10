import axios from 'axios';
import { NetflixAccount } from '../types/NetflixAccount';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const NetflixAccountService = {
    getAll: async (): Promise<NetflixAccount[]> =>
        (await axios.get(`${API_URL}/netflix-accounts`)).data,

    getByClient: async (clientId: number) =>
        (await axios.get(`${API_URL}/netflix-accounts/client/${clientId}`)).data,

    create: async (payload: { email: string; maxSlots?: number; notes?: string; paymentMethod?: string }): Promise<NetflixAccount> =>
        (await axios.post(`${API_URL}/netflix-accounts`, payload)).data,

    update: async (id: number, payload: { email?: string; maxSlots?: number; notes?: string; paymentMethod?: string }): Promise<NetflixAccount> =>
        (await axios.put(`${API_URL}/netflix-accounts/${id}`, payload)).data,

    remove: async (id: number) => {
        await axios.delete(`${API_URL}/netflix-accounts/${id}`);
    },

    assignSlot: async (slotId: number, clientId: number, pin?: string, profileName?: string): Promise<NetflixAccount> =>
        (await axios.post(`${API_URL}/netflix-accounts/slot/${slotId}/assign`, { clientId, pin, profileName })).data,

    releaseSlot: async (slotId: number): Promise<NetflixAccount> =>
        (await axios.post(`${API_URL}/netflix-accounts/slot/${slotId}/release`)).data,

    updateSlot: async (slotId: number, payload: { profileName?: string; pin?: string }): Promise<NetflixAccount> =>
        (await axios.put(`${API_URL}/netflix-accounts/slot/${slotId}`, payload)).data,
};