import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeAdditionalServiceStatus20260714000100 implements MigrationInterface {
  name = 'StandardizeAdditionalServiceStatus20260714000100'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE additional_services SET status = 'activo' WHERE status = 'active'`);
    await queryRunner.query(`UPDATE additional_services SET status = 'inactivo' WHERE status = 'inactive'`);
    await queryRunner.query(`ALTER TABLE additional_services MODIFY COLUMN status ENUM('activo','inactivo') NOT NULL DEFAULT 'activo'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE additional_services MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'active'`);
    await queryRunner.query(`UPDATE additional_services SET status = 'active' WHERE status = 'activo'`);
    await queryRunner.query(`UPDATE additional_services SET status = 'inactive' WHERE status = 'inactivo'`);
  }
}
