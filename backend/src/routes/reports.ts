import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { requireAnyPermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';

const router = Router();

router.get('/search', requireAnyPermission(PERMISSIONS.QUERIES.VIEW, PERMISSIONS.QUERIES.OWN), ReportController.search);

export default router;
