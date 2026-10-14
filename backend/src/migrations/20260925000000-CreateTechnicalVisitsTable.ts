import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateTechnicalVisitsTable20260925000000 implements MigrationInterface {
    name = 'CreateTechnicalVisitsTable20260925000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE technical_visits (
                id INT AUTO_INCREMENT PRIMARY KEY,
                clientId INT NOT NULL,
                installationId INT NULL,
                technicianId INT NOT NULL,
                visitType ENUM('instalacion','soporte','mantenimiento','reparacion','traslado','otro') NOT NULL DEFAULT 'soporte',
                scheduledDate DATE NOT NULL,
                timeSlot VARCHAR(30) NULL,
                status ENUM('programada','en_progreso','completada','cancelada') NOT NULL DEFAULT 'programada',
                address VARCHAR(255) NULL,
                notes TEXT NULL,
                createdById INT NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                KEY idx_technical_visits_date (scheduledDate),
                KEY idx_technical_visits_status (status),
                KEY idx_technical_visits_technician (technicianId),
                KEY idx_technical_visits_client (clientId),
                CONSTRAINT fk_technical_visits_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE CASCADE,
                CONSTRAINT fk_technical_visits_installation FOREIGN KEY (installationId) REFERENCES installations(id) ON DELETE SET NULL,
                CONSTRAINT fk_technical_visits_technician FOREIGN KEY (technicianId) REFERENCES technicians(id) ON DELETE CASCADE,
                CONSTRAINT fk_technical_visits_user FOREIGN KEY (createdById) REFERENCES users(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS technical_visits`);
    }
}
