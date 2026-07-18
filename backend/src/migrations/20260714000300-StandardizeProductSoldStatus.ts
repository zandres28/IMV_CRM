import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeProductSoldStatus20260714000300 implements MigrationInterface {
  name = 'StandardizeProductSoldStatus20260714000300'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE products_sold SET status = 'pendiente' WHERE status = 'pending'`);
    await queryRunner.query(`UPDATE products_sold SET status = 'completado' WHERE status = 'completed'`);
    await queryRunner.query(`ALTER TABLE products_sold MODIFY COLUMN status ENUM('pendiente','completado') NOT NULL DEFAULT 'pendiente'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products_sold MODIFY COLUMN status VARCHAR(255) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE products_sold SET status = 'pending' WHERE status = 'pendiente'`);
    await queryRunner.query(`UPDATE products_sold SET status = 'completed' WHERE status = 'completado'`);
  }
}
