import { Response } from "express";
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { AuthRequest } from "../middlewares/auth.middleware";
import { IptvService } from "../services/IptvService";

const clientRepository = AppDataSource.getRepository(Client);

/**
 * Auto-provisión de línea IPTV al crear/activar un cliente.
 * Fail-soft: si el panel XUI no está configurado o falla, no rompe la operación del cliente.
 * Devuelve true si la línea fue creada, false en caso contrario.
 */
export const autoProvisionIptv = async (client: Client): Promise<boolean> => {
    const autoCreateEnabled = process.env.XUI_AUTO_CREATE === 'true';
    if (!autoCreateEnabled) return false;

    if (!process.env.XUI_PANEL_URL || !process.env.XUI_API_KEY) {
        console.warn('[IPTV] Auto-provisión omitida: falta configuración XUI_PANEL_URL/XUI_API_KEY');
        return false;
    }

    if (client.iptvUsername) return false;

    if (client.status !== 'activo') return false;

    const result = await IptvService.createLine(client.fullName);
    if (!result.success) {
        console.warn(`[IPTV] Auto-provisión falló para cliente ${client.id}: ${result.error}`);
        return false;
    }

    client.iptvUsername = result.username;
    client.iptvPassword = result.password;
    client.iptvStatus = 'activo';
    await clientRepository.save(client);
    console.log(`[IPTV] Línea creada automáticamente para cliente ${client.id}: ${result.username}`);
    return true;
};

export const IptvController = {

    /**
     * Crear línea IPTV para un cliente
     */
    create: async (req: AuthRequest, res: Response) => {
        try {
            const clientId = parseInt(req.params.clientId, 10);
            const client = await clientRepository.findOne({ where: { id: clientId } });

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            if (client.iptvUsername) {
                return res.status(400).json({
                    message: `El cliente ya tiene una línea IPTV (${client.iptvUsername})`
                });
            }

            const expDate = req.body.expDate ? new Date(req.body.expDate) : undefined;

            const result = await IptvService.createLine(client.fullName, undefined, expDate);

            if (!result.success) {
                return res.status(502).json({
                    message: `Error creando línea IPTV en el panel: ${result.error}`,
                    error: result.error
                });
            }

            client.iptvUsername = result.username;
            client.iptvPassword = result.password;
            client.iptvStatus = 'activo';
            client.iptvExpDate = expDate || null;

            await clientRepository.save(client);

            return res.status(201).json({
                message: "Línea IPTV creada exitosamente",
                client
            });
        } catch (error) {
            console.error('[IPTV] Error creando línea:', error);
            return res.status(500).json({ message: "Error interno creando línea IPTV", error });
        }
    },

    /**
     * Obtener estado de la línea IPTV consultando el panel XUI
     */
    status: async (req: AuthRequest, res: Response) => {
        try {
            const clientId = parseInt(req.params.clientId, 10);
            const client = await clientRepository.findOne({ where: { id: clientId } });

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            if (!client.iptvUsername) {
                return res.status(200).json({
                    client: { ...client, iptvStatus: 'no_creado' },
                    panelStatus: { exists: false, active: false }
                });
            }

            const panelStatus = await IptvService.getLineStatus(client.iptvUsername);

            return res.status(200).json({ client, panelStatus });
        } catch (error) {
            console.error('[IPTV] Error consultando estado:', error);
            return res.status(500).json({ message: "Error consultando estado IPTV", error });
        }
    },

    /**
     * Deshabilitar línea IPTV
     */
    disable: async (req: AuthRequest, res: Response) => {
        try {
            const clientId = parseInt(req.params.clientId, 10);
            const client = await clientRepository.findOne({ where: { id: clientId } });

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            if (!client.iptvUsername) {
                return res.status(400).json({ message: "El cliente no tiene línea IPTV creada" });
            }

            // Actualizar estado local primero (útil si el panel está caído)
            client.iptvStatus = 'suspendido';
            await clientRepository.save(client);

            const result = await IptvService.disableLine(client.iptvUsername);
            if (!result.success && result.error) {
                console.warn(`[IPTV] Panel no pudo deshabilitar ${client.iptvUsername}: ${result.error}`);
            }

            return res.status(200).json({
                message: "Línea IPTV deshabilitada",
                client
            });
        } catch (error) {
            console.error('[IPTV] Error deshabilitando línea:', error);
            return res.status(500).json({ message: "Error deshabilitando línea IPTV", error });
        }
    },

    /**
     * Habilitar línea IPTV
     */
    enable: async (req: AuthRequest, res: Response) => {
        try {
            const clientId = parseInt(req.params.clientId, 10);
            const client = await clientRepository.findOne({ where: { id: clientId } });

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            if (!client.iptvUsername) {
                return res.status(400).json({ message: "El cliente no tiene línea IPTV creada" });
            }

            client.iptvStatus = 'activo';
            await clientRepository.save(client);

            const result = await IptvService.enableLine(client.iptvUsername);
            if (!result.success && result.error) {
                console.warn(`[IPTV] Panel no pudo habilitar ${client.iptvUsername}: ${result.error}`);
            }

            return res.status(200).json({
                message: "Línea IPTV habilitada",
                client
            });
        } catch (error) {
            console.error('[IPTV] Error habilitando línea:', error);
            return res.status(500).json({ message: "Error habilitando línea IPTV", error });
        }
    },

    /**
     * Eliminar línea IPTV
     */
    remove: async (req: AuthRequest, res: Response) => {
        try {
            const clientId = parseInt(req.params.clientId, 10);
            const client = await clientRepository.findOne({ where: { id: clientId } });

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            if (!client.iptvUsername) {
                return res.status(400).json({ message: "El cliente no tiene línea IPTV creada" });
            }

            const result = await IptvService.deleteLine(client.iptvUsername);
            if (!result.success && result.error) {
                console.warn(`[IPTV] Panel no pudo eliminar ${client.iptvUsername}: ${result.error}`);
            }

            client.iptvUsername = null;
            client.iptvPassword = null;
            client.iptvStatus = 'no_creado';
            client.iptvExpDate = null;
            await clientRepository.save(client);

            return res.status(200).json({
                message: "Línea IPTV eliminada",
                client
            });
        } catch (error) {
            console.error('[IPTV] Error eliminando línea:', error);
            return res.status(500).json({ message: "Error eliminando línea IPTV", error });
        }
    },

    /**
     * Generar username IPTV sugerido para un cliente (sin crearlo)
     */
    generateUsername: async (req: AuthRequest, res: Response) => {
        try {
            const { fullName } = req.body;

            if (!fullName) {
                return res.status(400).json({ message: "Se requiere fullName" });
            }

            const username = IptvService.generateUsername(fullName);
            return res.status(200).json({ username });
        } catch (error) {
            return res.status(500).json({ message: "Error generando username", error });
        }
    }
};