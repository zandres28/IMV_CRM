import { Router } from 'express';
import { PermissionController } from '../controllers/PermissionController';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requirePermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';

const router = Router();

// Todas las rutas requieren autenticación y permiso de gestión de permisos
router.use(authMiddleware);
router.use(requirePermission(PERMISSIONS.ADMIN.PERMISSIONS.MANAGE));

// Obtener todos los permisos disponibles
router.get('/all', PermissionController.getAllPermissions);

// Obtener matriz de permisos por defecto
router.get('/defaults', PermissionController.getDefaultRolePermissions);

// Obtener permisos de un rol específico
router.get('/role/:roleId', PermissionController.getRolePermissions);

// Actualizar permisos de un rol
router.put('/role/:roleId', PermissionController.updateRolePermissions);

// Restaurar permisos por defecto de un rol
router.post('/role/:roleId/restore', PermissionController.restoreDefaultPermissions);

export default router;
