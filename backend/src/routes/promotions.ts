import express from 'express';
import { PromotionController, upload } from '../controllers/PromotionController';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = express.Router();

// Ruta de subida de imagen
router.post('/upload', authMiddleware, upload.single('image'), PromotionController.uploadImage);

// Ruta para obtener la lista de imágenes
router.get('/', authMiddleware, PromotionController.getImages);

// Ruta para borrar una imagen
router.delete('/:filename', authMiddleware, PromotionController.deleteImage);

export default router;
