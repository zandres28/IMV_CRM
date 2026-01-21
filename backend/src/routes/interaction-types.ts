import { Router } from "express";
import { InteractionTypeController } from "../controllers/InteractionTypeController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", InteractionTypeController.getAll);
router.post("/", InteractionTypeController.create);
router.delete("/:id", InteractionTypeController.delete);

export default router;
