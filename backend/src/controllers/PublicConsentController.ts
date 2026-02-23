import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { PublicConsentLog } from "../entities/PublicConsentLog";

const consentLogRepository = AppDataSource.getRepository(PublicConsentLog);

export const PublicConsentController = {
    logConsent: async (req: Request, res: Response) => {
        try {
            const {
                identificationNumber,
                fullName,
                source,
                accepted,
                policyUrl,
                clientId
            } = req.body;

            if (!identificationNumber || !source || accepted !== true) {
                return res.status(400).json({ message: "Datos de consentimiento inválidos" });
            }

            const newLog = consentLogRepository.create({
                identificationNumber: String(identificationNumber).trim(),
                fullName: fullName ? String(fullName).trim() : null,
                source: String(source).trim(),
                accepted: true,
                policyUrl: policyUrl ? String(policyUrl).trim() : '/Politica_Tratamiento_Datos_IMV.pdf',
                clientId: typeof clientId === 'number' ? clientId : null,
                ipAddress: req.ip || null,
                userAgent: req.headers['user-agent'] || null
            });

            await consentLogRepository.save(newLog);

            return res.status(201).json({ message: "Consentimiento registrado" });
        } catch (error) {
            console.error("Error registrando consentimiento público:", error);
            return res.status(500).json({ message: "Error al registrar consentimiento" });
        }
    }
};