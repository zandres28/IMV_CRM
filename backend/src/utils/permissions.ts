import { User } from '../entities/User';

/**
 * Módulo de control de permisos
 * Define la estructura de permisos del sistema basado en la matriz de acceso
 */

// Definición de permisos disponibles en el sistema
export const PERMISSIONS = {
  // CLIENTES
  CLIENTS: {
    LIST: {
      VIEW: 'clients.list.view',
      CREATE: 'clients.list.create',
      EDIT: 'clients.list.edit',
      DELETE: 'clients.list.delete'
    },
    CRM: {
      VIEW: 'clients.crm.view',
      CREATE: 'clients.crm.create',
      EDIT: 'clients.crm.edit'
    },
    OUTAGES: {
      VIEW: 'clients.outages.view',
      CREATE: 'clients.outages.create',
      EDIT: 'clients.outages.edit',
      DELETE: 'clients.outages.delete'
    }
  },
  
  // FACTURACIÓN
  BILLING: {
    VIEW: 'billing.view',
    CREATE: 'billing.create',
    EDIT: 'billing.edit',
    DELETE: 'billing.delete',
    OWN: 'billing.own' // Solo ver su propia facturación
  },
  
  // INSTALACIONES
  INSTALLATIONS: {
    VIEW: 'installations.view',
    CREATE: 'installations.create',
    EDIT: 'installations.edit',
    DELETE: 'installations.delete',
    ASSIGNED: 'installations.assigned' // Solo ver instalaciones asignadas
  },

  // PLANES (General)
  PLANS: {
    VIEW: 'plans.view' // Ver planes (para dropdowns, etc)
  },
  
  // CONSULTAS
  QUERIES: {
    VIEW: 'queries.view',
    OWN: 'queries.own', // Solo ver sus propios datos
    ALL: 'queries.all'  // Ver datos de todos
  },
  
  // ADMINISTRACIÓN
  ADMIN: {
    USERS: {
      VIEW: 'admin.users.view',
      VIEW_OWN: 'admin.users.view.own', // Solo ver su propio perfil
      CREATE: 'admin.users.create',
      EDIT: 'admin.users.edit',
      EDIT_OWN: 'admin.users.edit.own', // Solo editar su propio perfil
      DELETE: 'admin.users.delete'
    },
    PLANS: {
      VIEW: 'admin.plans.view',
      CREATE: 'admin.plans.create',
      EDIT: 'admin.plans.edit',
      DELETE: 'admin.plans.delete'
    },
    TECHNICIANS: {
      VIEW: 'admin.technicians.view',
      CREATE: 'admin.technicians.create',
      EDIT: 'admin.technicians.edit',
      DELETE: 'admin.technicians.delete'
    },
    PERMISSIONS: {
      MANAGE: 'admin.permissions.manage'
    }
  }
} as const;

/**
 * Matriz de permisos por rol según la tabla de control de acceso
 */
export const ROLE_PERMISSIONS = {
  admin: [
    // Acceso total
    ...Object.values(PERMISSIONS.CLIENTS.LIST),
    ...Object.values(PERMISSIONS.CLIENTS.CRM),
    ...Object.values(PERMISSIONS.CLIENTS.OUTAGES),
    PERMISSIONS.BILLING.VIEW,
    PERMISSIONS.BILLING.CREATE,
    PERMISSIONS.BILLING.EDIT,
    PERMISSIONS.BILLING.DELETE,
    ...Object.values(PERMISSIONS.INSTALLATIONS).filter(p => p !== PERMISSIONS.INSTALLATIONS.ASSIGNED),
    PERMISSIONS.PLANS.VIEW,
    PERMISSIONS.QUERIES.VIEW,
    PERMISSIONS.QUERIES.ALL,
    ...Object.values(PERMISSIONS.ADMIN.USERS).filter(p => !p.includes('.own')),
    ...Object.values(PERMISSIONS.ADMIN.PLANS),
    ...Object.values(PERMISSIONS.ADMIN.TECHNICIANS),
    PERMISSIONS.ADMIN.PERMISSIONS.MANAGE
  ],
  
  operador: [
    // Clientes - Todo excepto borrar
    PERMISSIONS.CLIENTS.LIST.VIEW,
    PERMISSIONS.CLIENTS.LIST.CREATE,
    PERMISSIONS.CLIENTS.LIST.EDIT,
    PERMISSIONS.CLIENTS.CRM.VIEW,
    PERMISSIONS.CLIENTS.CRM.CREATE,
    PERMISSIONS.CLIENTS.CRM.EDIT,
    PERMISSIONS.CLIENTS.OUTAGES.VIEW,
    PERMISSIONS.CLIENTS.OUTAGES.CREATE,
    PERMISSIONS.CLIENTS.OUTAGES.EDIT,
    // Planes
    PERMISSIONS.PLANS.VIEW,
    // Consultas - Solo sus datos
    PERMISSIONS.QUERIES.VIEW,
    PERMISSIONS.QUERIES.OWN
  ],
  
  tecnico: [
    // Clientes - Solo lectura en listado y CRM
    PERMISSIONS.CLIENTS.LIST.VIEW,
    PERMISSIONS.CLIENTS.CRM.VIEW,
    // Caídas - Ver, crear, editar
    PERMISSIONS.CLIENTS.OUTAGES.VIEW,
    PERMISSIONS.CLIENTS.OUTAGES.CREATE,
    PERMISSIONS.CLIENTS.OUTAGES.EDIT,
    // Instalaciones - Solo las asignadas
    PERMISSIONS.INSTALLATIONS.VIEW,
    PERMISSIONS.INSTALLATIONS.EDIT,
    PERMISSIONS.INSTALLATIONS.ASSIGNED,
    // Planes
    PERMISSIONS.PLANS.VIEW,
    // Consultas - Solo sus datos
    PERMISSIONS.QUERIES.VIEW,
    PERMISSIONS.QUERIES.OWN,
    // Técnicos - Solo ver
    PERMISSIONS.ADMIN.TECHNICIANS.VIEW
  ],
  
  usuario: [
    // Clientes - Solo lectura
    PERMISSIONS.CLIENTS.LIST.VIEW,
    // Facturación - Solo sus datos
    PERMISSIONS.BILLING.VIEW,
    PERMISSIONS.BILLING.OWN,
    // Instalaciones - Ver
    PERMISSIONS.INSTALLATIONS.VIEW,
    // Planes - Ver
    PERMISSIONS.PLANS.VIEW,
    // Consultas - Solo sus datos
    PERMISSIONS.QUERIES.VIEW,
    PERMISSIONS.QUERIES.OWN,
    // Usuarios - Solo su propio perfil
    PERMISSIONS.ADMIN.USERS.VIEW_OWN,
    PERMISSIONS.ADMIN.USERS.EDIT_OWN
  ]
};

/**
 * Verifica si un usuario tiene un permiso específico
 */
export const hasPermission = (user: User | null | undefined, permission: string): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  // Verificar en todos los roles del usuario
  return user.roles.some(role => {
    if (!role.permissions) return false;
    
    let perms: string[] | string = role.permissions;
    
    // Handle case where TypeORM returns string instead of array
    if (typeof perms === 'string') {
        try {
            perms = JSON.parse(perms);
        } catch (e) {
            console.error('Error parsing permissions JSON:', e);
            return false;
        }
    }

    if (!Array.isArray(perms)) return false;
    return perms.includes(permission);
  });
};

/**
 * Verifica si un usuario tiene al menos uno de los permisos especificados
 */
export const hasAnyPermission = (user: User | null | undefined, permissions: string[]): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  return permissions.some(permission => hasPermission(user, permission));
};

/**
 * Verifica si un usuario tiene todos los permisos especificados
 */
export const hasAllPermissions = (user: User | null | undefined, permissions: string[]): boolean => {
  if (!user || !user.roles || user.roles.length === 0) {
    return false;
  }

  return permissions.every(permission => hasPermission(user, permission));
};

/**
 * Obtiene todos los permisos de un usuario
 */
export const getUserPermissions = (user: User | null | undefined): string[] => {
  if (!user || !user.roles || user.roles.length === 0) {
    return [];
  }

  const permissions = new Set<string>();
  user.roles.forEach(role => {
    if (role.permissions) {
      let perms: string[] | string = role.permissions;
      if (typeof perms === 'string') {
          try {
              perms = JSON.parse(perms);
          } catch (e) {
              return;
          }
      }
      if (Array.isArray(perms)) {
          perms.forEach(permission => permissions.add(permission));
      }
    }
  });

  return Array.from(permissions);
};

/**
 * Verifica si un usuario es administrador
 */
export const isAdmin = (user: User | null | undefined): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some(role => role.name === 'admin');
};

/**
 * Verifica si un usuario puede acceder a datos de otro usuario
 * (es admin o es el mismo usuario)
 */
export const canAccessUserData = (currentUser: User | null | undefined, targetUserId: number): boolean => {
  if (!currentUser) return false;
  if (isAdmin(currentUser)) return true;
  return currentUser.id === targetUserId;
};

/**
 * Filtra consultas/datos según los permisos del usuario
 */
export const getDataScopeForUser = (user: User | null | undefined): 'all' | 'own' | 'assigned' | 'none' => {
  if (!user) return 'none';
  
  if (isAdmin(user)) return 'all';
  
  if (hasPermission(user, PERMISSIONS.QUERIES.ALL)) return 'all';
  
  if (hasPermission(user, PERMISSIONS.INSTALLATIONS.ASSIGNED)) return 'assigned';
  
  if (hasPermission(user, PERMISSIONS.QUERIES.OWN) || hasPermission(user, PERMISSIONS.BILLING.OWN)) {
    return 'own';
  }
  
  return 'none';
};

/**
 * Middleware para verificar permisos específicos
 */
export const requirePermission = (permission: string) => {
  return (user: User | null | undefined): boolean => {
    return hasPermission(user, permission);
  };
};
