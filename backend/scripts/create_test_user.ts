
import { AppDataSource } from "../src/config/database";
import { Client } from "../src/entities/Client";
import { Installation } from "../src/entities/Installation";
import { OltService } from "../src/services/OltService";

const createTestUser = async () => {
    try {
        console.log("Iniciando conexión a Base de Datos...");
        await AppDataSource.initialize();
        
        const serialNumber = "DF51A6B79D91";
        const fullName = "USUARIO PRUEBA OLT";
        
        console.log(`Buscando ubicación de ONU ${serialNumber} en la OLT...`);
        const oltService = new OltService();
        
        let locations = null;
        try {
            locations = await oltService.findOnuBySn(serialNumber);
        } catch (err: any) {
            console.error("⚠️ No se pudo conectar a la OLT:", err.message);
            console.log("-> Se procederá con valores por defecto para crear el usuario en BBDD.");
        }
        
        let ponId = "0/0/1"; // Default fallback
        let onuId = "100";   // Default fallback
        
        if (locations) {
            console.log(`✅ ONU encontrada en OLT! PON: ${locations.ponId}, ID: ${locations.onuId}`);
            ponId = locations.ponId;
            onuId = locations.onuId;
        } else {
            console.warn(`⚠️ ONU no encontrada en OLT. Se usarán valores por defecto (${ponId}, ${onuId}) para la prueba.`);
        }

        const clientRepo = AppDataSource.getRepository(Client);
        const installRepo = AppDataSource.getRepository(Installation);

        // Buscar si ya exsite cliente
        let client = await clientRepo.findOne({ where: { identificationNumber: "99999999" } });

        if (!client) {
            console.log("Creando cliente de prueba...");
            client = new Client();
            client.fullName = fullName;
            client.identificationNumber = "99999999";
            client.primaryPhone = "3001234567";
            client.email = "prueba@test.com";
            client.installationAddress = "CALLE FALSA 123";
            client.city = "TEST CITY";
            client.status = "active";
            await clientRepo.save(client);
        } else {
            console.log("Cliente de prueba ya existe, actualizando...");
        }

        // Buscar instalación
        let installation = await installRepo.findOne({ where: { onuSerialNumber: serialNumber } });
        
        if (!installation) {
            console.log("Creando instalación...");
            installation = new Installation();
            installation.client = client;
            installation.serviceType = "FIBRA";
            installation.speedMbps = 100;
            installation.installationDate = new Date();
            installation.serviceStatus = "active";
            installation.ipAddress = "10.0.0.200";
            installation.routerModel = "TEST_ONU";
            installation.onuSerialNumber = serialNumber;
            // Asignar ubicación real
            installation.ponId = ponId;
            installation.onuId = onuId;
            
            await installRepo.save(installation);
            console.log(`✅ Instalación Creada con ID: ${installation.id}`);
        } else {
            console.log(`Instalación ya existe (ID: ${installation.id}). Actualizando ubicación OLT...`);
            installation.ponId = ponId;
            installation.onuId = onuId;
            await installRepo.save(installation);
            console.log(`✅ Instalación Actualizada.`);
        }

        console.log("--- DATOS FINALES ---");
        console.log(`Cliente: ${client.fullName}`);
        console.log(`SN: ${serialNumber}`);
        console.log(`PON ID: ${installation.ponId}`);
        console.log(`ONU ID: ${installation.onuId}`);
        console.log(`Para probar en n8n usa:`);
        console.log(`URL: .../api/olt/service/${serialNumber}`);

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
        process.exit();
    }
};

createTestUser();
