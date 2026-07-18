import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeServiceOutageStatus20260714000600 implements MigrationInterface {
  name = 'StandardizeServiceOutageStatus20260714000600'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE service_outages MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE service_outages SET status = 'pendiente' WHERE status = 'pending'`);
    await queryRunner.query(`UPDATE service_outages SET status = 'aplicado' WHERE status = 'applied'`);
    await queryRunner.query(`UPDATE service_outages SET status = 'anulado' WHERE status = 'cancelled'`);
    await queryRunner.query(`ALTER TABLE service_outages MODIFY COLUMN status ENUM('pendiente','aplicado','anulado') NOT NULL DEFAULT 'pendiente'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE service_outages MODIFY COLUMN status ENUM('pending','applied','cancelled') NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE service_outages SET status = 'pending' WHERE status = 'pendiente'`);
    await queryRunner.query(`UPDATE service_outages SET status = 'applied' WHERE status = 'aplicado'`);
    await queryRunner.query(`UPDATE service_outages SET status = 'cancelled' WHERE status = 'anulado'`);
  }
}
