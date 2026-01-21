import { Router } from "express";
import { ContactController } from "../controllers/ContactController";

const router = Router();

// Rutas para contactos
router.get("/", ContactController.getAll);
router.get("/client/:clientId", ContactController.getByClient);
router.post("/", ContactController.create);
router.put("/:id", ContactController.update);
router.delete("/:id", ContactController.delete);

export default router;