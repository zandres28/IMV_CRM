import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPonOnuIdsToInstallations20251119090000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = 'installations';
        const hasPonId = await queryRunner.hasColumn(table, 'ponId');
        const hasOnuId = await queryRunner.hasColumn(table, 'onuId');

        if (!hasPonId) {
            await queryRunner.addColumn(table, new TableColumn({
                name: 'ponId',
                type: 'varchar',
                length: '100',
                isNullable: true
            }));
        }

        if (!hasOnuId) {
            await queryRunner.addColumn(table, new TableColumn({
                name: 'onuId',
                type: 'varchar',
                length: '100',
                isNullable: true
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = 'installations';
        const hasPonId = await queryRunner.hasColumn(table, 'ponId');
        const hasOnuId = await queryRunner.hasColumn(table, 'onuId');

        if (hasPonId) {
            await queryRunner.dropColumn(table, 'ponId');
        }
        if (hasOnuId) {
            await queryRunner.dropColumn(table, 'onuId');
        }
    }
}
