import { Router } from 'express';
import { requirePermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';
import { NetflixAccountController } from '../controllers/NetflixAccountController';

const router = Router();
const controller = new NetflixAccountController();

// Ver (ocupación, cuentas)
router.get('/', requirePermission(PERMISSIONS.CLIENTS.LIST.VIEW), controller.getAll.bind(controller));

// Netflix asignado a un cliente (para el detalle del cliente)
router.get('/client/:clientId', requirePermission(PERMISSIONS.CLIENTS.LIST.VIEW), controller.getByClient.bind(controller));

// CRUD de cuentas
router.post('/', requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), controller.create.bind(controller));
router.put('/:id', requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), controller.update.bind(controller));
router.delete('/:id', requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), controller.remove.bind(controller));

// Gestión de perfiles/slots
router.post('/slot/:slotId/assign', requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), controller.assignSlot.bind(controller));
router.post('/slot/:slotId/release', requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), controller.releaseSlot.bind(controller));
router.put('/slot/:slotId', requirePermission(PERMISSIONS.CLIENTS.CRM.EDIT), controller.updateSlot.bind(controller));

export default router;