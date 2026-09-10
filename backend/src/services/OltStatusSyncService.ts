import cron from 'node-cron';
import { AppDataSource } from '../config/database';
import { Installation } from '../entities/Installation';
import { Payment } from '../entities/Payment';
import { OltService } from './OltService';
import { In, IsNull, LessThan, Not } from 'typeorm';

/**
 * Sincroniza el estado de servicio desde la OLT hacia el CRM.
 *
 * Criterio de suspensión: una ONU con `ControlFlag === 0` fue desactivada
 * deliberadamente en la OLT (onu_deactive). `RunningState === 0` NO basta:
 * una ONU habilitada (ControlFlag=1) puede estar offline por corte de
 * energía o ONT apagada y NO debe tratarse como suspensión.
 *
 * Todo pasa por el OltService (caché estática 30s + single-flight), de modo
 * que una ejecución del sync = 1 sola llamada HTTP a la OLT (regla anti-flood).
 */
export async function syncSuspendedInstallations(): Promise<{
    checked: number;
    suspended: number;
    errors: string[];
}> {
    const installationRepo = AppDataSource.getRepository(Installation);
    const errors: string[] = [];

    const oltService = new OltService();
    const onus = await oltService.getAllOnus();
    const onuBySn = new Map(
        onus
            .filter(o => o.PonSn)
            .map(o => [o.PonSn.toUpperCase(), o])
    );

    // Solo instalaciones activas en CRM con serial: las suspendidas ya lo están
    // y las retiradas no se tocan.
    const active = await installationRepo.find({
        where: {
            serviceStatus: 'activo',
            isDeleted: false,
            onuSerialNumber: Not(IsNull()),
        },
        relations: ['client'],
    });

    let suspended = 0;
    for (const installation of active) {
        if (!installation.onuSerialNumber) continue;

        const onu = onuBySn.get(installation.onuSerialNumber.toUpperCase());
        if (!onu) continue;

        if (onu.ControlFlag !== 0) continue;

        try {
            installation.serviceStatus = 'suspendido';
            installation.suspendedAt = installation.suspendedAt || new Date();
            await installationRepo.save(installation);
            suspended++;
            console.log(
                `[OLT Sync] Suspendida instalación #${installation.id}` +
                ` (${installation.client?.fullName ?? '?'}, SN=${installation.onuSerialNumber}, ${onu.PonId}/${onu.OnuId})`
            );
        } catch (e: any) {
            errors.push(`instalación #${installation.id}: ${e.message}`);
        }
    }

    return { checked: active.length, suspended, errors };
}

/**
 * Reactiva en la OLT todas las instalaciones suspendidas de un cliente y
 * devuelve las instalaciones que quedaron activas. Se llama tras registrar un
 * pago.
 *
 * VALIDACIÓN DE DEUDA: antes de reactivar, verifica si el cliente aún tiene
 * facturas vencidas (status pendiente/vencido con dueDate < hoy). Si tiene
 * deuda pendiente, NO reactiva — el pago no cubrió lo adeudado. Si ya no
 * tiene deudas vencidas, procede a reactivar.
 *
 * No lanza errores: cualquier fallo en la OLT se registra y el resto
 * de instalaciones del cliente se procesan igual.
 */
export async function restoreServiceForClient(clientId: number): Promise<{ reactivated: number; failed: string[] }> {
    const installationRepo = AppDataSource.getRepository(Installation);
    const failed: string[] = [];

    const suspended = await installationRepo.find({
        where: { serviceStatus: 'suspendido', client: { id: clientId }, isDeleted: false },
        relations: ['client'],
    });

    if (suspended.length === 0) {
        return { reactivated: 0, failed };
    }

    // Verificar si el cliente aún tiene facturas PENDIENTES de pagar cuya
    // fecha de vencimiento ya llegó (hoy inclusive — el mes anterior vence
    // precisamente hoy). Si las tiene, el pago registrado NO correspondió a
    // la deuda adeudada (o la saldó solo en parte) y el servicio NO debe
    // reactivarse. Solo cuando la deuda vencida queda saldada se reactiva.
    const paymentRepo = AppDataSource.getRepository(Payment);
    const pendingPayments = await paymentRepo.find({
        where: {
            client: { id: clientId },
            status: In(['pendiente', 'vencido']),
        },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overduePayments = pendingPayments.filter(p => {
        if (!p.dueDate) return false;
        const due = new Date(p.dueDate);
        due.setHours(0, 0, 0, 0);
        return due.getTime() <= today.getTime();
    });

    if (overduePayments.length > 0) {
        const totalDeuda = overduePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
        console.log(
            `[OLT Sync] Cliente ${clientId} (${suspended[0].client?.fullName ?? '?'}): ` +
            `aún tiene ${overduePayments.length} factura(s) vencida(s) por $${totalDeuda.toLocaleString('es-CO')}. ` +
            `Servicio NO reactivado.`
        );
        return { reactivated: 0, failed };
    }

    const oltService = new OltService();

    for (const installation of suspended) {
        try {
            // Buscar la ONU por serial primero (posición actual en la OLT,
            // soporta cambios de puerto). Fallback a ponId/onuId de BD.
            let ponId: string | null = null;
            let onuId: number | null = null;

            if (installation.onuSerialNumber) {
                const onu = await oltService.getOnuBySerial(installation.onuSerialNumber);
                if (onu) {
                    ponId = onu.PonId;
                    onuId = onu.OnuId;
                }
            }
            if (!ponId || onuId === null) {
                if (installation.ponId && installation.onuId) {
                    ponId = installation.ponId;
                    onuId = parseInt(installation.onuId, 10);
                }
            }
            if (!ponId || onuId === null) {
                failed.push(`instalación #${installation.id}: sin datos OLT para reactivar`);
                continue;
            }

            await oltService.activateOnu(ponId, String(onuId));
            // Registrar la posición actual por si el ONU cambió de puerto
            if (installation.ponId !== ponId) installation.ponId = ponId;
            if (Number(installation.onuId) !== onuId) installation.onuId = String(onuId);

            installation.serviceStatus = 'activo';
            installation.suspendedAt = null;
            await installationRepo.save(installation);
            console.log(
                `[OLT Sync] Reactivada instalación #${installation.id}` +
                ` (${installation.client?.fullName ?? '?'}, SN=${installation.onuSerialNumber}, ${ponId}/${onuId})`
            );
        } catch (e: any) {
            failed.push(`instalación #${installation.id}: ${e.message}`);
            console.error(`[OLT Sync] Error reactivando instalación #${installation.id}:`, e.message);
        }
    }

    const reactivated = suspended.length - failed.length;
    return { reactivated, failed };
}

export function startOltStatusSync() {
    // Sync inicial al arrancar + cada 5 minutos
    const run = async () => {
        try {
            const result = await syncSuspendedInstallations();
            if (result.suspended > 0 || result.errors.length > 0) {
                console.log(
                    `[OLT Sync] Revisadas ${result.checked} instalaciones, ` +
                    `${result.suspended} suspendidas.` +
                    (result.errors.length ? ` Errores: ${result.errors.join(' | ')}` : '')
                );
            }
        } catch (error: any) {
            console.error(`[OLT Sync] Error general: ${error.message}`);
        }
    };

    run();
    cron.schedule('*/5 * * * *', run, {
        timezone: process.env.TZ || 'America/Bogota',
    });

    console.log('[OLT Sync] Scheduler de sync estado OLT→CRM iniciado (cada 5 minutos).');
}