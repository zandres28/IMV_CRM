import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Payment } from '../entities/Payment';
import { Client } from '../entities/Client';
import * as fs from 'fs';
import * as path from 'path';

// Mapeo de meses en español a números (0-11)
const MONTHS: { [key: string]: number } = {
  'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
  'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
};

// Función para parsear fechas en español "miércoles, 18 de junio de 2025"
function parseSpanishDate(dateStr: string): Date {
  const parts = dateStr.split(',')[1]?.trim() || dateStr.trim();
  const match = parts.match(/(\d+)\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if (match) {
    const day = parseInt(match[1]);
    const monthName = match[2].toLowerCase();
    const year = parseInt(match[3]);
    const month = MONTHS[monthName];
    if (month !== undefined) {
      return new Date(year, month, day);
    }
  }
  return new Date();
}

// Función para normalizar métodos de pago
function normalizePaymentMethod(method: string): string {
  const normalized = method.toLowerCase().trim();
  if (normalized === 'efectivo') return 'efectivo';
  if (normalized === 'nequi') return 'nequi';
  if (normalized === 'bancolombia') return 'bancolombia';
  if (normalized === 'daviplata') return 'daviplata';
  if (normalized === 'transferencia') return 'transferencia';
  return 'otro';
}

// Función para parsear montos "$ 25.000" -> 25000
function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[$\s.]/g, '');
  return parseInt(cleaned) || 0;
}

async function updateInstallationPayments() {
  try {
    await AppDataSource.initialize();
    console.log('Conexión a base de datos establecida');

    const csvPath = path.join(__dirname, '../../../tmp/PAGOS_INSTALACIONES.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());

    console.log(`\nIniciando actualización de pagos de instalación...`);
    console.log(`Total líneas CSV: ${lines.length}`);

    const paymentRepo = AppDataSource.getRepository(Payment);
    const clientRepo = AppDataSource.getRepository(Client);

    let updated = 0;
    let notFound = 0;
    let errors = 0;

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const columns = line.split(';');

      if (columns.length < 8) {
        console.log(`⚠ Línea ${i + 1} no tiene suficientes columnas, saltando`);
        continue;
      }

      const externalId = columns[0]?.trim() || '';
      const clientIdStr = columns[2]?.trim() || '';
      const serviceType = columns[3]?.trim() || '';
      const dateStr = columns[4]?.trim() || '';
      const amountStr = columns[5]?.trim() || '';
      const paymentMethodStr = columns[6]?.trim() || '';
      const statusStr = columns[7]?.trim() || '';

      if (!externalId) {
        console.log(`⚠ Línea ${i + 1} no tiene ID de pago, saltando`);
        continue;
      }

      // Extraer ID numérico del cliente (CL-0001 -> 1)
      const clientIdMatch = clientIdStr.match(/CL-0*(\d+)/);
      if (!clientIdMatch) {
        console.log(`⚠ No se pudo extraer ID de cliente de: ${clientIdStr}`);
        notFound++;
        continue;
      }
      const clientId = parseInt(clientIdMatch[1]);

      try {
        // Buscar el pago existente por externalId
        const existingPayment = await paymentRepo.findOne({
          where: { externalId },
          relations: ['client', 'installation']
        });

        if (!existingPayment) {
          console.log(`⚠ ${externalId} -> Pago no encontrado en BD`);
          notFound++;
          continue;
        }

        // Parsear datos del CSV
        const paymentDate = parseSpanishDate(dateStr);
        const amount = parseAmount(amountStr);
        const paymentMethod = normalizePaymentMethod(paymentMethodStr);
        const status = statusStr.toLowerCase().includes('pagado') ? 'paid' : 'pending';

        // Actualizar el pago
        existingPayment.paymentDate = paymentDate;
        existingPayment.amount = amount;
        existingPayment.installationFeeAmount = amount;
        existingPayment.paymentMethod = paymentMethod;
        existingPayment.status = status;
        existingPayment.dueDate = paymentDate;
        existingPayment.paymentMonth = paymentDate.toLocaleDateString('es-ES', { month: 'long' });
        existingPayment.paymentYear = paymentDate.getFullYear();
        existingPayment.notes = `Actualizado desde CSV - ${serviceType}`;

        await paymentRepo.save(existingPayment);

        console.log(`✓ ${externalId} -> Actualizado: ${existingPayment.client.fullName} - ${formatCurrency(amount)}`);
        updated++;

      } catch (err) {
        console.error(`✗ Error procesando ${externalId}:`, err);
        errors++;
      }
    }

    console.log('\n=== RESUMEN DE ACTUALIZACIÓN ===');
    console.log(`Total registros CSV: ${lines.length - 1}`);
    console.log(`Pagos actualizados: ${updated}`);
    console.log(`Pagos no encontrados: ${notFound}`);
    console.log(`Errores: ${errors}`);
    console.log('✓ Actualización completada');

  } catch (error) {
    console.error('Error en actualización:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString('es-CO')}`;
}

updateInstallationPayments();
