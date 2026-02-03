import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: Array<{
    id: number;
    name: string;
    description: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleIds?: number[];
}

export interface UpdateUserData {
  email?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
  roleIds?: number[];
  password?: string;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  isActive: boolean;
}

class UserService {
  async getAll(): Promise<User[]> {
    const response = await axios.get(`${API_URL}/users`);
    return response.data;
  }

  async getById(id: number): Promise<User> {
    const response = await axios.get(`${API_URL}/users/${id}`);
    return response.data;
  }

  async create(data: CreateUserData): Promise<User> {
    const response = await axios.post(`${API_URL}/users`, data);
    return response.data;
  }

  async update(id: number, data: UpdateUserData): Promise<User> {
    const response = await axios.put(`${API_URL}/users/${id}`, data);
    return response.data;
  }

  async delete(id: number): Promise<void> {
    await axios.delete(`${API_URL}/users/${id}`);
  }

  async getAllRoles(): Promise<Role[]> {
    const response = await axios.get(`${API_URL}/roles`);
    return response.data;
  }
}

export default new UserService();
