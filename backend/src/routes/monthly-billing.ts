import { Router } from "express";
import { MonthlyBillingController } from "../controllers/MonthlyBillingController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// Generar cobros mensuales
router.post("/generate", requirePermission(PERMISSIONS.BILLING.CREATE), MonthlyBillingController.generateMonthlyBilling);

// Obtener cobros de un mes específico
router.get("/", requirePermission(PERMISSIONS.BILLING.VIEW), MonthlyBillingController.getMonthlyBilling);

// Obtener detalle de un pago
router.get("/:id", requirePermission(PERMISSIONS.BILLING.VIEW), MonthlyBillingController.getPaymentDetail);

// Deshace la facturación mensual para un periodo específico
router.delete("/rollback", requirePermission(PERMISSIONS.BILLING.DELETE), MonthlyBillingController.rollbackMonthlyBilling);

// Eliminar un pago
router.delete("/:id", requirePermission(PERMISSIONS.BILLING.DELETE), MonthlyBillingController.deletePayment);

export default router;
