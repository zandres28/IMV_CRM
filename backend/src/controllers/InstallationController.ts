import { Response } from 'express';
import { In } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Installation } from '../entities/Installation';
import { SpeedHistory } from '../entities/SpeedHistory';
import { Client } from '../entities/Client';
import { ServicePlan } from '../entities/ServicePlan';
import { Payment } from '../entities/Payment';
import { AuthRequest } from '../middlewares/auth.middleware';
import { hasPermission, PERMISSIONS, getDataScopeForUser } from '../utils/permissions';
import { createNoteInteraction } from '../utils/interactionUtils';
import { OltService } from '../services/OltService';

export class InstallationController {
    private installationRepository = AppDataSource.getRepository(Installation);
    private speedHistoryRepository = AppDataSource.getRepository(SpeedHistory);
    private clientRepository = AppDataSource.getRepository(Client);

    // Convierte 'YYYY-MM-DD' a fecha local para evitar desfases por zona horaria
    private parseLocalDate(value: string | Date | undefined): Date | undefined {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (/T/.test(value)) return new Date(value);
        const [y, m, d] = value.split('-').map(Number);
        if (!y || !m || !d) return new Date(value);
        return new Date(y, m - 1, d);
    }

    async createInstallation(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para crear instalaciones
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.CREATE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para crear instalaciones' 
                });
            }
            const {
                clientId,
                servicePlanId,
                serviceType,
                speedMbps,
                routerModel,
                onuSerialNumber,
                ipAddress,
                technician,
                notes,
                monthlyFee,
                installationDate,
                ponId,
                onuId,
                napLabel,
                installationFee,
            } = req.body;

            const client = await this.clientRepository.findOne({ where: { id: clientId } });
            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            const installation = this.installationRepository.create({
                client,
                serviceType,
                speedMbps,
                routerModel,
                onuSerialNumber,
                ponId,
                onuId,
                napLabel,
                ipAddress,
                technician,
                notes,
                monthlyFee,
                installationFee: installationFee || 0,
                installationDate: this.parseLocalDate(installationDate)!,
                isActive: true,
                isDeleted: false,
                deletedAt: null,
            });

            // Validate ONU-SN uniqueness if provided
            if (onuSerialNumber) {
                const existing = await this.installationRepository.findOne({ where: { onuSerialNumber } });
                if (existing) {
                    return res.status(409).json({ message: 'El ONU-SN ya está asignado a otra instalación' });
                }
            }

            // If a servicePlanId is provided, link it and snapshot its values
            if (servicePlanId) {
                const plan = await AppDataSource.getRepository(ServicePlan).findOne({ where: { id: parseInt(servicePlanId) } });
                if (plan) {
                    installation.servicePlan = plan;
                    installation.serviceType = plan.name;
                    installation.speedMbps = plan.speedMbps;
                    installation.monthlyFee = Number(plan.monthlyFee);
                }
            }

            await this.installationRepository.save(installation);

            // Crear interacción si hay nota
            if (notes) {
                await createNoteInteraction(
                    client.id, 
                    notes, 
                    'Instalación (Creación)', 
                    req.user ? req.user.id : undefined
                );
            }

            // Crear pago inmediato si hay installationFee > 0
            if (installationFee && Number(installationFee) > 0) {
                const paymentRepo = AppDataSource.getRepository(Payment);
                const instDate = this.parseLocalDate(installationDate)!;
                const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
                
                const payment = paymentRepo.create({
                    client,
                    installation,
                    amount: Number(installationFee),
                    paymentMonth: monthNames[instDate.getMonth()],
                    paymentYear: instDate.getFullYear(),
                    dueDate: instDate, // Vence el mismo día de la instalación
                    status: 'paid', // Se marca inmediatamente como pagado
                    paymentDate: instDate,
                    paymentType: 'installation',
                    servicePlanAmount: 0,
                    additionalServicesAmount: 0,
                    productInstallmentsAmount: 0,
                    installationFeeAmount: Number(installationFee),
                    outageDiscountAmount: 0,
                    outageDays: 0,
                    notes: 'Cobro de instalación'
                });

                await paymentRepo.save(payment);
            }

            return res.status(201).json(installation);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al crear la instalación' });
        }
    }

    async getInstallationsByClient(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para ver instalaciones
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver instalaciones' 
                });
            }

            const { clientId } = req.params;
            const includeDeleted = String(req.query.includeDeleted || 'false') === 'true';
            const where: any = { client: { id: parseInt(clientId) } };
            if (!includeDeleted) where.isDeleted = false;

            // Filtrar por técnico si no es admin
            const dataScope = getDataScopeForUser(req.user!);
            if (dataScope === 'assigned') {
                // Solo técnico puede ver sus instalaciones asignadas
                const technicianName = `${req.user!.firstName} ${req.user!.lastName}`;
                where.technician = technicianName;
            }
            // Si es 'all' (admin/operador), no aplica filtro adicional
            // Si es 'own' (usuario), no debería tener acceso a instalaciones (permiso denegado arriba)
            const installations = await this.installationRepository.find({
                where,
                relations: ['speedHistory', 'servicePlan'],
                order: { created_at: 'DESC' }
            });
            return res.json(installations);
        } catch (error: any) {
            console.error('Error en getInstallationsByClient:', error);
            console.error('Stack:', error.stack);
            return res.status(500).json({ message: 'Error al obtener las instalaciones', error: error.message });
        }
    }

    async updateInstallation(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso básico para editar instalaciones
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para editar instalaciones' 
                });
            }
            const { id } = req.params;
            const {
                servicePlanId,
                serviceType,
                speedMbps,
                routerModel,
                onuSerialNumber,
                ipAddress,
                technician,
                notes,
                monthlyFee,
                installationFee,
                serviceStatus,
                installationDate,
                retirementDate,
                ponId,
                onuId,
                napLabel,
            } = req.body;

            const installation = await this.installationRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['servicePlan', 'client']
            });

            if (!installation) {
                return res.status(404).json({ message: 'Instalación no encontrada' });
            }

            // If servicePlanId provided, update relation and snapshot values
            if (servicePlanId) {
                const plan = await AppDataSource.getRepository(ServicePlan).findOne({ where: { id: parseInt(servicePlanId) } });
                if (plan) {
                    // If speed changes due to plan change, log history
                    if (plan.speedMbps !== installation.speedMbps) {
                        const history = new SpeedHistory();
                        history.installation = { id: installation.id } as Installation;
                        history.previousSpeed = installation.speedMbps;
                        history.newSpeed = plan.speedMbps;
                        history.reason = (req.body.speedChangeReason || 'Cambio de plan') as string;
                        await this.speedHistoryRepository.save(history);
                    }

                    installation.servicePlan = plan;
                    installation.serviceType = plan.name;
                    installation.speedMbps = plan.speedMbps;
                    installation.monthlyFee = Number(plan.monthlyFee);
                }
            }

            // Validate ONU-SN uniqueness if changed/provided
            if (onuSerialNumber && onuSerialNumber !== installation.onuSerialNumber) {
                const existing = await this.installationRepository.findOne({ where: { onuSerialNumber } });
                if (existing && existing.id !== installation.id) {
                    return res.status(409).json({ message: 'El ONU-SN ya está asignado a otra instalación' });
                }
                installation.onuSerialNumber = onuSerialNumber;
            }

            // If speed explicitly provided and different, log history
            if (speedMbps !== undefined && speedMbps !== installation.speedMbps) {
                const history2 = new SpeedHistory();
                history2.installation = { id: installation.id } as Installation;
                history2.previousSpeed = installation.speedMbps;
                history2.newSpeed = speedMbps;
                history2.reason = (req.body.speedChangeReason || 'Actualización de velocidad') as string;
                await this.speedHistoryRepository.save(history2);
                installation.speedMbps = speedMbps;
            }

            const updateFields: any = {
                routerModel,
                ipAddress,
                technician,
                notes,
                serviceStatus,
                installationDate: installationDate ? this.parseLocalDate(installationDate)! : installation.installationDate,
                retirementDate: retirementDate ? this.parseLocalDate(retirementDate) : (retirementDate === null ? null : installation.retirementDate)
            };
            if (ponId !== undefined) updateFields.ponId = ponId;
            if (onuId !== undefined) updateFields.onuId = onuId;
            if (napLabel !== undefined) updateFields.napLabel = napLabel;
            if (monthlyFee !== undefined) {
                updateFields.monthlyFee = monthlyFee;
            }
            if (installationFee !== undefined) {
                updateFields.installationFee = installationFee;
            }

            // Crear interacción si la nota ha cambiado y no está vacía
            if (notes !== undefined && notes !== installation.notes && notes.trim() !== '') {
                if (installation.client) {
                     await createNoteInteraction(
                        installation.client.id, 
                        notes, 
                        'Instalación (Actualización)', 
                        req.user ? req.user.id : undefined
                    );
                }
            }

            Object.assign(installation, updateFields);

            // Sincronizar isActive con serviceStatus
            if (serviceStatus) {
                installation.isActive = serviceStatus === 'active';
            }

            await this.installationRepository.save(installation);

            // Recargar la instalación con el historial actualizado
            const updatedInstallation = await this.installationRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['speedHistory', 'servicePlan']
            });
            if (updatedInstallation) {
                console.log('[SpeedHistory] Response size:', updatedInstallation.speedHistory?.length || 0);
            }

            return res.json(updatedInstallation);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al actualizar la instalación' });
        }
    }

    async getSpeedHistory(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para ver instalaciones
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver el historial de velocidad' 
                });
            }
            const { installationId } = req.params;
            const speedHistory = await this.speedHistoryRepository.find({
                where: { installation: { id: parseInt(installationId) } },
                order: { changeDate: 'DESC' }
            });
            return res.json(speedHistory);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al obtener el historial de velocidad' });
        }
    }

    async changeServiceStatus(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para editar instalaciones
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para cambiar el estado del servicio' 
                });
            }
            const { id } = req.params;
            const { serviceStatus } = req.body;

            const installation = await this.installationRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!installation) {
                return res.status(404).json({ message: 'Instalación no encontrada' });
            }

            installation.serviceStatus = serviceStatus;
            installation.isActive = serviceStatus === 'active';

            await this.installationRepository.save(installation);
            return res.json(installation);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al cambiar el estado del servicio' });
        }
    }

    /**
     * Eliminar una instalación.
     * Reglas propuestas:
     *  - Permitir eliminación de instalaciones en cualquier estado (active/suspended/cancelled)
     *    siempre que no existan pagos mensuales PENDIENTES o VENCIDOS asociados explícitamente a esta instalación.
     *  - Si hay pagos 'pending' u 'overdue' vinculados (campo installation_id en payments), bloquear.
     *  - Si la instalación está activa, se permite eliminar (se asume que el negocio desea limpieza manual),
     *    pero podría requerir confirmación en frontend.
     */
    async deleteInstallation(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para eliminar instalaciones
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.DELETE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para eliminar instalaciones' 
                });
            }
            const { id } = req.params;
            const installationId = parseInt(id);

            const installation = await this.installationRepository.findOne({ where: { id: installationId } });
            if (!installation) {
                return res.status(404).json({ message: 'Instalación no encontrada' });
            }

            // Soft delete: marcar como eliminada y desvincular payments
            if (installation.isDeleted) {
                return res.status(200).json({ message: 'La instalación ya estaba eliminada' });
            }

            installation.isDeleted = true;
            installation.deletedAt = new Date();
            await this.installationRepository.save(installation);

            // Desasociar pagos de esta instalación para evitar referencias a una instalación eliminada
            const paymentRepo = AppDataSource.getRepository(Payment);
            await paymentRepo
                .createQueryBuilder()
                .update(Payment)
                .set({ installation: null as any })
                .where('installationId = :installationId', { installationId })
                .execute();

            return res.json({ message: 'Instalación eliminada (soft delete) con éxito' });
        } catch (error: any) {
            console.error('Error al eliminar instalación:', error);
            // Traducir errores de FK si aparecieran (poco probable debido a cascade en SpeedHistory)
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    message: 'No se puede eliminar: la instalación tiene datos asociados',
                    hint: 'Revisa pagos u otros registros vinculados antes de eliminar',
                    detail: error.sqlMessage
                });
            }
            return res.status(500).json({ message: 'Error al eliminar la instalación', error: error.message || error });
        }
    }

    async restoreInstallation(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para editar instalaciones (restaurar requiere edición)
            if (!hasPermission(req.user || null, PERMISSIONS.INSTALLATIONS.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para restaurar instalaciones' 
                });
            }
            const { id } = req.params;
            const installationId = parseInt(id);

            const installation = await this.installationRepository.findOne({ where: { id: installationId } });
            if (!installation) return res.status(404).json({ message: 'Instalación no encontrada' });

            installation.isDeleted = false;
            installation.deletedAt = null;
            await this.installationRepository.save(installation);
            return res.json({ message: 'Instalación restaurada con éxito' });
        } catch (error) {
            console.error('Error al restaurar instalación:', error);
            return res.status(500).json({ message: 'Error al restaurar la instalación' });
        }
    }
}