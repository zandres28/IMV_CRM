
import { AppDataSource } from '../src/config/database';
import { Installation } from '../src/entities/Installation';
import { AdditionalService } from '../src/entities/AdditionalService';
import { ServiceOutage } from '../src/entities/ServiceOutage';
import { ProductSold } from '../src/entities/ProductSold';
import { ProductInstallment } from '../src/entities/ProductInstallment';
import { Payment } from '../src/entities/Payment';
import { Opportunity } from '../src/entities/Opportunity';
import { Interaction } from '../src/entities/Interaction';
import { InteractionType } from '../src/entities/InteractionType';
import { Not, IsNull } from 'typeorm';

async function migrateNotes() {
    try {
        await AppDataSource.initialize();
        console.log('Database connected');

        const interactionRepo = AppDataSource.getRepository(Interaction);
        const typeRepo = AppDataSource.getRepository(InteractionType);

        // Get or create 'Nota' type
        let noteType = await typeRepo.findOne({ where: { name: 'Nota' } });
        if (!noteType) {
            noteType = await typeRepo.createQueryBuilder("type")
                .where("type.name LIKE :name", { name: "%Nota%" })
                .getOne();
        }
        
        // If still no note type, use the first one or create one (safest to perhaps just not assign a type if null, or assume a default)
        // ideally we should have a 'Nota' type. 
        if (!noteType) {
             console.log("No interaction type found for 'Nota', using generic fallback if available.");
             noteType = await typeRepo.findOne({ where: {} });
        }

        const noteTypeId = noteType ? noteType.id : null;

        // 1. Installations
        const installationRepo = AppDataSource.getRepository(Installation);
        const installations = await installationRepo.find({
            where: { 
                notes: Not(IsNull()) 
            },
            relations: ['client']
        });
        
        console.log(`Processing ${installations.length} installations with notes...`);
        for (const inst of installations) {
             if (!inst.notes || !inst.notes.trim()) continue;
             if (!inst.client) continue;

             const subject = `Nota importada: Instalación`;
             // Avoid duplicates (simple check)
             const exists = await interactionRepo.findOne({ 
                 where: { 
                     clientId: inst.client.id, 
                     description: inst.notes,
                     subject: subject 
                } 
             });

             if (!exists) {
                 await interactionRepo.save({
                     clientId: inst.client.id,
                     interactionTypeId: noteTypeId || undefined,
                     interactionType: noteType || undefined,
                     subject: subject,
                     description: inst.notes,
                     status: 'completado',
                     priority: 'baja',
                     created_at: inst.created_at || new Date(), // Try to keep original date if possible
                     updated_at: new Date()
                 });
             }
        }

        // 2. Additional Services
        const serviceRepo = AppDataSource.getRepository(AdditionalService);
        const services = await serviceRepo.find({
            where: { notes: Not(IsNull()) },
            relations: ['client']
        });
        
        console.log(`Processing ${services.length} additional services with notes...`);
        for (const srv of services) {
            if (!srv.notes || !srv.notes.trim()) continue;
            if (!srv.client) continue;

            const subject = `Nota importada: Servicio Adicional`;
            const exists = await interactionRepo.findOne({ 
                where: { clientId: srv.client.id, description: srv.notes, subject: subject } 
            });

            if (!exists) {
                await interactionRepo.save({
                    clientId: srv.client.id,
                    interactionTypeId: noteTypeId || undefined,
                    interactionType: noteType || undefined,
                    subject: subject,
                    description: srv.notes,
                    status: 'completado',
                    priority: 'baja',
                    created_at: srv.created_at || new Date()
                });
            }
        }

        // 3. Service Outages
        const outageRepo = AppDataSource.getRepository(ServiceOutage);
        const outages = await outageRepo.find({
             // Check if notes column exists on entity, grep said yes
             where: { notes: Not(IsNull()) },
             relations: ['client']
        });

        console.log(`Processing ${outages.length} service outages with notes...`);
        for (const out of outages) {
             if (!out.notes || !out.notes.trim()) continue;
             
             // Client might be direct or via installation? ServiceOutage has clientId column?
             // Let's check ServiceOutage entity or controller. Controller uses clientId.
             // If relationship is not loaded, we rely on clientId column if entity has it.
             // Grep of ServiceOutageController showed: outageRepo.create({ clientId, ... })
             
             let clientId = out.clientId;
             if (!clientId && out.client) clientId = out.client.id;

             if (!clientId) continue;

             const subject = `Nota importada: Reporte de Falla`;
             const exists = await interactionRepo.findOne({ 
                 where: { clientId: clientId, description: out.notes, subject: subject } 
             });

             if (!exists) {
                 await interactionRepo.save({
                     clientId: clientId,
                     interactionTypeId: noteTypeId || undefined,
                     interactionType: noteType || undefined,
                     subject: subject,
                     description: out.notes,
                     status: 'completado',
                     priority: 'baja',
                     created_at: out.created_at || new Date()
                 });
             }
        }

        // 4. Products Sold
        const productRepo = AppDataSource.getRepository(ProductSold);
        const products = await productRepo.find({ 
            where: { notes: Not(IsNull()) },
            relations: ['client']
        });
        
        console.log(`Processing ${products.length} products with notes...`);
        for (const prod of products) {
            if (!prod.notes || !prod.notes.trim()) continue;
            if (!prod.client) continue;

            const subject = `Nota importada: Venta de Producto`;
            const exists = await interactionRepo.findOne({ 
                where: { clientId: prod.client.id, description: prod.notes, subject: subject } 
            });

            if (!exists) {
                await interactionRepo.save({
                    clientId: prod.client.id,
                    interactionTypeId: noteTypeId || undefined,
                    interactionType: noteType || undefined,
                    subject: subject,
                    description: prod.notes,
                    status: 'completado',
                    priority: 'baja',
                    created_at: prod.created_at || new Date()
                });
            }
        }

        // 5. Product Installments
        const installmentRepo = AppDataSource.getRepository(ProductInstallment);
        const installments = await installmentRepo.find({
            where: { notes: Not(IsNull()) },
            relations: ['product', 'product.client']
        });
        
        console.log(`Processing ${installments.length} product installments with notes...`);
        for (const inst of installments) {
            if (!inst.notes || !inst.notes.trim()) continue;
            if (!inst.product || !inst.product.client) continue;

            const subject = `Nota importada: Cuota ${inst.installmentNumber} de Producto`;
            const exists = await interactionRepo.findOne({ 
                 where: { clientId: inst.product.client.id, description: inst.notes, subject: subject } 
            });

            if (!exists) {
                await interactionRepo.save({
                    clientId: inst.product.client.id,
                    interactionTypeId: noteTypeId || undefined,
                    interactionType: noteType || undefined,
                    subject: subject,
                    description: inst.notes,
                    status: 'completado',
                    priority: 'baja',
                    created_at: inst.paymentDate // Use payment date if available, else now? installRepo doesn't have created_at usually? Check entity.
                });
            }
        }

        // 6. Payments
        const paymentRepo = AppDataSource.getRepository(Payment);
        const payments = await paymentRepo.find({
            where: { notes: Not(IsNull()) },
            relations: ['client']
        });

        console.log(`Processing ${payments.length} payments with notes...`);
        for (const pay of payments) {
             if (!pay.notes || !pay.notes.trim()) continue;
             if (!pay.client) continue;
             
             // Ignore automatic system notes? "Importado desde CSV..." might be spammy if huge.
             // User asked to "Verifica los clientes que tienen alguna nota", implies all notes.
             // But maybe exclude specific automatic ones? 
             // "Cobro de instalación" is standard.
             // Let's include all for now as user asked.
             
             const subject = `Nota importada: Pago ${pay.paymentType || ''}`;
             const exists = await interactionRepo.findOne({ 
                 where: { clientId: pay.client.id, description: pay.notes, subject: subject } 
             });

             if (!exists) {
                 await interactionRepo.save({
                     clientId: pay.client.id,
                     interactionTypeId: noteTypeId || undefined,
                     interactionType: noteType || undefined,
                     subject: subject,
                     description: pay.notes,
                     status: 'completado',
                     priority: 'baja',
                     created_at: pay.paymentDate || new Date()
                 });
             }
        }

        // 7. Opportunities
        const opportunityRepo = AppDataSource.getRepository(Opportunity);
        const opportunities = await opportunityRepo.find({
            where: { notes: Not(IsNull()) },
            relations: ['client']
        });

        console.log(`Processing ${opportunities.length} opportunities with notes...`);
        for (const opp of opportunities) {
            if (!opp.notes || !opp.notes.trim()) continue;
            
             // Opportunity client relation
             let clientId = (opp.client as any)?.id || (typeof opp.client === 'number' ? opp.client : null);
             if (!clientId) continue;

             const subject = `Nota importada: Oportunidad`;
             const exists = await interactionRepo.findOne({ 
                 where: { clientId: clientId, description: opp.notes, subject: subject } 
             });

             if (!exists) {
                 await interactionRepo.save({
                     clientId: clientId,
                     interactionTypeId: noteTypeId || undefined,
                     interactionType: noteType || undefined,
                     subject: subject,
                     description: opp.notes,
                     status: 'completado',
                     priority: 'baja',
                     created_at: opp.created_at || new Date()
                 });
             }
        }

        console.log('Migration completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrateNotes();
