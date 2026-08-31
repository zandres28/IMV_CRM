import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { OltService } from './OltService';

const BACKUP_DIR = path.resolve(process.env.OLT_BACKUP_DIR || 'backups/olt');
const KEEP_DAYS = 7;

/**
 * Backup automático diario de la configuración de la OLT C-Data.
 *
 * - Genera el export en la OLT via sys_cfg_operate (API autenticada).
 * - Descarga el .cfg directo desde la raíz web (sin auth — la OLT lo sirve así).
 * - Guarda en backups/olt/ y purga archivos más viejos de KEEP_DAYS días.
 *
 * Fallar (OLT web colgada) solo deja log de error; no rompe nada y no
 * satisface la OLT (una llamada cada 24h).
 */
async function runBackup(): Promise<void> {
    const host = process.env.OLT_HOST || '192.168.1.94';
    const port = process.env.OLT_WEB_PORT || '8080';

    const oltService = new OltService();
    const data = await oltService['apiGet']('sys_cfg_operate') as { CfgFile?: string; TarFile?: string };
    const cfgFile = data?.CfgFile;
    if (!cfgFile) {
        throw new Error('sys_cfg_operate no devolvió CfgFile');
    }

    const url = `http://${host}:${port}/${cfgFile}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${cfgFile}`);
        const content = await res.text();

        fs.mkdirSync(BACKUP_DIR, { recursive: true });
        const dest = path.join(BACKUP_DIR, cfgFile);
        fs.writeFileSync(dest, content, 'utf8');
        console.log(`[OltBackup] Config guardado en ${dest} (${content.length} bytes)`);

        // Purga de archivos antiguos
        const files = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.cfg'));
        const cutoff = Date.now() - KEEP_DAYS * 86400000;
        for (const f of files) {
            const full = path.join(BACKUP_DIR, f);
            const stat = fs.statSync(full);
            if (stat.mtimeMs < cutoff) {
                fs.unlinkSync(full);
                console.log(`[OltBackup] Purga: ${f}`);
            }
        }
    } finally {
        clearTimeout(timeout);
    }
}

export { runBackup };

export const startOltBackupScheduler = () => {
    cron.schedule('0 3 * * *', async () => {
        try {
            await runBackup();
        } catch (error: any) {
            console.error(`[OltBackup] Error: ${error.message}`);
        }
    }, {
        timezone: process.env.TZ || 'America/Bogota',
    });

    console.log('[OltBackup] Backup diario OLT programado (03:00, retención 7 días).');
};

