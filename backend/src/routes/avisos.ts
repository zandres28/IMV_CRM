import express from 'express';
import { AvisoController } from '../controllers/AvisoController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

router.get('/', authMiddleware, AvisoController.getAll);
router.post('/', authMiddleware, AvisoController.create);
router.put('/:id', authMiddleware, AvisoController.update);
router.delete('/:id', authMiddleware, AvisoController.delete);

// Vista previa de destinatarios con filtros (requiere auth, NO es endpoint de n8n)
router.post('/preview', authMiddleware, AvisoController.preview);

export default router;
