import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { Installation } from "../entities/Installation";
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

interface PonRecord {
    ponId: string;
    onuId: string;
    serial: string;
    nombre: string;
    estado: string;
}

async function importPonData() {
    try {
        console.log('Inicializando conexión a la base de datos...');
        await AppDataSource.initialize();
        console.log('✓ Conexión establecida');

        // Leer CSV
        const csvPath = path.resolve(__dirname, '../../../tmp/pon-clientes.csv');
        console.log(`Leyendo archivo: ${csvPath}`);
        
        if (!fs.existsSync(csvPath)) {
            throw new Error(`Archivo no encontrado: ${csvPath}`);
        }

        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
        
        // Parsear CSV (formato: PON ID;ONU ID;Serial ONU;Nombre;Estado)
        const records: PonRecord[] = [];
        const startIndex = lines[0].toLowerCase().includes('pon id') ? 1 : 0;
        
        for (let i = startIndex; i < lines.length; i++) {
            const parts = lines[i].split(';');
            if (parts.length >= 3) {
                const ponId = (parts[0] || '').trim();
                const onuId = (parts[1] || '').trim();
                const serial = (parts[2] || '').trim().toUpperCase();
                const nombre = (parts[3] || '').trim();
                const estado = (parts[4] || '').trim();
                
                if (serial) {
                    records.push({ ponId, onuId, serial, nombre, estado });
                }
            }
        }
        
        console.log(`✓ Leídos ${records.length} registros del CSV`);

        // Actualizar instalaciones
        const installationRepo = AppDataSource.getRepository(Installation);
        let updated = 0;
        let notFound = 0;
        let errors = 0;

        for (const record of records) {
            try {
                const installation = await installationRepo.findOne({
                    where: { onuSerialNumber: record.serial }
                });

                if (installation) {
                    installation.ponId = record.ponId;
                    installation.onuId = record.onuId;
                    await installationRepo.save(installation);
                    updated++;
                    console.log(`✓ Actualizado: ${record.serial} -> PON: ${record.ponId}, ONU: ${record.onuId}`);
                } else {
                    notFound++;
                    console.log(`⚠ No encontrado en BD: ${record.serial} (${record.nombre})`);
                }
            } catch (error) {
                errors++;
                console.error(`✗ Error con ${record.serial}:`, error instanceof Error ? error.message : error);
            }
        }

        console.log('\n=== RESUMEN ===');
        console.log(`Total registros CSV: ${records.length}`);
        console.log(`Instalaciones actualizadas: ${updated}`);
        console.log(`No encontradas en BD: ${notFound}`);
        console.log(`Errores: ${errors}`);

        await AppDataSource.destroy();
        console.log('\n✓ Importación completada');
        process.exit(0);
    } catch (error) {
        console.error('Error en importación:', error);
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
        process.exit(1);
    }
}

importPonData();
