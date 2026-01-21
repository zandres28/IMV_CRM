import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { requirePermission, requireSelfOrPermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// Rutas para usuarios
router.get("/", requirePermission(PERMISSIONS.ADMIN.USERS.VIEW), UserController.getAll);
router.get("/:id", requireSelfOrPermission(PERMISSIONS.ADMIN.USERS.VIEW), UserController.getById);
router.post("/", requirePermission(PERMISSIONS.ADMIN.USERS.CREATE), UserController.create);
router.put("/:id", requireSelfOrPermission(PERMISSIONS.ADMIN.USERS.EDIT), UserController.update);
router.delete("/:id", requirePermission(PERMISSIONS.ADMIN.USERS.DELETE), UserController.delete);

export default router;