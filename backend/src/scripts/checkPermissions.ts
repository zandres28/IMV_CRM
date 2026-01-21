import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { User } from "../entities/User";
import { Role } from "../entities/Role";

const checkPermissions = async () => {
  try {
    await AppDataSource.initialize();
    console.log("DB Connected");

    const userRepository = AppDataSource.getRepository(User);
    const roleRepository = AppDataSource.getRepository(Role);

    const roles = await roleRepository.find();
    console.log("\n=== ROLES IN DB ===");
    roles.forEach(r => {
        console.log(`Role: ${r.name}`);
        console.log(`Permissions: ${JSON.stringify(r.permissions)}`);
    });

    const users = await userRepository.find({ relations: ["roles"] });
    console.log("\n=== USERS IN DB ===");
    users.forEach(u => {
        console.log(`User: ${u.email} (${u.firstName} ${u.lastName})`);
        u.roles.forEach(r => {
            console.log(`  - Role: ${r.name}`);
            console.log(`    Permissions: ${JSON.stringify(r.permissions)}`);
        });
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error(error);
  }
};

checkPermissions();
