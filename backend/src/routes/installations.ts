import { Router } from 'express';
import { InstallationController } from '../controllers/InstallationController';
import { requirePermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';

const router = Router();
const installationController = new InstallationController();

// Crear una nueva instalación
router.post('/', requirePermission(PERMISSIONS.INSTALLATIONS.CREATE), (req, res) => installationController.createInstallation(req, res));

// Obtener instalaciones por cliente
router.get('/client/:clientId', requirePermission(PERMISSIONS.INSTALLATIONS.VIEW), (req, res) => installationController.getInstallationsByClient(req, res));

// Actualizar una instalación
router.put('/:id', requirePermission(PERMISSIONS.INSTALLATIONS.EDIT), (req, res) => installationController.updateInstallation(req, res));

// Obtener historial de velocidad de una instalación
router.get('/:installationId/speed-history', requirePermission(PERMISSIONS.INSTALLATIONS.VIEW), (req, res) => installationController.getSpeedHistory(req, res));

// Cambiar estado del servicio
router.patch('/:id/status', requirePermission(PERMISSIONS.INSTALLATIONS.EDIT), (req, res) => installationController.changeServiceStatus(req, res));

// Eliminar una instalación
router.delete('/:id', requirePermission(PERMISSIONS.INSTALLATIONS.DELETE), (req, res) => installationController.deleteInstallation(req, res));

// Restaurar una instalación soft-deleted
router.patch('/:id/restore', requirePermission(PERMISSIONS.INSTALLATIONS.EDIT), (req, res) => installationController.restoreInstallation(req, res));

export default router;