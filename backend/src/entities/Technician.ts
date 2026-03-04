import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User";

@Entity("technicians")
export class Technician {
    @PrimaryGeneratedColumn()
    id!: number;

    @Column()
    name!: string;

    @Column({ nullable: true })
    phone?: string;

    @Column({ nullable: true })
    email?: string;

    @Column({ default: true })
    isActive!: boolean;

    // Vinculación directa con el usuario del CRM para notificaciones
    @Column({ nullable: true, type: 'int' })
    userId?: number | null;

    @ManyToOne(() => User, { nullable: true, eager: false })
    @JoinColumn({ name: 'userId' })
    user?: User;

    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;
}
