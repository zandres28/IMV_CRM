import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRetirementDateToInstallations20251216100000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("installations", new TableColumn({
            name: "retirementDate",
            type: "date",
            isNullable: true
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("installations", "retirementDate");
    }

}
