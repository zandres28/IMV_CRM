import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateNetflixTables20260910100000 implements MigrationInterface {
    name = 'CreateNetflixTables20260910100000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE netflix_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                max_slots INT NOT NULL DEFAULT 5,
                notes TEXT NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await queryRunner.query(`
            CREATE TABLE netflix_slots (
                id INT AUTO_INCREMENT PRIMARY KEY,
                accountId INT NOT NULL,
                slot_index INT NOT NULL,
                profile_name VARCHAR(100) NOT NULL DEFAULT '',
                pin VARCHAR(4) NOT NULL,
                clientId INT NULL,
                additionalServiceId INT NULL,
                assigned_at DATETIME NULL,
                created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE KEY uq_netflix_slot_account_index (accountId, slot_index),
                UNIQUE KEY uq_netflix_slot_account_pin (accountId, pin),
                CONSTRAINT fk_netflix_slots_account FOREIGN KEY (accountId) REFERENCES netflix_accounts(id) ON DELETE CASCADE,
                CONSTRAINT fk_netflix_slots_client FOREIGN KEY (clientId) REFERENCES clients(id) ON DELETE SET NULL,
                CONSTRAINT fk_netflix_slots_additional FOREIGN KEY (additionalServiceId) REFERENCES additional_services(id) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS netflix_slots`);
        await queryRunner.query(`DROP TABLE IF EXISTS netflix_accounts`);
    }
}