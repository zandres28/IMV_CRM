import { Request, Response } from "express";
import axios from "axios";
import { Client } from "ssh2";
import { AppDataSource } from "../config/database";
import { DeviceType, NetworkDevice } from "../entities/NetworkDevice";

interface MikrotikSshConfig {
    host: string;
    port: number;
    username: string;
    password: string;
}

const sanitizeHost = (rawHost: string): string => {
    return rawHost
        .trim()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*/, "");
};

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

const getMikrotikSshConfig = async (): Promise<MikrotikSshConfig> => {
    const fallbackHost = sanitizeHost(process.env.MIKROTIK_SSH_HOST || process.env.MIKROTIK_HOST || "192.168.40.10");
    const fallbackPort = Number(process.env.MIKROTIK_SSH_PORT || 22);
    const fallbackUser = process.env.MIKROTIK_SSH_USER || "admin";
    const fallbackPassword = process.env.MIKROTIK_SSH_PASSWORD || "";

    try {
        const deviceRepository = AppDataSource.getRepository(NetworkDevice);
        const device = await deviceRepository.findOne({
            where: {
                type: DeviceType.MIKROTIK,
                enabled: true
            },
            order: { id: "ASC" }
        });

        return {
            host: sanitizeHost(device?.host || fallbackHost),
            port: fallbackPort,
            username: (device?.username || fallbackUser || "admin").trim(),
            password: (device?.password || fallbackPassword || "").trim()
        };
    } catch (error) {
        console.warn("Using fallback MIKROTIK SSH config due to DB lookup error:", error);
        return {
            host: fallbackHost,
            port: fallbackPort,
            username: fallbackUser,
            password: fallbackPassword
        };
    }
};

const runMikrotikSshCommand = (config: MikrotikSshConfig, command: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const conn = new Client();
        let stdout = "";
        let stderr = "";

        conn.on("ready", () => {
            conn.exec(command, (err, stream) => {
                if (err) {
                    conn.end();
                    reject(err);
                    return;
                }

                stream.on("data", (data: Buffer) => {
                    stdout += data.toString("utf8");
                });

                stream.stderr.on("data", (data: Buffer) => {
                    stderr += data.toString("utf8");
                });

                stream.on("close", () => {
                    conn.end();
                    if (stderr.trim().length > 0) {
                        reject(new Error(stderr.trim()));
                        return;
                    }
                    resolve(stdout);
                });
            });
        });

        conn.on("error", (error: Error) => {
            reject(error);
        });

        conn.connect({
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            readyTimeout: 8000,
            tryKeyboard: false
        });
    });
};

const parseKeyValueOutput = (raw: string): Record<string, string> => {
    return raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.includes("="))
        .reduce<Record<string, string>>((acc, line) => {
            const idx = line.indexOf("=");
            const key = line.slice(0, idx).trim();
            const value = line.slice(idx + 1).trim();
            if (key.length > 0) acc[key] = value;
            return acc;
        }, {});
};

const parseNumber = (value: string | undefined): number => {
    if (!value) return 0;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

const buildOnuDiagnosticsCommand = (ip: string): string => {
    const safeIp = ip.replace(/"/g, "");

    return [
        `:local ip \"${safeIp}\"`,
        `:local ipWithPort ($ip . \":\")`,
        `:local leaseId [:pick [/ip dhcp-server lease find where address=$ip] 0]`,
        `:local arpId [:pick [/ip arp find where address=$ip] 0]`,
        `:put (\"IP=\" . $ip)`,
        `:if ([:len $leaseId] > 0) do={:put (\"LEASE_STATUS=\" . [/ip dhcp-server lease get $leaseId status]); :put (\"LEASE_LAST_SEEN=\" . [/ip dhcp-server lease get $leaseId last-seen]); :put (\"LEASE_MAC=\" . [/ip dhcp-server lease get $leaseId mac-address]);} else={:put \"LEASE_STATUS=missing\"; :put \"LEASE_LAST_SEEN=n/a\"; :put \"LEASE_MAC=n/a\";}`,
        `:if ([:len $arpId] > 0) do={:put (\"ARP_STATUS=\" . [/ip arp get $arpId status]); :put (\"ARP_MAC=\" . [/ip arp get $arpId mac-address]);} else={:put \"ARP_STATUS=missing\"; :put \"ARP_MAC=n/a\";}`,
        `:put (\"CONN_TOTAL=\" . [/ip firewall connection print count-only where src-address~$ipWithPort])`,
        `:put (\"CONN_SEEN_REPLY=\" . [/ip firewall connection print count-only where src-address~$ipWithPort and seen-reply=yes])`,
        `:put (\"CONN_ASSURED=\" . [/ip firewall connection print count-only where src-address~$ipWithPort and assured=yes])`,
        `:put (\"CONN_WAN1=\" . [/ip firewall connection print count-only where src-address~$ipWithPort and connection-mark=\"WAN1_conn\"])`,
        `:put (\"CONN_WAN2=\" . [/ip firewall connection print count-only where src-address~$ipWithPort and connection-mark=\"WAN2_conn\"])`,
        `:put (\"PING_REPLIES=\" . [/ping $ip count=3])`
    ].join("; ");
};

const isValidIpv4 = (value: string): boolean => {
    const ipv4Regex = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
    return ipv4Regex.test(value);
};

export const MikrotikController = {
    getGraph: async (req: Request, res: Response) => {
        try {
            const { type } = req.query;
            if (!type) {
                return res.status(400).send("Graph type (daily, weekly, etc.) is required");
            }

            const MIKROTIK_HOST = await getMikrotikBaseUrl();
            const INTERFACE = "12%2DWAN1";
            const imageUrl = `${MIKROTIK_HOST}/graphs/iface/${INTERFACE}/${type}.gif`;

            const response = await axios({
                method: "get",
                url: imageUrl,
                responseType: "stream",
                timeout: 5000
            });

            response.data.pipe(res);
        } catch (error: any) {
            console.error("Error proxying Mikrotik graph:", error.message);
            if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND") {
                return res.status(504).send("Gateway Timeout: Cannot reach Mikrotik Router");
            }
            return res.status(500).send("Error fetching graph");
        }
    },

    getOnuDiagnostics: async (req: Request, res: Response) => {
        try {
            const ip = (req.params.ip || "").trim();
            if (!isValidIpv4(ip)) {
                return res.status(400).json({ message: "IP invalida" });
            }

            const sshConfig = await getMikrotikSshConfig();
            if (!sshConfig.password) {
                return res.status(500).json({ message: "No hay credenciales SSH configuradas para MikroTik" });
            }

            const command = buildOnuDiagnosticsCommand(ip);
            const rawOutput = await runMikrotikSshCommand(sshConfig, command);
            const kv = parseKeyValueOutput(rawOutput);

            const connTotal = parseNumber(kv.CONN_TOTAL);
            const connSeenReply = parseNumber(kv.CONN_SEEN_REPLY);
            const connAssured = parseNumber(kv.CONN_ASSURED);
            const pingReplies = parseNumber(kv.PING_REPLIES);

            return res.json({
                ip,
                sshTarget: `${sshConfig.host}:${sshConfig.port}`,
                lease: {
                    status: kv.LEASE_STATUS || "unknown",
                    lastSeen: kv.LEASE_LAST_SEEN || "n/a",
                    mac: kv.LEASE_MAC || "n/a"
                },
                arp: {
                    status: kv.ARP_STATUS || "unknown",
                    mac: kv.ARP_MAC || "n/a"
                },
                connections: {
                    total: connTotal,
                    seenReply: connSeenReply,
                    assured: connAssured,
                    wan1: parseNumber(kv.CONN_WAN1),
                    wan2: parseNumber(kv.CONN_WAN2)
                },
                pingReplies,
                hasNavigationSignals: connSeenReply > 0,
                hasLocalReachability: (kv.ARP_STATUS || "") === "reachable" || pingReplies > 0,
                raw: kv
            });
        } catch (error: any) {
            console.error("Error running ONU diagnostics:", error?.message || error);
            return res.status(500).json({
                message: "Error ejecutando diagnostico ONU en MikroTik",
                error: error?.message || "unknown"
            });
        }
    }
};
