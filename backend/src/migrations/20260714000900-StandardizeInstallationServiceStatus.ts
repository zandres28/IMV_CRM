import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeInstallationServiceStatus20260714000900 implements MigrationInterface {
    name = 'StandardizeInstallationServiceStatus20260714000900'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Cambiar a VARCHAR para migrar datos
        await queryRunner.query(`ALTER TABLE installations MODIFY COLUMN serviceStatus VARCHAR(20) NOT NULL DEFAULT 'activo'`);
        // Mapear valores antiguos a nuevos
        await queryRunner.query(`UPDATE installations SET serviceStatus = 'activo' WHERE serviceStatus = 'active'`);
        await queryRunner.query(`UPDATE installations SET serviceStatus = 'suspendido' WHERE serviceStatus = 'suspended'`);
        await queryRunner.query(`UPDATE installations SET serviceStatus = 'retirado' WHERE serviceStatus = 'cancelled'`);
        // Cambiar a ENUM con nuevos valores
        await queryRunner.query(`ALTER TABLE installations MODIFY COLUMN serviceStatus ENUM('activo','suspendido','retirado') NOT NULL DEFAULT 'activo'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE installations MODIFY COLUMN serviceStatus VARCHAR(20) NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`UPDATE installations SET serviceStatus = 'active' WHERE serviceStatus = 'activo'`);
        await queryRunner.query(`UPDATE installations SET serviceStatus = 'suspended' WHERE serviceStatus = 'suspendido'`);
        await queryRunner.query(`UPDATE installations SET serviceStatus = 'cancelled' WHERE serviceStatus = 'retirado'`);
        await queryRunner.query(`ALTER TABLE installations MODIFY COLUMN serviceStatus ENUM('active','suspended','cancelled') NOT NULL DEFAULT 'active'`);
    }
}
