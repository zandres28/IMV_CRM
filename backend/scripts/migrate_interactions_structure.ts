import { AppDataSource } from "../src/config/database";

async function migrate() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected for migration");

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        // 1. Crear tabla interaction_types
        // Usamos raw SQL para no depender de la Entidad actualizada aún
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`interaction_types\` (
                \`id\` int NOT NULL AUTO_INCREMENT, 
                \`name\` varchar(255) NOT NULL, 
                \`description\` varchar(255) NULL, 
                \`isSystem\` tinyint NOT NULL DEFAULT 0, 
                \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), 
                \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), 
                UNIQUE INDEX \`IDX_int_type_name\` (\`name\`), 
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // 2. Insertar tipos por defecto
        const defaultTypes = [
            'mantenimiento', 'reporte_daño', 'solicitud_servicio', 
            'llamada', 'visita', 'consulta', 'queja', 'otro'
        ];

        for (const typeName of defaultTypes) {
            await queryRunner.query(`
                INSERT IGNORE INTO \`interaction_types\` (name, isSystem) VALUES (?, 1)
            `, [typeName]);
        }

        // 3. Añadir columna interactionTypeId
        const table = await queryRunner.getTable("interactions");
        const hasTypeId = table?.columns.find(c => c.name === "interactionTypeId");

        if (!hasTypeId) {
            console.log("Adding interactionTypeId column...");
            await queryRunner.query(`ALTER TABLE \`interactions\` ADD \`interactionTypeId\` int NULL`);
            await queryRunner.query(`
                ALTER TABLE \`interactions\` 
                ADD CONSTRAINT \`FK_interactions_type_id\` 
                FOREIGN KEY (\`interactionTypeId\`) 
                REFERENCES \`interaction_types\`(\`id\`)
            `);
        }

        // 4. Migrar datos antiguos (string) a nuevos (ID)
        console.log("Migrating data...");
        await queryRunner.query(`
            UPDATE \`interactions\` i
            JOIN \`interaction_types\` t ON t.name = i.type
            SET i.interactionTypeId = t.id
            WHERE i.interactionTypeId IS NULL
        `);

        // Asignar 'otro' a los que no casaron (si hay)
        await queryRunner.query(`
            UPDATE \`interactions\` 
            SET interactionTypeId = (SELECT id FROM interaction_types WHERE name = 'otro') 
            WHERE interactionTypeId IS NULL
        `);

        // 5. Eliminar columna 'type' antigua
        const hasType = table?.columns.find(c => c.name === "type");
        if (hasType) {
            console.log("Dropping old 'type' column...");
            await queryRunner.query(`ALTER TABLE \`interactions\` DROP COLUMN \`type\``);
        }

        // 6. Eliminar columna 'installationId' (Pedido del usuario)
        const hasInstallationId = table?.columns.find(c => c.name === "installationId");
        if (hasInstallationId) {
            console.log("Dropping 'installationId' column...");
            // Buscar y eliminar FKs asociadas primero
            const fks = table?.foreignKeys.filter(fk => fk.columnNames.indexOf("installationId") !== -1);
            for (const fk of fks || []) {
                console.log(`Dropping FK ${fk.name}...`);
                await queryRunner.query(`ALTER TABLE \`interactions\` DROP FOREIGN KEY \`${fk.name}\``);
            }
            await queryRunner.query(`ALTER TABLE \`interactions\` DROP COLUMN \`installationId\``);
        }

        console.log("Migración completada con éxito.");

    } catch (error) {
        console.error("Error durante la migración:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

migrate();
