import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeClientStatus20260714001000 implements MigrationInterface {
    name = 'StandardizeClientStatus20260714001000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE clients MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'activo'`);
        await queryRunner.query(`UPDATE clients SET status = 'activo' WHERE status IN ('active')`);
        await queryRunner.query(`UPDATE clients SET status = 'retirado' WHERE status IN ('cancelled', 'retired')`);
        await queryRunner.query(`UPDATE clients SET status = 'pendiente_instalacion' WHERE status = 'pendiente_instalacion'`);
        await queryRunner.query(`ALTER TABLE clients MODIFY COLUMN status ENUM('activo','suspendido','retirado','inactivo','pendiente_instalacion') NOT NULL DEFAULT 'activo'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE clients MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active'`);
        await queryRunner.query(`UPDATE clients SET status = 'active' WHERE status = 'activo'`);
        await queryRunner.query(`UPDATE clients SET status = 'cancelled' WHERE status = 'retirado'`);
        await queryRunner.query(`UPDATE clients SET status = 'pendiente_instalacion' WHERE status = 'pendiente_instalacion'`);
        await queryRunner.query(`ALTER TABLE clients MODIFY COLUMN status VARCHAR(30) NOT NULL DEFAULT 'active'`);
    }
}
