import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn
} from "typeorm";

export enum DeviceType {
    MIKROTIK = "mikrotik",
    OLT = "olt",
    SWITCH = "switch",
    OTHER = "other"
}

@Entity("network_devices")
export class NetworkDevice {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({
        type: "enum",
        enum: DeviceType,
        default: DeviceType.MIKROTIK
    })
    type!: DeviceType;

    @Column()
    host!: string;

    @Column({ default: 80 })
    port!: number;

    @Column({ nullable: true })
    username!: string;

    @Column({ nullable: true })
    password!: string;

    @Column({ nullable: true })
    description!: string;

    @Column({ default: true })
    enabled!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
