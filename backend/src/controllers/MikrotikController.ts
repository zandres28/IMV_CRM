import { Request, Response } from "express";
import axios from "axios";
import { AppDataSource } from "../config/database";
import { DeviceType, NetworkDevice } from "../entities/NetworkDevice";

const getMikrotikBaseUrl = async (): Promise<string> => {
    const fallback = process.env.MIKROTIK_HOST || "http://192.168.40.10";

    try {
        const deviceRepository = AppDataSource.getRepository(NetworkDevice);
        const device = await deviceRepository.findOne({
            where: {
                type: DeviceType.MIKROTIK,
                enabled: true
            },
            order: { id: "ASC" }
        });

        if (!device || !device.host) {
            return fallback;
        }

        const host = device.host.trim();
        const protocol = host.startsWith("http://") || host.startsWith("https://")
            ? ""
            : "http://";
        const hasPortInHost = /:[0-9]+$/.test(host);
        const portSuffix = hasPortInHost ? "" : `:${device.port || 80}`;

        return `${protocol}${host}${portSuffix}`;
    } catch (error) {
        console.warn("Using fallback MIKROTIK_HOST due to DB lookup error:", error);
        return fallback;
    }
};

export const MikrotikController = {
    getGraph: async (req: Request, res: Response) => {
        try {
            const { type } = req.query; // daily, weekly, monthly, yearly
            if (!type) {
                return res.status(400).send("Graph type (daily, weekly, etc.) is required");
            }

            const MIKROTIK_HOST = await getMikrotikBaseUrl();
            // Hardcoded interface for now based on the frontend usage "12%2DWAN1" which decodes to "12-WAN1"
            const INTERFACE = "12%2DWAN1"; 
            
            const imageUrl = `${MIKROTIK_HOST}/graphs/iface/${INTERFACE}/${type}.gif`;

            const response = await axios({
                method: 'get',
                url: imageUrl,
                responseType: 'stream',
                timeout: 5000 // 5 segundos máximo para conectar
            });

            response.data.pipe(res);
        } catch (error: any) {
            console.error("Error proxying Mikrotik graph:", error.message);
            // Si es timeout o network error
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
                return res.status(504).send("Gateway Timeout: Cannot reach Mikrotik Router");
            }
            res.status(500).send("Error fetching graph");
        }
    }
};
