import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateNetworkDevicesTable20260421000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "network_devices",
                columns: [
                    {
                        name: "id",
                        type: "int",
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: "increment"
                    },
                    {
                        name: "name",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "type",
                        type: "enum",
                        enum: ["mikrotik", "olt", "switch", "other"],
                        default: "'mikrotik'"
                    },
                    {
                        name: "host",
                        type: "varchar",
                        length: "255"
                    },
                    {
                        name: "port",
                        type: "int",
                        default: 80
                    },
                    {
                        name: "username",
                        type: "varchar",
                        length: "255",
                        isNullable: true
                    },
                    {
                        name: "password",
                        type: "varchar",
                        length: "255",
                        isNullable: true
                    },
                    {
                        name: "description",
                        type: "varchar",
                        length: "500",
                        isNullable: true
                    },
                    {
                        name: "enabled",
                        type: "tinyint",
                        default: 1
                    },
                    {
                        name: "created_at",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP"
                    },
                    {
                        name: "updated_at",
                        type: "datetime",
                        default: "CURRENT_TIMESTAMP",
                        onUpdate: "CURRENT_TIMESTAMP"
                    }
                ]
            }),
            true
        );

        // Insertar el MikroTik por defecto con la IP ya configurada
        await queryRunner.query(`
            INSERT INTO network_devices (name, type, host, port, username, description, enabled)
            VALUES ('MikroTik Principal', 'mikrotik', '192.168.1.94', 80, 'admin', 'Router MikroTik principal - acceso via WireGuard VPN', 1)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("network_devices");
    }
}
