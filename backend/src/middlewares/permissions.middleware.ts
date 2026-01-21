import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { hasPermission, hasAnyPermission, isAdmin } from '../utils/permissions';

/**
 * Middleware para verificar que el usuario tenga un permiso específico
 */
export const requirePermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Debug log
    // console.log(`[PermissionsMiddleware] Checking permission: ${permission} for user: ${req.user.email}`);
    // if (req.user.roles) {
    //     req.user.roles.forEach(r => {
    //         console.log(`[PermissionsMiddleware] Role: ${r.name}, Permissions: ${JSON.stringify(r.permissions)}`);
    //     });
    // }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        message: 'No tienes permiso para realizar esta acción',
        requiredPermission: permission
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario tenga al menos uno de los permisos
 */
export const requireAnyPermission = (...permissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!hasAnyPermission(req.user, permissions)) {
      return res.status(403).json({ 
        message: 'No tienes ninguno de los permisos necesarios para esta acción',
        requiredPermissions: permissions
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario acceda solo a sus propios datos
 * o sea administrador
 */
export const requireSelfOrPermission = (permission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const requestedUserId = parseInt(req.params.id || req.params.userId || '0');
    const isOwnData = req.user.id === requestedUserId;
    const hasRequiredPermission = hasPermission(req.user, permission);

    if (!isOwnData && !hasRequiredPermission) {
      return res.status(403).json({ 
        message: 'Solo puedes acceder a tus propios datos o necesitas el permiso adecuado'
      });
    }

    // Agregar flag para indicar si está accediendo a sus propios datos
    req.isOwnData = isOwnData;
    next();
  };
};

/**
 * Middleware para verificar acceso a datos según scope
 * Permite: admin (todo), usuario con permiso (todo), o propio usuario (solo sus datos)
 */
export const requireDataAccess = (options: {
  allDataPermission?: string;  // Permiso para ver todos los datos
  ownDataPermission?: string;  // Permiso para ver solo sus datos
  assignedDataPermission?: string; // Permiso para ver datos asignados
}) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Admin siempre tiene acceso
    if (isAdmin(req.user)) {
      req.dataScope = 'all';
      return next();
    }

    // Verificar permiso para todos los datos
    if (options.allDataPermission && hasPermission(req.user, options.allDataPermission)) {
      req.dataScope = 'all';
      return next();
    }

    // Verificar permiso para datos asignados (técnicos)
    if (options.assignedDataPermission && hasPermission(req.user, options.assignedDataPermission)) {
      req.dataScope = 'assigned';
      req.assignedUserId = req.user.id;
      return next();
    }

    // Verificar permiso para datos propios
    if (options.ownDataPermission && hasPermission(req.user, options.ownDataPermission)) {
      req.dataScope = 'own';
      req.ownUserId = req.user.id;
      return next();
    }

    return res.status(403).json({ 
      message: 'No tienes permiso para acceder a estos datos'
    });
  };
};

// Extender el tipo AuthRequest
declare module './auth.middleware' {
  interface AuthRequest {
    isOwnData?: boolean;
    dataScope?: 'all' | 'own' | 'assigned';
    ownUserId?: number;
    assignedUserId?: number;
  }
}
