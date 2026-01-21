import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Payment } from '../entities/Payment';
import { Client } from '../entities/Client';
import { Installation } from '../entities/Installation';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

// Mapeo de meses en español a índices
const MONTHS: { [key: string]: number } = {
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

// Parsear fecha en español (ej: "miércoles, 18 de junio de 2025")
function parseSpanishDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  // Extraer: "18 de junio de 2025"
  const parts = dateStr.split(',');
  if (parts.length < 2) return null;
  
  const datePart = parts[1].trim(); // "18 de junio de 2025"
  const match = datePart.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/);
  
  if (!match) return null;
  
  const day = parseInt(match[1]);
  const monthName = match[2].toLowerCase();
  const year = parseInt(match[3]);
  
  const monthIndex = MONTHS[monthName];
  if (monthIndex === undefined) return null;
  
  return new Date(year, monthIndex, day);
}

// Normalizar forma de pago
function normalizePaymentMethod(method: string): string {
  const normalized = method.toLowerCase().trim();
  if (normalized.includes('efectivo')) return 'efectivo';
  if (normalized.includes('nequi')) return 'nequi';
  if (normalized.includes('bancolombia')) return 'bancolombia';
  if (normalized.includes('daviplata')) return 'daviplata';
  if (normalized.includes('transferencia')) return 'transferencia';
  return 'otro';
}

// Parsear monto (ej: "$ 25.000" -> 25000)
function parseAmount(amountStr: string): number {
  return Number(amountStr.replace(/[^0-9]/g, '')) || 0;
}

async function run() {
  console.log('Iniciando importación de pagos de instalación...');
  
  await AppDataSource.initialize();
  
  const paymentRepo = AppDataSource.getRepository(Payment);
  const clientRepo = AppDataSource.getRepository(Client);
  const installationRepo = AppDataSource.getRepository(Installation);
  
  const csvPath = path.resolve(__dirname, '../../../tmp/PAGOS_INSTALACIONES.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = csvContent.split('\n').filter(l => l.trim());
  
  console.log(`Total líneas CSV: ${lines.length}`);
  
  let updated = 0;
  let notFound = 0;
  let errors = 0;
  
  // Saltar header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cols = line.split(';');
    
    if (cols.length < 8) {
      console.warn(`⚠ Línea ${i} incompleta, saltando`);
      continue;
    }
    
    const externalId = cols[0].trim();
    const clientCode = cols[2].trim(); // CL-XXXX
    const serviceType = cols[3].trim();
    const paymentDateStr = cols[4].trim();
    const amountStr = cols[5].trim();
    const paymentMethodStr = cols[6].trim();
    const statusStr = cols[7].trim().toLowerCase();
    
    try {
      // Buscar cliente por ID numérico extraído del código CL-XXXX
      const clientIdMatch = clientCode.match(/CL-0*(\d+)/);
      if (!clientIdMatch) {
        console.warn(`⚠ No se pudo extraer ID de cliente de: ${clientCode}`);
        notFound++;
        continue;
      }
      
      const clientId = parseInt(clientIdMatch[1]);
      const client = await clientRepo.findOne({ where: { id: clientId } });
      
      if (!client) {
        console.warn(`⚠ Cliente no encontrado: ${clientCode} (ID: ${clientId})`);
        notFound++;
        continue;
      }
      
      // Buscar instalación activa del cliente
      const installation = await installationRepo.findOne({
        where: { client: { id: clientId }, isActive: true },
        order: { created_at: 'DESC' }
      });
      
      const paymentDate = parseSpanishDate(paymentDateStr);
      if (!paymentDate) {
        console.warn(`⚠ Fecha inválida: ${paymentDateStr} para ${externalId}`);
        errors++;
        continue;
      }
      
      const amount = parseAmount(amountStr);
      const paymentMethod = normalizePaymentMethod(paymentMethodStr);
      const status = statusStr.includes('pagado') ? 'paid' : 'pending';
      
      const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      
      // Verificar si ya existe el pago con este externalId
      const existing = await paymentRepo.findOne({ where: { externalId } });
      
      if (existing) {
        console.log(`⚠ Pago ${externalId} ya existe, saltando`);
        continue;
      }
      
      // Crear el pago
      const payment = paymentRepo.create({
        client,
        installation: installation || undefined,
        externalId,
        amount,
        paymentMonth: monthNames[paymentDate.getMonth()],
        paymentYear: paymentDate.getFullYear(),
        dueDate: paymentDate,
        status,
        paymentDate: status === 'paid' ? paymentDate : undefined,
        paymentMethod: paymentMethod as any,
        paymentType: 'installation',
        servicePlanAmount: 0,
        additionalServicesAmount: 0,
        productInstallmentsAmount: 0,
        installationFeeAmount: amount,
        outageDiscountAmount: 0,
        outageDays: 0,
        notes: `Importado desde CSV - ${serviceType}`
      });
      
      await paymentRepo.save(payment);
      updated++;
      console.log(`✓ ${externalId} -> Cliente: ${client.fullName} - $${amount.toLocaleString('es-CO')}`);
      
    } catch (err: any) {
      console.error(`✗ Error procesando ${externalId}:`, err.message);
      errors++;
    }
  }
  
  console.log('\n=== RESUMEN ===');
  console.log(`Total registros CSV: ${lines.length - 1}`);
  console.log(`Pagos importados: ${updated}`);
  console.log(`Clientes no encontrados: ${notFound}`);
  console.log(`Errores: ${errors}`);
  
  await AppDataSource.destroy();
  console.log('✓ Importación completada');
}

run().catch(err => {
  console.error('Error en importación:', err);
  process.exit(1);
});
