import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Role } from "../entities/Role";

const roleRepository = AppDataSource.getRepository(Role);

export const RoleController = {
    // Obtener todos los roles
    getAll: async (_req: Request, res: Response) => {
        try {
            const roles = await roleRepository.find();
            return res.json(roles);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los roles", error });
        }
    },

    // Obtener un rol por ID
    getById: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const role = await roleRepository.findOneBy({ id: parseInt(id) });
            
            if (!role) {
                return res.status(404).json({ message: "Rol no encontrado" });
            }

            return res.json(role);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener el rol", error });
        }
    },

    // Crear un nuevo rol
    create: async (req: Request, res: Response) => {
        try {
            const newRole = roleRepository.create(req.body);
            const result = await roleRepository.save(newRole);
            return res.status(201).json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al crear el rol", error });
        }
    },

    // Actualizar un rol
    update: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const role = await roleRepository.findOneBy({ id: parseInt(id) });
            
            if (!role) {
                return res.status(404).json({ message: "Rol no encontrado" });
            }

            roleRepository.merge(role, req.body);
            const result = await roleRepository.save(role);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar el rol", error });
        }
    },

    // Eliminar un rol (soft delete - solo desactivar)
    delete: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const role = await roleRepository.findOneBy({ id: parseInt(id) });
            
            if (!role) {
                return res.status(404).json({ message: "Rol no encontrado" });
            }

            role.isActive = false;
            await roleRepository.save(role);

            return res.json({ message: "Rol desactivado con éxito" });
        } catch (error) {
            return res.status(500).json({ message: "Error al desactivar el rol", error });
        }
    }
};