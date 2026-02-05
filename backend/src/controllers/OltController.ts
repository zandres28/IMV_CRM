import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Installation } from "../entities/Installation";
import { OltService } from "../services/OltService";

export const OltController = {
    rebootOnu: async (req: Request, res: Response) => {
        try {
            const { installationId } = req.params;
            
            const installationRepository = AppDataSource.getRepository(Installation);
            const installation = await installationRepository.findOne({ where: { id: parseInt(installationId) } });

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada" });
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
                details: { ponId: installation.ponId, onuId: installation.onuId },
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
            const { action } = req.body; // 'enable' | 'disable'

            if (!action || !['enable', 'disable'].includes(action)) {
                return res.status(400).json({ message: "Acción inválida. Use 'enable' o 'disable'" });
            }
            
            const installationRepository = AppDataSource.getRepository(Installation);
            const installation = await installationRepository.findOne({ where: { id: parseInt(installationId) } });

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada" });
            }

            if (!installation.ponId || !installation.onuId) {
                return res.status(400).json({ 
                    message: "La instalación no tiene datos de OLT configurados (ponId, onuId)",
                    data: { ponId: installation.ponId, onuId: installation.onuId }
                });
            }

            const oltService = new OltService();
            let output = '';

            if (action === 'enable') {
                output = await oltService.activateOnu(installation.ponId, installation.onuId);
            } else {
                output = await oltService.deactivateOnu(installation.ponId, installation.onuId);
            }

            return res.json({ 
                message: `Servicio ${action === 'enable' ? 'activado' : 'cortado'} exitosamente`,
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
            
            const installationRepository = AppDataSource.getRepository(Installation);
            const installation = await installationRepository.findOne({ where: { id: parseInt(installationId) } });

            if (!installation) {
                return res.status(404).json({ message: "Instalación no encontrada" });
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
