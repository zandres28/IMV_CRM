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
            await oltService.rebootOnu(installation.ponId, installation.onuId);

            return res.json({ 
                message: "Comando de reinicio enviado exitosamente", 
                details: { ponId: installation.ponId, onuId: installation.onuId, sn: installation.onuSerialNumber }
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
            let messageAction = '';

            if (action === 'enable') {
                await oltService.activateOnu(installation.ponId, installation.onuId);
                messageAction = 'activado';
                installation.serviceStatus = 'activo';
                await AppDataSource.getRepository(Installation).save(installation);
            } else if (action === 'disable') {
                await oltService.deactivateOnu(installation.ponId, installation.onuId);
                messageAction = 'cortado';
                installation.serviceStatus = 'suspendido';
                await AppDataSource.getRepository(Installation).save(installation);
            } else if (action === 'reboot' || action === 'restart') {
                await oltService.rebootOnu(installation.ponId, installation.onuId);
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

            const oltService = new OltService();

            if (installation.onuSerialNumber) {
                const onu = await oltService.getOnuBySerial(installation.onuSerialNumber);
                return res.json({ message: "Estado consultado", data: onu });
            }

            if (installation.ponId && installation.onuId) {
                const onu = await oltService.getOnuByPonPort(installation.ponId, parseInt(installation.onuId));
                return res.json({ message: "Estado consultado", data: onu });
            }

            return res.status(400).json({ message: "Faltan datos de OLT (serial o ponId)" });

        } catch (error: any) {
            return res.status(500).json({ message: "Error OLT", error: error.message });
        }
    },

    getOnuRunState: async (req: Request, res: Response) => {
        try {
            const { installationId } = req.params;
            
            const installation = await findInstallation(installationId);

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada" });
            }

            const oltService = new OltService();
            let runState: string | null = null;

            if (installation.onuSerialNumber) {
                const result = await oltService.getOnuRunStateBySn(installation.onuSerialNumber);
                runState = result?.state || null;
            } else if (installation.ponId && installation.onuId) {
                runState = await oltService.getOnuRunState(installation.ponId, installation.onuId);
            }

            return res.json({ 
                message: "Estado de ONU obtenido",
                onlineStatus: runState || 'unknown',
                isOnline: runState?.toLowerCase() === 'online'
            });

        } catch (error: any) {
            console.error("Error obteniendo estado de ONU:", error);
            return res.status(500).json({ message: "Error al consultar estado de ONU", error: error.message });
        }
    }
};
