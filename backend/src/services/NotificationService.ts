import { AppDataSource } from "../config/database";
import { Notification } from "../entities/Notification";
import { User } from "../entities/User";

export class NotificationService {
    private static notificationRepository = AppDataSource.getRepository(Notification);

    static async create(user: User, message: string, link?: string): Promise<Notification> {
        const notification = new Notification();
        notification.user = user;
        notification.message = message;
        notification.link = link || '';
        return this.notificationRepository.save(notification);
    }
}
