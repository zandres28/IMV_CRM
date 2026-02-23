
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { Between } from "typeorm";

async function checkDate() {
    await AppDataSource.initialize();
    const clientRepository = AppDataSource.getRepository(Client);

    const start = new Date('2025-11-01T00:00:00');
    const end = new Date('2025-11-30T23:59:59');

    const count = await clientRepository.count({
        where: {
            created_at: Between(start, end)
        }
    });

    console.log(`Clientes creados en Noviembre 2025: ${count}`);

    // Ver algunos ejemplos
    const clients = await clientRepository.find({
        where: {
            created_at: Between(start, end)
        },
        relations: ['installations'],
        take: 5
    });

    console.log("Ejemplos:", clients.map(c => ({ 
        id: c.id, 
        name: c.fullName, 
        created_at: c.created_at,
        installations: c.installations.map(i => i.installationDate)
    })));
}

checkDate().catch(console.error);
