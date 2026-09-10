import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { NetflixAccount } from "./NetflixAccount";
import { Client } from "./Client";
import { AdditionalService } from "./AdditionalService";

@Entity("netflix_slots")
export class NetflixSlot {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => NetflixAccount, account => account.slots, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'accountId' })
    account!: NetflixAccount;

    @Column({ name: 'slot_index', type: 'int' })
    slotIndex!: number;

    @Column({ name: 'profile_name', type: 'varchar', length: 100, default: '' })
    profileName!: string;

    @Column({ name: 'pin', type: 'varchar', length: 4 })
    pin!: string;

    @ManyToOne(() => Client, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'clientId' })
    client!: Client | null;

    @ManyToOne(() => AdditionalService, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'additionalServiceId' })
    additionalService!: AdditionalService | null;

    @Column({ name: 'assigned_at', type: 'datetime', nullable: true })
    assignedAt!: Date | null;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}