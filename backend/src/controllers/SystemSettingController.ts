import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { SystemSetting } from "../entities/SystemSetting";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission } from "../utils/permissions";

export class SystemSettingController {
    static async getAll(req: Request, res: Response) {
        try {
            const settingRepository = AppDataSource.getRepository(SystemSetting);
            const settings = await settingRepository.find();
            return res.json(settings);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener configuraciones", error });
        }
    }

    static async getSetting(req: Request, res: Response) {
        try {
            const { key } = req.params;
            const settingRepository = AppDataSource.getRepository(SystemSetting);
            let setting = await settingRepository.findOneBy({ key });

            if (!setting && key === "session_timeout_minutes") {
                // Default fallback if not in DB yet
                return res.json({ key: "session_timeout_minutes", value: "5", type: "number" });
            }

            if (!setting) {
                return res.status(404).json({ message: "Configuración no encontrada" });
            }

            return res.json(setting);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener configuración", error });
        }
    }

    static async updateSetting(req: AuthRequest, res: Response) {
        try {
            // Check permissions manually
            // User.roles is an array
            const userRoles = req.user?.roles || [];
            const hasAdminRole = userRoles.some(r => r.name === "admin" || r.name === "superadmin");

            if (!hasAdminRole) {
                 return res.status(403).json({ message: "No autorizado" });
            }

            const { key } = req.params;
            const { value } = req.body;

            const settingRepository = AppDataSource.getRepository(SystemSetting);
            let setting = await settingRepository.findOneBy({ key });

            if (!setting) {
                setting = new SystemSetting();
                setting.key = key;
                setting.type = "string";
            }

            setting.value = String(value);
            // Auto-detect type/description for specific known keys
            if (key === "session_timeout_minutes") {
                setting.type = "number";
                setting.description = "Tiempo de inactividad para cierre de sesión";
            }

            await settingRepository.save(setting);

            return res.json(setting);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar configuración", error });
        }
    }
}
