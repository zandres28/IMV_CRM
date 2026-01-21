
import { AppDataSource } from '../src/config/database';
import { Interaction } from '../src/entities/Interaction';
import { Like } from 'typeorm';

async function deleteMonthlyPaymentNotes() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const interactionRepo = AppDataSource.getRepository(Interaction);

        // Find interactions with "Pago monthly" in description or subject
        // Based on migration log: subject was "Nota importada: Pago monthly"
        const interactionsToDelete = await interactionRepo.find({
            where: [
                { description: Like('%Pago monthly%') },
                { subject: Like('%Pago monthly%') }
            ]
        });

        console.log(`Found ${interactionsToDelete.length} interactions to delete.`);

        if (interactionsToDelete.length > 0) {
            await interactionRepo.remove(interactionsToDelete);
            console.log(`Successfully deleted ${interactionsToDelete.length} interactions.`);
        } else {
            console.log('No interactions found matching "Pago monthly".');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error deleting interactions:', error);
        process.exit(1);
    }
}

deleteMonthlyPaymentNotes();
