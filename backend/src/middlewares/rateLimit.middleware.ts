import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// IPs internas de la red Docker y localhost que se saltan el rate limit
const TRUSTED_INTERNAL_RANGES = ['127.', '10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '::1', '::ffff:127.'];

function isInternalRequest(req: Request): boolean {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
    return TRUSTED_INTERNAL_RANGES.some(range => ip.startsWith(range));
}

// Limitador estricto para rutas públicas y Auth
export const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100,
    standardHeaders: true, 
    legacyHeaders: false,
    skip: isInternalRequest,
    message: {
        message: "Demasiadas peticiones desde esta IP, por favor intente nuevamente en 15 minutos."
    }
});

// Limitador general para API interna (más permisivo)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isInternalRequest,
    message: {
        message: "Límite de peticiones excedido, por favor espere un momento."
    }
});
