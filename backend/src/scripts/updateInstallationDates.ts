import { AppDataSource } from '../config/database';
import { Installation } from '../entities/Installation';
import * as fs from 'fs';
import * as path from 'path';

// Mapa de meses en español a número
const mesesMap: Record<string, number> = {
    'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
    'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
    'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

// Función para parsear fecha en español como "miércoles, 18 de junio de 2025"
function parseDateSpanish(dateStr: string): string | null {
    if (!dateStr) return null;
    
    // Extraer día, mes y año
    const match = dateStr.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (!match) return null;
    
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    
    const month = mesesMap[monthName];
    if (month === undefined) return null;
    
    // Crear fecha local
    const date = new Date(year, month, day);
    
    // Formatear como YYYY-MM-DD
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    
    return `${yyyy}-${mm}-${dd}`;
}

async function updateInstallationDates() {
    try {
        await AppDataSource.initialize();
        console.log('Base de datos conectada');
        
        // Leer el archivo CSV
        const csvPath = path.join(__dirname, '../../../tmp/INSTALACIONES.csv');
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        
        const installationRepo = AppDataSource.getRepository(Installation);
        
        let updated = 0;
        let errors = 0;
        
        // Saltar las primeras 3 líneas (encabezados)
        for (let i = 3; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const columns = line.split(';');
            if (columns.length < 5) continue;
            
            const installationId = columns[0]; // IN-0001
            const clientIdStr = columns[2]; // CL-0001
            const dateStr = columns[4]; // miércoles, 18 de junio de 2025
            
            // Extraer el número de ID de instalación
            const idMatch = installationId.match(/IN-(\d+)/);
            if (!idMatch) continue;
            
            const id = parseInt(idMatch[1]);
            
            // Parsear la fecha
            const installationDate = parseDateSpanish(dateStr);
            if (!installationDate) {
                console.log(`❌ No se pudo parsear fecha para ${installationId}: "${dateStr}"`);
                errors++;
                continue;
            }
            
            // Actualizar la instalación
            try {
                const result = await installationRepo.update(
                    { id },
                    { installationDate }
                );
                
                if (result.affected && result.affected > 0) {
                    console.log(`✅ ${installationId}: ${installationDate}`);
                    updated++;
                } else {
                    console.log(`⚠️  ${installationId}: No encontrada en BD`);
                }
            } catch (error: any) {
                console.error(`❌ Error actualizando ${installationId}:`, error.message);
                errors++;
            }
        }
        
        console.log('\n=== RESUMEN ===');
        console.log(`✅ Actualizadas: ${updated}`);
        console.log(`❌ Errores: ${errors}`);
        
        await AppDataSource.destroy();
    } catch (error) {
        console.error('Error general:', error);
        process.exit(1);
    }
}

updateInstallationDates();
