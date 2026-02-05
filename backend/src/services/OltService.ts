import { Client } from 'ssh2';

export class OltService {
    private config = {
        host: process.env.OLT_HOST || '192.168.100.1',
        port: Number(process.env.OLT_PORT) || 22,
        username: process.env.OLT_USER || 'admin',
        password: process.env.OLT_PASSWORD || 'IMV*2025*', // Fallback a la proporcionada
        readyTimeout: 20000,
    };

    /**
     * Parsea el ponId "0/0/1" en { board: "0/0", port: "1" }
     */
    private parsePonId(ponId: string) {
        const parts = ponId.split('/');
        if (parts.length === 3) {
            return {
                board: `${parts[0]}/${parts[1]}`, 
                port: parts[2]
            };
        }
        // Fallback por si acaso es solo "1" y asumimos board 0/0 (común en esta OLT)
        if (parts.length === 1) {
             return {
                board: '0/0',
                port: parts[0]
             };
        }
        throw new Error(`Formato de PON ID inválido: ${ponId}. Se espera formato 'F/S/P' (ej: 0/0/1)`);
    }

    /**
     * Ejecuta una secuencia de comandos en la OLT vía Shell interactiva.
     * Detecta el prompt '#' o '>' para saber cuándo enviar el siguiente comando.
     */
    private async executeOltCommands(commands: string[]): Promise<string> {
        return new Promise((resolve, reject) => {
            const conn = new Client();
            let outputLog = '';

            conn.on('ready', () => {
                conn.shell((err, stream) => {
                    if (err) {
                        conn.end();
                        return reject(err);
                    }

                    let cmdIndex = 0;
                    
                    // Comandos iniciales para asegurar privilegios y paginación desactivada
                    // smart-mode desactivado para evitar pausas tipo "--More--"
                    const setupCommands = ['enable', 'config', 'undo smart']; 
                    const allCommands = [...setupCommands, ...commands, 'exit', 'exit', 'exit']; 

                    const sendNext = () => {
                        if (cmdIndex < allCommands.length) {
                            const cmd = allCommands[cmdIndex++];
                            // console.log(`Enviando comando OLT: ${cmd}`);
                            stream.write(cmd + '\n');
                        } else {
                            stream.end();
                        }
                    };

                    stream.on('close', () => {
                        conn.end();
                        resolve(outputLog);
                    });

                    stream.on('data', (data: Buffer) => {
                        const chunk = data.toString();
                        outputLog += chunk;
                        
                        // Detectar prompt estándar de C-DATA/Wolck (# o >)
                        // A veces incluye el nombre del host: WK-OLT#
                        if (chunk.trim().endsWith('#') || chunk.trim().endsWith('>')) {
                            // Pequeño delay para no saturar el buffer de entrada de la OLT
                            setTimeout(sendNext, 100);
                        }
                    });

                    // Iniciar secuencia
                    // Enviar "Enter" inicial para despertar la terminal si es necesario
                    stream.write('\n');
                });
            }).on('error', (err) => {
                reject(err);
            }).connect(this.config);
        });
    }

    // --- ACCIONES PUBLICAS ---

    async rebootOnu(ponId: string, onuId: string) {
        const { board, port } = this.parsePonId(ponId);
        // Comando: interface gpon 0/0 -> ont reboot 1 5
        const commands = [
            `interface gpon ${board}`,
            `ont reboot ${port} ${onuId}`
        ];
        return this.executeOltCommands(commands);
    }

    async deactivateOnu(ponId: string, onuId: string) {
        const { board, port } = this.parsePonId(ponId);
        // Comando: interface gpon 0/0 -> ont deactivate 1 5
        const commands = [
            `interface gpon ${board}`,
            `ont deactivate ${port} ${onuId}`
        ];
        return this.executeOltCommands(commands);
    }

    async activateOnu(ponId: string, onuId: string) {
        const { board, port } = this.parsePonId(ponId);
        // Comando: interface gpon 0/0 -> ont activate 1 5
        const commands = [
            `interface gpon ${board}`,
            `ont activate ${port} ${onuId}`
        ];
        return this.executeOltCommands(commands);
    }

    async getOnuStatus(ponId: string, onuId: string) {
        const { board, port } = this.parsePonId(ponId);
        // show ont info 1 5
        const commands = [
            `interface gpon ${board}`,
            `show ont info ${port} ${onuId}`
        ];
        return this.executeOltCommands(commands);
    }

    /**
     * Busca una ONU por Serial Number en toda la OLT y devuelve su ubicación.
     * Retorna { ponId: "0/0/1", onuId: "5" } o null si no se encuentra.
     */
    async findOnuBySn(serialNumber: string): Promise<{ ponId: string, onuId: string } | null> {
        // Comando global (no requiere entrar a interface gpon, pero en esta OLT 
        // parece que show ont info by-sn se ejecuta DENTRO de interface gpon 0/0 según manual)
        // Probaremos dentro de gpon 0/0 por defecto.
        
        const commands = [
            `interface gpon 0/0`,
            `show ont info by-sn ${serialNumber}`
        ];

        const output = await this.executeOltCommands(commands);
        
        // Analizar salida. Ejemplo esperado:
        // F/S P  ONT  SN            ...
        // 0/0 1  2    DF51A6B7... 
        
        // Regex para capturar F/S (0/0), P (1) y ONT ID (2)
        // Busca una línea que contenga el SN
        const line = output.split('\n').find(l => l.includes(serialNumber));
        if (!line) return null;

        // Parsear linea
        // Ejemplo formato estricto: " 0/0 1  2    DF51..."
        // Usamos regex simple
        const match = line.match(/(\d+\/\d+)\s+(\d+)\s+(\d+)/);
        if (match) {
            const board = match[1]; // 0/0
            const port = match[2];  // 1
            const onuId = match[3]; // 2
            
            return {
                ponId: `${board}/${port}`,
                onuId: onuId
            };
        }
        return null;
    }
}
