// src/services/NotificationService.ts
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export interface Notification {
    id: number;
    message: string;
    link?: string;
    isRead: boolean;
    createdAt: string;
}

class NotificationService {
    async getAll(): Promise<Notification[]> {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${API_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data;
    }

    async getUnreadCount(): Promise<number> {
        const token = localStorage.getItem('accessToken');
        const response = await axios.get(`${API_URL}/notifications/unread-count`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data.count;
    }

    async markAsRead(id: number): Promise<void> {
        const token = localStorage.getItem('accessToken');
        await axios.put(`${API_URL}/notifications/${id}/read`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }

    async delete(id: number): Promise<void> {
        const token = localStorage.getItem('accessToken');
        await axios.delete(`${API_URL}/notifications/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
    }
}

export default new NotificationService();
