import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeServiceTransferStatus20260714000700 implements MigrationInterface {
  name = 'StandardizeServiceTransferStatus20260714000700'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE service_transfers MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'pendiente' WHERE status = 'pending'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'en_progreso' WHERE status = 'in_progress'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'completado' WHERE status = 'completed'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'anulado' WHERE status = 'cancelled'`);
    await queryRunner.query(`ALTER TABLE service_transfers MODIFY COLUMN status ENUM('pendiente','en_progreso','completado','anulado') NOT NULL DEFAULT 'pendiente'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE service_transfers MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'pending' WHERE status = 'pendiente'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'in_progress' WHERE status = 'en_progreso'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'completed' WHERE status = 'completado'`);
    await queryRunner.query(`UPDATE service_transfers SET status = 'cancelled' WHERE status = 'anulado'`);
  }
}
