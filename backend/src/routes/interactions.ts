import { Router } from "express";
import { InteractionController } from "../controllers/InteractionController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// Rutas para interacciones
router.get("/", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getAll);
router.get("/stats", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getStats);
router.get("/client/:clientId", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getByClient);
router.get("/:id", requirePermission(PERMISSIONS.CLIENTS.CRM.VIEW), InteractionController.getById);
router.post("/", requirePermission(PERMISSIONS.CLIENTS.CRM.CREATE), InteractionController.create);
router.put("/:id", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.update);
router.put("/:id/status", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.updateStatus);
router.put("/:id/assign-technician", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.assignTechnician);
router.delete("/:id", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), InteractionController.delete);

export default router;