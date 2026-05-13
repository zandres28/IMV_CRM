import { Response } from "express";
import { AppDataSource } from "../config/database";
import { NetworkDevice } from "../entities/NetworkDevice";
import { AuthRequest } from "../middlewares/auth.middleware";
import axios from "axios";
import net from "net";

const deviceRepository = () => AppDataSource.getRepository(NetworkDevice);

const requireAdmin = (req: AuthRequest, res: Response): boolean => {
    const userRoles = req.user?.roles || [];
    const isAdmin = userRoles.some(r => r.name === "admin" || r.name === "superadmin");
    if (!isAdmin) {
        res.status(403).json({ message: "No autorizado. Se requiere rol de administrador." });
        return false;
    }
    return true;
};

export const NetworkDeviceController = {
    getAll: async (req: AuthRequest, res: Response) => {
        try {
            const devices = await deviceRepository().find({ order: { type: "ASC", name: "ASC" } });
            // No retornar contraseñas en el listado
            const safe = devices.map(({ password, ...d }) => d);
            return res.json(safe);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener dispositivos", error });
        }
    },

    getById: async (req: AuthRequest, res: Response) => {
        try {
            const device = await deviceRepository().findOneBy({ id: Number(req.params.id) });
            if (!device) return res.status(404).json({ message: "Dispositivo no encontrado" });
            const { password, ...safe } = device;
            return res.json(safe);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener dispositivo", error });
        }
    },

    create: async (req: AuthRequest, res: Response) => {
        if (!requireAdmin(req, res)) return;
        try {
            const { name, type, host, port, username, password, description, enabled } = req.body;
            if (!name || !type || !host) {
                return res.status(400).json({ message: "Nombre, tipo y host son requeridos" });
            }
            const device = deviceRepository().create({ name, type, host, port, username, password, description, enabled });
            const saved = await deviceRepository().save(device);
            const { password: _p, ...safe } = saved;
            return res.status(201).json(safe);
        } catch (error) {
            return res.status(500).json({ message: "Error al crear dispositivo", error });
        }
    },

    update: async (req: AuthRequest, res: Response) => {
        if (!requireAdmin(req, res)) return;
        try {
            const device = await deviceRepository().findOneBy({ id: Number(req.params.id) });
            if (!device) return res.status(404).json({ message: "Dispositivo no encontrado" });

            const { name, type, host, port, username, password, description, enabled } = req.body;
            if (name !== undefined) device.name = name;
            if (type !== undefined) device.type = type;
            if (host !== undefined) device.host = host;
            if (port !== undefined) device.port = port;
            if (username !== undefined) device.username = username;
            if (password !== undefined && password !== "") device.password = password;
            if (description !== undefined) device.description = description;
            if (enabled !== undefined) device.enabled = enabled;

            const saved = await deviceRepository().save(device);
            const { password: _p, ...safe } = saved;
            return res.json(safe);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar dispositivo", error });
        }
    },

    delete: async (req: AuthRequest, res: Response) => {
        if (!requireAdmin(req, res)) return;
        try {
            const device = await deviceRepository().findOneBy({ id: Number(req.params.id) });
            if (!device) return res.status(404).json({ message: "Dispositivo no encontrado" });
            await deviceRepository().remove(device);
            return res.json({ message: "Dispositivo eliminado" });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar dispositivo", error });
        }
    },

    testConnection: async (req: AuthRequest, res: Response) => {
        try {
            const device = await deviceRepository().findOneBy({ id: Number(req.params.id) });
            if (!device) return res.status(404).json({ message: "Dispositivo no encontrado" });

            const { host, port, type } = device;
            const start = Date.now();

            if (type === "mikrotik") {
                // Test HTTP connection to MikroTik web interface
                try {
                    await axios.get(`http://${host}:${port}`, { timeout: 5000 });
                    const latency = Date.now() - start;
                    return res.json({ ok: true, latency, message: `Conexion exitosa a ${host}:${port}` });
                } catch (err: any) {
                    // If we get a response (even 401 Unauthorized), the device is reachable
                    if (err.response) {
                        const latency = Date.now() - start;
                        return res.json({ ok: true, latency, message: `Dispositivo alcanzable (HTTP ${err.response.status})` });
                    }
                    return res.json({ ok: false, latency: Date.now() - start, message: `No se puede conectar: ${err.message}` });
                }
            }

            // Generic TCP ping for OLT / switch
            const latency = await new Promise<number | null>((resolve) => {
                const socket = new net.Socket();
                socket.setTimeout(5000);
                socket.on("connect", () => { socket.destroy(); resolve(Date.now() - start); });
                socket.on("timeout", () => { socket.destroy(); resolve(null); });
                socket.on("error", () => { socket.destroy(); resolve(null); });
                socket.connect(port, host);
            });

            if (latency !== null) {
                return res.json({ ok: true, latency, message: `Puerto ${port} accesible en ${host}` });
            }
            return res.json({ ok: false, latency: null, message: `No se puede conectar a ${host}:${port}` });

        } catch (error) {
            return res.status(500).json({ message: "Error al probar conexion", error });
        }
    }
};
