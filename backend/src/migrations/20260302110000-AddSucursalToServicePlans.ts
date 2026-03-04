import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddSucursalToServicePlans20260302110000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("service_plans", new TableColumn({
            name: "sucursal",
            type: "varchar",
            length: "100",
            isNullable: true,
            default: "'CALI'",
        }));

        // Todos los planes existentes pertenecen a CALI
        await queryRunner.query(`UPDATE service_plans SET sucursal = 'CALI' WHERE sucursal IS NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("service_plans", "sucursal");
    }
}
