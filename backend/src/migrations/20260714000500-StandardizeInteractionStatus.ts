import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeInteractionStatus20260714000500 implements MigrationInterface {
  name = 'StandardizeInteractionStatus20260714000500'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE interactions MODIFY COLUMN status ENUM('pendiente','en_progreso','completado','cancelado','pospuesto','rechazado') NOT NULL DEFAULT 'pendiente'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE interactions MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pendiente'`);
  }
}
