import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";
import { Installation } from "./Installation";
import { dateOnlyTransformer } from "../utils/transformers";

@Entity("payments")
export class Payment {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Client, client => client.payments)
    client!: Client;

    @ManyToOne(() => Installation, { nullable: true })
    installation?: Installation;

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer })
    paymentDate?: Date;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    amount!: number;

    @Column()
    paymentMonth!: string;

    @Column()
    paymentYear!: number;

    @Column({ type: 'date', transformer: dateOnlyTransformer })
    dueDate!: Date;

    @Column({ type: 'enum', enum: ['pending', 'paid', 'overdue', 'cancelled'], default: 'pending' })
    status!: string;

    @Column({ type: 'enum', enum: ['monthly', 'installation', 'other'], default: 'monthly' })
    paymentType!: 'monthly' | 'installation' | 'other';

    @Column({ type: 'varchar', length: 50, nullable: true, unique: true })
    externalId?: string;

    @Column({ type: 'enum', enum: ['efectivo', 'nequi', 'bancolombia', 'daviplata', 'transferencia', 'otro'], nullable: true })
    paymentMethod?: string;

    // Desglose del pago
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    servicePlanAmount!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    additionalServicesAmount!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    productInstallmentsAmount!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    installationFeeAmount!: number;

    // Descuento por días sin servicio (caídas)
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    outageDiscountAmount!: number;

    @Column({ type: 'int', default: 0 })
    outageDays!: number;

    // Cuotas de productos futuras provisionadas (no vencidas en este mes)
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    productFutureInstallmentsAmount!: number;

    @Column({ type: 'int', default: 0 })
    productFutureInstallmentsCount!: number;

    // Prorrateo
    @Column({ default: false })
    isProrated!: boolean;

    @Column({ type: 'int', nullable: true })
    billedDays?: number;

    @Column({ type: 'int', nullable: true })
    totalDaysInMonth?: number;

    @Column({ type: 'text', nullable: true })
    notes!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}