import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Payment } from '../entities/Payment';
import { Client } from '../entities/Client';
import { Installation } from '../entities/Installation';

async function addMissingPayments() {
  try {
    await AppDataSource.initialize();
    console.log('Conexión a base de datos establecida\n');

    const paymentRepo = AppDataSource.getRepository(Payment);
    const clientRepo = AppDataSource.getRepository(Client);
    const installationRepo = AppDataSource.getRepository(Installation);

    const missingPayments = [
      {
        externalId: 'PG-0052',
        clientId: 52,
        clientName: 'SANDRA RAMÍREZ',
        serviceType: 'Internet - 600 Mbps',
        paymentDate: new Date(2025, 9, 27), // 27 de octubre
        amount: 40000,
        paymentMethod: 'efectivo'
      },
      {
        externalId: 'PG-0053',
        clientId: 53,
        clientName: 'CINDY MANTILLA',
        serviceType: 'Internet - 400 Mbps',
        paymentDate: new Date(2025, 9, 28), // 28 de octubre
        amount: 40000,
        paymentMethod: 'efectivo'
      },
      {
        externalId: 'PG-0054',
        clientId: 54,
        clientName: 'OSCAR ARMANDO MOLINA',
        serviceType: 'Internet - 600 Mbps',
        paymentDate: new Date(2025, 9, 29), // 29 de octubre
        amount: 40000,
        paymentMethod: 'efectivo'
      }
    ];

    let created = 0;
    let notFound = 0;

    for (const paymentData of missingPayments) {
      try {
        // Verificar si ya existe
        const existing = await paymentRepo.findOne({
          where: { externalId: paymentData.externalId }
        });

        if (existing) {
          console.log(`⚠ ${paymentData.externalId} ya existe, saltando`);
          continue;
        }

        // Buscar cliente
        const client = await clientRepo.findOne({
          where: { id: paymentData.clientId }
        });

        if (!client) {
          console.log(`⚠ ${paymentData.externalId} -> Cliente ${paymentData.clientId} no encontrado`);
          notFound++;
          continue;
        }

        // Buscar instalación activa del cliente
        const installation = await installationRepo.findOne({
          where: {
            client: { id: paymentData.clientId },
            isActive: true
          },
          order: { created_at: 'DESC' }
        });

        if (!installation) {
          console.log(`⚠ ${paymentData.externalId} -> No se encontró instalación activa para cliente ${paymentData.clientId}`);
          notFound++;
          continue;
        }

        // Crear el pago
        const payment = paymentRepo.create({
          externalId: paymentData.externalId,
          paymentDate: paymentData.paymentDate,
          amount: paymentData.amount,
          installationFeeAmount: paymentData.amount,
          paymentMethod: paymentData.paymentMethod,
          status: 'paid',
          paymentType: 'installation',
          dueDate: paymentData.paymentDate,
          paymentMonth: paymentData.paymentDate.toLocaleDateString('es-ES', { month: 'long' }),
          paymentYear: paymentData.paymentDate.getFullYear(),
          notes: `Importado desde CSV - ${paymentData.serviceType}`,
          client: client,
          installation: installation,
          servicePlanAmount: 0,
          additionalServicesAmount: 0,
          productInstallmentsAmount: 0,
          outageDiscountAmount: 0,
          outageDays: 0
        });

        await paymentRepo.save(payment);
        console.log(`✓ ${paymentData.externalId} -> Creado: ${client.fullName} - $${paymentData.amount.toLocaleString('es-CO')}`);
        created++;

      } catch (err) {
        console.error(`✗ Error procesando ${paymentData.externalId}:`, err);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`Total registros: ${missingPayments.length}`);
    console.log(`Pagos creados: ${created}`);
    console.log(`Clientes no encontrados: ${notFound}`);
    console.log('✓ Proceso completado');

  } catch (error) {
    console.error('Error en el proceso:', error);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

addMissingPayments();
