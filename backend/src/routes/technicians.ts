import { Router } from 'express';
import { TechnicianController } from '../controllers/TechnicianController';
import { requirePermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';

const router = Router();
const technicianController = new TechnicianController();

router.get('/', requirePermission(PERMISSIONS.ADMIN.TECHNICIANS.VIEW), (req, res) => technicianController.getAll(req, res));
router.get('/:id', requirePermission(PERMISSIONS.ADMIN.TECHNICIANS.VIEW), (req, res) => technicianController.getById(req, res));
router.post('/', requirePermission(PERMISSIONS.ADMIN.TECHNICIANS.CREATE), (req, res) => technicianController.create(req, res));
router.put('/:id', requirePermission(PERMISSIONS.ADMIN.TECHNICIANS.EDIT), (req, res) => technicianController.update(req, res));
router.delete('/:id', requirePermission(PERMISSIONS.ADMIN.TECHNICIANS.DELETE), (req, res) => technicianController.delete(req, res));

export default router;
