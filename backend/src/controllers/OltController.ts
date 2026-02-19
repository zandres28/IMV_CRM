import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Installation } from "../entities/Installation";
import { OltService } from "../services/OltService";

// Helper para buscar instalación por ID o Serial Number
const findInstallation = async (identifier: string) => {
    const installationRepository = AppDataSource.getRepository(Installation);
    
    // 1. Intentar buscar por ID numérico
    if (!isNaN(Number(identifier))) {
        const byId = await installationRepository.findOne({ where: { id: parseInt(identifier) } });
        if (byId) return byId;
    }

    // 2. Intentar buscar por ONU Serial Number
    const bySn = await installationRepository.findOne({ where: { onuSerialNumber: identifier } });
    return bySn;
};

export const OltController = {
    rebootOnu: async (req: Request, res: Response) => {
        try {
            const { installationId } = req.params;
            
            const installation = await findInstallation(installationId);

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada tras buscar por ID y Serial Number" });
            }

            if (!installation.ponId || !installation.onuId) {
                return res.status(400).json({ 
                    message: "La instalación no tiene datos de OLT configurados (ponId, onuId)",
                    data: { ponId: installation.ponId, onuId: installation.onuId }
                });
            }

            const oltService = new OltService();
            const output = await oltService.rebootOnu(installation.ponId, installation.onuId);

            return res.json({ 
                message: "Comando de reinicio enviado exitosamente", 
                details: { ponId: installation.ponId, onuId: installation.onuId, sn: installation.onuSerialNumber },
                log: output 
            });

        } catch (error: any) {
            console.error("Error en OLT Reboot:", error);
            return res.status(500).json({ message: "Error al comunicar con la OLT", error: error.message });
        }
    },

    toggleService: async (req: Request, res: Response) => {
        try {
            const { installationId } = req.params;
            const { action } = req.body; // 'enable' | 'disable' | 'reboot' | 'restart'

            const validActions = ['enable', 'disable', 'reboot', 'restart'];
            if (!action || !validActions.includes(action)) {
                return res.status(400).json({ message: "Acción inválida. Use 'enable', 'disable', 'reboot' o 'restart'" });
            }
            
            const installation = await findInstallation(installationId);

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada tras buscar por ID y Serial Number" });
            }

            if (!installation.ponId || !installation.onuId) {
                return res.status(400).json({ 
                    message: "La instalación no tiene datos de OLT configurados (ponId, onuId)",
                    data: { ponId: installation.ponId, onuId: installation.onuId }
                });
            }

            const oltService = new OltService();
            let output = '';
            let messageAction = '';

            if (action === 'enable') {
                output = await oltService.activateOnu(installation.ponId, installation.onuId);
                messageAction = 'activado';
                installation.serviceStatus = 'active';
                await AppDataSource.getRepository(Installation).save(installation);
            } else if (action === 'disable') {
                output = await oltService.deactivateOnu(installation.ponId, installation.onuId);
                messageAction = 'cortado';
                installation.serviceStatus = 'suspended';
                await AppDataSource.getRepository(Installation).save(installation);
            } else if (action === 'reboot' || action === 'restart') {
                output = await oltService.rebootOnu(installation.ponId, installation.onuId);
                messageAction = 'reiniciado';
            }

            return res.json({ 
                message: `Servicio ${messageAction} exitosamente. Estado actualizado en CRM.`,
                details: { 
                    ponId: installation.ponId, 
                    onuId: installation.onuId, 
                    sn: installation.onuSerialNumber,
                    newStatus: installation.serviceStatus
                },
                log: output 
            });

        } catch (error: any) {
            console.error("Error en OLT Toggle:", error);
            return res.status(500).json({ message: "Error al comunicar con la OLT", error: error.message });
        }
    },

    getStatus: async (req: Request, res: Response) => {
        try {
            const { installationId } = req.params;
            
            const installation = await findInstallation(installationId);

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada tras buscar por ID y Serial Number" });
            }

            if (!installation.ponId || !installation.onuId) {
                return res.status(400).json({ message: "Faltan datos de OLT" });
            }

            const oltService = new OltService();
            const output = await oltService.getOnuStatus(installation.ponId, installation.onuId);

            return res.json({ 
                message: "Estado consultado",
                log: output 
            });

        } catch (error: any) {
            return res.status(500).json({ message: "Error OLT", error: error.message });
        }
    }
};
