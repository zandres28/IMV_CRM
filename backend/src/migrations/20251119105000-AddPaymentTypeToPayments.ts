import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddPaymentTypeToPayments20251119105000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('payments', 'paymentType');
        if (!hasColumn) {
            await queryRunner.addColumn('payments', new TableColumn({
                name: 'paymentType',
                type: 'enum',
                enum: ['monthly','installation','other'],
                default: `'monthly'`,
                isNullable: false
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn('payments', 'paymentType');
        if (hasColumn) {
            await queryRunner.dropColumn('payments', 'paymentType');
        }
    }
}
