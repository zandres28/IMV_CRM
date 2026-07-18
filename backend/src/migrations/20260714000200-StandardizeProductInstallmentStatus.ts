import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeProductInstallmentStatus20260714000200 implements MigrationInterface {
  name = 'StandardizeProductInstallmentStatus20260714000200'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE product_installments SET status = 'pendiente' WHERE status = 'pending'`);
    await queryRunner.query(`UPDATE product_installments SET status = 'completado' WHERE status IN ('completed', 'paid')`);
    await queryRunner.query(`ALTER TABLE product_installments MODIFY COLUMN status ENUM('pendiente','completado') NOT NULL DEFAULT 'pendiente'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE product_installments MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE product_installments SET status = 'pending' WHERE status = 'pendiente'`);
    await queryRunner.query(`UPDATE product_installments SET status = 'completed' WHERE status = 'completado'`);
  }
}
