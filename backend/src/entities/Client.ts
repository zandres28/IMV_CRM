import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn, OneToMany, BeforeInsert, BeforeUpdate } from "typeorm";
import { Installation } from "./Installation";
import { Payment } from "./Payment";
import { AdditionalService } from "./AdditionalService";
import { ProductSold } from "./ProductSold";
import { Interaction } from "./Interaction";
import { dateOnlyTransformer } from "../utils/transformers";

@Entity("clients")
export class Client {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    fullName: string;

    // ...

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer })
    suspension_extension_date?: Date | null;

    @Column({ unique: true })
    identificationNumber: string;

    @Column()
    installationAddress: string;

    @Column()
    city: string;

    @Column()
    primaryPhone: string;

    @Column({ nullable: true })
    secondaryPhone: string;

    @Column()
    email: string;

    // Deprecated: El ONU-SN ahora vive en Installation.onuSerialNumber
    @Column({ nullable: true })
    onuSerialNumber?: string;

    @Column({ default: 'active' })
    status: string;

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer })
    retirementDate?: Date | null;

    @Column({ type: 'text', nullable: true })
    retirementReason?: string;

    @DeleteDateColumn()
    deletedAt?: Date;

    @OneToMany(() => Installation, installation => installation.client)
    installations: Installation[];

    @OneToMany(() => Payment, payment => payment.client)
    payments!: Payment[];

    @OneToMany(() => AdditionalService, service => service.client)
    additionalServices!: AdditionalService[];

    @OneToMany(() => ProductSold, product => product.client)
    productsSold!: ProductSold[];

    @OneToMany(() => Interaction, interaction => interaction.client)
    interactions!: Interaction[];

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @BeforeInsert()
    @BeforeUpdate()
    normalizeNames() {
        if (this.fullName) {
            this.fullName = this.fullName.toUpperCase().trim();
        }
        if (this.city) {
            this.city = this.city.toUpperCase().trim();
        }
    }
}