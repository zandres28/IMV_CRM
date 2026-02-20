import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

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

            // Construir la URL de acceso público
            // Asumimos que se sirve la carpeta uploads en /uploads
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const imageUrl = `${baseUrl}/uploads/promotions/${req.file.filename}`;

            return res.status(201).json({
                message: 'Imagen subida correctamente',
                filename: req.file.filename,
                url: imageUrl,
                originalName: req.file.originalname,
                size: req.file.size
            });

        } catch (error) {
            console.error('Error al subir imagen:', error);
            return res.status(500).json({ message: 'Error interno al procesar la imagen' });
        }
    }

    static async getImages(req: Request, res: Response) {
        try {
            const uploadPath = path.join(__dirname, '../../uploads/promotions');
            
            if (!fs.existsSync(uploadPath)) {
                return res.status(200).json([]);
            }

            const files = fs.readdirSync(uploadPath);
            const baseUrl = `${req.protocol}://${req.get('host')}`;

            const images = files.map(file => {
                const filePath = path.join(uploadPath, file);
                const stats = fs.statSync(filePath);
                
                return {
                    filename: file,
                    url: `${baseUrl}/uploads/promotions/${file}`,
                    createdAt: stats.birthtime,
                    size: stats.size
                };
            });

            // Ordenar por fecha de creación (más recientes primero)
            images.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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

            const filePath = path.join(__dirname, '../../uploads/promotions', filename);

            if (!fs.existsSync(filePath)) {
                return res.status(404).json({ message: 'Imagen no encontrada' });
            }

            fs.unlinkSync(filePath);

            return res.status(200).json({ message: 'Imagen eliminada correctamente' });

        } catch (error) {
            console.error('Error al eliminar imagen:', error);
            return res.status(500).json({ message: 'Error al eliminar la imagen' });
        }
    }
}
