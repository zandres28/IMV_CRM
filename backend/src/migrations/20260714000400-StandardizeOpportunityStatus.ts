import { MigrationInterface, QueryRunner } from "typeorm";

export class StandardizeOpportunityStatus20260714000400 implements MigrationInterface {
  name = 'StandardizeOpportunityStatus20260714000400'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE opportunities MODIFY COLUMN status ENUM('prospecto','negociación','ganada','perdida') NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE opportunities MODIFY COLUMN status VARCHAR(255) NOT NULL`);
  }
}
