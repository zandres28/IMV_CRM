import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { ServicePlan } from '../entities/ServicePlan';
import { AuthRequest } from '../middlewares/auth.middleware';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

export class ServicePlanController {
    private planRepository = AppDataSource.getRepository(ServicePlan);

    async create(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.PLANS.CREATE)) {
                return res.status(403).json({ message: 'No tienes permiso para crear planes' });
            }
            const { name, speedMbps, monthlyFee, installationFee, sucursal } = req.body;
            // Heredar sucursal del usuario creador si no se especifica
            const planSucursal = sucursal || req.user?.sucursal || 'CALI';
            const plan = this.planRepository.create({ name, speedMbps, monthlyFee, installationFee, isActive: true, sucursal: planSucursal });
            await this.planRepository.save(plan);
            return res.status(201).json(plan);
        } catch (error) {
            console.error('Error creating plan', error);
            return res.status(500).json({ message: 'Error creating plan', error: error instanceof Error ? error.message : error });
        }
    }

    async getAll(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.PLANS.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver planes' });
            }
            // Admin global (sin sucursal) ve todos; los demás solo los de su sucursal
            const userSucursal = req.user?.sucursal;
            const where = userSucursal ? { sucursal: userSucursal } : {};
            const plans = await this.planRepository.find({ where, order: { speedMbps: 'ASC' } });
            return res.json(plans);
        } catch (error) {
            console.error('Error getting plans', error);
            return res.status(500).json({ message: 'Error getting plans', error: error instanceof Error ? error.message : error });
        }
    }

    async getActive(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.PLANS.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver planes' });
            }
            const userSucursal = req.user?.sucursal;
            const where: any = { isActive: true };
            if (userSucursal) where.sucursal = userSucursal;
            const plans = await this.planRepository.find({ where, order: { speedMbps: 'ASC' } });
            return res.json(plans);
        } catch (error) {
            console.error('Error getting active plans', error);
            return res.status(500).json({ message: 'Error getting active plans', error: error instanceof Error ? error.message : error });
        }
    }

    async getPublicList(req: any, res: Response) {
        try {
            // Permite filtrar por sucursal via query param: /api/plans/public?sucursal=PASTO
            const sucursal = req.query?.sucursal as string | undefined;
            const where: any = { isActive: true };
            if (sucursal) where.sucursal = sucursal.toUpperCase();
            const plans = await this.planRepository.find({ 
                where,
                select: ['id', 'name', 'speedMbps', 'monthlyFee', 'installationFee'],
                order: { speedMbps: 'ASC' } 
            });
            return res.json(plans);
        } catch (error) {
            console.error('Error getting public plans', error);
            return res.status(500).json({ message: 'Error getting plans' });
        }
    }

    async getById(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.PLANS.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver planes' });
            }
            const { id } = req.params;
            const plan = await this.planRepository.findOne({ where: { id: parseInt(id) } });
            if (!plan) return res.status(404).json({ message: 'Plan not found' });
            return res.json(plan);
        } catch (error) {
            console.error('Error getting plan by id', error);
            return res.status(500).json({ message: 'Error getting plan', error: error instanceof Error ? error.message : error });
        }
    }

    async update(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.PLANS.EDIT)) {
                return res.status(403).json({ message: 'No tienes permiso para editar planes' });
            }
            const { id } = req.params;
            const { name, speedMbps, monthlyFee, installationFee, isActive } = req.body;
            const plan = await this.planRepository.findOne({ where: { id: parseInt(id) } });
            if (!plan) return res.status(404).json({ message: 'Plan not found' });
            Object.assign(plan, { name, speedMbps, monthlyFee, installationFee, isActive });
            await this.planRepository.save(plan);
            return res.json(plan);
        } catch (error) {
            console.error('Error updating plan', error);
            return res.status(500).json({ message: 'Error updating plan', error: error instanceof Error ? error.message : error });
        }
    }

    async delete(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.PLANS.DELETE)) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar planes' });
            }
            const { id } = req.params;
            const plan = await this.planRepository.findOne({ where: { id: parseInt(id) } });
            if (!plan) return res.status(404).json({ message: 'Plan not found' });
            plan.isActive = false;
            await this.planRepository.save(plan);
            return res.json({ message: 'Plan deactivated' });
        } catch (error) {
            console.error('Error deleting plan', error);
            return res.status(500).json({ message: 'Error deleting plan', error: error instanceof Error ? error.message : error });
        }
    }
}
