
import { AppDataSource } from "../src/config/database";
import { InteractionType } from "../src/entities/InteractionType";

async function listInteractionTypes() {
    try {
        await AppDataSource.initialize();
        console.log("Database initialized");

        const repo = AppDataSource.getRepository(InteractionType);
        const types = await repo.find();
        console.log("Existing Interaction Types:", JSON.stringify(types, null, 2));
        
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

listInteractionTypes();
