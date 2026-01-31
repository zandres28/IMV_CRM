import { AppDataSource } from "../src/config/database";
import { Client } from "../src/entities/Client";

async function migratePhones() {
    try {
        console.log("Inicializando conexión a DB...");
        await AppDataSource.initialize();
        console.log("Conectado a la base de datos:", process.env.DB_NAME);

        const clientRepository = AppDataSource.getRepository(Client);
        const clients = await clientRepository.find();

        console.log(`Analizando ${clients.length} clientes...`);

        let updatedCount = 0;

        for (const client of clients) {
            let changed = false;
            
            // Función helper para formatear
            const formatPhone = (phone: string | null | undefined) => {
                if (!phone) return phone;
                // Eliminar espacios, guiones, paréntesis
                let clean = phone.replace(/\D/g, '');
                
                // Si ya tiene 12 dígitos y empieza por 57, está bien (ej: 573001234567)
                if (clean.length === 12 && clean.startsWith('57')) {
                    return clean;
                }
                
                // Si tiene 10 dígitos (ej: 3001234567), agregar 57
                if (clean.length === 10) {
                    return '57' + clean;
                }

                // Opcional: si tiene 11 digitos y empieza con 7? (Casos viejos)
                // Por ahora nos enfocamos en el formato movil estándar Colombia
                return phone; // Dejar original si no encaja en patrón obvio
            };

            const newPrimary = formatPhone(client.primaryPhone);
            const newSecondary = formatPhone(client.secondaryPhone);

            if (newPrimary && newPrimary !== client.primaryPhone) {
                console.log(`Cliente ${client.fullName} (${client.id}): Teléfono principal ${client.primaryPhone} -> ${newPrimary}`);
                client.primaryPhone = newPrimary;
                changed = true;
            }

            if (newSecondary && newSecondary !== client.secondaryPhone) {
                console.log(`Cliente ${client.fullName} (${client.id}): Teléfono secundario ${client.secondaryPhone} -> ${newSecondary}`);
                client.secondaryPhone = newSecondary;
                changed = true;
            }

            if (changed) {
                await clientRepository.save(client);
                updatedCount++;
            }
        }

        console.log(`Migración completada. ${updatedCount} clientes actualizados.`);
        process.exit(0);
    } catch (error) {
        console.error("Error durante la migración:", error);
        process.exit(1);
    }
}

migratePhones();
