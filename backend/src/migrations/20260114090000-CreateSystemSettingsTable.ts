import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateSystemSettingsTable1768464000000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(new Table({
            name: "system_settings",
            columns: [
                {
                    name: "id",
                    type: "int",
                    isPrimary: true,
                    isGenerated: true,
                    generationStrategy: "increment"
                },
                {
                    name: "key",
                    type: "varchar",
                    length: "255",
                    isUnique: true
                },
                {
                    name: "value",
                    type: "text", // Using text to support longer values/JSON strings
                    isNullable: false
                },
                {
                    name: "description",
                    type: "varchar",
                    length: "255",
                    isNullable: true
                },
                {
                    name: "type",
                    type: "varchar",
                    length: "50",
                    default: "'string'"
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    default: "CURRENT_TIMESTAMP",
                    onUpdate: "CURRENT_TIMESTAMP"
                }
            ]
        }), true);

        // Insert default setting
        await queryRunner.query(`
            INSERT INTO system_settings (\`key\`, value, type, description)
            VALUES ('session_timeout_minutes', '5', 'number', 'Tiempo de inactividad para cierre de sesión en minutos')
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("system_settings");
    }

}
