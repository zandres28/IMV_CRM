import { Router } from 'express';
import { InstallationBillingController } from '../controllers/InstallationBillingController';

const router = Router();

router.get('/', InstallationBillingController.list);
router.get('/:id', InstallationBillingController.detail);
router.put('/:id', InstallationBillingController.update);
router.put('/:id/pay', InstallationBillingController.markPaid);
router.post('/manual', InstallationBillingController.createManual);

export default router;
