import { Router } from "express";
import { MonthlyBillingController } from "../controllers/MonthlyBillingController";
import { ClientController } from "../controllers/ClientController";
import { ServicePlanController } from "../controllers/ServicePlanController";
import { PublicConsentController } from "../controllers/PublicConsentController";
import { publicApiLimiter } from "../middlewares/rateLimit.middleware";
import path from "path";
import fs from "fs";

const router = Router();
const servicePlanController = new ServicePlanController();

// Aplicar rate limiter a las rutas públicas
router.use(publicApiLimiter);

router.get("/billing/:identificationNumber", MonthlyBillingController.getPublicClientBilling);

// Rutas de registro público
router.get("/plans", servicePlanController.getPublicList.bind(servicePlanController));
router.post("/register", ClientController.registerPublic);
router.post("/consent-log", PublicConsentController.logConsent);

// Config del agente IA
router.get("/agent-config", (_req, res) => {
  const inBuild = path.join(__dirname, "../config/agent_config.json");
  const inSrc   = path.join(__dirname, "../../src/config/agent_config.json");
  const configPath = fs.existsSync(inBuild) ? inBuild : inSrc;
  fs.readFile(configPath, "utf8", (err, data) => {
    if (err) return res.status(500).json({ error: "Error leyendo config" });
    try { res.json(JSON.parse(data)); }
    catch { res.status(500).json({ error: "JSON invalido" }); }
  });
});

export default router;
