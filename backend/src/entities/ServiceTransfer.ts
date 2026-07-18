import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Client } from "./Client";
import { Technician } from "./Technician";

export type ServiceTransferStatus = 'pendiente' | 'en_progreso' | 'completado' | 'anulado';

@Entity("service_transfers")
export class ServiceTransfer {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    clientId: number;

    @ManyToOne(() => Client, { eager: true })
    @JoinColumn({ name: 'clientId' })
    client: Client;

    @Column()
    previousAddress: string;

    @Column()
    newAddress: string;

    @Column({ type: 'date' })
    requestDate: Date;

    @Column({ type: 'date', nullable: true })
    scheduledDate?: Date;

    @Column({ type: 'date', nullable: true })
    completionDate?: Date;

    @Column({
        type: 'enum',
        enum: ['pendiente', 'en_progreso', 'completado', 'anulado'],
        default: 'pendiente'
    })
    status: ServiceTransferStatus;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    cost: number;

    @Column({ nullable: true })
    technicianId?: number;

    @ManyToOne(() => Technician, { nullable: true, eager: true })
    @JoinColumn({ name: 'technicianId' })
    technician?: Technician;

    @Column('text', { nullable: true })
    notes?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}
