import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppDataSource } from '../config/database';
import { Promotion } from '../entities/Promotion';

// Configuración de almacenamiento
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../../uploads/promotions');
        // Asegurar que el directorio existe
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Generar un nombre único para evitar colisiones
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'promo-' + uniqueSuffix + ext);
    }
});

// Filtro de archivos (solo imágenes)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten archivos de imagen'));
    }
};

export const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB límite
    }
});

export class PromotionController {

    static async uploadImage(req: Request, res: Response) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'No se ha subido ninguna imagen' });
            }

            const { description } = req.body;
            const promotionRepository = AppDataSource.getRepository(Promotion);

            const newPromotion = promotionRepository.create({
                filename: req.file.filename,
                originalName: req.file.originalname,
                mimeType: req.file.mimetype,
                size: req.file.size,
                description: description || '',
            });

            await promotionRepository.save(newPromotion);

            // Construir la URL relativa (para que el frontend la complete)
            const relativePath = `/uploads/promotions/${req.file.filename}`;

            return res.status(201).json({
                message: 'Imagen subida correctamente',
                id: newPromotion.id,
                filename: newPromotion.filename,
                path: relativePath, // Usar path relativo
                description: newPromotion.description,         
                originalName: newPromotion.originalName,
                size: newPromotion.size
            });

        } catch (error) {
            console.error('Error al subir imagen:', error);
            return res.status(500).json({ message: 'Error interno al procesar la imagen' });
        }
    }

    static async getImages(req: Request, res: Response) {
        try {
            const promotionRepository = AppDataSource.getRepository(Promotion);
            const promotions = await promotionRepository.find({
                order: { createdAt: 'DESC' }
            });

            const images = promotions.map(promo => ({
                id: promo.id,
                filename: promo.filename,
                path: `/uploads/promotions/${promo.filename}`,
                description: promo.description,
                createdAt: promo.createdAt,
                size: promo.size
            }));

            return res.status(200).json(images);

        } catch (error) {
            console.error('Error al listar imágenes:', error);
            return res.status(500).json({ message: 'Error al obtener las imágenes' });
        }
    }

    static async deleteImage(req: Request, res: Response) {
        try {
            const { filename } = req.params;
            if (!filename) {
                return res.status(400).json({ message: 'Nombre de archivo requerido' });
            }

            const promotionRepository = AppDataSource.getRepository(Promotion);
            const promo = await promotionRepository.findOneBy({ filename });

            if (promo) {
                await promotionRepository.remove(promo);
            }

            // Intentar borrar del disco aunque no esté en DB (limpieza)
            const filePath = path.join(__dirname, '../../uploads/promotions', filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            return res.status(200).json({ message: 'Imagen eliminada correctamente' });

        } catch (error) {
            console.error('Error al eliminar imagen:', error);
            return res.status(500).json({ message: 'Error al eliminar la imagen' });
        }
    }
}
