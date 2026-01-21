import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Client } from "./Client";
import { ProductInstallment } from "./ProductInstallment";
import { dateOnlyTransformer } from "../utils/transformers";

@Entity("products_sold")
export class ProductSold {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => Client, client => client.productsSold)
    client!: Client;

    @Column()
    productName!: string;

    @Column()
    totalAmount!: number;

    @Column()
    installments!: number;

    @Column()
    installmentAmount!: number;

    @Column({ type: 'date', transformer: dateOnlyTransformer })
    saleDate!: Date;

    @Column({ default: 'pending' })
    status!: string;

    @OneToMany(() => ProductInstallment, installment => installment.product)
    installmentPayments!: ProductInstallment[];

    @Column({ type: 'text', nullable: true })
    notes!: string;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}