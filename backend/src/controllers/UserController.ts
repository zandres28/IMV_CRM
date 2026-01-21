import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Role } from "../entities/Role";
import * as bcrypt from "bcryptjs";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);

export const UserController = {
    // Obtener todos los usuarios (solo admin)
    getAll: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar si tiene permiso para ver todos los usuarios
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.USERS.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver todos los usuarios' 
                });
            }

            const users = await userRepository.find({
                relations: ["roles"],
                select: ["id", "firstName", "lastName", "email", "isActive", "created_at", "updated_at"]
            });
            return res.json(users);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los usuarios", error });
        }
    },

    // Obtener un usuario por ID
    getById: async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const requestedUserId = parseInt(id);

            // Verificar permisos: admin puede ver todos, usuario solo su propio perfil
            const canViewAll = hasPermission(req.user, PERMISSIONS.ADMIN.USERS.VIEW);
            const canViewOwn = hasPermission(req.user, PERMISSIONS.ADMIN.USERS.VIEW_OWN);
            const isOwnProfile = req.user?.id === requestedUserId;

            if (!canViewAll && !(canViewOwn && isOwnProfile)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver este usuario' 
                });
            }

            const user = await userRepository.findOne({
                where: { id: requestedUserId },
                relations: ["roles"],
                select: ["id", "firstName", "lastName", "email", "isActive", "created_at", "updated_at"]
            });
            
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            return res.json(user);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener el usuario", error });
        }
    },

    // Crear un nuevo usuario
    create: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para crear usuarios
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.USERS.CREATE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para crear usuarios' 
                });
            }

            const { password, roleIds, ...userData } = req.body;
            
            // Validar campos requeridos
            if (!userData.email || !password || !userData.firstName || !userData.lastName) {
                return res.status(400).json({ 
                    message: "Email, contraseña, nombre y apellido son requeridos" 
                });
            }

            // Verificar que el email no exista
            const existingUser = await userRepository.findOne({ where: { email: userData.email } });
            if (existingUser) {
                return res.status(400).json({ 
                    message: "El email ya está registrado" 
                });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            
            // Buscar roles si se proporcionaron IDs
            let roles: Role[] = [];
            if (roleIds && roleIds.length > 0) {
                roles = await roleRepository.findByIds(roleIds);
            }

            const newUser = userRepository.create({
                ...userData,
                password: hashedPassword,
                roles
            });
            
            const savedUser = await userRepository.save(newUser);
            
            // Recargar con relaciones
            const userWithRoles = await userRepository.findOne({
                where: { id: (savedUser as any).id },
                relations: ["roles"]
            });
            
            const { password: _, ...userWithoutPassword } = userWithRoles as any;
            
            return res.status(201).json(userWithoutPassword);
        } catch (error) {
            console.error("Error al crear usuario:", error);
            return res.status(500).json({ message: "Error al crear el usuario", error });
        }
    },

    // Actualizar un usuario
    update: async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { password, roleIds, ...updateData } = req.body;
            const targetUserId = parseInt(id);
            
            // Verificar permisos: admin puede editar todos, usuario solo su propio perfil
            const canEditAll = hasPermission(req.user, PERMISSIONS.ADMIN.USERS.EDIT);
            const canEditOwn = hasPermission(req.user, PERMISSIONS.ADMIN.USERS.EDIT_OWN);
            const isOwnProfile = req.user?.id === targetUserId;

            if (!canEditAll && !(canEditOwn && isOwnProfile)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para editar este usuario' 
                });
            }

            const user = await userRepository.findOne({
                where: { id: targetUserId },
                relations: ["roles"]
            });
            
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            // Si se proporciona nueva contraseña, hashearla
            if (password) {
                updateData.password = await bcrypt.hash(password, 10);
            }

            // Si se proporcionan roleIds, actualizar roles (solo admin puede cambiar roles)
            if (roleIds !== undefined) {
                if (!canEditAll) {
                    return res.status(403).json({ 
                        message: 'Solo el administrador puede cambiar roles' 
                    });
                }
                
                if (roleIds.length > 0) {
                    const roles = await roleRepository.findByIds(roleIds);
                    user.roles = roles;
                } else {
                    user.roles = [];
                }
            }

            // Actualizar otros campos
            userRepository.merge(user, updateData);
            const result = await userRepository.save(user);
            
            // Recargar con relaciones
            const updatedUser = await userRepository.findOne({
                where: { id: result.id },
                relations: ["roles"]
            });
            
            const { password: _, ...userWithoutPassword } = updatedUser as any;
            
            return res.json(userWithoutPassword);
        } catch (error) {
            console.error("Error al actualizar usuario:", error);
            return res.status(500).json({ message: "Error al actualizar el usuario", error });
        }
    },

    // Eliminar un usuario (soft delete - solo desactivar)
    delete: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para eliminar usuarios
            if (!hasPermission(req.user, PERMISSIONS.ADMIN.USERS.DELETE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para eliminar usuarios' 
                });
            }

            const { id } = req.params;
            const targetUserId = parseInt(id);

            // No permitir que un usuario se elimine a sí mismo
            if (req.user?.id === targetUserId) {
                return res.status(400).json({ 
                    message: 'No puedes eliminar tu propia cuenta' 
                });
            }

            const user = await userRepository.findOneBy({ id: targetUserId });
            
            if (!user) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }

            user.isActive = false;
            await userRepository.save(user);

            return res.json({ message: "Usuario desactivado con éxito" });
        } catch (error) {
            return res.status(500).json({ message: "Error al desactivar el usuario", error });
        }
    }
};