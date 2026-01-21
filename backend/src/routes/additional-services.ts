import { Router } from 'express';
import { AdditionalServiceController } from '../controllers/AdditionalServiceController';

const router = Router();
const controller = new AdditionalServiceController();

// Crear un nuevo servicio adicional
router.post('/', controller.create.bind(controller));

// Obtener servicios por cliente
router.get('/client/:clientId', controller.getByClient.bind(controller));

// Actualizar un servicio
router.put('/:id', controller.update.bind(controller));

// Eliminar un servicio
router.delete('/:id', controller.delete.bind(controller));

export default router;