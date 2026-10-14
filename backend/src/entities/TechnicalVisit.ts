import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";
import { Installation } from "./Installation";
import { Technician } from "./Technician";
import { User } from "./User";
import { dateOnlyTransformer } from "../utils/transformers";

export type TechnicalVisitStatus = 'programada' | 'en_progreso' | 'completada' | 'cancelada';
export type TechnicalVisitType = 'instalacion' | 'soporte' | 'mantenimiento' | 'reparacion' | 'traslado' | 'otro';

@Entity("technical_visits")
export class TechnicalVisit {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    clientId!: number;

    @ManyToOne(() => Client, { eager: true })
    @JoinColumn({ name: "clientId" })
    client!: Client;

    // Instalación relacionada (opcional): visita a una instalación existente
    @Column({ type: "int", nullable: true })
    installationId?: number | null;

    @ManyToOne(() => Installation, { nullable: true })
    @JoinColumn({ name: "installationId" })
    installation?: Installation | null;

    // Técnico asignado a la visita — solo él puede verla en su agenda
    @Column()
    technicianId!: number;

    @ManyToOne(() => Technician, { eager: true })
    @JoinColumn({ name: "technicianId" })
    technician!: Technician;

    @Column({
        type: "enum",
        enum: ["instalacion", "soporte", "mantenimiento", "reparacion", "traslado", "otro"],
        default: "soporte"
    })
    visitType!: TechnicalVisitType;

    @Column({ type: "date", transformer: dateOnlyTransformer })
    scheduledDate!: Date;

    // Franja horaria (ej: "8:00 am a 10:00 am") — misma catalogación que la agenda de instalaciones
    @Column({ type: "varchar", nullable: true, length: 30 })
    timeSlot?: string | null;

    @Column({
        type: "enum",
        enum: ["programada", "en_progreso", "completada", "cancelada"],
        default: "programada"
    })
    status!: TechnicalVisitStatus;

    // Dirección de la visita (si difiere de la dirección del cliente)
    @Column({ type: "varchar", nullable: true, length: 255 })
    address?: string | null;

    @Column({ type: "text", nullable: true })
    notes?: string | null;

    // Usuario que programó la visita
    @Column({ type: "int", nullable: true })
    createdById?: number | null;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: "createdById" })
    createdBy?: User | null;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
