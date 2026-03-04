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

      const baseDate = new Date(product.saleDate);

      const toCreate = product.installments - have;
      for (let i = 0; i < toCreate; i++) {
        const cuotaIndex = have + i; // 0-based index for this cuota
        // Misma regla que ProductController: día 5 del (mes siguiente + índice)
        const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1 + cuotaIndex, 5);
        const inst = instRepo.create({
          product,
          installmentNumber: have + i + 1,
          amount: product.installmentAmount,
          dueDate,
          status: "pending",
        });
        await instRepo.save(inst);
        created++;
      }

      console.log(`Producto ${product.id} (${product.productName}) -> cuotas existentes: ${have}, creadas: ${toCreate}`);
    }

    console.log(`Cuotas creadas: ${created}`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
