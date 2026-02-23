import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("public_consent_logs")
export class PublicConsentLog {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ type: 'varchar', length: 50 })
    identificationNumber!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    fullName?: string | null;

    @Column({ type: 'varchar', length: 50 })
    source!: string;

    @Column({ type: 'boolean', default: true })
    accepted!: boolean;

    @Column({ type: 'varchar', length: 255 })
    policyUrl!: string;

    @Column({ type: 'int', nullable: true })
    clientId?: number | null;

    @Column({ type: 'varchar', length: 255, nullable: true })
    ipAddress?: string | null;

    @Column({ type: 'text', nullable: true })
    userAgent?: string | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt!: Date;
}