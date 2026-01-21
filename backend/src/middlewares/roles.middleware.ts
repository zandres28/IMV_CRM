import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/**
 * Middleware para verificar que el usuario tenga al menos uno de los roles especificados
 * Debe usarse después del authMiddleware
 */
export const requireRoles = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userRoles = req.user.roles.map(role => role.name);
    const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      return res.status(403).json({ 
        message: 'No tienes permisos para acceder a este recurso',
        requiredRoles: allowedRoles,
        userRoles
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario tenga TODOS los roles especificados
 */
export const requireAllRoles = (...requiredRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userRoles = req.user.roles.map(role => role.name);
    const hasAllRoles = requiredRoles.every(role => userRoles.includes(role));

    if (!hasAllRoles) {
      return res.status(403).json({ 
        message: 'No tienes todos los permisos necesarios para este recurso',
        requiredRoles,
        userRoles
      });
    }

    next();
  };
};

/**
 * Middleware para verificar que el usuario sea administrador
 */
export const requireAdmin = requireRoles('admin');

/**
 * Middleware para permitir acceso al propio usuario o a un administrador
 */
export const requireSelfOrAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }

  const requestedUserId = parseInt(req.params.id);
  const isOwnProfile = req.user.id === requestedUserId;
  const isAdmin = req.user.roles.some(role => role.name === 'admin');

  if (!isOwnProfile && !isAdmin) {
    return res.status(403).json({ 
      message: 'Solo puedes acceder a tu propio perfil o ser administrador'
    });
  }

  next();
};
