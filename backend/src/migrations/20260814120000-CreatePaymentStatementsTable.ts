import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePaymentStatementsTable20260814120000 implements MigrationInterface {
    name = 'CreatePaymentStatementsTable20260814120000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE payment_statements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                client_id INT NOT NULL,
                statement_year INT NOT NULL,
                statement_month VARCHAR(20) NOT NULL,
                consecutive INT NOT NULL,
                account_number VARCHAR(30) NOT NULL UNIQUE,
                amount DECIMAL(10,2) NOT NULL DEFAULT 0,
                issued_at DATE NULL,
                created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE KEY uq_statement_client_period (client_id, statement_year, statement_month)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE payment_statements`);
    }
}
