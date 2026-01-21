import { Router } from 'express';
import { ProductController } from '../controllers/ProductController';

const router = Router();
const controller = new ProductController();

// Crear un nuevo producto vendido
router.post('/', controller.createProduct.bind(controller));

// Obtener productos por cliente
router.get('/client/:clientId', controller.getByClient.bind(controller));

// Obtener cuotas de un producto
router.get('/:productId/installments', controller.getInstallments.bind(controller));

// Actualizar un producto
router.put('/:id', controller.updateProduct.bind(controller));

// Eliminar un producto
router.delete('/:id', controller.deleteProduct.bind(controller));

// Actualizar una cuota
router.put('/installments/:id', controller.updateInstallment.bind(controller));

// Backfill cuotas faltantes de un producto específico
router.post('/:productId/backfill-installments', controller.backfillInstallments.bind(controller));

// Backfill global cuotas faltantes
router.post('/backfill-installments', controller.backfillAllInstallments.bind(controller));

export default router;