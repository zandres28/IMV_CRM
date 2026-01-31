import { Request, Response, NextFunction } from 'express';

export const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    const validApiKey = process.env.N8N_API_KEY || 'imv_crm_n8n_secret_key_2025';

    if (!apiKey || apiKey !== validApiKey) {
        console.warn(`[API-KEY] Intento de acceso no autorizado desde ${req.ip}`);
        return res.status(401).json({ message: 'Invalid or missing API Key' });
    }

    next();
};
