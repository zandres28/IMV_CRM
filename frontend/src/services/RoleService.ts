import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3010/api';

export interface Role {
    id: number;
    name: string;
    description: string;
    permissions: string[];
    isActive: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface Permission {
    id: string;
    label: string;
    group: string;
}

const RoleService = {
    getAll: async () => {
        const response = await axios.get<Role[]>(`${API_URL}/roles`);
        return response.data;
    },

    getById: async (id: number) => {
        const response = await axios.get<Role>(`${API_URL}/roles/${id}`);
        return response.data;
    },

    create: async (role: Partial<Role>) => {
        const response = await axios.post<Role>(`${API_URL}/roles`, role);
        return response.data;
    },

    update: async (id: number, role: Partial<Role>) => {
        const response = await axios.put<Role>(`${API_URL}/roles/${id}`, role);
        return response.data;
    },

    delete: async (id: number) => {
        const response = await axios.delete(`${API_URL}/roles/${id}`);
        return response.data;
    },

    getAvailablePermissions: async () => {
        const response = await axios.get<Permission[]>(`${API_URL}/roles/permissions/list`);
        return response.data;
    }
};

export default RoleService;
