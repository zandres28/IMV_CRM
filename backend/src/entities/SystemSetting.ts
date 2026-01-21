import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from "typeorm";

@Entity("system_settings")
export class SystemSetting {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ unique: true })
    key!: string;

    @Column()
    value!: string;

    @Column({ nullable: true })
    description!: string;

    @Column({ default: "string" })
    type!: string;

    @UpdateDateColumn()
    updated_at!: Date;
}
