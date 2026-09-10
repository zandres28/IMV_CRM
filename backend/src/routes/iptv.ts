import { Router } from "express";
import { IptvController } from "../controllers/IptvController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

router.post("/generate-username", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), IptvController.generateUsername);
router.post("/:clientId/create", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), IptvController.create);
router.get("/:clientId/status", requirePermission(PERMISSIONS.CLIENTS.LIST.VIEW), IptvController.status);
router.post("/:clientId/disable", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), IptvController.disable);
router.post("/:clientId/enable", requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), IptvController.enable);
router.delete("/:clientId", requirePermission(PERMISSIONS.CLIENTS.LIST.DELETE), IptvController.remove);

export default router;