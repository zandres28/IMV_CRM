import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddNapLabelAndIpToInstallations20260218120000 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = 'installations';
        
        // Check and add napLabel
        const hasNapLabel = await queryRunner.hasColumn(table, 'napLabel');
        if (!hasNapLabel) {
            await queryRunner.addColumn(table, new TableColumn({
                name: 'napLabel',
                type: 'varchar',
                isNullable: true,
                default: null
            }));
            console.log('Added napLabel column to installations table');
        }

        // Check and add ipAddress
        const hasIpAddress = await queryRunner.hasColumn(table, 'ipAddress');
        if (!hasIpAddress) {
            await queryRunner.addColumn(table, new TableColumn({
                name: 'ipAddress',
                type: 'varchar',
                isNullable: true, // Entity says nullable: true, though TS uses ! (definite assignment)
                default: null
            }));
            console.log('Added ipAddress column to installations table');
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = 'installations';
        
        const hasNapLabel = await queryRunner.hasColumn(table, 'napLabel');
        if (hasNapLabel) {
            await queryRunner.dropColumn(table, 'napLabel');
        }

        const hasIpAddress = await queryRunner.hasColumn(table, 'ipAddress');
        if (hasIpAddress) {
            await queryRunner.dropColumn(table, 'ipAddress');
        }
    }

}
