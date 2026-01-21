import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddInstallationFeeToInstallations20251119100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("installations", "installationFee");
        if (!hasColumn) {
            await queryRunner.addColumn("installations", new TableColumn({
                name: "installationFee",
                type: "decimal",
                precision: 10,
                scale: 2,
                default: 0,
                isNullable: false
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("installations", "installationFee");
        if (hasColumn) {
            await queryRunner.dropColumn("installations", "installationFee");
        }
    }
}
