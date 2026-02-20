import { MigrationInterface, QueryRunner, Table } from "typeorm"

export class CreatePromotionsTable1700000000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "promotions",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment",
                },
                {
                    name: "title",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "description",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "filename",
                    type: "varchar",
                },
                {
                    name: "originalName",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "mimeType",
                    type: "varchar",
                    isNullable: true,
                },
                {
                    name: "size",
                    type: "int",
                    isNullable: true,
                },
                {
                    name: "createdAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP",
                },
                {
                    name: "updatedAt",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP",
                },
            ],
        }), true)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("promotions")
    }

}
