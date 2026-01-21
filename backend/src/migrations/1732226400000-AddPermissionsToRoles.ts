import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPermissionsToRoles1732226400000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("roles", new TableColumn({
            name: "permissions",
            type: "json",
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("roles", "permissions");
    }
}
