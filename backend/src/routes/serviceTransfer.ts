import { Router } from "express";
import { ServiceTransferController } from "../controllers/ServiceTransferController";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.use(authMiddleware);

router.get("/", ServiceTransferController.getAll);
router.get("/cost/:clientId", ServiceTransferController.checkCost as any);
router.get("/client/:clientId", ServiceTransferController.getByClient);
router.post("/", ServiceTransferController.create);
router.put("/:id", ServiceTransferController.update);
router.delete("/:id", ServiceTransferController.delete);

export default router;
