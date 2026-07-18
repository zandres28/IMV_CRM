
import { DataSource } from "typeorm";
import * as dotenv from "dotenv";
import path from "path";
import { Client } from "../src/entities/Client";
import { Installation } from "../src/entities/Installation";
import { ServicePlan } from "../src/entities/ServicePlan";
import { Payment } from "../src/entities/Payment";
import { AdditionalService } from "../src/entities/AdditionalService";
import { ProductSold } from "../src/entities/ProductSold";
import { ProductInstallment } from "../src/entities/ProductInstallment";
import { ServiceOutage } from "../src/entities/ServiceOutage";
import { User } from "../src/entities/User";
import { Role } from "../src/entities/Role";
import { ServiceTransfer } from "../src/entities/ServiceTransfer";
import { Contact } from "../src/entities/Contact";
import { Interaction } from "../src/entities/Interaction";
import { Opportunity } from "../src/entities/Opportunity";
import { SpeedHistory } from "../src/entities/SpeedHistory";
import { Technician } from "../src/entities/Technician";

dotenv.config();

const DebugDataSource = new DataSource({
    type: "mysql",
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || "3306"),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    synchronize: false,
    logging: false, // Disabled logging
    entities: [
        Client, Installation, ServicePlan, Payment, AdditionalService, 
        ProductSold, ProductInstallment, ServiceOutage, User, Role,
        ServiceTransfer, Contact, Interaction, Opportunity, SpeedHistory, Technician
    ],
});

async function debugClient() {
    try {
        await DebugDataSource.initialize();
        console.log("Database connected (Logging Disabled)");

        const clientRepository = DebugDataSource.getRepository(Client);
        const installationRepository = DebugDataSource.getRepository(Installation);

        // Find client by name (approximate)
        const clients = await clientRepository.createQueryBuilder("client")
            .where("client.fullName LIKE :name", { name: "%Amparo%" })
            .withDeleted() // Include soft-deleted clients
            .getMany();

        console.log(`Found ${clients.length} clients matching 'Amparo'`);

        for (const client of clients) {
            console.log("--------------------------------------------------");
            console.log(`Client: ${client.fullName} (ID: ${client.id})`);
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
        await DebugDataSource.destroy();
    }
}

debugClient();
