import { Router } from "express";
import { ClientController } from "../controllers/ClientController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// Rutas para clientes
router.get("/", requirePermission(PERMISSIONS.CLIENTS.LIST.VIEW), ClientController.getAll);
router.get("/:id/payments", requirePermission(PERMISSIONS.CLIENTS.LIST.VIEW), ClientController.getPayments);
router.get("/:id", requirePermission(PERMISSIONS.CLIENTS.LIST.VIEW), ClientController.getById);
router.post("/", requirePermission(PERMISSIONS.CLIENTS.LIST.CREATE), ClientController.create);
router.put("/:id", requirePermission(PERMISSIONS.CLIENTS.LIST.EDIT), ClientController.update);
router.delete("/:id", requirePermission(PERMISSIONS.CLIENTS.LIST.DELETE), ClientController.delete);

// Endpoint administrativo para normalizar nombres
router.post("/normalize-names", requirePermission(PERMISSIONS.CLIENTS.LIST.EDIT), ClientController.normalizeAllNames);

export default router;