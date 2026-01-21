import { Router } from "express";
import { OpportunityController } from "../controllers/OpportunityController";

const router = Router();

// Rutas para oportunidades
router.get("/", OpportunityController.getAll);
router.get("/client/:clientId", OpportunityController.getByClient);
router.post("/", OpportunityController.create);
router.put("/:id", OpportunityController.update);
router.delete("/:id", OpportunityController.delete);

export default router;