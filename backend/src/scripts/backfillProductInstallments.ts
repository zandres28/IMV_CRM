import "reflect-metadata";
import { AppDataSource } from "../config/database";
import { ProductSold } from "../entities/ProductSold";
import { ProductInstallment } from "../entities/ProductInstallment";

async function main() {
  try {
    await AppDataSource.initialize();
    console.log("DB connected");

    const productRepo = AppDataSource.getRepository(ProductSold);
    const instRepo = AppDataSource.getRepository(ProductInstallment);

    const products = await productRepo.find({ relations: ["installmentPayments"] });

    let created = 0;

    for (const product of products) {
      const have = product.installmentPayments?.length || 0;
      if (have >= product.installments) continue;

      const start = new Date(product.saleDate);
      // Si ya hay algunas cuotas, comenzar a partir de la última dueDate
      let current = new Date(start);
      if (have > 0) {
        const last = product.installmentPayments.reduce((acc, it) =>
          acc && acc > it.dueDate ? acc : it.dueDate,
        new Date(0));
        current = new Date(last);
      }

      const toCreate = product.installments - have;
      for (let i = 0; i < toCreate; i++) {
        // avanzar un mes
        current.setMonth(current.getMonth() + 1);
        const inst = instRepo.create({
          product,
          installmentNumber: have + i + 1,
          amount: product.installmentAmount,
          dueDate: new Date(current),
          status: "pending",
        });
        await instRepo.save(inst);
        created++;
      }

      console.log(`Producto ${product.id} -> cuotas existentes: ${have}, creadas: ${toCreate}`);
    }

    console.log(`Cuotas creadas: ${created}`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
