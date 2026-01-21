import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { InteractionType } from "../entities/InteractionType";

const repository = AppDataSource.getRepository(InteractionType);

export const InteractionTypeController = {
    getAll: async (_req: Request, res: Response) => {
        try {
            const types = await repository.find({ order: { name: 'ASC' } });
            res.json(types);
        } catch (error) {
            res.status(500).json({ message: "Error al obtener tipos de interacción", error });
        }
    },

    create: async (req: Request, res: Response) => {
        try {
            const { name, description } = req.body;
            const newType = repository.create({ name, description });
            await repository.save(newType);
            res.status(201).json(newType);
        } catch (error: any) {
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(400).json({ message: "El tipo de interacción ya existe" });
            }
            res.status(500).json({ message: "Error al crear tipo de interacción", error });
        }
    },

    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const type = await repository.findOneBy({ id: parseInt(id) });
            
            if (!type) {
                return res.status(404).json({ message: "Tipo no encontrado" });
            }

            if (type.isSystem) {
                return res.status(400).json({ message: "No se pueden eliminar tipos de sistema" });
            }

            await repository.remove(type);
            res.json({ message: "Tipo eliminado correctamente" });
        } catch (error) {
            res.status(500).json({ message: "Error al eliminar tipo", error });
        }
    }
};
