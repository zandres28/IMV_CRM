import { Router } from 'express';
import { ServicePlanController } from '../controllers/ServicePlanController';
import { requirePermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';

const router = Router();
const planController = new ServicePlanController();

router.get('/', requirePermission(PERMISSIONS.PLANS.VIEW), (req, res) => planController.getAll(req, res));
router.get('/active', requirePermission(PERMISSIONS.PLANS.VIEW), (req, res) => planController.getActive(req, res));
router.get('/:id', requirePermission(PERMISSIONS.PLANS.VIEW), (req, res) => planController.getById(req, res));
router.post('/', requirePermission(PERMISSIONS.ADMIN.PLANS.CREATE), (req, res) => planController.create(req, res));
router.put('/:id', requirePermission(PERMISSIONS.ADMIN.PLANS.EDIT), (req, res) => planController.update(req, res));
router.delete('/:id', requirePermission(PERMISSIONS.ADMIN.PLANS.DELETE), (req, res) => planController.delete(req, res));

export default router;
