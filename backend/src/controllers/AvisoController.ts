import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AvisoTemplate } from '../entities/AvisoTemplate';
import { Client } from '../entities/Client';
import { Installation } from '../entities/Installation';
import { ServicePlan } from '../entities/ServicePlan';

// Helper: Formatear teléfono para WhatsApp (Colombia)
const formatPhone = (phone: string | null | undefined): string => {
    if (!phone) return '';
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('57') && clean.length === 12) return clean;
    if (clean.length === 10 && clean.startsWith('3')) return `57${clean}`;
    return clean;
};

export class AvisoController {

    // GET /api/avisos
    static async getAll(req: Request, res: Response) {
        try {
            const repo = AppDataSource.getRepository(AvisoTemplate);
            const templates = await repo.find({ order: { category: 'ASC', createdAt: 'DESC' } });
            return res.json(templates);
        } catch (error) {
            console.error('AvisoController.getAll error:', error);
            return res.status(500).json({ message: 'Error al obtener los avisos' });
        }
    }

    // POST /api/avisos
    static async create(req: Request, res: Response) {
        try {
            const { title, category, message, isActive } = req.body;
            if (!title || !message || !category) {
                return res.status(400).json({ message: 'title, category y message son requeridos' });
            }
            const repo = AppDataSource.getRepository(AvisoTemplate);
            const aviso = repo.create({ title: title.trim(), category, message: message.trim(), isActive: isActive !== false });
            await repo.save(aviso);
            return res.status(201).json(aviso);
        } catch (error) {
            console.error('AvisoController.create error:', error);
            return res.status(500).json({ message: 'Error al crear el aviso' });
        }
    }

    // PUT /api/avisos/:id
    static async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { title, category, message, isActive } = req.body;
            const repo = AppDataSource.getRepository(AvisoTemplate);
            const aviso = await repo.findOneBy({ id: Number(id) });
            if (!aviso) return res.status(404).json({ message: 'Aviso no encontrado' });

            if (title !== undefined) aviso.title = title.trim();
            if (category !== undefined) aviso.category = category;
            if (message !== undefined) aviso.message = message.trim();
            if (isActive !== undefined) aviso.isActive = isActive;

            await repo.save(aviso);
            return res.json(aviso);
        } catch (error) {
            console.error('AvisoController.update error:', error);
            return res.status(500).json({ message: 'Error al actualizar el aviso' });
        }
    }

    // DELETE /api/avisos/:id
    static async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const repo = AppDataSource.getRepository(AvisoTemplate);
            const aviso = await repo.findOneBy({ id: Number(id) });
            if (!aviso) return res.status(404).json({ message: 'Aviso no encontrado' });
            await repo.remove(aviso);
            return res.json({ message: 'Aviso eliminado correctamente' });
        } catch (error) {
            console.error('AvisoController.delete error:', error);
            return res.status(500).json({ message: 'Error al eliminar el aviso' });
        }
    }

    // POST /api/avisos/preview — Vista previa de destinatarios con filtros
    // Retorna count + primeros 5 nombres para confirmación
    static async preview(req: Request, res: Response) {
        try {
            const { ponId, planId, installationDateFrom, installationDateTo } = req.body as {
                ponId?: string;
                planId?: number;
                installationDateFrom?: string;
                installationDateTo?: string;
            };

            const recipients = await AvisoController._buildRecipients({ ponId, planId, installationDateFrom, installationDateTo });

            return res.json({
                count: recipients.length,
                sample: recipients.slice(0, 5).map(r => r.clientData.name),
            });
        } catch (error) {
            console.error('AvisoController.preview error:', error);
            return res.status(500).json({ message: 'Error al obtener vista previa de destinatarios' });
        }
    }

    // Helper compartido para construir la lista de destinatarios
    static async _buildRecipients(filters: {
        ponId?: string;
        planId?: number;
        installationDateFrom?: string;
        installationDateTo?: string;
    }) {
        const installationRepo = AppDataSource.getRepository(Installation);

        let qb = installationRepo
            .createQueryBuilder('inst')
            .innerJoinAndSelect('inst.client', 'client')
            .leftJoinAndSelect('inst.servicePlan', 'plan')
            .where('inst.isActive = :isActive', { isActive: true })
            .andWhere('inst.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('client.status = :status', { status: 'active' });

        if (filters.ponId && filters.ponId.trim() !== '') {
            qb = qb.andWhere('inst.ponId = :ponId', { ponId: filters.ponId.trim() });
        }

        if (filters.planId) {
            qb = qb.andWhere('plan.id = :planId', { planId: Number(filters.planId) });
        }

        if (filters.installationDateFrom) {
            qb = qb.andWhere('inst.installationDate >= :dateFrom', { dateFrom: filters.installationDateFrom });
        }

        if (filters.installationDateTo) {
            qb = qb.andWhere('inst.installationDate <= :dateTo', { dateTo: filters.installationDateTo });
        }

        const installations = await qb.getMany();

        // Deduplicar por cliente (un cliente puede tener varias instalaciones)
        const seen = new Set<number>();
        const recipients: Array<{ number: string; clientData: { id: number; name: string; phone: string } }> = [];

        for (const inst of installations) {
            const client = inst.client;
            if (!client || seen.has(client.id)) continue;
            const phone = formatPhone(client.primaryPhone);
            if (!phone) continue;
            seen.add(client.id);
            recipients.push({
                number: phone,
                clientData: { id: client.id, name: client.fullName, phone: client.primaryPhone }
            });
        }

        return recipients;
    }
}
