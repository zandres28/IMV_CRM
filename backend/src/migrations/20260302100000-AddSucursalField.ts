import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSucursalField20260302100000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Columna en clientes
        await queryRunner.addColumn("clients", new TableColumn({
            name: "sucursal",
            type: "varchar",
            length: "100",
            isNullable: true,
            default: "'CALI'",
        }));

        // Columna en usuarios
        await queryRunner.addColumn("users", new TableColumn({
            name: "sucursal",
            type: "varchar",
            length: "100",
            isNullable: true,
            default: "'CALI'",
        }));

        // Poblar sucursal = 'CALI' para todos los registros existentes
        await queryRunner.query(`UPDATE clients SET sucursal = 'CALI' WHERE sucursal IS NULL`);
        await queryRunner.query(`UPDATE users  SET sucursal = 'CALI' WHERE sucursal IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("users", "sucursal");
        await queryRunner.dropColumn("clients", "sucursal");
    }
}
