import { Router } from "express";
import { MonthlyBillingController } from "../controllers/MonthlyBillingController";
import { requirePermission } from "../middlewares/permissions.middleware";
import { PERMISSIONS } from "../utils/permissions";

const router = Router();

// Generar cobros mensuales
router.post("/generate", requirePermission(PERMISSIONS.BILLING.CREATE), MonthlyBillingController.generateMonthlyBilling);

// Marcar pagos vencidos
router.post("/mark-overdue", requirePermission(PERMISSIONS.BILLING.EDIT), MonthlyBillingController.markOverduePayments);

// Recalcular cobros del mes
router.post("/recalculate", requirePermission(PERMISSIONS.BILLING.EDIT), MonthlyBillingController.recalculateMonthlyBilling);

// Marcar pagos en lote como pagados
router.post("/bulk/mark-paid", requirePermission(PERMISSIONS.BILLING.EDIT), MonthlyBillingController.bulkMarkPaid);

// Obtener cobros de un mes específico
router.get("/", requirePermission(PERMISSIONS.BILLING.VIEW), MonthlyBillingController.getMonthlyBilling);

// Obtener pagos pendientes de un cliente (Ruta estática/específica antes de :id)
router.get("/client/:clientId/pending", requirePermission(PERMISSIONS.BILLING.VIEW), MonthlyBillingController.getClientPendingPayments);

// Deshace la facturación mensual para un periodo específico
router.delete("/rollback", requirePermission(PERMISSIONS.BILLING.DELETE), MonthlyBillingController.rollbackMonthlyBilling);

// Obtener detalle de un pago
router.get("/:id", requirePermission(PERMISSIONS.BILLING.VIEW), MonthlyBillingController.getPaymentDetail);

// Eliminar un pago
router.delete("/:id", requirePermission(PERMISSIONS.BILLING.DELETE), MonthlyBillingController.deletePayment);

// Registrar un pago
router.put("/:id/pay", requirePermission(PERMISSIONS.BILLING.CREATE), MonthlyBillingController.registerPayment);

// Actualizar estado de un pago
router.put("/:id/status", requirePermission(PERMISSIONS.BILLING.EDIT), MonthlyBillingController.updatePaymentStatus);

export default router;
