import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey } from "typeorm";

export class AddUserIdToTechnicians20260304120000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("technicians", new TableColumn({
            name: "userId",
            type: "int",
            isNullable: true,
        }));

        await queryRunner.createForeignKey("technicians", new TableForeignKey({
            columnNames: ["userId"],
            referencedColumnNames: ["id"],
            referencedTableName: "users",
            onDelete: "SET NULL",
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("technicians");
        const fk = table?.foreignKeys.find(fk => fk.columnNames.includes("userId"));
        if (fk) await queryRunner.dropForeignKey("technicians", fk);
        await queryRunner.dropColumn("technicians", "userId");
    }
}
