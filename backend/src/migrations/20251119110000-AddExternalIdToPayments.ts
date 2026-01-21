import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddExternalIdToPayments20251119110000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Agregar campo para almacenar ID externo del CSV (PG-XXXX)
        const hasExternalId = await queryRunner.hasColumn('payments', 'externalId');
        if (!hasExternalId) {
            await queryRunner.addColumn('payments', new TableColumn({
                name: 'externalId',
                type: 'varchar',
                length: '50',
                isNullable: true,
                isUnique: true
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasExternalId = await queryRunner.hasColumn('payments', 'externalId');
        if (hasExternalId) {
            await queryRunner.dropColumn('payments', 'externalId');
        }
    }
}
