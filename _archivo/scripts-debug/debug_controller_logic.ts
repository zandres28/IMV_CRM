
import { AppDataSource } from '../src/config/database';
import { Client } from '../src/entities/Client';
import { Payment } from '../src/entities/Payment';
import { In } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const targetNames = [
    'ESTEFANY REINA',
    'CARMEN VALENCIA',
    'SIGIFREDO SARRIA ESCOBAR',
    'BRADY AGREDA',
    'BERNARDO LONDOÑO MÉNDEZ'
];

const debugControllerLogic = async () => {
    try {
        await AppDataSource.initialize();
        const clientRepo = AppDataSource.getRepository(Client);
        const paymentRepo = AppDataSource.getRepository(Payment);

        // 1. Get IDs of target clients
        const clients = await clientRepo.find({ relations: ['installations'] }); // Get all to simulate bulk
        const targetClients = clients.filter(c => targetNames.some(name => c.fullName.includes(name)));
        
        const clientIds = targetClients.map(c => c.id);
        console.log(`Testing with ${clientIds.length} clients: ${targetClients.map(c => c.fullName).join(', ')}`);

        const currentDate = new Date(); // Simulating Today
        // HARDCODE MONTH TO MATCH WHAT WE EXPECT
        const currentMonth = 'ENERO'; // Or 'enero'
        const currentYear = 2026;

        console.log(`Querying for Month: ${currentMonth}, Year: ${currentYear}`);

        // 3. Obtener todos los pagos del mes (EXACT COPY FROM CONTROLLER)
        const allPayments = await paymentRepo.find({
            where: [
                { client: { id: In(clientIds) }, paymentMonth: currentMonth, paymentYear: currentYear },
                { client: { id: In(clientIds) }, paymentMonth: currentMonth.toLowerCase(), paymentYear: currentYear }
            ],
            relations: ['installation', 'client']
        });

        console.log(`Fetched ${allPayments.length} payments total.`);

        // Agrupar datos en Mapas (EXACT COPY)
        const paymentsMap = new Map<number, Payment[]>();
        allPayments.forEach(p => {
            const cid = p.client.id;
            if (!paymentsMap.has(cid)) paymentsMap.set(cid, []);
            paymentsMap.get(cid)?.push(p);
        });

        // Debug Logic for each client
        for (const client of targetClients) {
            console.log(`\n--------------------------------------------------`);
            console.log(`Client: ${client.fullName} (ID: ${client.id})`);
            
            const activeInstallations = client.installations?.filter(inst => inst.isActive && !inst.isDeleted) || [];
            const payments = paymentsMap.get(client.id) || [];

            console.log(`Payments in Map: ${payments.length}`);
            payments.forEach(p => {
                console.log(`   - P_ID: ${p.id}, Status: ${p.status}, Month: ${p.paymentMonth}, InstID: ${p.installation?.id}`);
            });

            for (const installation of activeInstallations) {
                console.log(`   Checking Installation ID: ${installation.id}`);
                
                // LOGIC FROM CONTROLLER
                let payment = payments.find(p => p.installation?.id === installation.id);
                
                if (payment) {
                    console.log(`   [MATCH SPECIFIC] Found Payment ID ${payment.id} with status ${payment.status}`);
                } else {
                    console.log(`   [NO SPECIFIC MATCH]`);
                    // Fallback
                    payment = payments.find(p => !p.installation);
                    if (payment) {
                        console.log(`   [MATCH GENERAL] Found Payment ID ${payment.id} with status ${payment.status}`);
                    } else {
                        console.log(`   [NO PAYMENT FOUND]`);
                    }
                }
                
                const finalStatus = payment?.status || 'pending';
                console.log(`   >>> FINAL RESULT for API: ${finalStatus}`);
            }
        }

    } catch (error) {
        console.error(error);
    } finally {
        process.exit(0);
    }
};

debugControllerLogic();
