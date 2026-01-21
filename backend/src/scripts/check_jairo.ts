
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { Installation } from "../entities/Installation";

async function checkJairo() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const clientRepo = AppDataSource.getRepository(Client);
        const installationRepo = AppDataSource.getRepository(Installation);

        const client = await clientRepo.findOne({
            where: { fullName: "JAIRO GIRALDO SANCHEZ" },
            relations: ["installations"]
        });

        if (!client) {
            console.log("Client not found");
            return;
        }

        console.log("Client found:", client.id, client.fullName);
        console.log("Client Status:", client.status);
        console.log("Client DeletedAt:", client.deletedAt); // Check deletedAt explicitly
        console.log("Installations:", client.installations.length);

        for (const inst of client.installations) {
            console.log("Installation ID:", inst.id);
            console.log("  Date:", inst.installationDate);
            console.log("  Status:", inst.serviceStatus);
            console.log("  MonthlyFee:", inst.monthlyFee);
            console.log("  IsActive (prop):", (inst as any).isActive); 
            console.log("  IsDeleted:", (inst as any).isDeleted);
        }

        // Check if payment exists
        const paymentRepo = AppDataSource.getRepository("Payment");
        const payment = await paymentRepo.findOne({
            where: {
                client: { id: client.id },
                paymentMonth: "junio",
                paymentYear: 2025
            }
        });

        if (payment) {
            console.log("Payment found for June 2025:", payment.id, payment.amount, payment.status);
            console.log("Payment Type:", payment.paymentType); // Check payment type
        } else {
            console.log("No payment found for June 2025");
        }


    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

checkJairo();
