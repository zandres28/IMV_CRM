import { MigrationInterface, QueryRunner } from "typeorm";

export class SetDefaultPaymentMethodForInstallations20260224153000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Update existing installation payments that have no payment method or empty string
        await queryRunner.query(`
            UPDATE payments 
            SET paymentMethod = 'efectivo' 
            WHERE paymentType = 'installation' 
            AND (paymentMethod IS NULL OR paymentMethod = '')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // It is difficult to revert this change accurately without knowing which ones were null before.
        // We will leave it as is or could set all 'efectivo' back to NULL if we wanted to be destructive,
        // but that would erase valid 'efectivo' entries.
        // So we do nothing or log a message.
        console.log('Reverting SetDefaultPaymentMethodForInstallations is not supported to preserve data integrity.');
    }

}
