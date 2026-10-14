import { Router } from 'express';
import { TechnicalVisitController } from '../controllers/TechnicalVisitController';
import { requirePermission } from '../middlewares/permissions.middleware';
import { PERMISSIONS } from '../utils/permissions';

const router = Router();
const technicalVisitController = new TechnicalVisitController();

// Listar visitas (el controller filtra: el técnico solo ve las suyas)
router.get('/', requirePermission(PERMISSIONS.VISITS.VIEW), (req, res) => technicalVisitController.list(req, res));

// Programar visita
router.post('/', requirePermission(PERMISSIONS.VISITS.CREATE), (req, res) => technicalVisitController.create(req, res));

// Editar / reasignar (fecha y técnico) — permiso visits.edit;
// el técnico asignado puede cambiar solo estado/notas (lógica interna del controller)
router.put('/:id', (req, res) => technicalVisitController.update(req, res));

// Eliminar visita
router.delete('/:id', requirePermission(PERMISSIONS.VISITS.EDIT), (req, res) => technicalVisitController.remove(req, res));

export default router;
