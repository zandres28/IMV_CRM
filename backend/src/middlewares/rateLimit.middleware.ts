import rateLimit from 'express-rate-limit';

export const publicApiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50, // Limita a 50 peticiones por IP por ventana de 15 minutos
    standardHeaders: true, // Retorna info de rate limit en los headers `RateLimit-*`
    legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
    message: {
        message: "Demasiadas peticiones desde esta IP, por favor intente nuevamente en 15 minutos."
    }
});
