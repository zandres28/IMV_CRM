import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Devuelve un mapa: serial -> { ponId, onuId, nombre, estado }
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Intentar resolver la ruta del CSV desde build o src
    const candidatePaths = [
      path.resolve(__dirname, '../../../../tmp/pon-clientes.csv'),
      path.resolve(__dirname, '../../../tmp/pon-clientes.csv'),
      path.resolve(process.cwd(), 'tmp/pon-clientes.csv')
    ];

    let filePath: string | undefined;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) { filePath = p; break; }
    }

    if (!filePath) {
      return res.status(404).json({ message: 'Archivo pon-clientes.csv no encontrado' });
    }

    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter(l => l.trim().length > 0);
    // Formato esperado: PON ID;ONU ID;Serial ONU;Nombre;Estado
    // Saltar encabezado si lo detectamos
    const startIndex = lines[0].toLowerCase().includes('pon id') ? 1 : 0;

    const map: Record<string, { ponId: string; onuId: string; nombre?: string; estado?: string }> = {};
    for (let i = startIndex; i < lines.length; i++) {
      const parts = lines[i].split(';');
      if (parts.length < 3) continue;
      const ponId = (parts[0] || '').trim();
      const onuId = (parts[1] || '').trim();
      const serial = (parts[2] || '').trim().toUpperCase();
      const nombre = (parts[3] || '').trim();
      const estado = (parts[4] || '').trim();
      if (!serial) continue;
      map[serial] = { ponId, onuId, nombre, estado };
    }

    return res.json(map);
  } catch (error) {
    console.error('Error leyendo pon-clientes.csv:', error);
    return res.status(500).json({ message: 'Error procesando CSV', error: error instanceof Error ? error.message : error });
  }
});

export default router;
