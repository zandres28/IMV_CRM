import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSuspendedAtToInstallation20260902000000 implements MigrationInterface {
    name = 'AddSuspendedAtToInstallation20260902000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE installations 
            ADD COLUMN suspendedAt datetime NULL AFTER retirementDate
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE installations 
            DROP COLUMN suspendedAt
        `);
    }
}
