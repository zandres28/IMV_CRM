import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config();

export const AppDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST || "imv_crm-db-1", // Fallback directo al nombre del contenedor si falla ENV
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USER || "root", // Fallback
    password: process.env.DB_PASSWORD || "rootpassword", // Fallback
    database: process.env.DB_NAME || "imv_crm", // Fallback
    // Mantener en false: usamos migraciones para cambios de esquema.
    synchronize: false,
    logging: ["error", "warn"], // Desactivar log SQL para mejorar rendimiento
    entities: [path.join(__dirname, "../entities/**/*.{ts,js}")],
    migrations: [path.join(__dirname, "../migrations/**/*.{ts,js}")],
    subscribers: [path.join(__dirname, "../subscribers/**/*.{ts,js}")],
});