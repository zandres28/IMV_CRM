import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { TechnicalVisit, TechnicalVisitStatus, TechnicalVisitType } from '../entities/TechnicalVisit';
import { Technician } from '../entities/Technician';
import { User } from '../entities/User';
import { NotificationService } from '../services/NotificationService';
import { AuthRequest } from '../middlewares/auth.middleware';
import { hasPermission, isAdmin, PERMISSIONS } from '../utils/permissions';

const VALID_STATUSES: TechnicalVisitStatus[] = ['programada', 'en_progreso', 'completada', 'cancelada'];
const VALID_TYPES: TechnicalVisitType[] = ['instalacion', 'soporte', 'mantenimiento', 'reparacion', 'traslado', 'otro'];

export class TechnicalVisitController {
    private visitRepository = AppDataSource.getRepository(TechnicalVisit);
    private technicianRepository = AppDataSource.getRepository(Technician);

    /**
     * ¿El usuario autenticado es el técnico asignado de la visita?
     * Match por userId vinculado en technicians, o por nombre completo
     * ("firstName lastName"), los dos patrones ya usados en el código.
     */
    private isAssignedTechnician(user: AuthRequest['user'], technician?: Technician | null): boolean {
        if (!user || !technician) return false;
        if (technician.userId && technician.userId === user.id) return true;
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
        return (technician.name || '').trim().toLowerCase() === fullName;
    }

    /** 'YYYY-MM-DD' → 'dd/mm/yyyy' (para mensajes legibles) */
    private formatFecha(value: string | Date | null | undefined): string {
        if (!value) return '';
        const s = String(value).split('T')[0];
        const [y, m, d] = s.split('-');
        return y && m && d ? `${d}/${m}/${y}` : s;
    }

    /**
     * Notificación in-app al técnico asignado (patrón de InstallationController):
     * resolver usuario por userId → email → nombre fuzzy, y crear Notification
     * con link a la Agenda. No lanza errores (todo queda en try/catch).
     */
    private async notifyTechnician(visit: TechnicalVisit, kind: 'creada' | 'reagendada'): Promise<void> {
        try {
            const userRepo = AppDataSource.getRepository(User);
            const tech = visit.technician
                || (await this.technicianRepository.findOne({ where: { id: visit.technicianId } }));
            if (!tech) return;

            let techUser: User | null = null;
            if (tech.userId) {
                techUser = await userRepo.findOne({ where: { id: tech.userId } });
            }
            if (!techUser && tech.email) {
                techUser = await userRepo.findOne({ where: { email: tech.email } });
            }
            if (!techUser) {
                const normStr = (s: string) =>
                    (s || '').toLowerCase().trim().replace(/\s+/g, ' ')
                        .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const target = normStr(tech.name);
                const allUsers = await userRepo.find();
                techUser = allUsers.find(u => {
                    const fullName = normStr(`${u.firstName || ''} ${u.lastName || ''}`);
                    return fullName === target || fullName.includes(target) || target.includes(fullName);
                }) || null;
            }
            if (!techUser) {
                console.warn(`[Visitas] Sin usuario CRM para el técnico "${tech.name}". Vincúlalo en Administración > Técnicos.`);
                return;
            }

            const clientName = visit.client?.fullName || `Cliente #${visit.clientId}`;
            const fecha = this.formatFecha(visit.scheduledDate);
            const franja = visit.timeSlot ? ` (${visit.timeSlot})` : '';
            const message = kind === 'creada'
                ? `Nueva visita pendiente - Cliente: ${clientName} - ${fecha}${franja}`
                : `Visita reagendada - Cliente: ${clientName} - ${fecha}${franja}`;

            await NotificationService.create(techUser, message, '/installations/agenda');
            console.log(`[Visitas] ✓ Notificación "${kind}" enviada a ${techUser.email}`);
        } catch (error) {
            console.error('Error al notificar al técnico de la visita:', error);
        }
    }

    /**
     * GET /api/technical-visits?from=YYYY-MM-DD&to=YYYY-MM-DD&clientId=&technicianId=&status=
     * Alcance: admin/operador ven todas las visitas; el técnico (permiso
     * installations.assigned) SOLO las asignadas a él.
     */
    async list(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user || null, PERMISSIONS.VISITS.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver visitas técnicas' });
            }

            const { from, to, clientId, technicianId, status } = req.query as {
                from?: string; to?: string; clientId?: string; technicianId?: string; status?: string;
            };

            let qb = this.visitRepository.createQueryBuilder('visit')
                .leftJoinAndSelect('visit.client', 'client')
                .leftJoinAndSelect('visit.technician', 'technician')
                .orderBy('visit.scheduledDate', 'ASC')
                .addOrderBy('visit.timeSlot', 'ASC')
                .addOrderBy('visit.id', 'ASC');

            if (from) qb = qb.andWhere('visit.scheduledDate >= :from', { from });
            if (to) qb = qb.andWhere('visit.scheduledDate <= :to', { to });
            if (clientId) qb = qb.andWhere('visit.clientId = :clientId', { clientId: parseInt(clientId, 10) });
            if (technicianId) qb = qb.andWhere('visit.technicianId = :technicianId', { technicianId: parseInt(technicianId, 10) });
            if (status) qb = qb.andWhere('visit.status = :status', { status });

            // Scope de técnico: si tiene installations.assigned (y no es admin),
            // solo ve las visitas asignadas a él.
            const user = req.user!;
            const assignedOnly = !isAdmin(user) && hasPermission(user, PERMISSIONS.INSTALLATIONS.ASSIGNED);
            if (assignedOnly) {
                const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim().toLowerCase();
                qb = qb.andWhere(
                    '(technician.userId = :userId OR LOWER(TRIM(technician.name)) = :techName)',
                    { userId: user.id, techName: fullName }
                );
            }

            const visits = await qb.getMany();
            return res.json(visits);
        } catch (error) {
            console.error('Error listando visitas técnicas:', error);
            return res.status(500).json({ message: 'Error al obtener visitas técnicas' });
        }
    }

    /**
     * POST /api/technical-visits — programar una visita
     */
    async create(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user || null, PERMISSIONS.VISITS.CREATE)) {
                return res.status(403).json({ message: 'No tienes permiso para programar visitas' });
            }

            const { clientId, installationId, technicianId, visitType, scheduledDate, timeSlot, address, notes } = req.body;

            if (!clientId || isNaN(Number(clientId))) {
                return res.status(400).json({ message: 'Cliente inválido' });
            }
            if (!technicianId || isNaN(Number(technicianId))) {
                return res.status(400).json({ message: 'Debes seleccionar un técnico' });
            }
            if (!scheduledDate) {
                return res.status(400).json({ message: 'Debes indicar la fecha de la visita' });
            }
            if (visitType && !VALID_TYPES.includes(visitType)) {
                return res.status(400).json({ message: 'Tipo de visita inválido' });
            }

            const technician = await this.technicianRepository.findOne({ where: { id: parseInt(technicianId, 10) } });
            if (!technician) {
                return res.status(404).json({ message: 'Técnico no encontrado' });
            }
            if (technician.isActive === false) {
                return res.status(400).json({ message: `El técnico "${technician.name}" está inactivo` });
            }

            const visit = this.visitRepository.create({
                clientId: parseInt(clientId, 10),
                installationId: installationId ? parseInt(installationId, 10) : null,
                technicianId: technician.id,
                visitType: (visitType || 'soporte') as TechnicalVisitType,
                scheduledDate,
                timeSlot: timeSlot || null,
                address: address || null,
                notes: notes || null,
                status: 'programada',
                createdById: req.user!.id,
            });

            const saved = await this.visitRepository.save(visit);
            const full = await this.visitRepository.findOne({
                where: { id: saved.id },
                relations: { client: true, technician: true },
            });

            // Notificar al técnico que tiene una visita pendiente
            if (full) await this.notifyTechnician(full, 'creada');

            return res.status(201).json({ message: 'Visita programada correctamente', data: full });
        } catch (error) {
            console.error('Error creando visita técnica:', error);
            return res.status(500).json({ message: 'Error al programar la visita' });
        }
    }

    /**
     * PUT /api/technical-visits/:id
     *  - Con visits.edit (admin/operador): edición completa — reasigna fecha,
     *    técnico, tipo, dirección, notas y estado.
     *  - Solo técnico asignado: puede cambiar ESTADO y NOTAS (no fecha/técnico).
     */
    async update(req: AuthRequest, res: Response) {
        try {
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

            const visit = await this.visitRepository.findOne({
                where: { id },
                relations: { client: true, technician: true },
            });
            if (!visit) return res.status(404).json({ message: 'Visita no encontrada' });

            const user = req.user!;
            const canEdit = hasPermission(user, PERMISSIONS.VISITS.EDIT);
            const isAssigned = this.isAssignedTechnician(user, visit.technician);

            if (!canEdit && !isAssigned) {
                return res.status(403).json({ message: 'No tienes permiso para modificar esta visita' });
            }

            const body = req.body || {};
            let technicianChanged = false;
            let dateChanged = false;

            if (!canEdit) {
                // Técnico asignado: solo estado y notas — NO reasigna fecha/técnico
                const reassigningTech = body.technicianId !== undefined && Number(body.technicianId) !== visit.technicianId;
                const reassigningDate = body.scheduledDate !== undefined && String(body.scheduledDate) !== String(visit.scheduledDate);
                if (reassigningTech || reassigningDate) {
                    return res.status(403).json({
                        message: 'Solo un usuario con permiso de gestión puede reasignar la fecha o el técnico de la visita',
                    });
                }
                if (body.status !== undefined) {
                    if (!VALID_STATUSES.includes(body.status)) {
                        return res.status(400).json({ message: 'Estado inválido' });
                    }
                    visit.status = body.status;
                }
                if (body.notes !== undefined) visit.notes = body.notes || null;
            } else {
                if (body.technicianId !== undefined) {
                    if (isNaN(Number(body.technicianId))) {
                        return res.status(400).json({ message: 'Técnico inválido' });
                    }
                    const technician = await this.technicianRepository.findOne({ where: { id: parseInt(body.technicianId, 10) } });
                    if (!technician) return res.status(404).json({ message: 'Técnico no encontrado' });
                    if (technician.id !== visit.technicianId) technicianChanged = true;
                    visit.technicianId = technician.id;
                    visit.technician = technician;
                }
                if (body.scheduledDate !== undefined) {
                    if (!body.scheduledDate) return res.status(400).json({ message: 'La fecha es obligatoria' });
                    if (String(body.scheduledDate) !== String(visit.scheduledDate)) dateChanged = true;
                    visit.scheduledDate = body.scheduledDate;
                }
                if (body.timeSlot !== undefined) visit.timeSlot = body.timeSlot || null;
                if (body.visitType !== undefined) {
                    if (!VALID_TYPES.includes(body.visitType)) {
                        return res.status(400).json({ message: 'Tipo de visita inválido' });
                    }
                    visit.visitType = body.visitType;
                }
                if (body.status !== undefined) {
                    if (!VALID_STATUSES.includes(body.status)) {
                        return res.status(400).json({ message: 'Estado inválido' });
                    }
                    visit.status = body.status;
                }
                if (body.address !== undefined) visit.address = body.address || null;
                if (body.notes !== undefined) visit.notes = body.notes || null;
            }

            await this.visitRepository.save(visit);
            const full = await this.visitRepository.findOne({
                where: { id: visit.id },
                relations: { client: true, technician: true },
            });

            // Reasignación de técnico o reagendado → avisar al técnico asignado
            if (full && (technicianChanged || dateChanged)) {
                await this.notifyTechnician(full, 'reagendada');
            }

            return res.json({ message: 'Visita actualizada correctamente', data: full });
        } catch (error) {
            console.error('Error actualizando visita técnica:', error);
            return res.status(500).json({ message: 'Error al actualizar la visita' });
        }
    }

    /**
     * DELETE /api/technical-visits/:id
     */
    async remove(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user || null, PERMISSIONS.VISITS.EDIT)) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar visitas' });
            }
            const id = parseInt(req.params.id, 10);
            if (isNaN(id)) return res.status(400).json({ message: 'ID inválido' });

            const visit = await this.visitRepository.findOne({ where: { id } });
            if (!visit) return res.status(404).json({ message: 'Visita no encontrada' });

            await this.visitRepository.remove(visit);
            return res.json({ message: 'Visita eliminada correctamente' });
        } catch (error) {
            console.error('Error eliminando visita técnica:', error);
            return res.status(500).json({ message: 'Error al eliminar la visita' });
        }
    }
}
