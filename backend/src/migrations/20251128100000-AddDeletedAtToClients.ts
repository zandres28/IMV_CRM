import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDeletedAtToClients20251128100000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("clients", new TableColumn({
            name: "deletedAt",
            type: "datetime",
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("clients", "deletedAt");
    }

}
