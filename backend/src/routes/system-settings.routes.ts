import { Router } from "express";
import { SystemSettingController } from "../controllers/SystemSettingController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.get("/:key", authMiddleware, SystemSettingController.getSetting);
router.put("/:key", authMiddleware, SystemSettingController.updateSetting);

export default router;
