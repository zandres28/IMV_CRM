import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

export type AvisoCategory = 'emergency' | 'maintenance' | 'outage' | 'general';

@Entity("aviso_templates")
export class AvisoTemplate {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column({ length: 150 })
    title!: string;

    @Column({ type: 'enum', enum: ['emergency', 'maintenance', 'outage', 'general'], default: 'general' })
    category!: AvisoCategory;

    @Column({ type: 'text' })
    message!: string;

    @Column({ default: true })
    isActive!: boolean;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
