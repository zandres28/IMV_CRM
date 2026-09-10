import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";
import { dateOnlyTransformer } from "../utils/transformers";

@Entity('payment_statements')
@Index('uq_statement_client_period', ['clientId', 'statementYear', 'statementMonth'], { unique: true })
export class PaymentStatement {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'int', name: 'client_id' })
    clientId!: number;

    @Column({ type: 'int', name: 'statement_year' })
    statementYear!: number;

    @Column({ type: 'varchar', length: 20, name: 'statement_month' })
    statementMonth!: string;

    @Column({ type: 'int' })
    consecutive!: number;

    @Column({ type: 'varchar', length: 30, unique: true, name: 'account_number' })
    accountNumber!: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer, name: 'issued_at' })
    issuedAt?: Date | null;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
