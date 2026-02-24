import "reflect-metadata";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
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
import oltRoutes from "./routes/olt";
import promotionRoutes from "./routes/promotions";
import mikrotikRoutes from "./routes/mikrotik";
import path from "path";

// Middleware
import { authMiddleware } from "./middlewares/auth.middleware";
import { requireRoles } from "./middlewares/roles.middleware";
import { apiKeyMiddleware } from "./middlewares/apiKey.middleware";
import { publicApiLimiter } from "./middlewares/rateLimit.middleware";

dotenv.config();

const app = express();

// Trust Proxy (Necesario cuando se usa Nginx Proxy Manager)
app.set('trust proxy', 1);

// Debug Logging Middleware - Primero que todo
app.use((req, res, next) => {
    console.log(`[Request Debug] Method: ${req.method} | URL: ${req.url} | Origin: ${req.headers.origin} | IP: ${req.ip}`);
    next();
});

// SEGURIDAD 1: Implementar Helmet (Cabeceras de Seguridad)
app.use(helmet());

// Debug CORS - Log origins
// Removed duplicate logging middleware
// app.use((req, res, next) => { ... });

// SEGURIDAD 2: Configurar CORS Estricto
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8095',
    'http://localhost',
    'http://127.0.0.1',
    process.env.FRONTEND_URL // URL de producción desde variables de entorno
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // Permitir requests sin origen (server-to-server, curl, etc)
        if (!origin) return callback(null, true);
        
        // Permitir localhost, IP local y dominio de producción
        if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://192.168.') || origin.includes('149.130.162.188') || origin.includes('duckdns.org')) {
            callback(null, true);
        } else {
            console.warn(`Bloqueo de CORS para origen: ${origin}`);
            callback(new Error('No permitido por la política de CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// SEGURIDAD 3: Rate Limiting
app.use("/api/auth", publicApiLimiter); // Limite estricto para login (fuerza bruta)

// Configuración general
app.use(express.json());

// Servir archivos estáticos (imágenes promocionales, etc.)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Rutas públicas (sin autenticación)
app.use("/api/auth", authRoutes);
app.use("/api/public", publicRoutes);

// Configuración de rutas protegidas (requieren autenticación)
app.use("/api/clients", authMiddleware, clientRoutes);

// Rutas de integración OLT (Protegidas por API Key internamente en el router)
app.use("/api/olt", oltRoutes);
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
app.use("/api/promotions", authMiddleware, promotionRoutes);
app.use("/api/mikrotik", authMiddleware, mikrotikRoutes);
app.use("/api/service-plans", authMiddleware, servicePlanRoutes);
app.use("/api/technicians", authMiddleware, technicianRoutes);
app.use("/api/monthly-billing", authMiddleware, monthlyBillingRoutes);
app.use("/api/installation-billing", authMiddleware, installationBillingRoutes);
app.use("/api/n8n", apiKeyMiddleware, n8nIntegrationRoutes);
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