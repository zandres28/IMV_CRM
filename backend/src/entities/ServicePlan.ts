import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity("service_plans")
export class ServicePlan {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column()
    speedMbps!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    monthlyFee!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    installationFee!: number;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}