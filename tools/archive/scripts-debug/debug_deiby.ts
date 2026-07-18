import { AppDataSource } from "../src/config/database";
import { Client } from "../src/entities/Client";
import { ProductInstallment } from "../src/entities/ProductInstallment";

async function debugDeiby() {
    try {
        await AppDataSource.initialize();
        const clientRepo = AppDataSource.getRepository(Client);
        const installmentRepo = AppDataSource.getRepository(ProductInstallment);

        const client = await clientRepo.findOne({
            where: { identificationNumber: '1036394336' } // Finding by ID number if possible, or name
        });
        
        // Try finding by name if ID is not known, using LIKE
        const clients = await clientRepo.createQueryBuilder("client")
            .where("client.fullName LIKE :name", { name: "%DEIBY%" })
            .getMany();

        if (clients.length === 0) {
            console.log("No client found with name like DEIBY");
            return;
        }

        const targetClient = clients[0];
        console.log(`Found Client: ${targetClient.fullName} (ID: ${targetClient.id})`);

        const installments = await installmentRepo.find({
            where: {
                product: { client: { id: targetClient.id } },
                status: 'pending'
            },
            relations: ['product']
        });

        console.log("\n--- Pending Installments ---");
        installments.forEach(inst => {
            console.log(`ID: ${inst.id} | Product: ${inst.product.productName} | Cuota: ${inst.installmentNumber} | DueDate: ${inst.dueDate} (${typeof inst.dueDate}) | Amount: ${inst.amount}`);
        });
        
        const currentDate = new Date();
        const deadlineDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 5);
        console.log(`\n--- Debug Dates ---`);
        console.log(`Current Date: ${currentDate}`);
        console.log(`Deadline Date: ${deadlineDate}`);

        const filtered = installments.filter(p => {
             const dueDate = new Date(p.dueDate);
             return dueDate <= deadlineDate;
        });
        
        console.log(`\n--- Filtered Installments (Should match API) ---`);
        filtered.forEach(inst => {
            console.log(`ID: ${inst.id} | Product: ${inst.product.productName} | Cuota: ${inst.installmentNumber}`);
        });

    } catch (error) {
        console.error(error);
    }
}

debugDeiby();