import "reflect-metadata";
import express from "express";
import cors from "cors";
import { AppDataSource } from "./config/database";
import * as dotenv from "dotenv";

// Importación de rutas
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import contactRoutes from "./routes/contacts";
import interactionRoutes from "./routes/interactions";
import opportunityRoutes from "./routes/opportunities";
import userRoutes from "./routes/users";
import roleRoutes from "./routes/roles";
import permissionRoutes from "./routes/permissions";
import productRoutes from "./routes/products";
import additionalServiceRoutes from "./routes/additional-services";
import installationRoutes from "./routes/installations";
import servicePlanRoutes from "./routes/service-plans";
import technicianRoutes from "./routes/technicians";
import monthlyBillingRoutes from "./routes/monthly-billing";
import installationBillingRoutes from "./routes/installation-billing";
import n8nIntegrationRoutes from "./routes/n8n-integration";
import reportRoutes from "./routes/reports";
import serviceOutageRoutes from "./routes/service-outages";
import ponMapRoutes from "./routes/pon-map";
import publicRoutes from "./routes/public";
import serviceTransferRoutes from "./routes/serviceTransfer";
import dashboardRoutes from "./routes/dashboard";
import systemSettingsRoutes from "./routes/system-settings.routes";
import interactionTypeRoutes from "./routes/interaction-types";

// Middleware
import { authMiddleware } from "./middlewares/auth.middleware";
import { requireRoles } from "./middlewares/roles.middleware";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Rutas públicas (sin autenticación)
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Configuración de rutas protegidas (requieren autenticación)
app.use("/api/clients", authMiddleware, clientRoutes);
app.use("/api/settings", authMiddleware, systemSettingsRoutes);
app.use("/api/contacts", authMiddleware, contactRoutes);
app.use("/api/interactions", authMiddleware, interactionRoutes);
app.use("/api/interaction-types", authMiddleware, interactionTypeRoutes);
app.use("/api/opportunities", authMiddleware, opportunityRoutes);
app.use("/api/users", authMiddleware, userRoutes);
app.use("/api/roles", authMiddleware, requireRoles('admin'), roleRoutes);
app.use("/api/permissions", authMiddleware, permissionRoutes);
app.use("/api/products", authMiddleware, productRoutes);
app.use("/api/additional-services", authMiddleware, additionalServiceRoutes);
app.use("/api/installations", authMiddleware, installationRoutes);
app.use("/api/service-plans", authMiddleware, servicePlanRoutes);
app.use("/api/technicians", authMiddleware, technicianRoutes);
app.use("/api/monthly-billing", authMiddleware, monthlyBillingRoutes);
app.use("/api/installation-billing", authMiddleware, installationBillingRoutes);
app.use("/api/n8n", authMiddleware, n8nIntegrationRoutes);
app.use("/api/reports", authMiddleware, reportRoutes);
app.use("/api/service-outages", authMiddleware, serviceOutageRoutes);
app.use("/api/pon-map", authMiddleware, ponMapRoutes);
app.use("/api/service-transfers", authMiddleware, serviceTransferRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);

const PORT = process.env.PORT || 3001;


AppDataSource.initialize().then(() => {
    console.log("Base de datos conectada exitosamente");
    console.log("Backend reiniciado: " + new Date().toISOString());
    
    app.listen(PORT, () => {
        console.log(`Servidor corriendo en el puerto ${PORT}`);
    });
}).catch(error => {
    console.error("Error al conectar con la base de datos:", error);
});