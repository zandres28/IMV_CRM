import { AppDataSource } from "../config/database";
import { Role } from "../entities/Role";
import { ROLE_PERMISSIONS } from "../utils/permissions";

/**
 * Script para re-semillar los roles básicos con los permisos actualizados.
 * Ejecutar con: npx ts-node src/scripts/reseedRoles.ts
 */
async function reseedRoles() {
    try {
        console.log("Inicializando conexión a base de datos...");
        await AppDataSource.initialize();
        console.log("Conectado.");

        const roleRepository = AppDataSource.getRepository(Role);

        // Definimos los 4 roles básicos
        const rolesToSeed = [
            {
                name: 'admin',
                description: 'Administrador con acceso total al sistema',
                permissions: ROLE_PERMISSIONS.admin
            },
            {
                name: 'tecnico',
                description: 'Técnico de instalaciones y soporte',
                permissions: ROLE_PERMISSIONS.tecnico
            },
            {
                name: 'contabilidad', // Nuevo rol propuesto
                description: 'Encargado de facturación y cobros',
                // Como no existe en ROLE_PERMISSIONS original, lo construimos aquí basado en lo acordado
                permissions: [
                    'clients.list.view',
                    'clients.list.create',
                    'clients.list.edit',
                    'clients.crm.view',
                    'clients.crm.edit',
                    'installations.view',
                    'installations.create',
                    'billing.view',
                    'billing.create',
                    'billing.edit', // Puede registrar pagos
                    'clients.outages.view',
                    'queries.view',
                    'queries.all'
                ]
            },
            {
                name: 'usuario', // Usuario normal
                description: 'Usuario base con acceso limitado',
                permissions: ROLE_PERMISSIONS.usuario
            }
        ];

        for (const roleData of rolesToSeed) {
            console.log(`Procesando rol: ${roleData.name}...`);
            
            let role = await roleRepository.findOneBy({ name: roleData.name });
            
            if (!role) {
                console.log(`Rol ${roleData.name} no existe. Creando...`);
                role = roleRepository.create({
                    name: roleData.name,
                    description: roleData.description,
                    permissions: roleData.permissions,
                    isActive: true
                });
            } else {
                console.log(`Rol ${roleData.name} existe. Actualizando permisos...`);
                role.description = roleData.description;
                role.permissions = roleData.permissions;
                role.isActive = true;
            }

            await roleRepository.save(role);
            console.log(`Rol ${roleData.name} guardado con ${role.permissions.length} permisos.`);
        }

        console.log("¡Proceso finalizado con éxito!");
        process.exit(0);

    } catch (error) {
        console.error("Error al sembrar roles:", error);
        process.exit(1);
    }
}

reseedRoles();
