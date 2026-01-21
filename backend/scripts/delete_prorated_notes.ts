
import { AppDataSource } from '../src/config/database';
import { Interaction } from '../src/entities/Interaction';
import { Like } from 'typeorm';

async function deleteProratedNotes() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const interactionRepo = AppDataSource.getRepository(Interaction);

        // Find interactions with "Prorrateo aplicado" in description or subject
        const interactionsToDelete = await interactionRepo.find({
            where: [
                { description: Like('%Prorrateo aplicado%') },
                { subject: Like('%Prorrateo aplicado%') }
            ]
        });

        console.log(`Found ${interactionsToDelete.length} interactions to delete.`);

        if (interactionsToDelete.length > 0) {
            await interactionRepo.remove(interactionsToDelete);
            console.log(`Successfully deleted ${interactionsToDelete.length} interactions.`);
        } else {
            console.log('No interactions found matching "Prorrateo aplicado".');
        }

        process.exit(0);
    } catch (error) {
        console.error('Error deleting interactions:', error);
        process.exit(1);
    }
}

deleteProratedNotes();
