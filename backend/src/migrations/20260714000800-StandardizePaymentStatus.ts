import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizePaymentStatus20260714000800 implements MigrationInterface {
  name = 'StandardizePaymentStatus20260714000800'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payments MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE payments SET status = 'pendiente' WHERE status = 'pending'`);
    await queryRunner.query(`UPDATE payments SET status = 'pagado' WHERE status = 'paid'`);
    await queryRunner.query(`UPDATE payments SET status = 'vencido' WHERE status = 'overdue'`);
    await queryRunner.query(`UPDATE payments SET status = 'anulado' WHERE status = 'cancelled'`);
    await queryRunner.query(`ALTER TABLE payments MODIFY COLUMN status ENUM('pendiente','pagado','vencido','anulado') NOT NULL DEFAULT 'pendiente'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE payments MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'`);
    await queryRunner.query(`UPDATE payments SET status = 'pending' WHERE status = 'pendiente'`);
    await queryRunner.query(`UPDATE payments SET status = 'paid' WHERE status = 'pagado'`);
    await queryRunner.query(`UPDATE payments SET status = 'overdue' WHERE status = 'vencido'`);
    await queryRunner.query(`UPDATE payments SET status = 'cancelled' WHERE status = 'anulado'`);
  }
}
