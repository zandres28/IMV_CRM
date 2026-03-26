
import { AppDataSource } from "../src/config/database";
import { Client } from "../src/entities/Client";
import { Installation } from "../src/entities/Installation";

async function debugClient() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");

        const clientRepository = AppDataSource.getRepository(Client);
        const installationRepository = AppDataSource.getRepository(Installation);

        // Find client by name (approximate)
        const clients = await clientRepository.createQueryBuilder("client")
            .where("client.firstName LIKE :name OR client.lastName LIKE :name", { name: "%Amparo%" })
            .withDeleted() // Include soft-deleted clients
            .getMany();

        console.log(`Found ${clients.length} clients matching 'Amparo'`);

        for (const client of clients) {
            console.log("--------------------------------------------------");
            console.log(`Client: ${client.firstName} ${client.lastName} (ID: ${client.id})`);
            console.log(`Status: ${client.status}`);
            console.log(`DeletedAt: ${client.deletedAt}`);
            
            const installations = await installationRepository.find({
                where: { client: { id: client.id } },
                withDeleted: true
            });

            console.log(`Installations: ${installations.length}`);
            for (const inst of installations) {
                console.log(`  Inst ID: ${inst.id}`);
                console.log(`  ServiceStatus: ${inst.serviceStatus}`);
                console.log(`  IsActive: ${inst.isActive}`);
                console.log(`  IsDeleted: ${inst.isDeleted}`);
                console.log(`  InstallationDate: ${inst.installationDate}`);
                console.log(`  RetirementDate: ${inst.retirementDate}`);
            }
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

debugClient();
