import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";

@Entity("additional_services")
export class AdditionalService {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Client, client => client.additionalServices)
    client!: Client;

    @Column()
    serviceName!: string;

    @Column()
    monthlyFee!: number;

    @Column({ type: 'date' })
    startDate!: Date;

    @Column({ type: 'date', nullable: true })
    endDate!: Date;

    @Column({ default: 'active' })
    status!: string;

    @Column({ type: 'text', nullable: true })
    notes!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}