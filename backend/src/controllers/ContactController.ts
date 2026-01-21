import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Contact } from "../entities/Contact";

const contactRepository = AppDataSource.getRepository(Contact);

export const ContactController = {
    // Obtener todos los contactos
    getAll: async (_req: Request, res: Response) => {
        try {
            const contacts = await contactRepository.find({
                relations: ["client"]
            });
            return res.json(contacts);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los contactos", error });
        }
    },

    // Obtener contactos por cliente
    getByClient: async (req: Request, res: Response) => {
        try {
            const { clientId } = req.params;
            const contacts = await contactRepository.find({
                where: { client: { id: parseInt(clientId) } },
                relations: ["client"]
            });
            return res.json(contacts);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los contactos del cliente", error });
        }
    },

    // Crear un nuevo contacto
    create: async (req: Request, res: Response) => {
        try {
            const newContact = contactRepository.create(req.body);
            const result = await contactRepository.save(newContact);
            return res.status(201).json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al crear el contacto", error });
        }
    },

    // Actualizar un contacto
    update: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const contact = await contactRepository.findOneBy({ id: parseInt(id) });
            
            if (!contact) {
                return res.status(404).json({ message: "Contacto no encontrado" });
            }

            contactRepository.merge(contact, req.body);
            const result = await contactRepository.save(contact);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar el contacto", error });
        }
    },

    // Eliminar un contacto
    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const result = await contactRepository.delete(id);
            
            if (result.affected === 0) {
                return res.status(404).json({ message: "Contacto no encontrado" });
            }

            return res.json({ message: "Contacto eliminado con éxito" });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar el contacto", error });
        }
    }
};