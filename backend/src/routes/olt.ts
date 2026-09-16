import { authMiddleware } from "../middlewares/auth.middleware";
import { Router } from "express";
import { OltController } from "../controllers/OltController";
import { apiKeyMiddleware } from "../middlewares/apiKey.middleware";

const router = Router();

// Health check manual — usa JWT del browser, NO API Key
router.get("/health-check", authMiddleware, OltController.healthCheck);

// Todas las rutas OLT restantes requieren API Key (n8n)
router.use(apiKeyMiddleware);

router.post("/reboot/:installationId", OltController.rebootOnu);
router.post("/service/:installationId", OltController.toggleService);
router.get("/status/:installationId", OltController.getStatus);
router.post("/sync-service-status", OltController.syncServiceStatus);
router.post("/restore-client/:clientId", OltController.restoreClientService);

export default router;
