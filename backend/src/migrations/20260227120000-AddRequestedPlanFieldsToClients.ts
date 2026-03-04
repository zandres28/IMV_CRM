import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddRequestedPlanFieldsToClients20260227120000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumns("clients", [
            new TableColumn({
                name: "requestedPlanId",
                type: "int",
                isNullable: true,
            }),
            new TableColumn({
                name: "requestedPlanName",
                type: "varchar",
                isNullable: true,
            }),
            new TableColumn({
                name: "requestedPlanSpeedMbps",
                type: "int",
                isNullable: true,
            }),
            new TableColumn({
                name: "requestedPlanMonthlyFee",
                type: "decimal",
                precision: 10,
                scale: 2,
                isNullable: true,
            }),
            new TableColumn({
                name: "requestedInstallationFee",
                type: "decimal",
                precision: 10,
                scale: 2,
                isNullable: true,
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumns("clients", [
            "requestedInstallationFee",
            "requestedPlanMonthlyFee",
            "requestedPlanSpeedMbps",
            "requestedPlanName",
            "requestedPlanId",
        ]);
    }
}
