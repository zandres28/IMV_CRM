import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';

const isValidApiKey = (provided: string, expected: string) => {
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
};

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    // Solo por header: la query string se filtra a logs, proxies y referrers.
    const apiKey = req.headers['x-api-key'] || req.headers['x-n8n-api-key'];
    const validApiKey = process.env.N8N_API_KEY;

    if (!validApiKey) {
        console.error('N8N_API_KEY is not defined in environment variables');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    if (typeof apiKey !== 'string' || !isValidApiKey(apiKey, validApiKey)) {
        console.warn(`[API-KEY] Intento de acceso no autorizado desde ${req.ip}`);
        return res.status(401).json({ message: 'Invalid or missing API Key' });
    }

    next();
};
