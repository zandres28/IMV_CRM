import { Router } from "express";
import { NotificationController } from "../controllers/NotificationController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const controller = new NotificationController();

router.get("/", authMiddleware, (req, res) => controller.getAll(req, res));
router.get("/unread-count", authMiddleware, (req, res) => controller.getUnreadCount(req, res));
router.put("/:id/read", authMiddleware, (req, res) => controller.update(req, res));
router.delete("/:id", authMiddleware, (req, res) => controller.delete(req, res));

export default router;
