import { MigrationInterface, QueryRunner, TableIndex } from "typeorm";

export class DropUniqueOnuSnConstraint20260219100000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable("installations");
        const index = table?.indices.find(fk => fk.columnNames.indexOf("routerSerialNumber") !== -1);
        
        if (index) {
            await queryRunner.dropIndex("installations", index);
        }
        
        // Optionally create a non-unique index for performance
        await queryRunner.createIndex("installations", new TableIndex({
            name: "IDX_INSTALLATIONS_ROUTER_SERIAL_NUMBER",
            columnNames: ["routerSerialNumber"]
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Re-add unique constraint (might fail if duplicates depend on it now)
        await queryRunner.dropIndex("installations", "IDX_INSTALLATIONS_ROUTER_SERIAL_NUMBER");
        await queryRunner.createIndex("installations", new TableIndex({
            name: "IDX_INSTALLATIONS_ROUTER_SERIAL_NUMBER_UNIQUE",
            columnNames: ["routerSerialNumber"],
            isUnique: true
        }));
    }

}
