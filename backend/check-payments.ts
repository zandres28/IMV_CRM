import { AppDataSource } from "./src/config/database";

async function check() {
    await AppDataSource.initialize();
    const results = await AppDataSource.query("SHOW DATABASES;");
    console.log("Databases:", JSON.stringify(results, null, 2));
    await AppDataSource.destroy();
}

check();
