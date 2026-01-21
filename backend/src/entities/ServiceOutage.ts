import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { Client } from "./Client";
import { Installation } from "./Installation";

@Entity("service_outages")
export class ServiceOutage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  clientId: number;

  @ManyToOne(() => Client)
  @JoinColumn({ name: "clientId" })
  client: Client;

  @Column()
  installationId: number;

  @ManyToOne(() => Installation)
  @JoinColumn({ name: "installationId" })
  installation: Installation;

  @Column({ type: "date" })
  startDate: Date;

  @Column({ type: "date" })
  endDate: Date;

  @Column({ type: "int" })
  days: number;

  @Column({ type: "text", nullable: true })
  reason: string;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  discountAmount: number;

  @Column({
    type: "enum",
    enum: ["pending", "applied", "cancelled"],
    default: "pending",
  })
  status: "pending" | "applied" | "cancelled";

  @Column({ nullable: true })
  appliedToPaymentId: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
