import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateAvisoTemplatesTable1743091200000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "aviso_templates",
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
                    length: "150",
                },
                {
                    name: "category",
                    type: "enum",
                    enum: ["emergency", "maintenance", "outage", "general"],
                    default: "'general'",
                },
                {
                    name: "message",
                    type: "text",
                },
                {
                    name: "isActive",
                    type: "tinyint",
                    default: 1,
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
        }), true);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("aviso_templates");
    }
}
