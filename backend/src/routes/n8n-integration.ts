import { Router } from 'express';
import { N8nIntegrationController } from '../controllers/N8nIntegrationController';

const router = Router();

// Obtener datos para recordatorios de pago (n8n)
router.get('/payment-reminders', (req, res) => N8nIntegrationController.getPaymentReminders(req, res));

// Marcar recordatorio como enviado
router.post('/mark-sent', (req, res) => N8nIntegrationController.markAsSent(req, res));

export default router;
