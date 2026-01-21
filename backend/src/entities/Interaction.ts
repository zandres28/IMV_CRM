import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from "typeorm";
import { Client } from "./Client";
import { Technician } from "./Technician";
import { InteractionType } from "./InteractionType";

export type InteractionStatus = 'pendiente' | 'en_progreso' | 'completado' | 'cancelado' | 'pospuesto';
export type InteractionPriority = 'baja' | 'media' | 'alta' | 'urgente';

@Entity("interactions")
export class Interaction {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    clientId: number;

    @ManyToOne(() => Client, { eager: true })
    @JoinColumn({ name: 'clientId' })
    client: Client;

    @Column({ nullable: true })
    interactionTypeId: number;

    @ManyToOne(() => InteractionType, { eager: true })
    @JoinColumn({ name: 'interactionTypeId' })
    interactionType: InteractionType;

    @Column({ length: 200 })
    subject: string;

    @Column('text')
    description: string;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'pendiente'
    })
    status: InteractionStatus;

    @Column({
        type: 'varchar',
        length: 20,
        default: 'media'
    })
    priority: InteractionPriority;

    @Column({ nullable: true })
    assignedToTechnicianId?: number;

    @ManyToOne(() => Technician, { nullable: true, eager: true })
    @JoinColumn({ name: 'assignedToTechnicianId' })
    assignedToTechnician?: Technician;

    @Column({ type: 'date', nullable: true })
    scheduledDate?: Date;

    @Column({ type: 'datetime', nullable: true })
    completedDate?: Date;

    @Column('text', { nullable: true })
    notes?: string;

    @Column('text', { nullable: true })
    resolution?: string;

    // Para almacenar URLs o paths de archivos adjuntos (fotos de daños, etc.)
    @Column('simple-json', { nullable: true })
    attachments?: string[];

    @Column({ type: 'datetime', nullable: true })
    next_follow_up?: Date;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}