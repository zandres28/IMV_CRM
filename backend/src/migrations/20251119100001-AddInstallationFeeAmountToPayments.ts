import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddInstallationFeeAmountToPayments20251119100001 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("payments", "installationFeeAmount");
        if (!hasColumn) {
            await queryRunner.addColumn("payments", new TableColumn({
                name: "installationFeeAmount",
                type: "decimal",
                precision: 10,
                scale: 2,
                default: 0,
                isNullable: false
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("payments", "installationFeeAmount");
        if (hasColumn) {
            await queryRunner.dropColumn("payments", "installationFeeAmount");
        }
    }
}
