import { Router } from 'express';
import { N8nIntegrationController } from '../controllers/N8nIntegrationController';

const router = Router();

// Obtener datos para recordatorios de pago (n8n)
router.get('/payment-reminders', (req, res) => N8nIntegrationController.getPaymentReminders(req, res));

// Marcar recordatorio como enviado
router.post('/mark-sent', (req, res) => N8nIntegrationController.markAsSent(req, res));

// Consultar deuda cliente (por teléfono)
router.get('/client-debt', (req, res) => N8nIntegrationController.getClientDebt(req, res));

// Obtener detalles cliente (sync contactos Chatwoot)
router.get('/client-details', (req, res) => N8nIntegrationController.getClientByPhone(req, res));

// Registrar pago (Webhook)
router.post('/register-payment', (req, res) => N8nIntegrationController.registerPayment(req, res));

// Obtener candidatos a suspensión (corte automático día 6)
router.get('/suspension-candidates', (req, res) => N8nIntegrationController.getSuspensionCandidates(req, res));

// Resetear estado recordatorios (Admin/Tools)
router.post('/reset-reminders', (req, res) => N8nIntegrationController.resetRemindersStatus(req, res));

// Enviar promociones (imagenes/textos) vía n8n -> Devuelve lista de clientes activos con teléfono
router.post('/promotions/send', (req, res) => N8nIntegrationController.sendPromotions(req, res));

export default router;
