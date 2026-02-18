import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRetirementFieldsToClient20260218100000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns("clients", [
            new TableColumn({
                name: "retirementDate",
                type: "date",
                isNullable: true
            }),
            new TableColumn({
                name: "retirementReason",
                type: "text",
                isNullable: true
            })
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("clients", "retirementReason");
        await queryRunner.dropColumn("clients", "retirementDate");
    }

}
