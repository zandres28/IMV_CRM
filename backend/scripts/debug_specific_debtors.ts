
import { AppDataSource } from "../src/config/database";
import { Client } from "../src/entities/Client";
import { Payment } from "../src/entities/Payment";

async function checkDebtors() {
    await AppDataSource.initialize();
    
    // Nombres exactos como en la imagen
    const clientNames = [
        "CRISTIAN ARLEY LÓPEZ", 
        "CARLOTA CÓRDOBA LAVERDE", 
        "CARLOS FRANCISCO MORA", 
        "CONSUELO LENIS VALENCIA",
        "DIDIER SANTIAGO CHACÓN URBANO",
        "JOSE DAVID MOSQUERA MARTÍNEZ"
    ];
    
    const clientRepository = AppDataSource.getRepository(Client);
    const paymentRepository = AppDataSource.getRepository(Payment);

    // 1. Check Client Status
    console.log("--- CLIENT STATUS & PAYMENTS (ENERO 2026) ---");
    for (const name of clientNames) {
        // Buscar por nombre parcial
        const clients = await clientRepository.createQueryBuilder("c")
            .where("c.fullName LIKE :name", { name: `%${name}%` })
            .getMany();
            
        if (clients.length === 0) {
            console.log(`[?] ${name} -> NOT FOUND in DB`);
        }

        for (const c of clients) {
            console.log(`[${c.id}] ${c.fullName} - Status: '${c.status}'`);
            
            // 2. Check Payments for Jan 2026
            // Nota: N8n controller busca 'ENERO' o 'enero'.
            const payments = await paymentRepository.find({
                where: [
                    { client: { id: c.id }, paymentMonth: "enero", paymentYear: 2026 },
                    { client: { id: c.id }, paymentMonth: "ENERO", paymentYear: 2026 }
                ]
            });
            
            if (payments.length > 0) {
                 for(const p of payments) {
                     console.log(`   > Payment ID: ${p.id}, Status: '${p.status}', DueDate: ${p.dueDate}, Amount: ${p.amount}`);
                 }
            } else {
                console.log(`   > No payments found for Enero 2026`);
            }
        }
    }
    
    process.exit();
}

checkDebtors().catch(console.error);
