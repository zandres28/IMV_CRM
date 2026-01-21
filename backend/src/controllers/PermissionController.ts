import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Role } from '../entities/Role';
import { PERMISSIONS, ROLE_PERMISSIONS } from '../utils/permissions';

const roleRepository = AppDataSource.getRepository(Role);

export const PermissionController = {
  /**
   * Obtener todos los permisos disponibles en el sistema
   */
  getAllPermissions: async (_req: Request, res: Response) => {
    try {
      // Convertir el objeto PERMISSIONS en un array plano
      const flattenPermissions = (obj: any, prefix = ''): any[] => {
        let result: any[] = [];
        
        for (const key in obj) {
          const value = obj[key];
          const newPrefix = prefix ? `${prefix}.${key}` : key;
          
          if (typeof value === 'string') {
            result.push({
              key: value,
              label: newPrefix,
              description: getPermissionDescription(value)
            });
          } else if (typeof value === 'object') {
            result = result.concat(flattenPermissions(value, newPrefix));
          }
        }
        
        return result;
      };

      const permissions = flattenPermissions(PERMISSIONS);
      
      return res.json({
        permissions,
        grouped: PERMISSIONS
      });
    } catch (error) {
      console.error('Error al obtener permisos:', error);
      return res.status(500).json({ 
        message: 'Error al obtener permisos', 
        error 
      });
    }
  },

  /**
   * Obtener permisos de un rol específico
   */
  getRolePermissions: async (req: Request, res: Response) => {
    try {
      const { roleId } = req.params;
      
      const role = await roleRepository.findOne({
        where: { id: parseInt(roleId) }
      });

      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }

      return res.json({
        role: {
          id: role.id,
          name: role.name,
          description: role.description
        },
        permissions: role.permissions || []
      });
    } catch (error) {
      console.error('Error al obtener permisos del rol:', error);
      return res.status(500).json({ 
        message: 'Error al obtener permisos del rol', 
        error 
      });
    }
  },

  /**
   * Actualizar permisos de un rol
   */
  updateRolePermissions: async (req: Request, res: Response) => {
    try {
      const { roleId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return res.status(400).json({ 
          message: 'Los permisos deben ser un array' 
        });
      }

      const role = await roleRepository.findOne({
        where: { id: parseInt(roleId) }
      });

      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }

      role.permissions = permissions;
      await roleRepository.save(role);

      return res.json({
        message: 'Permisos actualizados correctamente',
        role: {
          id: role.id,
          name: role.name,
          permissions: role.permissions
        }
      });
    } catch (error) {
      console.error('Error al actualizar permisos:', error);
      return res.status(500).json({ 
        message: 'Error al actualizar permisos', 
        error 
      });
    }
  },

  /**
   * Obtener matriz de permisos por defecto de todos los roles
   */
  getDefaultRolePermissions: async (_req: Request, res: Response) => {
    try {
      return res.json({
        matrix: ROLE_PERMISSIONS,
        roles: Object.keys(ROLE_PERMISSIONS)
      });
    } catch (error) {
      console.error('Error al obtener matriz de permisos:', error);
      return res.status(500).json({ 
        message: 'Error al obtener matriz de permisos', 
        error 
      });
    }
  },

  /**
   * Restaurar permisos por defecto de un rol
   */
  restoreDefaultPermissions: async (req: Request, res: Response) => {
    try {
      const { roleId } = req.params;

      const role = await roleRepository.findOne({
        where: { id: parseInt(roleId) }
      });

      if (!role) {
        return res.status(404).json({ message: 'Rol no encontrado' });
      }

      const defaultPermissions = ROLE_PERMISSIONS[role.name as keyof typeof ROLE_PERMISSIONS];

      if (!defaultPermissions) {
        return res.status(400).json({ 
          message: 'No hay permisos por defecto para este rol' 
        });
      }

      role.permissions = defaultPermissions;
      await roleRepository.save(role);

      return res.json({
        message: 'Permisos restaurados a valores por defecto',
        role: {
          id: role.id,
          name: role.name,
          permissions: role.permissions
        }
      });
    } catch (error) {
      console.error('Error al restaurar permisos:', error);
      return res.status(500).json({ 
        message: 'Error al restaurar permisos', 
        error 
      });
    }
  }
};

/**
 * Función auxiliar para obtener descripción de un permiso
 */
function getPermissionDescription(permission: string): string {
  const descriptions: Record<string, string> = {
    // Clientes
    'clients.list.view': 'Ver listado de clientes',
    'clients.list.create': 'Crear nuevos clientes',
    'clients.list.edit': 'Editar información de clientes',
    'clients.list.delete': 'Eliminar clientes',
    'clients.crm.view': 'Ver interacciones CRM',
    'clients.crm.create': 'Crear interacciones CRM',
    'clients.crm.edit': 'Editar interacciones CRM',
    'clients.outages.view': 'Ver caídas de servicio',
    'clients.outages.create': 'Reportar caídas de servicio',
    'clients.outages.edit': 'Editar caídas de servicio',
    'clients.outages.delete': 'Eliminar caídas de servicio',
    
    // Facturación
    'billing.view': 'Ver facturación',
    'billing.create': 'Generar facturas',
    'billing.edit': 'Editar facturas',
    'billing.delete': 'Eliminar facturas',
    'billing.own': 'Ver solo su propia facturación',
    
    // Instalaciones
    'installations.view': 'Ver instalaciones',
    'installations.create': 'Crear instalaciones',
    'installations.edit': 'Editar instalaciones',
    'installations.delete': 'Eliminar instalaciones',
    'installations.assigned': 'Ver solo instalaciones asignadas',
    
    // Consultas
    'queries.view': 'Acceder a consultas',
    'queries.own': 'Ver solo sus propios datos',
    'queries.all': 'Ver datos de todos los usuarios',
    
    // Administración - Usuarios
    'admin.users.view': 'Ver todos los usuarios',
    'admin.users.view.own': 'Ver solo su propio perfil',
    'admin.users.create': 'Crear usuarios',
    'admin.users.edit': 'Editar usuarios',
    'admin.users.edit.own': 'Editar solo su propio perfil',
    'admin.users.delete': 'Eliminar usuarios',
    
    // Administración - Planes
    'admin.plans.view': 'Ver planes de servicio',
    'admin.plans.create': 'Crear planes de servicio',
    'admin.plans.edit': 'Editar planes de servicio',
    'admin.plans.delete': 'Eliminar planes de servicio',
    
    // Administración - Técnicos
    'admin.technicians.view': 'Ver técnicos',
    'admin.technicians.create': 'Crear técnicos',
    'admin.technicians.edit': 'Editar técnicos',
    'admin.technicians.delete': 'Eliminar técnicos',
    
    // Administración - Permisos
    'admin.permissions.manage': 'Gestionar permisos del sistema'
  };

  return descriptions[permission] || permission;
}
