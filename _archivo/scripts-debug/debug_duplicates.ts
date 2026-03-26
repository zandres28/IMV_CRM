import { AppDataSource } from "../src/config/database";
import { Payment } from "../src/entities/Payment";

async function checkDuplicates() {
    try {
        await AppDataSource.initialize();
        const paymentRepo = AppDataSource.getRepository(Payment);

        // Find duplicates
        const result = await paymentRepo.query(`
            SELECT clientId, COUNT(*) as count 
            FROM payments 
            WHERE paymentMonth = 'octubre' 
            GROUP BY clientId 
            HAVING count > 1 
            LIMIT 5
        `);

        console.log("Clients with multiple payments in October:", result);

        if (result.length > 0) {
            const clientId = result[0].clientId;
            console.log(`Analyzing details for clientId: ${clientId}`);
            
            const payments = await paymentRepo.find({
                where: { 
                    client: { id: clientId },
                    paymentMonth: 'octubre'
                },
                relations: ['client']
            });

            console.log(JSON.stringify(payments, null, 2));
        }

        await AppDataSource.destroy();
    } catch (error) {
        console.error("Error:", error);
    }
}

checkDuplicates();
