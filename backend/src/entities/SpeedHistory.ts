import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from "typeorm";
import { Installation } from "./Installation";

@Entity("speed_history")
export class SpeedHistory {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Installation, installation => installation.speedHistory, { onDelete: 'CASCADE', nullable: true })
    // Alineado al esquema existente en DB
    @JoinColumn({ name: 'installation_id' })
    installation!: Installation;

    @Column()
    previousSpeed!: number;

    @Column()
    newSpeed!: number;

    @Column({ type: 'text', nullable: true })
    reason!: string;

    @CreateDateColumn()
    changeDate!: Date;
}