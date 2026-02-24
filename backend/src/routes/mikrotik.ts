import { Router } from "express";
import { MikrotikController } from "../controllers/MikrotikController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Protect this route so only authenticated users can proxy traffic to internal network
router.use(authMiddleware);

router.get("/graph", MikrotikController.getGraph);

export default router;
