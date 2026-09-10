import { MigrationInterface, QueryRunner } from "typeorm";

export class NetflixPaymentMethodAndPin20260910180000 implements MigrationInterface {
    name = 'NetflixPaymentMethodAndPin20260910180000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE netflix_accounts ADD COLUMN payment_method VARCHAR(50) NULL AFTER notes`);
        await queryRunner.query(`ALTER TABLE netflix_slots DROP INDEX uq_netflix_slot_account_pin`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE netflix_slots ADD CONSTRAINT uq_netflix_slot_account_pin UNIQUE (accountId, pin)`);
        await queryRunner.query(`ALTER TABLE netflix_accounts DROP COLUMN payment_method`);
    }
}