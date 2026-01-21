import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";

@Entity("opportunities")
export class Opportunity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    title: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    value: number;

    @Column()
    status: string; // prospecto, negociación, ganada, perdida

    @Column({ type: 'datetime', nullable: true })
    expected_close_date: Date;

    @ManyToOne(() => Client, client => client.id)
    client: Client;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}