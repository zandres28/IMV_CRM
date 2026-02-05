
import { AppDataSource } from "../src/config/database";
import { Installation } from "../src/entities/Installation";

const checkData = async () => {
    try {
        await AppDataSource.initialize();
        const installations = await AppDataSource.getRepository(Installation).find({
             take: 5,
             where: {} 
        });
        
        console.log("--- Installation Data Sample ---");
        installations.forEach(i => {
            console.log(`ID: ${i.id}, PON: '${i.ponId}', ONU: '${i.onuId}', SN: '${i.onuSerialNumber}'`);
        });

    } catch (error) {
        console.error(error);
    } finally {
        await AppDataSource.destroy();
    }
};

checkData();
