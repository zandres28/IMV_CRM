import axios from "axios";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3010/api";

export type DeviceType = "mikrotik" | "olt" | "switch" | "other";

export interface NetworkDevice {
    id: number;
    name: string;
    type: DeviceType;
    host: string;
    port: number;
    username?: string;
    description?: string;
    enabled: boolean;
    created_at: string;
    updated_at: string;
}

export interface NetworkDeviceForm {
    name: string;
    type: DeviceType;
    host: string;
    port: number;
    username?: string;
    password?: string;
    description?: string;
    enabled: boolean;
}

export interface TestConnectionResult {
    ok: boolean;
    latency: number | null;
    message: string;
}

export const NetworkDeviceService = {
    getAll: async (): Promise<NetworkDevice[]> => {
        const res = await axios.get(`${API_URL}/network-devices`);
        return res.data;
    },

    getById: async (id: number): Promise<NetworkDevice> => {
        const res = await axios.get(`${API_URL}/network-devices/${id}`);
        return res.data;
    },

    create: async (data: NetworkDeviceForm): Promise<NetworkDevice> => {
        const res = await axios.post(`${API_URL}/network-devices`, data);
        return res.data;
    },

    update: async (id: number, data: Partial<NetworkDeviceForm>): Promise<NetworkDevice> => {
        const res = await axios.put(`${API_URL}/network-devices/${id}`, data);
        return res.data;
    },

    delete: async (id: number): Promise<void> => {
        await axios.delete(`${API_URL}/network-devices/${id}`);
    },

    testConnection: async (id: number): Promise<TestConnectionResult> => {
        const res = await axios.post(`${API_URL}/network-devices/${id}/test`);
        return res.data;
    }
};
