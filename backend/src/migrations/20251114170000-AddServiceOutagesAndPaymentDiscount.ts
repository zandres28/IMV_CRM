import { MigrationInterface, QueryRunner } from "typeorm";

export class AddServiceOutagesAndPaymentDiscount20251114170000 implements MigrationInterface {
  name = 'AddServiceOutagesAndPaymentDiscount20251114170000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS service_outages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        clientId INT NOT NULL,
        installationId INT NOT NULL,
        startDate DATE NOT NULL,
        endDate DATE NOT NULL,
        days INT NOT NULL,
        reason TEXT NULL,
        discountAmount DECIMAL(10,2) NOT NULL,
        status ENUM('pending','applied','cancelled') DEFAULT 'pending',
        appliedToPaymentId INT NULL,
        notes TEXT NULL,
        created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        INDEX idx_service_outages_client (clientId),
        INDEX idx_service_outages_installation (installationId),
        INDEX idx_service_outages_status (status),
        CONSTRAINT fk_service_outages_client FOREIGN KEY (clientId) REFERENCES clients(id),
        CONSTRAINT fk_service_outages_installation FOREIGN KEY (installationId) REFERENCES installations(id),
        CONSTRAINT fk_service_outages_payment FOREIGN KEY (appliedToPaymentId) REFERENCES payments(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    const col1 = await queryRunner.query(`SHOW COLUMNS FROM payments LIKE 'outageDiscountAmount'`);
    if (col1.length === 0) {
      await queryRunner.query(`ALTER TABLE payments ADD outageDiscountAmount DECIMAL(10,2) NOT NULL DEFAULT 0`);
    }
    const col2 = await queryRunner.query(`SHOW COLUMNS FROM payments LIKE 'outageDays'`);
    if (col2.length === 0) {
      await queryRunner.query(`ALTER TABLE payments ADD outageDays INT NOT NULL DEFAULT 0`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const col1 = await queryRunner.query(`SHOW COLUMNS FROM payments LIKE 'outageDiscountAmount'`);
    if (col1.length > 0) {
      await queryRunner.query(`ALTER TABLE payments DROP COLUMN outageDiscountAmount`);
    }
    const col2 = await queryRunner.query(`SHOW COLUMNS FROM payments LIKE 'outageDays'`);
    if (col2.length > 0) {
      await queryRunner.query(`ALTER TABLE payments DROP COLUMN outageDays`);
    }
    await queryRunner.query(`DROP TABLE IF EXISTS service_outages`);
  }
}
