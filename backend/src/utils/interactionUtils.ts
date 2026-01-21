import { AppDataSource } from '../config/database';
import { Interaction } from '../entities/Interaction';
import { InteractionType } from '../entities/InteractionType';
import { Client } from '../entities/Client';

export async function createNoteInteraction(
    clientId: number, 
    noteContent: string, 
    sourceModule: string, 
    userId?: number
) {
    if (!noteContent) return;

    try {
        const interactionRepository = AppDataSource.getRepository(Interaction);
        const typeRepository = AppDataSource.getRepository(InteractionType);

        // Buscar el tipo de interacción "Nota" o crear uno general si no existe
        let noteType = await typeRepository.findOne({ 
            where: { name: 'Nota' } 
        });

        if (!noteType) {
            // Intentar buscar uno que contenga "Nota"
            noteType = await typeRepository.createQueryBuilder("type")
                .where("type.name LIKE :name", { name: "%Nota%" })
                .getOne();
            
            // Si aún no existe, usar el primero disponible o crear uno (esto último es arriesgado en caliente, mejor usar null o uno por defecto)
            if (!noteType) {
                 noteType = await typeRepository.findOne({ where: {} }); // Fallback al primero
            }
        }

        const interaction = new Interaction();
        interaction.clientId = clientId;
        if (noteType) {
            interaction.interactionType = noteType;
            interaction.interactionTypeId = noteType.id;
        }
        
        interaction.subject = `Nota añadida en ${sourceModule}`;
        interaction.description = noteContent;
        interaction.status = 'completado'; // Las notas son registros informativos
        interaction.priority = 'baja';
        
        // Si hay usuario (técnico/admin) asignarlo como responsable inicial o creador (si hubiera campo createdBy)
        if (userId) {
            interaction.assignedToTechnicianId = userId;
        }

        await interactionRepository.save(interaction);
        console.log(`Interacción de nota creada para cliente ${clientId} desde ${sourceModule}`);

    } catch (error) {
        console.error('Error creando interacción automática por nota:', error);
        // No lanzamos error para no interrumpir el flujo principal
    }
}
