import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Opportunity } from "../entities/Opportunity";
import { createNoteInteraction } from "../utils/interactionUtils";

const opportunityRepository = AppDataSource.getRepository(Opportunity);

export const OpportunityController = {
    // Obtener todas las oportunidades
    getAll: async (_req: Request, res: Response) => {
        try {
            const opportunities = await opportunityRepository.find({
                relations: ["client"],
                order: { created_at: "DESC" }
            });
            return res.json(opportunities);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener las oportunidades", error });
        }
    },

    // Obtener oportunidades por cliente
    getByClient: async (req: Request, res: Response) => {
        try {
            const { clientId } = req.params;
            const opportunities = await opportunityRepository.find({
                where: { client: { id: parseInt(clientId) } },
                relations: ["client"],
                order: { created_at: "DESC" }
            });
            return res.json(opportunities);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener las oportunidades del cliente", error });
        }
    },

    // Crear una nueva oportunidad
    create: async (req: Request, res: Response) => {
        try {
            const newOpportunity = opportunityRepository.create(req.body);
            const result = await opportunityRepository.save(newOpportunity) as any;
            
            if (req.body.notes && result.client) {
                // Manejar si client es objeto o ID
                const clientId = typeof result.client === 'object' ? (result.client as any).id : result.client;
                if (clientId) {
                    await createNoteInteraction(
                        clientId, 
                        req.body.notes, 
                        'Oportunidad (Creación)', 
                        (req as any).user?.id
                    );
                }
            }

            return res.status(201).json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al crear la oportunidad", error });
        }
    },

    // Actualizar una oportunidad
    update: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const opportunity = await opportunityRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ["client"]
            });
            
            if (!opportunity) {
                return res.status(404).json({ message: "Oportunidad no encontrada" });
            }

            // Crear interacción si la nota cambia
            if (req.body.notes !== undefined && req.body.notes !== opportunity.notes && req.body.notes.trim() !== '') {
                if (opportunity.client) {
                     await createNoteInteraction(
                        opportunity.client.id, 
                        req.body.notes, 
                        'Oportunidad (Actualización)', 
                        (req as any).user?.id
                    );
                }
            }

            opportunityRepository.merge(opportunity, req.body);
            const result = await opportunityRepository.save(opportunity);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar la oportunidad", error });
        }
    },

    // Eliminar una oportunidad
    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const result = await opportunityRepository.delete(id);
            
            if (result.affected === 0) {
                return res.status(404).json({ message: "Oportunidad no encontrada" });
            }

            return res.json({ message: "Oportunidad eliminada con éxito" });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar la oportunidad", error });
        }
    }
};