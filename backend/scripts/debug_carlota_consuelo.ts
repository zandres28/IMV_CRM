
import { AppDataSource } from "../src/config/database";
import { Client } from "../src/entities/Client";

async function checkClients() {
    await AppDataSource.initialize();
    
    const clientNames = ["CARLOTA CÓRDOBA LAVERDE", "CONSUELO LENIS VALENCIA"];
    const clientRepository = AppDataSource.getRepository(Client);

    for (const name of clientNames) {
        // Use Like for partial match just in case
        const clients = await clientRepository.createQueryBuilder("client")
            .leftJoinAndSelect("client.installations", "installation")
            .where("client.fullName LIKE :name", { name: `%${name}%` })
            .getMany();

        console.log(`--- Checking: ${name} ---`);
        if (clients.length === 0) {
            console.log("No client found.");
        }

        for (const client of clients) {
            console.log(`ID: ${client.id}, Name: ${client.fullName}, Status: ${client.status}`);
            console.log("Installations:");
            for (const inst of client.installations) {
                console.log(`  InstID: ${inst.id}, ServiceStatus: ${inst.serviceStatus}, IsActive: ${inst.isActive}, IsDeleted: ${inst.isDeleted}`);
                console.log(`  InstallationDate: ${inst.installationDate}, RetirementDate: ${inst.retirementDate}`);
            }
        }
    }
    
    process.exit();
}

checkClients().catch(console.error);
