import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOltDisconnectScheduled20260327120000 implements MigrationInterface {
    name = 'AddOltDisconnectScheduled20260327120000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`installations\` ADD \`oltDisconnectScheduled\` tinyint NOT NULL DEFAULT 0`
        );
        await queryRunner.query(
            `ALTER TABLE \`installations\` ADD \`oltDisconnectTime\` varchar(5) NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`installations\` DROP COLUMN \`oltDisconnectTime\``
        );
        await queryRunner.query(
            `ALTER TABLE \`installations\` DROP COLUMN \`oltDisconnectScheduled\``
        );
    }
}
