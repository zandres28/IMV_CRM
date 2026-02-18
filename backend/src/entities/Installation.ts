import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";
import { SpeedHistory } from "./SpeedHistory";
import { ServicePlan } from "./ServicePlan";
import { dateOnlyTransformer } from "../utils/transformers";

@Entity("installations")
export class Installation {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Client, client => client.installations)
    client!: Client;

    @Column({ type: 'enum', enum: ['active', 'suspended', 'cancelled'], default: 'active' })
    serviceStatus!: string;

    @Column({ type: 'date', transformer: dateOnlyTransformer })
    installationDate!: Date;

    @Column()
    serviceType!: string;

    @Column()
    speedMbps!: number;

    @ManyToOne(() => ServicePlan, { nullable: true })
    servicePlan?: ServicePlan;

    @Column({ nullable: true })
    routerModel!: string;

    // ONU-SN (serial de la ONU) asociado a la instalación.
    // Usamos el nombre de columna existente 'routerSerialNumber' para no romper datos previos,
    // pero exponemos la propiedad como 'onuSerialNumber' en el código.
    @Column({ name: 'routerSerialNumber', nullable: true, unique: true })
    onuSerialNumber!: string;

    // Identificador del puerto PON en el OLT (ej: 0/0/1)
    @Column({ nullable: true, length: 100 })
    ponId?: string;

    // Identificador interno numérico de la ONU en el puerto PON (ej: 15)
    @Column({ nullable: true, length: 100 })
    onuId?: string;

    @Column({ nullable: true })
    napLabel?: string;

    @Column({ nullable: true })
    ipAddress!: string;

    @Column()
    technician!: string;

    @Column({ type: 'text', nullable: true })
    notes!: string;

    @Column()
    monthlyFee!: number;

    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    installationFee!: number;

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer })
    nextPaymentDate!: Date;

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer })
    retirementDate?: Date;

    @Column({ default: false })
    isActive!: boolean;

    // Soft delete flags
    @Column({ default: false })
    isDeleted!: boolean;

    @Column({ type: 'datetime', nullable: true })
    deletedAt!: Date | null;

    @OneToMany(() => SpeedHistory, speedHistory => speedHistory.installation)
    speedHistory!: SpeedHistory[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}