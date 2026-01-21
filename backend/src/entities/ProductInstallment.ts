import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from "typeorm";
import { ProductSold } from "./ProductSold";
import { dateOnlyTransformer } from "../utils/transformers";

@Entity("product_installments")
export class ProductInstallment {
    @PrimaryGeneratedColumn()
    id!: number;

    @ManyToOne(() => ProductSold, product => product.installmentPayments, { onDelete: 'CASCADE' })
    product!: ProductSold;

    @Column()
    installmentNumber!: number;

    @Column()
    amount!: number;

    @Column({ type: 'date', transformer: dateOnlyTransformer })
    dueDate!: Date;

    @Column({ type: 'date', nullable: true, transformer: dateOnlyTransformer })
    paymentDate!: Date;

    @Column({ default: 'pending' })
    status!: string;

    @Column({ type: 'text', nullable: true })
    notes!: string;

    @CreateDateColumn()
    created_at!: Date;
}