import { AppDataSource } from "../src/config/database";
import { ProductSold } from "../src/entities/ProductSold";
import { ProductInstallment } from "../src/entities/ProductInstallment";

async function fixInstallmentDates() {
    try {
        console.log("Inicializando conexión a DB...");
        await AppDataSource.initialize();
        console.log(`Conectado a la base de datos: ${process.env.DB_NAME}`);

        const productRepo = AppDataSource.getRepository(ProductSold);
        const installmentRepo = AppDataSource.getRepository(ProductInstallment);

        // Obtener productos con sus cuotas
        const products = await productRepo.find({
            relations: ["installmentPayments"]
        });

        console.log(`Procesando ${products.length} productos...`);
        let updatedCount = 0;

        for (const product of products) {
            if (!product.installmentPayments || product.installmentPayments.length === 0) continue;

            const saleDate = new Date(product.saleDate);
            // Asegurarnos de usar la fecha sin horas para evitar desfases de zona horaria al calcular
            const baseYear = saleDate.getFullYear();
            const baseMonth = saleDate.getMonth(); // 0-11

            console.log(`\nProducto: ${product.productName} (ID: ${product.id}) - Venta: ${product.saleDate}`);

            for (const installment of product.installmentPayments) {
                // Lógica:
                // Cuota 1 -> Vence el 5 del mes siguiente (Mes + 1)
                // Cuota 2 -> Vence el 5 del subsiguiente (Mes + 2)
                // Formula: MesBase + InstallmentNumber
                
                const targetMonth = baseMonth + installment.installmentNumber;
                const newDueDate = new Date(baseYear, targetMonth, 5);

                // Comprobar si cambió (ignoramos la hora, solo fecha)
                const currentDueDate = new Date(installment.dueDate);
                
                // Formato YYYY-MM-DD para comparar
                const strNew = newDueDate.toISOString().split('T')[0];
                const strOld = currentDueDate.toISOString().split('T')[0];

                if (strNew !== strOld) {
                    console.log(`   - Cuota ${installment.installmentNumber}: ${strOld} -> ${strNew}`);
                    installment.dueDate = newDueDate;
                    await installmentRepo.save(installment);
                    updatedCount++;
                } else {
                    // console.log(`   - Cuota ${installment.installmentNumber}: OK (${strOld})`);
                }
            }
        }

        console.log(`\n--- Proceso Terminado ---`);
        console.log(`Total cuotas actualizadas: ${updatedCount}`);
        process.exit(0);

    } catch (error) {
        console.error("Error crítico:", error);
        process.exit(1);
    }
}

fixInstallmentDates();
