
import { AppDataSource } from '../src/config/database';
import { Interaction } from '../src/entities/Interaction';
import { Between } from 'typeorm';

async function resetRemindersStatus() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const interactionRepository = AppDataSource.getRepository(Interaction);

        // Obtener rango de fechas del mes actual
        const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

        // Buscar interacciones de "Recordatorio Enviado" de este mes
        const sentReminders = await interactionRepository.find({
            where: {
                subject: 'Recordatorio WhatsApp Automático',
                created_at: Between(startOfMonth, endOfMonth)
            }
        });

        console.log(`Encontrados ${sentReminders.length} recordatorios enviados este mes.`);

        if (sentReminders.length > 0) {
            await interactionRepository.remove(sentReminders);
            console.log(`✅ Eliminados ${sentReminders.length} registros. El estado de "enviado" ha sido reseteado a false para todos los clientes.`);
        } else {
            console.log('⚠️ No hay recordatorios enviados este mes para eliminar.');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error al resetear estado de recordatorios:', error);
        process.exit(1);
    }
}

resetRemindersStatus();
