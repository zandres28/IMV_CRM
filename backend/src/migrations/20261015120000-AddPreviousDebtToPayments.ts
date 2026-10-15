import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPreviousDebtToPayments20261015120000 implements MigrationInterface {
    name = 'AddPreviousDebtToPayments20261015120000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE payments
            ADD COLUMN previousDebtAmount DECIMAL(10,2) NOT NULL DEFAULT 0,
            ADD COLUMN previousDebtPayments VARCHAR(500) NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE payments
            DROP COLUMN previousDebtPayments,
            DROP COLUMN previousDebtAmount
        `);
    }
}
