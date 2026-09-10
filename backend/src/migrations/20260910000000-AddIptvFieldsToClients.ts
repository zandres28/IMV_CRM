import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIptvFieldsToClients20260910000000 implements MigrationInterface {
    name = 'AddIptvFieldsToClients20260910000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE clients
            ADD COLUMN iptvUsername varchar(255) NULL,
            ADD COLUMN iptvPassword varchar(255) NULL,
            ADD COLUMN iptvStatus enum('activo', 'suspendido', 'no_creado') DEFAULT 'no_creado',
            ADD COLUMN iptvExpDate datetime NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE clients
            DROP COLUMN iptvUsername,
            DROP COLUMN iptvPassword,
            DROP COLUMN iptvStatus,
            DROP COLUMN iptvExpDate
        `);
    }
}
