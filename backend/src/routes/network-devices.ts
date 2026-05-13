import { Router } from "express";
import { NetworkDeviceController } from "../controllers/NetworkDeviceController";

const router = Router();

router.get("/", NetworkDeviceController.getAll);
router.get("/:id", NetworkDeviceController.getById);
router.post("/", NetworkDeviceController.create);
router.put("/:id", NetworkDeviceController.update);
router.delete("/:id", NetworkDeviceController.delete);
router.post("/:id/test", NetworkDeviceController.testConnection);

export default router;
