import { Router } from "express";
import { RoleController } from "../controllers/RoleController";

const router = Router();

// Rutas para roles
router.get("/permissions/list", RoleController.getAvailablePermissions);
router.get("/", RoleController.getAll);
router.get("/:id", RoleController.getById);
router.post("/", RoleController.create);
router.put("/:id", RoleController.update);
router.delete("/:id", RoleController.delete);

export default router;