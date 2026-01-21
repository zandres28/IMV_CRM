import "reflect-metadata";
import { AppDataSource } from "../config/database";

const runMigrations = async () => {
  try {
    // Inicializar conexión
    await AppDataSource.initialize();
    console.log("Conexión a base de datos establecida");

    // Ejecutar migraciones pendientes
    const migrations = await AppDataSource.runMigrations();
    
    if (migrations.length === 0) {
      console.log("No hay migraciones pendientes");
    } else {
      console.log(`\n✓ ${migrations.length} migración(es) ejecutada(s):`);
      migrations.forEach(migration => {
        console.log(`  - ${migration.name}`);
      });
    }

    await AppDataSource.destroy();
    console.log("\n✓ Proceso completado");
  } catch (error) {
    console.error("Error al ejecutar migraciones:", error);
    process.exit(1);
  }
};

runMigrations();
