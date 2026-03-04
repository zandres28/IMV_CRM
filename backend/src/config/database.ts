import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

// Fix: Don't override 'db' with 'imv_crm-db-1' if the environment says so. And localhost fallback.
const host = process.env.DB_HOST || "localhost";

export const AppDataSource = new DataSource({
    type: "mysql",
    host: host,
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "imv_crm", // Fallback
    // Mantener en false: usamos migraciones para cambios de esquema.
    synchronize: false,
    logging: ["error", "warn"], // Desactivar log SQL para mejorar rendimiento
    entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],
    migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
    subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
});