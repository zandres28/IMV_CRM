import { Router } from "express";
import { OltController } from "../controllers/OltController";
import { apiKeyMiddleware } from "../middlewares/apiKey.middleware";

const router = Router();

// Todas las rutas de OLT requieren API Key (para uso desde n8n)
router.use(apiKeyMiddleware);

router.post("/reboot/:installationId", OltController.rebootOnu);
router.post("/service/:installationId", OltController.toggleService); // Body: { action: 'enable' | 'disable' }
router.get("/status/:installationId", OltController.getStatus);

export default router;
