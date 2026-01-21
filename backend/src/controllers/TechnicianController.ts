import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Technician } from '../entities/Technician';
import { AuthRequest } from '../middlewares/auth.middleware';
import { hasPermission, PERMISSIONS } from '../utils/permissions';

export class TechnicianController {
    private technicianRepository = AppDataSource.getRepository(Technician);

    async create(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.TECHNICIANS.CREATE)) {
                return res.status(403).json({ message: 'No tienes permiso para crear técnicos' });
            }
            const { name, phone, email } = req.body;
            const tech = this.technicianRepository.create({ name, phone, email, isActive: true });
            await this.technicianRepository.save(tech);
            return res.status(201).json(tech);
        } catch (error) {
            console.error('Error creating technician', error);
            return res.status(500).json({ message: 'Error creating technician', error: error instanceof Error ? error.message : error });
        }
    }

    async getAll(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.TECHNICIANS.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver técnicos' });
            }
            const techs = await this.technicianRepository.find({ order: { name: 'ASC' } });
            return res.json(techs);
        } catch (error) {
            console.error('Error getting technicians', error);
            return res.status(500).json({ message: 'Error getting technicians', error: error instanceof Error ? error.message : error });
        }
    }

    async getById(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.TECHNICIANS.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver técnicos' });
            }
            const { id } = req.params;
            const tech = await this.technicianRepository.findOne({ where: { id: parseInt(id) } });
            if (!tech) return res.status(404).json({ message: 'Technician not found' });
            return res.json(tech);
        } catch (error) {
            console.error('Error getting technician by id', error);
            return res.status(500).json({ message: 'Error getting technician', error: error instanceof Error ? error.message : error });
        }
    }

    async update(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.TECHNICIANS.EDIT)) {
                return res.status(403).json({ message: 'No tienes permiso para editar técnicos' });
            }
            const { id } = req.params;
            const { name, phone, email, isActive } = req.body;
            const tech = await this.technicianRepository.findOne({ where: { id: parseInt(id) } });
            if (!tech) return res.status(404).json({ message: 'Technician not found' });
            Object.assign(tech, { name, phone, email, isActive });
            await this.technicianRepository.save(tech);
            return res.json(tech);
        } catch (error) {
            console.error('Error updating technician', error);
            return res.status(500).json({ message: 'Error updating technician', error: error instanceof Error ? error.message : error });
        }
    }

    async delete(req: AuthRequest, res: Response) {
        try {
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.TECHNICIANS.DELETE)) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar técnicos' });
            }
            const { id } = req.params;
            const tech = await this.technicianRepository.findOne({ where: { id: parseInt(id) } });
            if (!tech) return res.status(404).json({ message: 'Technician not found' });
            tech.isActive = false;
            await this.technicianRepository.save(tech);
            return res.json({ message: 'Technician deactivated' });
        } catch (error) {
            console.error('Error deleting technician', error);
            return res.status(500).json({ message: 'Error deleting technician', error: error instanceof Error ? error.message : error });
        }
    }
}
