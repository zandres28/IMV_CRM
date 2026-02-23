import { Router } from "express";
import { MonthlyBillingController } from "../controllers/MonthlyBillingController";
import { ClientController } from "../controllers/ClientController";
import { ServicePlanController } from "../controllers/ServicePlanController";
import { PublicConsentController } from "../controllers/PublicConsentController";
import { publicApiLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();
const servicePlanController = new ServicePlanController();

// Aplicar rate limiter a las rutas públicas
router.use(publicApiLimiter);

router.get("/billing/:identificationNumber", MonthlyBillingController.getPublicClientBilling);

// Rutas de registro público
router.get("/plans", servicePlanController.getPublicList.bind(servicePlanController));
router.post("/register", ClientController.registerPublic);
router.post("/consent-log", PublicConsentController.logConsent);

export default router;
