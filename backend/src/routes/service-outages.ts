import { Router } from "express";
import { ServiceOutageController } from "../controllers/ServiceOutageController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// CRUD básico
router.post("/", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.CREATE), ServiceOutageController.create);
router.get("/", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.VIEW), ServiceOutageController.list);
router.get("/:id", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.VIEW), ServiceOutageController.getById);
router.put("/:id", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.EDIT), ServiceOutageController.update);
router.delete("/:id", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.DELETE), ServiceOutageController.delete);

// Endpoints especiales
router.post("/:id/apply", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.EDIT), ServiceOutageController.markAsApplied);
router.get("/client/:clientId/pending", requirePermission(PERMISSIONS.CLIENTS.OUTAGES.VIEW), ServiceOutageController.getPendingDiscounts);

export default router;
