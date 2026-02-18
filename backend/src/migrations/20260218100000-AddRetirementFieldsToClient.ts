import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRetirementFieldsToClient20260218100000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("clients");
        const hasDate = table?.columns.find(column => column.name === "retirementDate");
        const hasReason = table?.columns.find(column => column.name === "retirementReason");

        if (!hasDate) {
            await queryRunner.addColumn("clients", new TableColumn({
                name: "retirementDate",
                type: "date",
                isNullable: true
            }));
        }

        if (!hasReason) {
            await queryRunner.addColumn("clients", new TableColumn({
                name: "retirementReason",
                type: "text",
                isNullable: true
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("clients");
        const hasDate = table?.columns.find(column => column.name === "retirementDate");
        const hasReason = table?.columns.find(column => column.name === "retirementReason");

        if (hasReason) {
            await queryRunner.dropColumn("clients", "retirementReason");
        }
        if (hasDate) {
            await queryRunner.dropColumn("clients", "retirementDate");
        }
    }

}
