import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { Role } from "../entities/Role";
import { User } from "../entities/User";
import * as bcrypt from "bcryptjs";

const seedAuthData = async () => {
  try {
    // Inicializar conexión a la base de datos
    await AppDataSource.initialize();
    console.log("Conexión a base de datos establecida");

    const roleRepository = AppDataSource.getRepository(Role);
    const userRepository = AppDataSource.getRepository(User);

    // Definir roles con sus permisos según la tabla de control de acceso
    const rolesData = [
      {
        name: "admin",
        description: "Administrador con acceso total al sistema",
        permissions: [
          // Clientes - Todos los permisos
          "clients.list.view",
          "clients.list.create",
          "clients.list.edit",
          "clients.list.delete",
          "clients.crm.view",
          "clients.crm.create",
          "clients.crm.edit",
          "clients.outages.view",
          "clients.outages.create",
          "clients.outages.edit",
          "clients.outages.delete",
          // Facturación
          "billing.view",
          "billing.create",
          "billing.edit",
          "billing.delete",
          // Instalaciones
          "installations.view",
          "installations.create",
          "installations.edit",
          "installations.delete",
          // Planes
          "plans.view",
          // Consultas
          "queries.view",
          "queries.all", // Ver datos de todos los usuarios
          // Administración
          "admin.users.view",
          "admin.users.create",
          "admin.users.edit",
          "admin.users.delete",
          "admin.plans.view",
          "admin.plans.create",
          "admin.plans.edit",
          "admin.plans.delete",
          "admin.technicians.view",
          "admin.technicians.create",
          "admin.technicians.edit",
          "admin.technicians.delete",
          "admin.permissions.manage"
        ]
      },
      {
        name: "operador",
        description: "Operador con permisos para gestionar clientes y consultas",
        permissions: [
          // Clientes
          "clients.list.view",
          "clients.list.create",
          "clients.list.edit",
          "clients.crm.view",
          "clients.crm.create",
          "clients.crm.edit",
          "clients.outages.view",
          "clients.outages.create",
          "clients.outages.edit",
          // Planes
          "plans.view",
          // Consultas (solo sus datos)
          "queries.view",
          "queries.own", // Solo ver sus propios datos
          // Sin acceso a Facturación, Instalaciones o Administración
        ]
      },
      {
        name: "tecnico",
        description: "Técnico con permisos para instalaciones y caídas de servicio",
        permissions: [
          // Clientes (solo lectura)
          "clients.list.view",
          "clients.crm.view",
          "clients.outages.view",
          "clients.outages.create",
          "clients.outages.edit",
          // Instalaciones (solo las asignadas a él)
          "installations.view",
          "installations.edit",
          "installations.assigned", // Solo ver instalaciones asignadas
          // Planes
          "plans.view",
          // Consultas (solo sus datos)
          "queries.view",
          "queries.own",
          // Administración - Solo técnicos
          "admin.technicians.view"
        ]
      },
      {
        name: "usuario",
        description: "Usuario básico con permisos de solo lectura de sus propios datos",
        permissions: [
          // Clientes - Solo lectura
          "clients.list.view",
          // Facturación (solo sus datos)
          "billing.view",
          "billing.own", // Solo ver su propia facturación
          // Instalaciones
          "installations.view",
          // Planes (lectura general)
          "plans.view",
          // Consultas (solo sus datos)
          "queries.view",
          "queries.own",
          // Administración - Solo puede ver/editar su propio perfil
          "admin.users.view.own"
        ]
      }
    ];

    console.log("\n=== CREANDO ROLES ===");

    // Crear o actualizar roles
    for (const roleData of rolesData) {
      let role = await roleRepository.findOne({
        where: { name: roleData.name }
      });

      if (role) {
        // Actualizar rol existente
        role.description = roleData.description;
        role.permissions = roleData.permissions;
        await roleRepository.save(role);
        console.log(`✓ Rol actualizado: ${roleData.name}`);
      } else {
        // Crear nuevo rol
        role = roleRepository.create(roleData);
        await roleRepository.save(role);
        console.log(`✓ Rol creado: ${roleData.name}`);
      }
    }

    // Verificar si ya existe un usuario administrador
    const existingAdmin = await userRepository.findOne({
      relations: ["roles"],
      where: { email: "admin@netflow.com" }
    });

    if (existingAdmin) {
      console.log("\n⚠ Usuario administrador ya existe: admin@netflow.com");
    } else {
      // Crear usuario administrador
      console.log("\n=== CREANDO USUARIO ADMINISTRADOR ===");
      
      const adminRole = await roleRepository.findOne({
        where: { name: "admin" }
      });

      if (!adminRole) {
        throw new Error("No se encontró el rol de administrador");
      }

      const hashedPassword = await bcrypt.hash("admin123", 10);

      const adminUser = userRepository.create({
        email: "admin@netflow.com",
        password: hashedPassword,
        firstName: "Administrador",
        lastName: "Sistema",
        isActive: true,
        roles: [adminRole]
      });

      await userRepository.save(adminUser);
      console.log("✓ Usuario administrador creado");
      console.log("  Email: admin@netflow.com");
      console.log("  Password: admin123");
      console.log("  ⚠ IMPORTANTE: Cambia esta contraseña después del primer login");
    }

    console.log("\n=== RESUMEN ===");
    console.log(`Roles creados/actualizados: ${rolesData.length}`);
    
    const totalUsers = await userRepository.count();
    console.log(`Total de usuarios en el sistema: ${totalUsers}`);
    
    console.log("\n✓ Seed completado exitosamente");

    await AppDataSource.destroy();
  } catch (error) {
    console.error("Error al ejecutar seed:", error);
    process.exit(1);
  }
};

seedAuthData();
