import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSuspensionExtensionToClient1770324798861 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("clients", new TableColumn({
            name: "suspension_extension_date",
            type: "date",
            isNullable: true,
            comment: "Fecha hasta la cual se extiende el servicio antes de corte por mora"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("clients", "suspension_extension_date");
    }

}
