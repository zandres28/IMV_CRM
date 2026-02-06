
import { AppDataSource } from "../src/config/database";
import { Payment } from "../src/entities/Payment";
import { Between, Like } from "typeorm";

async function findErroneousPayments() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const paymentRepo = AppDataSource.getRepository(Payment);

        console.log(`Getting last 20 payments...`);

        const payments = await paymentRepo.find({
            take: 20,
            relations: ["client"],
            order: {
                id: "DESC"
            }
        });

        console.log(`Found ${payments.length} payments.`);

        if (payments.length > 0) {
            console.log("Details:");
            payments.forEach(p => {
                console.log(`ID: ${p.id}, Amount: ${p.amount}, Date: ${p.paymentDate}, Month: ${p.paymentMonth}, Created: ${p.created_at}, Client: ${p.client?.fullName}`);
            });
        }

        process.exit(0);

    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

findErroneousPayments();
