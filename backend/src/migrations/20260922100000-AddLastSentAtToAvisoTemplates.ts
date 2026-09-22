import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastSentAtToAvisoTemplates20260922100000 implements MigrationInterface {
    name = 'AddLastSentAtToAvisoTemplates20260922100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE aviso_templates 
            ADD COLUMN lastSentAt datetime NULL DEFAULT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE aviso_templates 
            DROP COLUMN lastSentAt
        `);
    }
}