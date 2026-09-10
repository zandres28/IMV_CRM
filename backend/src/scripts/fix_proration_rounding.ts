
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { Installation } from "../entities/Installation";
import { Payment } from "../entities/Payment";
import { AdditionalService } from "../entities/AdditionalService";

/**
 * Script para encontrar y corregir pagos prorrateados con redondeo incorrecto.
 * 
 * El bug: dailyRate = Math.ceil((monthlyFee / 30) / 500) * 500
 * Causa sobrecargo del ~12% para planes cuyo valor diario no es múltiplo de 500.
 * 
 * Ejemplo: Plan $79,900 → dailyRate real = $2,663 → redondeado a $3,000 → +$337/día
 * 
 * Uso:
 *   npx ts-node --transpile-only src/scripts/fix_proration_rounding.ts agosto 2026 --dry-run
 *   npx ts-node --transpile-only src/scripts/fix_proration_rounding.ts agosto 2026 --apply
 *   npx ts-node --transpile-only src/scripts/fix_proration_rounding.ts --all --dry-run   (todos los meses)
 */

const DRY_RUN = !process.argv.includes('--apply');
const ALL_MODE = process.argv.includes('--all');

// Parse month/year from args
const monthNames: Record<string, number> = {
    enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
    julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11
};

const MONTH_ARG = process.argv.find(a => monthNames[a.toLowerCase()] !== undefined);
const YEAR_ARG = process.argv.find(a => /^\d{4}$/.test(a) && a !== '--dry-run' && a !== '--apply' && a !== '--all');

const MONTH = MONTH_ARG || "agosto";
const YEAR = YEAR_ARG ? parseInt(YEAR_ARG) : 2026;

function parseLocalDate(dateStr: string | Date): Date {
    if (dateStr instanceof Date) return dateStr;
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
}

// Replicar la lógica CORRECTA (redondeo a múltiplos de 100)
function calculateCorrectProration(monthlyFee: number, billedDays: number): number {
    return Math.round((monthlyFee / 30) * billedDays / 100) * 100;
}

// Replicar la lógica ANTIGUA (con el bug de redondeo)
function calculateOldProration(monthlyFee: number, billedDays: number): number {
    const dailyRate = Math.ceil((monthlyFee / 30) / 500) * 500;
    return dailyRate * billedDays;
}

async function fixProration() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected");
        console.log(`Modo: ${DRY_RUN ? 'DRY RUN (solo lectura)' : 'APPLY (corregirá registros)'}`);
        console.log(`Buscando pagos prorrateados de ${MONTH} ${YEAR}...\n`);

        const paymentRepo = AppDataSource.getRepository(Payment);
        const installationRepo = AppDataSource.getRepository(Installation);
        const additionalServiceRepo = AppDataSource.getRepository(AdditionalService);

        // Buscar todos los pagos prorrateados del mes
        const proratedPayments = await paymentRepo.find({
            where: {
                paymentMonth: MONTH,
                paymentYear: YEAR,
                isProrated: true
            },
            relations: ['client']
        });

        console.log(`Pagos prorrateados encontrados: ${proratedPayments.length}\n`);

        let totalCorregidos = 0;
        let totalSobrecargo = 0;
        const detalles: string[] = [];

        for (const payment of proratedPayments) {
            const client = payment.client;
            const installations = await installationRepo.find({
                where: { client: { id: client.id }, isDeleted: false },
                relations: ['servicePlan']
            });

            const monthIdx = monthNames[MONTH.toLowerCase()];
            const lastDayOfMonth = new Date(YEAR, monthIdx + 1, 0);
            const firstDayOfMonth = new Date(YEAR, monthIdx, 1);

            let correctServiceAmount = 0;
            let oldServiceAmount = 0;
            const instalDetails: string[] = [];

            for (const inst of installations) {
                const installDate = parseLocalDate(inst.installationDate as unknown as string);
                const retirementDate = inst.retirementDate
                    ? parseLocalDate(inst.retirementDate as unknown as string)
                    : null;

                if (installDate > lastDayOfMonth) continue;

                let billingEndDate = lastDayOfMonth;
                if (retirementDate && retirementDate <= lastDayOfMonth) {
                    billingEndDate = retirementDate;
                }

                let billingStartDate = firstDayOfMonth;
                if (installDate > firstDayOfMonth) {
                    billingStartDate = installDate;
                }

                if (billingEndDate < billingStartDate) continue;

                const isFullMonth = billingStartDate.getTime() === firstDayOfMonth.getTime()
                    && billingEndDate.getTime() === lastDayOfMonth.getTime();

                if (!isFullMonth) {
                    const billedDays = Math.floor(
                        (billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    const monthlyFee = Number(inst.monthlyFee);

                    const correctAmount = calculateCorrectProration(monthlyFee, billedDays);
                    const oldAmount = calculateOldProration(monthlyFee, billedDays);

                    correctServiceAmount += correctAmount;
                    oldServiceAmount += oldAmount;

                    if (oldAmount !== correctAmount) {
                        instalDetails.push(
                            `  Plan: ${inst.servicePlan?.name || 'N/A'} ($${monthlyFee}) | ` +
                            `${billedDays} días | ` +
                            `Antes: $${oldAmount} → Correcto: $${correctAmount} | ` +
                            `Diferencia: $${oldAmount - correctAmount}`
                        );
                    }
                } else {
                    const monthlyFee = Number(inst.monthlyFee);
                    correctServiceAmount += monthlyFee;
                    oldServiceAmount += monthlyFee;
                }
            }

            // Recalcular servicios adicionales prorrateados
            const additionalServices = await additionalServiceRepo.find({
                where: { client: { id: client.id }, status: 'activo' }
            });

            let correctAdditionalAmount = 0;
            let oldAdditionalAmount = 0;

            for (const svc of additionalServices) {
                const serviceStartDate = parseLocalDate(svc.startDate as unknown as string);
                const serviceEndDate = svc.endDate
                    ? parseLocalDate(svc.endDate as unknown as string)
                    : null;

                let billingEndDate = lastDayOfMonth;
                if (serviceEndDate && serviceEndDate < billingEndDate) {
                    billingEndDate = serviceEndDate;
                }

                const shouldProrate = billingEndDate.getTime() < lastDayOfMonth.getTime();

                if (shouldProrate) {
                    const billingStartDate = serviceStartDate > firstDayOfMonth ? serviceStartDate : firstDayOfMonth;
                    if (billingEndDate < billingStartDate) continue;

                    const billedDays = Math.floor(
                        (billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    const monthlyFee = Number(svc.monthlyFee);

                    correctAdditionalAmount += calculateCorrectProration(monthlyFee, billedDays);
                    oldAdditionalAmount += calculateOldProration(monthlyFee, billedDays);
                } else {
                    correctAdditionalAmount += Number(svc.monthlyFee);
                    oldAdditionalAmount += Number(svc.monthlyFee);
                }
            }

            const correctTotal = correctServiceAmount + correctAdditionalAmount
                + Number(payment.productInstallmentsAmount || 0)
                - Number(payment.outageDiscountAmount || 0);
            const oldTotal = oldServiceAmount + oldAdditionalAmount
                + Number(payment.productInstallmentsAmount || 0)
                - Number(payment.outageDiscountAmount || 0);

            const diff = oldTotal - correctTotal;

            if (diff > 0) {
                totalCorregidos++;
                totalSobrecargo += diff;

                const detail = [
                    `Cliente ${client.id}: ${client.fullName}`,
                    `  Pago actual: $${payment.amount} | Corrección: $${correctTotal} | Sobrecargo: $${diff}`,
                    ...instalDetails,
                    ''
                ].join('\n');
                detalles.push(detail);
                console.log(detail);
            }
        }

        console.log("\n" + "=".repeat(60));
        console.log(`RESUMEN:`);
        console.log(`  Pagos prorrateados analizados: ${proratedPayments.length}`);
        console.log(`  Pagos con sobrecargo (corregibles): ${totalCorregidos}`);
        console.log(`  Sobrecargo total: $${totalSobrecargo.toLocaleString('es-CO')}`);

        if (DRY_RUN) {
            console.log(`\n⚠️  MODO DRY RUN — No se modificaron registros.`);
            console.log(`Para aplicar los cambios, ejecuta:`);
            console.log(`  npx ts-node --transpile-only src/scripts/fix_proration_rounding.ts --apply`);
        } else {
            // Aplicar correcciones
            console.log(`\nAplicando correcciones...`);

        for (const payment of proratedPayments) {
            // NO modificar pagos ya marcados como pagados
            if (payment.status === 'pagado') {
                console.log(`  ⏭ ${payment.client.fullName}: ya está pagado ($${payment.amount}), se omite`);
                continue;
            }

            const client = payment.client;
            const installations = await installationRepo.find({
                where: { client: { id: client.id }, isDeleted: false },
                relations: ['servicePlan']
            });

            const monthIdx = monthNames[MONTH.toLowerCase()];
            const lastDayOfMonth = new Date(YEAR, monthIdx + 1, 0);
            const firstDayOfMonth = new Date(YEAR, monthIdx, 1);

            let correctServiceAmount = 0;

            for (const inst of installations) {
                const installDate = parseLocalDate(inst.installationDate as unknown as string);
                const retirementDate = inst.retirementDate
                    ? parseLocalDate(inst.retirementDate as unknown as string)
                    : null;

                if (installDate > lastDayOfMonth) continue;

                let billingEndDate = lastDayOfMonth;
                if (retirementDate && retirementDate <= lastDayOfMonth) {
                    billingEndDate = retirementDate;
                }

                let billingStartDate = firstDayOfMonth;
                if (installDate > firstDayOfMonth) {
                    billingStartDate = installDate;
                }

                if (billingEndDate < billingStartDate) continue;

                const isFullMonth = billingStartDate.getTime() === firstDayOfMonth.getTime()
                    && billingEndDate.getTime() === lastDayOfMonth.getTime();

                if (!isFullMonth) {
                    const billedDays = Math.floor(
                        (billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    correctServiceAmount += calculateCorrectProration(Number(inst.monthlyFee), billedDays);
                } else {
                    correctServiceAmount += Number(inst.monthlyFee);
                }
            }

            // Servicios adicionales
            const additionalServices = await additionalServiceRepo.find({
                where: { client: { id: client.id }, status: 'activo' }
            });
            let correctAdditionalAmount = 0;

            for (const svc of additionalServices) {
                const serviceStartDate = parseLocalDate(svc.startDate as unknown as string);
                const serviceEndDate = svc.endDate
                    ? parseLocalDate(svc.endDate as unknown as string)
                    : null;

                let billingEndDate = lastDayOfMonth;
                if (serviceEndDate && serviceEndDate < billingEndDate) billingEndDate = serviceEndDate;

                const shouldProrate = billingEndDate.getTime() < lastDayOfMonth.getTime();
                if (shouldProrate) {
                    const billingStartDate = serviceStartDate > firstDayOfMonth ? serviceStartDate : firstDayOfMonth;
                    if (billingEndDate < billingStartDate) continue;
                    const billedDays = Math.floor(
                        (billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24)
                    ) + 1;
                    correctAdditionalAmount += calculateCorrectProration(Number(svc.monthlyFee), billedDays);
                } else {
                    correctAdditionalAmount += Number(svc.monthlyFee);
                }
            }

            const correctTotal = correctServiceAmount + correctAdditionalAmount
                + Number(payment.productInstallmentsAmount || 0)
                - Number(payment.outageDiscountAmount || 0);

            const oldAmount = Number(payment.amount);
            if (correctTotal !== oldAmount) {
                payment.amount = Number(correctTotal.toFixed(2));
                payment.servicePlanAmount = Number(correctServiceAmount.toFixed(2));
                payment.additionalServicesAmount = Number(correctAdditionalAmount.toFixed(2));
                payment.notes = (payment.notes || '') + ` | Corrección prorrateo ${new Date().toISOString().split('T')[0]}: de $${oldAmount} a $${correctTotal}`;
                await paymentRepo.save(payment);
                console.log(`  ✓ ${client.fullName}: $${oldAmount} → $${correctTotal}`);
            }
        }

            console.log(`\n✅ Correcciones aplicadas exitosamente.`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

fixProration();
