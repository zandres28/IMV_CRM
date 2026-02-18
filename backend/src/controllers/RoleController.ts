import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Role } from "../entities/Role";
import { PERMISSIONS } from "../utils/permissions";

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
    
    // Obtener la lista de todos los permisos disponibles
    getAvailablePermissions: (req: Request, res: Response) => {
        try {
            // Aplanamos la estructura de PERMISSIONS para enviarla al frontend
            const permissionList: {id: string, label: string, group: string}[] = [];
            
            // Función recursiva para recorrer el objeto de permisos
            const flattenPermissions = (obj: any, prefix = '') => {
                for (const key in obj) {
                    if (typeof obj[key] === 'string') {
                        // Generar un label más amigable: "clients.list.view" -> "Clients List View"
                        const id = obj[key] as string;
                        const group = prefix ? prefix.slice(0, -1) : id.split('.')[0] || 'GENERAL';
                        
                        permissionList.push({
                            id: id,
                            label: id, 
                            group: group
                        });
                    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                        flattenPermissions(obj[key], prefix + key + '.');
                    }
                }
            };

            flattenPermissions(PERMISSIONS);
            
            return res.json(permissionList);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener permisos disponibles", error });
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

            const { name, description, permissions, isActive } = req.body;

            if (role.name === 'admin' && name && name !== 'admin') {
                return res.status(400).json({ message: "No se puede cambiar el nombre del rol admin" });
            }

            if (name) role.name = name;
            if (description !== undefined) role.description = description;
            if (permissions) role.permissions = permissions;
            if (typeof isActive === 'boolean') role.isActive = isActive;

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

            if (role.name === 'admin') {
                return res.status(403).json({ message: "No se puede eliminar el rol de administrador" });
            }

            role.isActive = false;
            await roleRepository.save(role);

            return res.json({ message: "Rol desactivado con éxito" });
        } catch (error) {
            return res.status(500).json({ message: "Error al desactivar el rol", error });
        }
    }
};
