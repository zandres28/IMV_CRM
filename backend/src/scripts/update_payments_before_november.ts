import { AppDataSource } from "../config/database";
import { Payment } from "../entities/Payment";

async function updatePayments() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const paymentRepository = AppDataSource.getRepository(Payment);

        // Map months to index 0-11
        const monthMap: { [key: string]: number } = {
            'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
            'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
        };

        // Fetch all monthly payments for 2025
        const payments = await paymentRepository.find({
            where: {
                paymentYear: 2025,
                paymentType: 'monthly'
            }
        });

        console.log(`Total monthly payments found for 2025: ${payments.length}`);

        let updatedCount = 0;

        for (const payment of payments) {
            const monthLower = payment.paymentMonth.toLowerCase();
            const monthIndex = monthMap[monthLower];

            if (monthIndex === undefined) {
                console.warn(`Unknown month: ${payment.paymentMonth} for payment ID ${payment.id}`);
                continue;
            }

            // Filter for months before November (index 10)
            if (monthIndex < 10) {
                // Update fields
                payment.status = 'paid';
                payment.paymentMethod = 'nequi';
                
                // Set date to 30th, or 28th for Feb
                let day = 30;
                if (monthIndex === 1) day = 28; // Feb 2025 (not a leap year)

                // Create date object (Year, Month Index, Day)
                // Note: Month index in Date constructor is 0-based
                const paymentDate = new Date(payment.paymentYear, monthIndex, day);
                payment.paymentDate = paymentDate;

                await paymentRepository.save(payment);
                updatedCount++;
            }
        }

        console.log(`Successfully updated ${updatedCount} payments to 'paid' with date 30th and method Nequi.`);

    } catch (error) {
        console.error("Error updating payments:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

updatePayments();
