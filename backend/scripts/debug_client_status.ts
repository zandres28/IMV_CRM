
import { AppDataSource } from '../src/config/database';
import { Client } from '../src/entities/Client';

async function checkClientStatus() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const clientRepo = AppDataSource.getRepository(Client);

        const statusCounts = await clientRepo.createQueryBuilder('client')
            .select('client.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('client.status')
            .getRawMany();

        console.log('Client Status Distribution:');
        console.table(statusCounts);

        // Check for mixed case or variations
        const distinctStatuses = await clientRepo.createQueryBuilder('client')
            .select('DISTINCT client.status', 'status')
            .getRawMany();
        
        console.log('Distinct Statuses found:', distinctStatuses.map(s => s.status));

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkClientStatus();
