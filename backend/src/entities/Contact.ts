import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";

@Entity("contacts")
export class Contact {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column()
    position: string;

    @Column({ nullable: true })
    email: string;

    @Column({ nullable: true })
    phone: string;

    @ManyToOne(() => Client, client => client.id)
    client: Client;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn()
    updated_at: Date;
}