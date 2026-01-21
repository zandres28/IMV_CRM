import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/stats", DashboardController.getStats);

export default router;
