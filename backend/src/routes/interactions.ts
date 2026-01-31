import { Router } from "express";
import { InteractionController } from "../controllers/InteractionController";
import { N8nIntegrationController } from "../controllers/N8nIntegrationController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// Rutas para interacciones
router.get("/", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getAll);
router.get("/stats", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getStats);
router.get("/client/:clientId", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getByClient);
router.get("/:id", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getById);

// Nueva ruta para resetear recordatorios (accesible desde frontend con JWT)
router.post("/reset-n8n-reminder", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), N8nIntegrationController.resetRemindersStatus);
router.post("/set-reminder-status", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), N8nIntegrationController.setReminderStatus);

router.post("/", requirePermission(PERMISSIONS.CLIENTS.CRM.CREATE), InteractionController.create);
router.put("/:id", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.update);
router.put("/:id/status", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.updateStatus);
router.put("/:id/assign-technician", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.assignTechnician);
router.delete("/:id", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.delete);

export default router;