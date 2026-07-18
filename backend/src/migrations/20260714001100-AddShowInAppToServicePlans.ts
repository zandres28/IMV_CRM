import { MigrationInterface, QueryRunner } from "typeorm";

export class AddShowInAppToServicePlans20260714001100 implements MigrationInterface {
    name = 'AddShowInAppToServicePlans20260714001100'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE service_plans ADD COLUMN showInApp tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE service_plans DROP COLUMN showInApp`);
    }
}
