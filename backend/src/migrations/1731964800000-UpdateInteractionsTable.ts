import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class UpdateInteractionsTable1731964800000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Verificar si la tabla existe
        const tableExists = await queryRunner.hasTable('interactions');
        
        if (!tableExists) {
            // Si la tabla no existe, crearla completa
            await queryRunner.query(`
                CREATE TABLE interactions (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    clientId INT NOT NULL,
                    installationId INT NULL,
                    type VARCHAR(50) NOT NULL,
                    subject VARCHAR(200) NOT NULL,
                    description TEXT NOT NULL,
                    status VARCHAR(20) NOT NULL DEFAULT 'pendiente',
                    priority VARCHAR(20) NOT NULL DEFAULT 'media',
                    assignedToTechnicianId INT NULL,
                    scheduledDate DATE NULL,
                    completedDate DATETIME NULL,
                    notes TEXT NULL,
                    resolution TEXT NULL,
                    attachments JSON NULL,
                    next_follow_up DATETIME NULL,
                    created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                    updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                    FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
                    FOREIGN KEY (installationId) REFERENCES installations(id) ON DELETE SET NULL,
                    FOREIGN KEY (assignedToTechnicianId) REFERENCES technicians(id) ON DELETE SET NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);
        } else {
            // Si la tabla existe, verificar y agregar las columnas faltantes
            const table = await queryRunner.getTable('interactions');
            
            const columnsToAdd = [
                { name: 'clientId', type: 'int', isNullable: false },
                { name: 'installationId', type: 'int', isNullable: true },
                { name: 'subject', type: 'varchar', length: '200', isNullable: false },
                { name: 'status', type: 'varchar', length: '20', default: "'pendiente'", isNullable: false },
                { name: 'priority', type: 'varchar', length: '20', default: "'media'", isNullable: false },
                { name: 'assignedToTechnicianId', type: 'int', isNullable: true },
                { name: 'scheduledDate', type: 'date', isNullable: true },
                { name: 'completedDate', type: 'datetime', isNullable: true },
                { name: 'notes', type: 'text', isNullable: true },
                { name: 'resolution', type: 'text', isNullable: true },
                { name: 'attachments', type: 'json', isNullable: true }
            ];

            for (const col of columnsToAdd) {
                const columnExists = table?.columns.find(c => c.name === col.name);
                if (!columnExists) {
                    await queryRunner.addColumn('interactions', new TableColumn(col as any));
                }
            }

            // Modificar columna type si es muy corta
            const typeColumn = table?.columns.find(c => c.name === 'type');
            if (typeColumn && typeColumn.length !== '50') {
                await queryRunner.changeColumn('interactions', 'type', new TableColumn({
                    name: 'type',
                    type: 'varchar',
                    length: '50',
                    isNullable: false
                }));
            }

            // Agregar foreign keys si no existen
            await queryRunner.query(`
                ALTER TABLE interactions 
                ADD CONSTRAINT FK_interactions_client 
                FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE;
            `).catch(() => {}); // Ignorar si ya existe

            await queryRunner.query(`
                ALTER TABLE interactions 
                ADD CONSTRAINT FK_interactions_installation 
                FOREIGN KEY (installationId) REFERENCES installations(id) ON DELETE SET NULL;
            `).catch(() => {});

            await queryRunner.query(`
                ALTER TABLE interactions 
                ADD CONSTRAINT FK_interactions_technician 
                FOREIGN KEY (assignedToTechnicianId) REFERENCES technicians(id) ON DELETE SET NULL;
            `).catch(() => {});
        }

        // Crear índices
        await queryRunner.query(`
            CREATE INDEX IDX_interactions_client ON interactions(clientId);
        `).catch(() => {});
        
        await queryRunner.query(`
            CREATE INDEX IDX_interactions_status ON interactions(status);
        `).catch(() => {});
        
        await queryRunner.query(`
            CREATE INDEX IDX_interactions_type ON interactions(type);
        `).catch(() => {});
        
        await queryRunner.query(`
            CREATE INDEX IDX_interactions_technician ON interactions(assignedToTechnicianId);
        `).catch(() => {});
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar foreign keys
        await queryRunner.query(`ALTER TABLE interactions DROP FOREIGN KEY FK_interactions_client;`).catch(() => {});
        await queryRunner.query(`ALTER TABLE interactions DROP FOREIGN KEY FK_interactions_installation;`).catch(() => {});
        await queryRunner.query(`ALTER TABLE interactions DROP FOREIGN KEY FK_interactions_technician;`).catch(() => {});
        
        // Eliminar índices
        await queryRunner.query(`DROP INDEX IDX_interactions_client ON interactions;`).catch(() => {});
        await queryRunner.query(`DROP INDEX IDX_interactions_status ON interactions;`).catch(() => {});
        await queryRunner.query(`DROP INDEX IDX_interactions_type ON interactions;`).catch(() => {});
        await queryRunner.query(`DROP INDEX IDX_interactions_technician ON interactions;`).catch(() => {});
        
        // Si quieres eliminar columnas específicas en el rollback, agrégalas aquí
        const columnsToRemove = ['subject', 'status', 'priority', 'assignedToTechnicianId', 
                                  'scheduledDate', 'completedDate', 'notes', 'resolution', 
                                  'attachments', 'installationId', 'clientId'];
        
        for (const columnName of columnsToRemove) {
            await queryRunner.dropColumn('interactions', columnName).catch(() => {});
        }
    }
}
