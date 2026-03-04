import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Notification } from '../entities/Notification';
import { AuthRequest } from '../middlewares/auth.middleware';

export class NotificationController {
    
    async getAll(req: Request, res: Response) {
        try {
            const authReq = req as unknown as AuthRequest;
            if (!authReq.user) {
                return res.status(401).json({ message: 'No autenticado' });
            }

            const notifications = await AppDataSource.getRepository(Notification).find({
                where: { 
                    user: { id: authReq.user.id }
                },
                order: { createdAt: 'DESC' },
                take: 20 // Retrieve only last 20 notifications
            });

            return res.json(notifications);
        } catch (error) {
            console.error('Error al obtener notificaciones:', error);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const notification = await AppDataSource.getRepository(Notification).findOne({
                where: { id: parseInt(id) },
                relations: ['user']
            });

            if (!notification) {
                return res.status(404).json({ message: 'Notificación no encontrada' });
            }

            // Verify user owns the notification
            const authReq = req as any;
            if (notification.user.id !== authReq.user.id) {
                return res.status(403).json({ message: 'No tienes permiso para modificar esta notificación' });
            }

            notification.isRead = true;
            await AppDataSource.getRepository(Notification).save(notification);

            return res.json({ message: 'Notificación marcada como leída' });
        } catch (error) {
            console.error('Error al actualizar notificación:', error);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    }

    async getUnreadCount(req: Request, res: Response) {
        try {
            const authReq = req as unknown as AuthRequest;
            if (!authReq.user) {
                return res.status(401).json({ count: 0 });
            }

            const count = await AppDataSource.getRepository(Notification).count({
                where: { 
                    user: { id: authReq.user.id },
                    isRead: false
                }
            });

            return res.json({ count });
        } catch (error) {
            console.error('Error al contar notificaciones:', error);
            return res.status(500).json({ count: 0 });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const notification = await AppDataSource.getRepository(Notification).findOne({
                where: { id: parseInt(id) },
                relations: ['user']
            });

            if (!notification) {
                return res.status(404).json({ message: 'Notificación no encontrada' });
            }

            const authReq = req as unknown as AuthRequest;
            if (!authReq.user || notification.user.id !== authReq.user.id) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar esta notificación' });
            }

            await AppDataSource.getRepository(Notification).remove(notification);
            return res.json({ message: 'Notificación eliminada' });
        } catch (error) {
            console.error('Error al eliminar notificación:', error);
            return res.status(500).json({ message: 'Error interno del servidor' });
        }
    }
}
