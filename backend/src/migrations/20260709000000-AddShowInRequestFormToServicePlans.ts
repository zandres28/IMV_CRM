import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddShowInRequestFormToServicePlans20260709000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("service_plans", new TableColumn({
            name: "showInRequestForm",
            type: "tinyint",
            default: 1,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("service_plans", "showInRequestForm");
    }
}
