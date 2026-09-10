import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { NetflixSlot } from "./NetflixSlot";

@Entity("netflix_accounts")
export class NetflixAccount {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ name: 'email', type: 'varchar', length: 255 })
    email!: string;

    @Column({ name: 'max_slots', type: 'int', default: 5 })
    maxSlots!: number;

    @Column({ name: 'notes', type: 'text', nullable: true })
    notes!: string | null;

    @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
    paymentMethod!: string | null;

    @OneToMany(() => NetflixSlot, slot => slot.account)
    slots!: NetflixSlot[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}