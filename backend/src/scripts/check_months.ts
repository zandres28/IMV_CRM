import { AppDataSource } from "../config/database";
import { Payment } from "../entities/Payment";

async function checkPaymentMonths() {
    try {
        await AppDataSource.initialize();
        const paymentRepository = AppDataSource.getRepository(Payment);
        
        const payments = await paymentRepository
            .createQueryBuilder("payment")
            .select("DISTINCT payment.paymentMonth", "month")
            .getRawMany();

        console.log("Distinct payment months in DB:", payments);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

checkPaymentMonths();
