import { AppDataSource } from "./src/config/database";
import { Payment } from "./src/entities/Payment";
import { ServiceOutage } from "./src/entities/ServiceOutage";
import { In } from "typeorm";

async function rollback() {
    console.log("Iniciando rollback de facturación de FEBRERO 2026...");

    await AppDataSource.initialize();
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
        const paymentRepository = queryRunner.manager.getRepository(Payment);
        const outageRepository = queryRunner.manager.getRepository(ServiceOutage);

        const month = "febrero";
        const year = 2026;

        const paymentsToDelete = await paymentRepository.find({
            where: {
                paymentMonth: month,
                paymentYear: year,
                paymentType: 'monthly',
                status: In(['pending', 'overdue'])
            }
        });

        console.log(`Encontrados ${paymentsToDelete.length} pagos para eliminar.`);

        let restoredOutages = 0;
        for (const payment of paymentsToDelete) {
            const linkedOutages = await outageRepository.find({
                where: { appliedToPaymentId: payment.id }
            });

            for (const outage of linkedOutages) {
                outage.status = 'pending';
                outage.appliedToPaymentId = null as any;
                await outageRepository.save(outage);
                restoredOutages++;
            }

            await paymentRepository.remove(payment);
        }

        await queryRunner.commitTransaction();
        console.log(`Rollback completado. Pagos eliminados: ${paymentsToDelete.length}. Caídas restauradas: ${restoredOutages}.`);

    } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error("Error durante el rollback:", error);
    } finally {
        await queryRunner.release();
        await AppDataSource.destroy();
    }
}

rollback();
