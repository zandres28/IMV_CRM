import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';
import { AppDataSource } from '../config/database';
import { Client } from '../entities/Client';
import { Installation } from '../entities/Installation';
import { ServicePlan } from '../entities/ServicePlan';

interface ClientRow {
    'ID Cliente': string;
    'Nombre Completo': string;
    ' No. Cédula ': string;
    'Dirección de Instalación': string;
    'Ciudad': string;
    'Celular 1': string;
    'Celular 2': string;
    'Correo Electrónico': string;
    'ONU -SN': string;
}

interface InstallationRow {
    'ID SERVICIO': string;
    'ID Cliente': string;
    'Estado del Servicio': string;
    'Fecha Instalación': string;
    'Tipo de Servicio': string;
    'Velocidad (Mbps)': string;
    'Router Asignado': string;
    'IP Asignada': string;
    'Técnico Instalador': string;
    'Notas Especiales': string;
}

// Mapeo de velocidades a planes
const SPEED_TO_PLAN: Record<number, number> = {
    200: 1, // Plan 200 Megas
    400: 2, // Plan 400 Megas
    600: 3, // Plan 600 Megas
};

const PLAN_PRICES: Record<number, number> = {
    200: 45000,
    400: 60000,
    600: 75000,
};

function parseSpanishDate(dateStr: string): Date {
    // Formato: "miércoles, 18 de junio de 2025"
    const months: Record<string, number> = {
        'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3,
        'mayo': 4, 'junio': 5, 'julio': 6, 'agosto': 7,
        'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
    };

    const match = dateStr.match(/\d+\s+de\s+(\w+)\s+de\s+(\d+)/);
    if (!match) return new Date();

    const day = parseInt(dateStr.match(/\d+/)?.[0] || '1');
    const month = months[match[1].toLowerCase()] || 0;
    const year = parseInt(match[2]);

    return new Date(year, month, day);
}

function cleanNumber(str: string): string {
    return str.replace(/[.\s]/g, '').trim();
}

function cleanEmail(email: string): string {
    const cleaned = email.trim();
    return cleaned || 'sin-email@example.com';
}

async function importData() {
    try {
        // Inicializar conexión a la base de datos
        await AppDataSource.initialize();
        console.log('✓ Base de datos conectada');

        const clientRepository = AppDataSource.getRepository(Client);
        const installationRepository = AppDataSource.getRepository(Installation);
        const servicePlanRepository = AppDataSource.getRepository(ServicePlan);

        // Leer CSV de clientes
        const clientsPath = path.join(__dirname, '../../../tmp/CLIENTES.csv');
        const clientsContent = fs.readFileSync(clientsPath, 'latin1');
        
        const clientRecords = parse(clientsContent, {
            columns: true,
            skip_empty_lines: true,
            delimiter: ';',
            from_line: 3 // Saltar las dos primeras líneas
        }) as ClientRow[];

        console.log(`\n📋 Encontrados ${clientRecords.length} clientes en CSV`);

        // Leer CSV de instalaciones
        const installationsPath = path.join(__dirname, '../../../tmp/INSTALACIONES.csv');
        const installationsContent = fs.readFileSync(installationsPath, 'latin1');
        
        const installationRecords = parse(installationsContent, {
            columns: true,
            skip_empty_lines: true,
            delimiter: ';',
            from_line: 3
        }) as InstallationRow[];

        console.log(`📋 Encontradas ${installationRecords.length} instalaciones en CSV\n`);

        // Mapear instalaciones por ID de cliente
        const installationsByClient = new Map<string, InstallationRow>();
        installationRecords.forEach(inst => {
            if (inst['ID Cliente']) {
                installationsByClient.set(inst['ID Cliente'].trim(), inst);
            }
        });

        // Importar clientes e instalaciones
        let clientsImported = 0;
        let installationsImported = 0;

        for (const row of clientRecords) {
            try {
                const clientId = row['ID Cliente']?.trim();
                if (!clientId || clientId === 'ID Cliente') continue;

                // Verificar si el cliente ya existe
                const identificationNumber = cleanNumber(row[' No. Cédula '] || clientId);
                const existingClient = await clientRepository.findOne({
                    where: { identificationNumber }
                });

                if (existingClient) {
                    console.log(`⊘ Cliente ${clientId} ya existe, omitiendo...`);
                    continue;
                }

                // Crear cliente
                const client = new Client();
                client.fullName = row['Nombre Completo']?.trim() || 'Sin nombre';
                client.identificationNumber = identificationNumber;
                client.installationAddress = row['Dirección de Instalación']?.trim() || 'Sin dirección';
                client.city = row['Ciudad']?.trim() || 'CALI';
                client.primaryPhone = row['Celular 1']?.trim() || 'Sin teléfono';
                client.secondaryPhone = row['Celular 2']?.trim() || '';
                client.email = cleanEmail(row['Correo Electrónico']);
                client.status = 'active';

                await clientRepository.save(client);
                clientsImported++;
                console.log(`✓ Cliente importado: ${client.fullName} (${clientId})`);

                // Buscar instalación asociada
                const instRow = installationsByClient.get(clientId);
                if (instRow) {
                    const speedMbps = parseInt(instRow['Velocidad (Mbps)'] || '200');
                    const servicePlanId = SPEED_TO_PLAN[speedMbps] || 1;
                    const monthlyFee = PLAN_PRICES[speedMbps] || 45000;

                    const servicePlan = await servicePlanRepository.findOne({
                        where: { id: servicePlanId }
                    });

                    const installation = new Installation();
                    installation.client = client;
                    installation.servicePlan = servicePlan || undefined;
                    installation.serviceType = instRow['Tipo de Servicio']?.trim() || `Internet - ${speedMbps} Mbps`;
                    installation.speedMbps = speedMbps;
                    installation.routerModel = instRow['Router Asignado']?.trim() || 'Sin especificar';
                    installation.onuSerialNumber = row['ONU -SN']?.trim() || '';
                    installation.ipAddress = instRow['IP Asignada']?.trim() || '';
                    installation.technician = instRow['Técnico Instalador']?.trim() || 'Sin especificar';
                    installation.notes = instRow['Notas Especiales']?.trim() || '';
                    installation.monthlyFee = monthlyFee;
                    installation.installationDate = parseSpanishDate(instRow['Fecha Instalación'] || '');
                    installation.serviceStatus = instRow['Estado del Servicio']?.toLowerCase().includes('activo') ? 'active' : 'suspended';
                    installation.isActive = instRow['Estado del Servicio']?.toLowerCase().includes('activo') || false;

                    await installationRepository.save(installation);
                    installationsImported++;
                    console.log(`  ↳ Instalación importada: ${speedMbps} Mbps`);
                }

            } catch (error: any) {
                console.error(`✗ Error importando cliente ${row['ID Cliente']}: ${error.message}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log(`✓ Importación completada:`);
        console.log(`  • Clientes importados: ${clientsImported}`);
        console.log(`  • Instalaciones importadas: ${installationsImported}`);
        console.log('='.repeat(50));

        await AppDataSource.destroy();

    } catch (error) {
        console.error('Error en la importación:', error);
        process.exit(1);
    }
}

// Ejecutar importación
importData();
