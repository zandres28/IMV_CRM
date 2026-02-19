import rateLimit from 'express-rate-limit';

// Limitador estricto para rutas públicas y Auth
export const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Aumentado a 100 para evitar bloqueos legítimos en dashboard
    standardHeaders: true, 
    legacyHeaders: false,
    message: {
        message: "Demasiadas peticiones desde esta IP, por favor intente nuevamente en 15 minutos."
    }
});

// Limitador general para API interna (más permisivo)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000, // 1000 peticiones por 15 min (suficiente para uso normal)
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Límite de peticiones excedido, por favor espere un momento."
    }
});
