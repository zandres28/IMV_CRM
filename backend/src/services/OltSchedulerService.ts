import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { Installation } from '../entities/Installation';
import { OltService } from './OltService';
import { LessThanOrEqual } from 'typeorm';

/**
 * Servicio que ejecuta desconexiones programadas de ONUs en la OLT.
 * Se ejecuta cada minuto y procesa instalaciones cuya fecha + hora de
 * desconexión ya llegó y tienen pendiente la desconexión de OLT.
 */
export const startOltDisconnectScheduler = () => {
    // Ejecutar cada minuto
    cron.schedule('* * * * *', async () => {
        try {
            const installationRepo = AppDataSource.getRepository(Installation);

            // Obtener la fecha de hoy (sin hora) para comparar con retirementDate
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0]; // "YYYY-MM-DD"
            const currentHHmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            const endOfToday = new Date(todayStr + 'T23:59:59.999Z');
            // Ajustar a zona local
            endOfToday.setHours(23, 59, 59, 999);

            const pendingInstallations = await installationRepo.find({
                where: {
                    oltDisconnectScheduled: true,
                    retirementDate: LessThanOrEqual(endOfToday) as any,
                },
                relations: ['client'],
            });

            if (pendingInstallations.length === 0) return;

            const oltService = new OltService();

            for (const installation of pendingInstallations) {
                // Verificar la fecha de retiro
                const retirementStr = installation.retirementDate
                    ? new Date(installation.retirementDate).toISOString().split('T')[0]
                    : null;

                if (!retirementStr) continue;

                // Si la fecha de retiro es en el futuro (hoy aún no llegó), skip
                if (retirementStr > todayStr) continue;

                // Si la fecha de retiro es hoy, verificar que la hora actual >= hora programada
                if (retirementStr === todayStr && installation.oltDisconnectTime) {
                    if (currentHHmm < installation.oltDisconnectTime) {
                        // Aún no es la hora programada
                        continue;
                    }
                }
                // Si retirementDate es pasado (< hoy), desconectar inmediatamente

                if (installation.ponId && installation.onuId) {
                    try {
                        await oltService.deactivateOnu(installation.ponId, installation.onuId);
                        console.log(
                            `[OLT Scheduler] ✓ ONU desconectada: SN=${installation.onuSerialNumber}, ` +
                            `PON=${installation.ponId}, ID=${installation.onuId}, ` +
                            `Hora programada=${installation.oltDisconnectTime ?? 'inmediata'}`
                        );
                    } catch (oltError: any) {
                        console.error(
                            `[OLT Scheduler] ✗ Error desconectando ONU ${installation.onuSerialNumber}:`,
                            oltError.message
                        );
                        continue;
                    }
                }

                // Liberar datos de OLT para reasignación
                installation.oltDisconnectScheduled = false;
                installation.oltDisconnectTime = undefined;
                (installation as any).onuSerialNumber = null;
                installation.ponId = undefined;
                installation.onuId = undefined;

                await installationRepo.save(installation);
            }
        } catch (error: any) {
            console.error('[OLT Scheduler] Error general:', error.message);
        }
    }, {
        timezone: process.env.TZ || 'America/Bogota',
    });

    console.log('[OLT Scheduler] Scheduler de desconexiones de ONU iniciado (revisión cada minuto).');
};
