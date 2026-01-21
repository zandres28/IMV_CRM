import { Response } from "express";
import { AppDataSource } from "../config/database";
import { Interaction } from "../entities/Interaction";
import { Between, In } from "typeorm";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";

const interactionRepository = AppDataSource.getRepository(Interaction);

export const InteractionController = {
    // Obtener todas las interacciones con filtros
    getAll: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver interacciones CRM' 
                });
            }
            const { interactionTypeId, status, priority, clientId, technicianId, startDate, endDate } = req.query;
            
            const where: any = {};
            
            if (interactionTypeId) where.interactionTypeId = parseInt(interactionTypeId as string);
            if (status) where.status = status;
            if (priority) where.priority = priority;
            if (clientId) where.clientId = parseInt(clientId as string);
            if (technicianId) where.assignedToTechnicianId = parseInt(technicianId as string);
            
            if (startDate && endDate) {
                where.created_at = Between(new Date(startDate as string), new Date(endDate as string));
            }

            const interactions = await interactionRepository.find({
                where,
                order: { created_at: "DESC" },
                relations: ["interactionType", "client", "assignedToTechnician"]
            });
            
            return res.json(interactions);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener las interacciones", error });
        }
    },

    // Obtener una interacción por ID
    getById: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver interacciones CRM' 
                });
            }
            const { id } = req.params;
            const interaction = await interactionRepository.findOne({
                where: { id: parseInt(id) }
            });
            
            if (!interaction) {
                return res.status(404).json({ message: "Interacción no encontrada" });
            }
            
            return res.json(interaction);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener la interacción", error });
        }
    },

    // Obtener interacciones por cliente
    getByClient: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver interacciones CRM' 
                });
            }
            const { clientId } = req.params;
            const interactions = await interactionRepository.find({
                where: { clientId: parseInt(clientId) },
                order: { created_at: "DESC" }
            });
            return res.json(interactions);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener las interacciones del cliente", error });
        }
    },

    // Obtener estadísticas
    getStats: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver estadísticas CRM' 
                });
            }
            const total = await interactionRepository.count();
            const pendientes = await interactionRepository.count({ where: { status: 'pendiente' } });
            const enProgreso = await interactionRepository.count({ where: { status: 'en_progreso' } });
            const completados = await interactionRepository.count({ where: { status: 'completado' } });
            const urgentes = await interactionRepository.count({ where: { priority: 'urgente' } });
            
            const porTipo = await interactionRepository
                .createQueryBuilder('interaction')
                .leftJoin('interaction.interactionType', 'typeRelation')
                .select('typeRelation.name', 'type')
                .addSelect('COUNT(*)', 'count')
                .groupBy('typeRelation.name')
                .getRawMany();

            return res.json({
                total,
                pendientes,
                enProgreso,
                completados,
                urgentes,
                porTipo
            });
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener estadísticas", error });
        }
    },

    // Crear una nueva interacción
    create: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para crear interacciones CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.CREATE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para crear interacciones CRM' 
                });
            }
            const newInteraction = interactionRepository.create(req.body);
            const result = await interactionRepository.save(newInteraction);
            return res.status(201).json(result);
        } catch (error) {
            console.error('Error creando interacción:', error);
            return res.status(500).json({ message: "Error al crear la interacción", error });
        }
    },

    // Actualizar una interacción
    update: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para editar interacciones CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para editar interacciones CRM' 
                });
            }
            const { id } = req.params;
            const interaction = await interactionRepository.findOne({
                where: { id: parseInt(id) }
            });
            
            if (!interaction) {
                return res.status(404).json({ message: "Interacción no encontrada" });
            }

            interactionRepository.merge(interaction, req.body);
            const result = await interactionRepository.save(interaction);
            
            // Recargar con relaciones
            const updated = await interactionRepository.findOne({
                where: { id: result.id }
            });
            
            return res.json(updated);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar la interacción", error });
        }
    },

    // Actualizar estado
    updateStatus: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para editar interacciones CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para actualizar el estado' 
                });
            }
            const { id } = req.params;
            const { status, resolution, completedDate } = req.body;
            
            const interaction = await interactionRepository.findOne({
                where: { id: parseInt(id) }
            });
            
            if (!interaction) {
                return res.status(404).json({ message: "Interacción no encontrada" });
            }

            interaction.status = status;
            if (resolution) interaction.resolution = resolution;
            if (status === 'completado' && !interaction.completedDate) {
                interaction.completedDate = completedDate || new Date();
            }
            
            const result = await interactionRepository.save(interaction);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar el estado", error });
        }
    },

    // Asignar técnico
    assignTechnician: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para editar interacciones CRM
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para asignar técnicos' 
                });
            }
            const { id } = req.params;
            const { technicianId } = req.body;
            
            const interaction = await interactionRepository.findOne({
                where: { id: parseInt(id) }
            });
            
            if (!interaction) {
                return res.status(404).json({ message: "Interacción no encontrada" });
            }

            interaction.assignedToTechnicianId = technicianId;
            if (interaction.status === 'pendiente') {
                interaction.status = 'en_progreso';
            }
            
            const result = await interactionRepository.save(interaction);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al asignar técnico", error });
        }
    },

    // Eliminar una interacción
    delete: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para editar interacciones CRM (delete no está en la matriz, usamos edit)
            if (!hasPermission(req.user, PERMISSIONS.CLIENTS.CRM.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para eliminar interacciones CRM' 
                });
            }
            const { id } = req.params;
            const result = await interactionRepository.delete(id);
            
            if (result.affected === 0) {
                return res.status(404).json({ message: "Interacción no encontrada" });
            }

            return res.json({ message: "Interacción eliminada con éxito" });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar la interacción", error });
        }
    }
};