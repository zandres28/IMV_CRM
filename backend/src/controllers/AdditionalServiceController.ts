import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { AdditionalService } from '../entities/AdditionalService';
import { Client } from '../entities/Client';
import { createNoteInteraction } from '../utils/interactionUtils';

export class AdditionalServiceController {
    private serviceRepository = AppDataSource.getRepository(AdditionalService);
    private clientRepository = AppDataSource.getRepository(Client);

    async create(req: Request, res: Response) {
        try {
            const { clientId, serviceName, monthlyFee, startDate, endDate, notes } = req.body;
            
            const client = await this.clientRepository.findOne({ where: { id: clientId } });
            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            const service = new AdditionalService();
            service.client = client;
            service.serviceName = serviceName;
            service.monthlyFee = monthlyFee;
            service.startDate = new Date(startDate);
            if (endDate) {
                service.endDate = new Date(endDate);
            }
            service.notes = notes || '';

            await this.serviceRepository.save(service);

            if (notes) {
                await createNoteInteraction(
                    clientId, 
                    notes, 
                    'Servicio Adicional (Creación)', 
                    (req as any).user?.id
                );
            }

            return res.status(201).json(service);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al crear el servicio adicional' });
        }
    }

    async getByClient(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const services = await this.serviceRepository.find({
                where: { client: { id: parseInt(clientId) } },
                order: { created_at: 'DESC' }
            });
            return res.json(services);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al obtener los servicios' });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { serviceName, monthlyFee, startDate, endDate, status, notes } = req.body;

            const service = await this.serviceRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ['client']
            });
            if (!service) {
                return res.status(404).json({ message: 'Servicio no encontrado' });
            }

            // Crear interacción si la nota cambia
            if (notes !== undefined && notes !== service.notes && notes.trim() !== '') {
                 if (service.client) {
                    await createNoteInteraction(
                        service.client.id, 
                        notes, 
                        'Servicio Adicional (Actualización)', 
                        (req as any).user?.id
                    );
                 }
            }

            Object.assign(service, {
                serviceName,
                monthlyFee,
                startDate: new Date(startDate),
                endDate: endDate ? new Date(endDate) : null,
                status,
                notes
            });

            await this.serviceRepository.save(service);
            return res.json(service);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al actualizar el servicio' });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.serviceRepository.delete(id);
            if (result.affected === 0) {
                return res.status(404).json({ message: 'Servicio no encontrado' });
            }
            return res.status(204).send();
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al eliminar el servicio' });
        }
    }
}