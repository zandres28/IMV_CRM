
import { AppDataSource } from '../src/config/database';
import { Client } from '../src/entities/Client';
import { Payment } from '../src/entities/Payment';

async function checkPayments() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const clientRepo = AppDataSource.getRepository(Client);
        const paymentRepo = AppDataSource.getRepository(Payment);

        const clients = await clientRepo.createQueryBuilder('client')
            .where('client.fullName LIKE :name1', { name1: '%SADY ALBERTO CARDONA BALLESTEROS%' })
            .orWhere('client.fullName LIKE :name2', { name2: '%MAURICIO SILVA ORTÍZ%' })
            .leftJoinAndSelect('client.installations', 'installation')
            .getMany();

        console.log(`Found ${clients.length} clients.`);

        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
        const currentYear = currentDate.getFullYear();
        
        console.log(`Checking for Month: ${currentMonth}, Year: ${currentYear}`);

        for (const client of clients) {
            console.log(`\nClient: ${client.fullName} (ID: ${client.id})`);
            console.log('Installations:', client.installations?.map(i => `${i.id} (${i.servicePlan?.name || i.serviceType})`).join(', '));

            const payments = await paymentRepo.find({
                where: {
                    client: { id: client.id }
                },
                relations: ['installation']
            });

            console.log('All Payments found:', payments.length);
            
            // Filter visually for current month logic
            const currentMonthPayments = payments.filter(p => 
                p.paymentMonth === currentMonth && p.paymentYear === currentYear
            );

            console.log(`Payments matching ${currentMonth} ${currentYear}:`, currentMonthPayments.length);
            currentMonthPayments.forEach(p => {
                console.log(` - Payment ID: ${p.id}, Status: ${p.status}, Month: '${p.paymentMonth}', Year: ${p.paymentYear}, Installation ID: ${p.installation?.id}`);
            });
            
             const recentPayments = payments.slice(-3);
             console.log("Recent 3 payments regardless of month:");
             recentPayments.forEach(p => {
                console.log(` - Payment ID: ${p.id}, Status: ${p.status}, Month: '${p.paymentMonth}', Year: ${p.paymentYear}, Installation ID: ${p.installation?.id}, CreatedAt: ${p.created_at}`);
            });

        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkPayments();
