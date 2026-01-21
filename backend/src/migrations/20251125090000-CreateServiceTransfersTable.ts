import { MigrationInterface, QueryRunner, Table, TableForeignKey } from "typeorm";

export class CreateServiceTransfersTable20251125090000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "service_transfers",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment",
                },
                {
                    name: "clientId",
                    type: "int",
                },
                {
                    name: "previousAddress",
                    type: "varchar",
                },
                {
                    name: "newAddress",
                    type: "varchar",
                },
                {
                    name: "requestDate",
                    type: "date",
                },
                {
                    name: "scheduledDate",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "completionDate",
                    type: "date",
                    isNullable: true,
                },
                {
                    name: "status",
                    type: "varchar",
                    length: "20",
                    default: "'pending'",
                },
                {
                    name: "cost",
                    type: "decimal",
                    precision: 10,
                    scale: 2,
                    default: 0,
                },
                {
                    name: "technicianId",
                    type: "int",
                    isNullable: true,
                },
                {
                    name: "notes",
                    type: "text",
                    isNullable: true,
                },
                {
                    name: "created_at",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP",
                },
                {
                    name: "updated_at",
                    type: "datetime",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP",
                },
            ],
        }), true);

        await queryRunner.createForeignKey("service_transfers", new TableForeignKey({
            columnNames: ["clientId"],
            referencedColumnNames: ["id"],
            referencedTableName: "clients",
            onDelete: "CASCADE",
        }));

        await queryRunner.createForeignKey("service_transfers", new TableForeignKey({
            columnNames: ["technicianId"],
            referencedColumnNames: ["id"],
            referencedTableName: "technicians",
            onDelete: "SET NULL",
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("service_transfers");
        const foreignKeyClient = table!.foreignKeys.find(fk => fk.columnNames.indexOf("clientId") !== -1);
        const foreignKeyTech = table!.foreignKeys.find(fk => fk.columnNames.indexOf("technicianId") !== -1);
        
        if (foreignKeyClient) await queryRunner.dropForeignKey("service_transfers", foreignKeyClient);
        if (foreignKeyTech) await queryRunner.dropForeignKey("service_transfers", foreignKeyTech);
        
        await queryRunner.dropTable("service_transfers");
    }

}
