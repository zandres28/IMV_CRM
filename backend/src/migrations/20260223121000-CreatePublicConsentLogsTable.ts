import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreatePublicConsentLogsTable20260223121000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("public_consent_logs");
        if (tableExists) {
            return;
        }

        await queryRunner.createTable(new Table({
            name: "public_consent_logs",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "identificationNumber",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "fullName",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "source",
                    type: "varchar",
                    length: "50"
                },
                {
                    name: "accepted",
                    type: "tinyint",
                    width: 1,
                    default: 1
                },
                {
                    name: "policyUrl",
                    type: "varchar",
                    length: "255"
                },
                {
                    name: "clientId",
                    type: "int",
                    isNullable: true
                },
                {
                    name: "ipAddress",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "userAgent",
                    type: "text",
                    isNullable: true
                },
                {
                    name: "created_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP"
                }
            ]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable("public_consent_logs");
        if (tableExists) {
            await queryRunner.dropTable("public_consent_logs");
        }
    }

}