import { AppDataSource } from "../config/database";
import { ServicePlan } from "../entities/ServicePlan";

async function run() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(ServicePlan);

    const plans: Array<Partial<ServicePlan>> = [
      { name: "Plan 200 Megas", speedMbps: 200, monthlyFee: 45000, installationFee: 0, isActive: true },
      { name: "Plan 400 Megas", speedMbps: 400, monthlyFee: 60000, installationFee: 0, isActive: true },
      { name: "Plan 600 Megas", speedMbps: 600, monthlyFee: 75000, installationFee: 0, isActive: true },
    ];

    // upsert por nombre para evitar duplicados si se ejecuta más de una vez
    await repo.upsert(plans as ServicePlan[], ["name"]);

    const all = await repo.find({ order: { speedMbps: "ASC" } });
    console.log("Planes actuales:", all);
  } catch (err) {
    console.error("Error seeding plans", err);
    process.exitCode = 1;
  } finally {
    await AppDataSource.destroy();
  }
}

run();
