import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Payment } from "../entities/Payment";
import { Client } from "../entities/Client";
import { Installation } from "../entities/Installation";
import { AdditionalService } from "../entities/AdditionalService";
import { ProductSold } from "../entities/ProductSold";
import { ProductInstallment } from "../entities/ProductInstallment";
import { ServiceOutage } from "../entities/ServiceOutage";
import { Interaction } from "../entities/Interaction";
import { Between, Brackets, In } from "typeorm";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";

export class MonthlyBillingController {
    /**
     * Genera los cobros mensuales para todos los clientes activos
     * POST /api/monthly-billing/generate
     */
    static async generateMonthlyBilling(req: AuthRequest, res: Response) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Solo admin/operador pueden generar facturación
            if (!hasPermission(req.user || null, PERMISSIONS.BILLING.CREATE)) {
                return res.status(403).json({ message: 'No tienes permiso para generar facturación' });
            }
            const { month, year } = req.body;

            if (!month || !year) {
                return res.status(400).json({ message: "Mes y año son requeridos" });
            }

            // Usar el manager de la transacción para todos los repositorios
            const clientRepository = queryRunner.manager.getRepository(Client);
            const paymentRepository = queryRunner.manager.getRepository(Payment);
            const installationRepository = queryRunner.manager.getRepository(Installation);
            const additionalServiceRepository = queryRunner.manager.getRepository(AdditionalService);
            const productSoldRepository = queryRunner.manager.getRepository(ProductSold);
            const installmentRepository = queryRunner.manager.getRepository(ProductInstallment);
            const outageRepository = queryRunner.manager.getRepository(ServiceOutage);

            // Obtener todos los clientes (activos e inactivos) para verificar si tienen cobros pendientes o retiros recientes
            const clients = await clientRepository.find({
                // where: { status: 'active' }, // Se comenta para permitir facturar clientes retirados en el mes
                relations: ['installations', 'installations.servicePlan']
            });

            const generatedPayments = [];
            const monthName = month; // e.g., "octubre"
            const yearNum = parseInt(year);

            // Calcular el primer y último día del mes
            const monthIndex = getMonthIndex(month);
            const firstDayOfMonth = new Date(yearNum, monthIndex, 1);
            const lastDayOfMonth = new Date(yearNum, monthIndex + 1, 0);
            const totalDaysInMonth = lastDayOfMonth.getDate();

            // Período de facturación: incluye cuotas con vencimiento hasta el día 5 del mes siguiente
            const billingPeriodEnd = new Date(yearNum, monthIndex + 1, 5);

            for (const client of clients) {
                // Buscar instalaciones que deben ser facturadas:
                // 1. Activas
                // 2. O Canceladas/Suspendidas pero con fecha de retiro dentro del mes (o posterior)
                const allInstallations = await installationRepository.find({
                    where: [
                        {
                            client: { id: client.id },
                            isActive: true,
                            serviceStatus: 'active',
                            isDeleted: false
                        },
                        {
                            client: { id: client.id },
                            isDeleted: false,
                            // Si está cancelada/suspendida, verificar si se retiró en este mes o después
                            // Nota: Esto requiere que retirementDate esté seteado. Si no, se asume retiro inmediato.
                            // Para simplificar, traemos todas y filtramos en memoria por fecha.
                        }
                    ],
                    relations: ['servicePlan']
                });

                // Filtrar en memoria para manejar lógica compleja de fechas
                const activeInstallations = allInstallations.filter(inst => {
                    // Si está activa, incluirla (a menos que tenga retirementDate anterior al mes, lo cual sería inconsistente pero posible)
                    if (inst.serviceStatus === 'active') {
                        if (inst.retirementDate) {
                            const rDate = parseLocalDate(inst.retirementDate as unknown as string) || new Date(inst.retirementDate);
                            // Si se retiró antes de empezar el mes, no facturar
                            if (rDate < firstDayOfMonth) return false;
                        }
                        return true;
                    }

                    // Si NO está activa (cancelada/suspendida), solo incluir si tiene retirementDate dentro del mes o posterior
                    if (inst.retirementDate) {
                        const rDate = parseLocalDate(inst.retirementDate as unknown as string) || new Date(inst.retirementDate);

                        // FIX: Problema con Carlota/Consuelo. Retiro el 30 Enero. Facturando Enero (mes actual).
                        // Si se retiró ANTES de que empiece este mes, NO se debe facturar NADA.
                        if (rDate < firstDayOfMonth) {
                            return false;
                        }

                        // Si se retiró durante este mes (o después), facturar (prorrateado o completo)
                        return rDate >= firstDayOfMonth;
                    }

                    return false;
                });

                if (activeInstallations.length === 0) {
                    // Si no hay instalaciones facturables, verificar si existe un pago generado previamente y eliminarlo si está pendiente
                    // Esto limpia cobros generados antes de marcar el retiro del cliente
                    const existingPayment = await paymentRepository.findOne({
                        where: {
                            client: { id: client.id },
                            paymentMonth: monthName,
                            paymentYear: yearNum,
                            paymentType: 'monthly',
                            status: 'pending'
                        }
                    });

                    if (existingPayment) {
                        await paymentRepository.remove(existingPayment);
                    }
                    continue;
                }

                let servicePlanAmount = 0;
                let isProrated = false;
                let billedDaysAgg = 0; // sumatoria de días facturados entre instalaciones (solo informativo)

                for (const installation of activeInstallations) {
                    // Usar parseLocalDate para evitar desfases de zona horaria
                    const installDate = parseLocalDate(installation.installationDate as unknown as string) || new Date(installation.installationDate);
                    const retirementDate = installation.retirementDate ? (parseLocalDate(installation.retirementDate as unknown as string) || new Date(installation.retirementDate)) : null;

                    // Validar fecha
                    if (!installDate || isNaN(installDate.getTime())) continue;

                    // Si la instalación es posterior al fin de mes a facturar, ignorarla
                    if (installDate > lastDayOfMonth) continue;

                    // Determinar fecha fin de cobro: Fin de mes O Fecha de retiro (lo que ocurra primero)
                    let billingEndDate = lastDayOfMonth;
                    if (retirementDate && retirementDate <= lastDayOfMonth) {
                        billingEndDate = retirementDate;
                    }

                    // Determinar fecha inicio de cobro: Inicio de mes O Fecha de instalación (lo que ocurra último)
                    let billingStartDate = firstDayOfMonth;
                    if (installDate > firstDayOfMonth) {
                        billingStartDate = installDate;
                    }

                    // Si la fecha de fin es antes de la de inicio, no cobrar nada (ej. retiro antes de instalación en el mismo mes?)
                    if (billingEndDate < billingStartDate) continue;

                    // Calcular días a facturar
                    // Si cubre todo el mes (1 al último día), es mes completo (30 días)
                    // Si es parcial, contar días reales
                    const isFullMonth = billingStartDate.getTime() === firstDayOfMonth.getTime() && billingEndDate.getTime() === lastDayOfMonth.getTime();

                    if (!isFullMonth) {
                        isProrated = true;
                        // Calcular días (inclusive)
                        const billedDays = Math.floor((billingEndDate.getTime() - billingStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                        billedDaysAgg += billedDays;

                        // Calcular monto prorrateado: siempre usar 30 días y redondear a múltiplos de 500 hacia arriba
                        const monthlyFee = Number(installation.monthlyFee);
                        const dailyRate = Math.ceil((monthlyFee / 30) / 500) * 500;
                        servicePlanAmount += dailyRate * billedDays;
                    } else {
                        servicePlanAmount += Number(installation.monthlyFee);
                    }
                }

                // Servicios adicionales activos
                const additionalServices = await additionalServiceRepository.find({
                    where: { client: { id: client.id }, status: 'active' }
                });
                let additionalServicesAmount = 0;
                for (const service of additionalServices) {
                    const serviceStartDate = parseLocalDate(service.startDate as unknown as string) || new Date(service.startDate);
                    // Los servicios adicionales NO se prorratean, siempre se cobra tarifa completa
                    if (serviceStartDate <= lastDayOfMonth && (!service.endDate || (parseLocalDate(service.endDate as unknown as string) || new Date(service.endDate)) >= firstDayOfMonth)) {
                        additionalServicesAmount += Number(service.monthlyFee);
                    }
                }

                // Cuotas de productos: del mes (hasta día 5 del siguiente) y futuras provisionadas
                const productsSold = await productSoldRepository.find({
                    where: { client: { id: client.id }, status: 'pending' },
                    relations: ['installmentPayments']
                });
                let productInstallmentsAmount = 0; // del período de facturación
                let productFutureInstallmentsAmount = 0; // futuras provisionadas
                let productFutureInstallmentsCount = 0;
                for (const product of productsSold) {
                    // Solo considerar productos vendidos hasta el fin del mes de facturación (NO incluir ventas del mes siguiente aunque sea antes del 5)
                    const saleDate = parseLocalDate(product.saleDate as unknown as string) || new Date(product.saleDate);
                    if (saleDate > lastDayOfMonth) continue;

                    const pendingFromThisMonthOn = await installmentRepository.find({
                        where: {
                            product: { id: product.id },
                            status: 'pending',
                            dueDate: Between(firstDayOfMonth, new Date(9999, 11, 31))
                        }
                    });

                    for (const inst of pendingFromThisMonthOn) {
                        const due = new Date(inst.dueDate);
                        // Cuotas con vencimiento hasta el día 5 del mes siguiente se incluyen en este mes
                        if (due <= billingPeriodEnd) {
                            productInstallmentsAmount += Number(inst.amount);
                        } else {
                            productFutureInstallmentsAmount += Number(inst.amount);
                            productFutureInstallmentsCount += 1;
                        }
                    }
                }

                // Por defecto, el total del mes NO incluye las futuras para evitar marcarlas como vencidas

                // No incluir fees de instalación en facturación mensual; se manejan por módulo separado

                // Buscar si ya existe un pago MENSUAL para este mes
                let payment = await paymentRepository.findOne({
                    where: {
                        client: { id: client.id },
                        paymentMonth: monthName,
                        paymentYear: yearNum,
                        paymentType: 'monthly'
                    }
                });

                // Obtener descuentos pendientes por caídas de servicio del cliente
                // Incluir también las que ya están aplicadas a este pago (para recalcular correctamente)
                // NOTA: Reemplazar createQueryBuilder con find del repositorio transaccional si es posible, o usar el queryRunner
                const outageQuery = outageRepository.createQueryBuilder('outage', queryRunner)
                    .where('outage.clientId = :clientId', { clientId: client.id })
                    .andWhere(new Brackets(qb => {
                        qb.where('outage.status = :pending', { pending: 'pending' });
                        if (payment) {
                            qb.orWhere('outage.appliedToPaymentId = :paymentId', { paymentId: payment.id });
                        }
                    }));

                const pendingOutages = await outageQuery.getMany();

                const outageDiscountAmount = pendingOutages.reduce(
                    (sum, outage) => sum + Number(outage.discountAmount),
                    0
                );

                const outageDays = pendingOutages.reduce(
                    (sum, outage) => sum + outage.days,
                    0
                );

                const totalAmount = servicePlanAmount + additionalServicesAmount + productInstallmentsAmount - outageDiscountAmount;

                // Si el total es 0 o negativo (ej. todas las instalaciones son futuras), 
                // y existe un pago pendiente previo, eliminarlo para limpiar basura
                if (totalAmount <= 0) {
                    if (payment && payment.status === 'pending') {
                        await paymentRepository.remove(payment);
                    }
                    continue;
                }

                if (!payment) {
                    payment = new Payment();
                    payment.paymentType = 'monthly';
                }
                payment.client = client;
                payment.amount = Number(totalAmount.toFixed(2));
                payment.paymentMonth = monthName;
                payment.paymentYear = yearNum;
                payment.dueDate = new Date(yearNum, monthIndex + 1, 5);
                // Si ya estaba pagado, no modificar estado ni amount; de lo contrario, marcar/actualizar
                if (payment.status !== 'paid') {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    payment.status = today > payment.dueDate ? 'overdue' : 'pending';
                }
                payment.servicePlanAmount = Number(servicePlanAmount.toFixed(2));
                payment.additionalServicesAmount = Number(additionalServicesAmount.toFixed(2));
                payment.productInstallmentsAmount = Number(productInstallmentsAmount.toFixed(2));
                payment.installationFeeAmount = 0; // explícitamente excluir en mensual
                payment.outageDiscountAmount = Number(outageDiscountAmount.toFixed(2));
                payment.outageDays = outageDays;
                payment.productFutureInstallmentsAmount = Number(productFutureInstallmentsAmount.toFixed(2));
                payment.productFutureInstallmentsCount = productFutureInstallmentsCount;
                payment.isProrated = isProrated;
                payment.billedDays = isProrated ? billedDaysAgg : totalDaysInMonth;
                // Siempre usar 30 días como base para el cálculo del prorrateo
                payment.totalDaysInMonth = 30;
                const futureNote = productFutureInstallmentsCount > 0
                    ? ` | Incluye ${productFutureInstallmentsCount} cuota(s) futura(s) provisionada(s)`
                    : '';
                const outageNote = outageDays > 0
                    ? ` | Descuento por ${outageDays} día(s) sin servicio (-$${outageDiscountAmount.toLocaleString('es-CO')})`
                    : '';
                payment.notes = isProrated ? `Prorrateo aplicado${futureNote}${outageNote}` : (payment.notes || '') + futureNote + outageNote;

                await paymentRepository.save(payment);

                // Marcar las caídas como aplicadas a este pago
                if (pendingOutages.length > 0) {
                    for (const outage of pendingOutages) {
                        outage.status = 'applied';
                        outage.appliedToPaymentId = payment.id;
                        await outageRepository.save(outage);
                    }
                }

                generatedPayments.push(payment);
            }

            await queryRunner.commitTransaction();

            res.json({
                message: `Se generaron ${generatedPayments.length} cobros para ${monthName} ${yearNum}`,
                payments: generatedPayments
            });

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error generando cobros mensuales:", error);
            res.status(500).json({ message: "Error generando cobros mensuales" });
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * Marcar pagos de varios clientes como pagados (por mes/año)
     * POST /api/monthly-billing/bulk/mark-paid
     * body: { clientIds: number[], month?: string, year?: number, paymentMethod?: string, paymentDate?: string }
     */
    static async bulkMarkPaid(req: Request, res: Response) {
        try {
            const { clientIds, month, year, paymentMethod, paymentDate } = req.body as {
                clientIds: number[];
                month?: string;
                year?: number;
                paymentMethod?: string;
                paymentDate?: string;
            };

            if (!Array.isArray(clientIds) || clientIds.length === 0) {
                return res.status(400).json({ message: "clientIds es requerido" });
            }

            const now = new Date();
            const monthName = month ? String(month) : Object.keys(MONTHS_MAP).find(key => MONTHS_MAP[key] === now.getMonth()) || 'noviembre';
            const yearNum = year ?? now.getFullYear();
            const method = paymentMethod || 'transferencia';

            const paymentRepository = AppDataSource.getRepository(Payment);

            const results: { clientId: number; status: 'updated' | 'not-found' | 'already-paid'; paymentId?: number }[] = [];

            for (const clientId of clientIds) {
                const payment = await paymentRepository.findOne({
                    where: {
                        client: { id: clientId },
                        paymentMonth: monthName,
                        paymentYear: yearNum,
                    }
                });

                if (!payment) {
                    results.push({ clientId, status: 'not-found' });
                    continue;
                }

                if (payment.status === 'paid') {
                    results.push({ clientId, status: 'already-paid', paymentId: payment.id });
                    continue;
                }

                payment.status = 'paid';
                payment.paymentMethod = method as any;
                payment.paymentDate = paymentDate ? parseLocalDate(paymentDate)! : new Date();
                await paymentRepository.save(payment);
                results.push({ clientId, status: 'updated', paymentId: payment.id });
            }

            const summary = {
                updated: results.filter(r => r.status === 'updated').length,
                notFound: results.filter(r => r.status === 'not-found').map(r => r.clientId),
                alreadyPaid: results.filter(r => r.status === 'already-paid').map(r => r.clientId),
                month: monthName,
                year: yearNum,
                method
            };

            return res.json({ summary, results });
        } catch (error) {
            console.error("Error en bulkMarkPaid:", error);
            return res.status(500).json({ message: "Error marcando pagos en lote" });
        }
    }
    /**
     * Recalcula los cobros del mes indicado para todos los clientes.
     * Equivalente a generateMonthlyBilling pero forzando actualización de montos
     * solo para pagos en estado pending/overdue.
     * POST /api/monthly-billing/recalculate
     */
    static async recalculateMonthlyBilling(req: Request, res: Response) {
        try {
            const { month, year } = req.body;
            if (!month || !year) {
                return res.status(400).json({ message: "Mes y año son requeridos" });
            }

            // Reutilizamos la lógica de generateMonthlyBilling que hace upsert.
            // La única diferencia es que preservamos pagos 'paid' sin tocar montos/estado.
            await MonthlyBillingController.generateMonthlyBilling(req, res);
        } catch (error) {
            console.error("Error recalculando cobros mensuales:", error);
            res.status(500).json({ message: "Error recalculando cobros mensuales" });
        }
    }
    /**
     * Obtener todos los cobros de un mes específico
     * GET /api/monthly-billing?month=octubre&year=2025
     */
    static async getMonthlyBilling(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para ver facturación
            if (!hasPermission(req.user || null, PERMISSIONS.BILLING.VIEW)) {
                return res.status(403).json({ message: 'No tienes permiso para ver facturación' });
            }
            const { month, year, status, viewMode } = req.query;

            if (!month || !year) {
                return res.status(400).json({ message: "Mes y año son requeridos" });
            }

            const paymentRepository = AppDataSource.getRepository(Payment);

            const query = paymentRepository.createQueryBuilder('payment')
                .innerJoinAndSelect('payment.client', 'client')
                .leftJoinAndSelect('payment.installation', 'installation')
                .leftJoinAndSelect('installation.servicePlan', 'servicePlan')
                .leftJoinAndSelect('client.installations', 'clientInstallations')
                .leftJoinAndSelect('clientInstallations.servicePlan', 'clientInstallationServicePlan')
                .leftJoinAndSelect('client.additionalServices', 'additionalServices')
                .leftJoinAndSelect('client.productsSold', 'productsSold')
                .where('payment.paymentType = :type', { type: 'monthly' })
                .andWhere('client.deletedAt IS NULL');

            if (viewMode === 'cumulative') {
                // Modo acumulado: Pagos del mes seleccionado + Pagos pendientes/vencidos anteriores
                const monthIndex = getMonthIndex(month as string);
                const yearNum = parseInt(year as string);
                // Fecha de vencimiento del mes seleccionado (día 5 del mes siguiente)
                const currentMonthDueDate = new Date(yearNum, monthIndex + 1, 5);

                query.andWhere(
                    new Brackets(qb => {
                        qb.where('(payment.paymentMonth = :month AND payment.paymentYear = :year)', { month, year: yearNum })
                            .orWhere('(payment.status IN (:...statuses) AND payment.dueDate < :dueDate)', {
                                statuses: ['pending', 'overdue'],
                                dueDate: currentMonthDueDate
                            });
                    })
                );
            } else {
                // Modo normal: Solo pagos del mes seleccionado
                query.andWhere('payment.paymentMonth = :month', { month })
                    .andWhere('payment.paymentYear = :year', { year: parseInt(year as string) });
            }

            if (status) {
                if (status === 'pending') {
                    // Si el filtro es "pendientes", incluir "vencidos" también, ya que técnicamente están pendientes de pago
                    query.andWhere('payment.status IN (:...statuses)', { statuses: ['pending', 'overdue'] });
                } else if (status === 'overdue') {
                    // Si el filtro es "vencidos", incluir:
                    // 1. Los que explícitamente tienen status = 'overdue'
                    // 2. Los que están 'pending' pero su fecha de vencimiento ya pasó (dinámico)
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    query.andWhere(new Brackets(qb => {
                        qb.where('payment.status = :overdueStatus', { overdueStatus: 'overdue' })
                            .orWhere('(payment.status = :pendingStatus AND payment.dueDate < :today)', {
                                pendingStatus: 'pending',
                                today
                            });
                    }));
                } else {
                    query.andWhere('payment.status = :status', { status });
                }
            }

            query.orderBy('payment.dueDate', 'ASC');

            const payments = await query.getMany();

            // --- LOGICA DE RECORDATORIOS (ENVIADO SI/NO) ---
            const monthIdx = getMonthIndex(month as string);
            const yr = parseInt(year as string);
            const startMonth = new Date(yr, monthIdx, 1);
            const endMonth = new Date(yr, monthIdx + 1, 0); // Warning: this is 00:00:00
            endMonth.setHours(23, 59, 59, 999); // Fix for full day coverage

            const clientIds = payments.map(p => p.client?.id).filter(id => id); // IDs unicos
            let sentClientIds = new Set<number>();

            if (clientIds.length > 0) {
                const interactionRepository = AppDataSource.getRepository(Interaction);
                const sentInteractions = await interactionRepository.find({
                    where: {
                        clientId: In(clientIds),
                        subject: 'Recordatorio WhatsApp Automático',
                        created_at: Between(startMonth, endMonth)
                    },
                    select: ['clientId']
                });
                sentInteractions.forEach(i => sentClientIds.add(i.clientId));
            }

            const paymentsWithReminder = payments.map(p => ({
                ...p,
                reminderSent: p.client ? sentClientIds.has(p.client.id) : false
            }));
            // -----------------------------------------------

            // Ordenar por instalación más reciente del cliente (desc)
            paymentsWithReminder.sort((a, b) => {
                const clientA = a.client;
                const clientB = b.client;

                if (!clientA && !clientB) return 0;
                if (!clientA) return 1;
                if (!clientB) return -1;

                const latestA = getLatestInstallationDate((clientA.installations || []).filter((i: any) => !i.isDeleted));
                const latestB = getLatestInstallationDate((clientB.installations || []).filter((i: any) => !i.isDeleted));
                return latestB.getTime() - latestA.getTime();
            });

            // Calcular estadísticas de pagos mensuales
            const stats = {
                total: paymentsWithReminder.length,
                pending: paymentsWithReminder.filter(p => p.status === 'pending').length,
                paid: paymentsWithReminder.filter(p => p.status === 'paid').length,
                overdue: paymentsWithReminder.filter(p => p.status === 'overdue').length,
                totalAmount: paymentsWithReminder.reduce((sum, p) => sum + Number(p.amount), 0),
                paidAmount: paymentsWithReminder.filter(p => p.status === 'paid')
                    .reduce((sum, p) => sum + Number(p.amount), 0),
                pendingAmount: paymentsWithReminder.filter(p => p.status === 'pending' || p.status === 'overdue')
                    .reduce((sum, p) => sum + Number(p.amount), 0),
                // Desglose por tipo de concepto
                totalServicePlan: paymentsWithReminder.reduce((sum, p) => sum + Number(p.servicePlanAmount || 0), 0),
                totalAdditionalServices: paymentsWithReminder.reduce((sum, p) => sum + Number(p.additionalServicesAmount || 0), 0),
                totalProducts: paymentsWithReminder.reduce((sum, p) => sum + Number(p.productInstallmentsAmount || 0), 0),
                totalInstallationFees: 0 // Placeholder
            };

            // Obtener recaudos por instalaciones en este mes (basado en fecha de instalación)
            const installationRepository = AppDataSource.getRepository(Installation);
            const monthIndex = getMonthIndex(month as string);
            const yearNum = parseInt(year as string);
            const startDate = new Date(yearNum, monthIndex, 1);
            const endDate = new Date(yearNum, monthIndex + 1, 0);

            const installationsInMonth = await installationRepository.find({
                where: {
                    installationDate: Between(startDate, endDate),
                    isDeleted: false
                }
            });

            stats.totalInstallationFees = installationsInMonth.reduce((sum, inst) => sum + Number(inst.installationFee || 0), 0);

            res.json({ payments: paymentsWithReminder, stats });

        } catch (error) {
            console.error("Error obteniendo cobros mensuales:", error);
            res.status(500).json({ message: "Error obteniendo cobros mensuales" });
        }
    }

    /**
     * Obtener detalle de un pago específico
     * GET /api/monthly-billing/:id
     */
    static async getPaymentDetail(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const paymentRepository = AppDataSource.getRepository(Payment);

            const payment = await paymentRepository.findOne({
                where: { id: parseInt(id), paymentType: 'monthly' },
                relations: [
                    'client',
                    'client.installations',
                    'client.installations.servicePlan',
                    'client.additionalServices',
                    'client.productsSold',
                    'client.productsSold.installmentPayments'
                ]
            });

            if (!payment) {
                return res.status(404).json({ message: "Pago no encontrado" });
            }

            res.json(payment);

        } catch (error) {
            console.error("Error obteniendo detalle de pago:", error);
            res.status(500).json({ message: "Error obteniendo detalle de pago" });
        }
    }
    /**
     * Elimina un pago existente
     * DELETE /api/monthly-billing/:id
     */
    static async deletePayment(req: AuthRequest, res: Response) {
        try {
            // Verificar permisos
            if (!hasPermission(req.user || null, PERMISSIONS.BILLING.DELETE)) {
                return res.status(403).json({ message: 'No tienes permiso para eliminar pagos' });
            }

            const { id } = req.params;
            const paymentRepository = AppDataSource.getRepository(Payment);

            const payment = await paymentRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!payment) {
                return res.status(404).json({ message: "Pago no encontrado" });
            }

            await paymentRepository.remove(payment);

            return res.json({ message: "Pago eliminado correctamente" });
        } catch (error) {
            console.error("Error al eliminar pago:", error);
            return res.status(500).json({ message: "Error interno al eliminar el pago" });
        }
    }
    /**
     * Registrar un pago
     * PUT /api/monthly-billing/:id/pay
     */
    static async registerPayment(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para crear pagos
            if (!hasPermission(req.user || null, PERMISSIONS.BILLING.CREATE)) {
                return res.status(403).json({ message: 'No tienes permiso para registrar pagos' });
            }
            const { id } = req.params;
            const { paymentDate, paymentMethod, amount, notes, extraInstallmentIds } = req.body;

            const paymentRepository = AppDataSource.getRepository(Payment);
            const installmentRepository = AppDataSource.getRepository(ProductInstallment);

            const payment = await paymentRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!payment) {
                return res.status(404).json({ message: "Pago no encontrado" });
            }

            payment.status = 'paid';
            payment.paymentDate = paymentDate ? parseLocalDate(paymentDate)! : new Date();
            payment.paymentMethod = paymentMethod;

            // Procesar cuotas adicionales
            let extraAmount = 0;
            if (extraInstallmentIds && Array.isArray(extraInstallmentIds) && extraInstallmentIds.length > 0) {
                const installments = await installmentRepository.findBy({
                    id: In(extraInstallmentIds)
                });

                for (const inst of installments) {
                    if (inst.status !== 'paid') {
                        inst.status = 'paid';
                        inst.paymentDate = payment.paymentDate;
                        inst.notes = (inst.notes ? inst.notes + ' | ' : '') + `Pagado con mensualidad ${payment.paymentMonth} ${payment.paymentYear}`;
                        await installmentRepository.save(inst);
                        extraAmount += Number(inst.amount);
                    }
                }

                // Actualizar el desglose en el pago
                payment.productInstallmentsAmount = Number(payment.productInstallmentsAmount) + extraAmount;

                // Agregar nota sobre los adicionales
                const extraNote = ` | Incluye ${installments.length} cuota(s) adicional(es) por $${extraAmount.toLocaleString('es-CO')}`;
                payment.notes = (payment.notes || '') + extraNote;
            }

            if (amount) {
                payment.amount = amount;
            } else if (extraAmount > 0) {
                // Si no se envió monto explícito pero hubo extras, sumarlos al total original
                payment.amount = Number(payment.amount) + extraAmount;
            }

            if (notes) {
                // Si ya agregamos nota de extras, concatenar la nota del usuario
                if (payment.notes && payment.notes.includes('Incluye')) {
                    payment.notes = payment.notes + (notes ? ` | ${notes}` : '');
                } else {
                    payment.notes = notes;
                }
            }

            await paymentRepository.save(payment);

            res.json({
                message: "Pago registrado exitosamente",
                payment
            });

        } catch (error) {
            console.error("Error registrando pago:", error);
            res.status(500).json({ message: "Error registrando pago" });
        }
    }

    /**
     * Actualizar estado de un pago
     * PUT /api/monthly-billing/:id/status
     */
    static async updatePaymentStatus(req: AuthRequest, res: Response) {
        try {
            // Verificar permiso para editar pagos
            if (!hasPermission(req.user || null, PERMISSIONS.BILLING.EDIT)) {
                return res.status(403).json({ message: 'No tienes permiso para actualizar estado de pagos' });
            }
            const { id } = req.params;
            const { status, notes } = req.body;

            const paymentRepository = AppDataSource.getRepository(Payment);

            const payment = await paymentRepository.findOne({
                where: { id: parseInt(id) }
            });

            if (!payment) {
                return res.status(404).json({ message: "Pago no encontrado" });
            }

            payment.status = status;

            if (notes) {
                payment.notes = notes;
            }

            await paymentRepository.save(payment);

            res.json({
                message: "Estado de pago actualizado",
                payment
            });

        } catch (error) {
            console.error("Error actualizando estado de pago:", error);
            res.status(500).json({ message: "Error actualizando estado de pago" });
        }
    }

    /**
     * Marcar pagos vencidos como "overdue"
     * POST /api/monthly-billing/mark-overdue
     */
    static async markOverduePayments(req: Request, res: Response) {
        try {
            const paymentRepository = AppDataSource.getRepository(Payment);
            const today = new Date();

            const overduePayments = await paymentRepository
                .createQueryBuilder('payment')
                .where('payment.status = :status', { status: 'pending' })
                .andWhere('payment.dueDate < :today', { today })
                .getMany();

            for (const payment of overduePayments) {
                payment.status = 'overdue';
                await paymentRepository.save(payment);
            }

            res.json({
                message: `Se marcaron ${overduePayments.length} pagos como vencidos`,
                count: overduePayments.length
            });

        } catch (error) {
            console.error("Error marcando pagos vencidos:", error);
            res.status(500).json({ message: "Error marcando pagos vencidos" });
        }
    }

    /**
     * Obtener cobros pendientes de un cliente
     * GET /api/monthly-billing/client/:clientId/pending
     */
    static async getClientPendingPayments(req: Request, res: Response) {
        try {
            let { clientId } = req.params;
            clientId = clientId.trim();

            const clientRepository = AppDataSource.getRepository(Client);
            let client = null;

            // Intentar buscar por ID si es numérico
            const idAsNumber = parseInt(clientId);
            if (!isNaN(idAsNumber)) {
                client = await clientRepository.findOneBy({ id: idAsNumber });
            }

            // Si no se encuentra por ID, buscar por cédula
            if (!client) {
                client = await clientRepository.findOneBy({ identificationNumber: clientId });
            }

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            const paymentRepository = AppDataSource.getRepository(Payment);

            const payments = await paymentRepository.find({
                where: {
                    client: { id: client.id },
                    status: 'pending',
                    paymentType: 'monthly'
                },
                relations: ['installation', 'installation.servicePlan'],
                order: { dueDate: 'ASC' }
            });

            const totalPending = payments.reduce((sum, p) => sum + Number(p.amount), 0);

            res.json({
                client: {
                    id: client.id,
                    fullName: client.fullName,
                    identificationNumber: client.identificationNumber
                },
                payments,
                totalPending
            });

        } catch (error) {
            console.error("Error obteniendo pagos pendientes:", error);
            res.status(500).json({ message: "Error obteniendo pagos pendientes" });
        }
    }

    /**
     * Obtener información pública de facturación por cédula
     * GET /api/public/billing/:identificationNumber
     */
    static async getPublicClientBilling(req: Request, res: Response) {
        try {
            const { identificationNumber } = req.params;

            if (!identificationNumber) {
                return res.status(400).json({ message: "Número de identificación requerido" });
            }

            const clientRepository = AppDataSource.getRepository(Client);
            const client = await clientRepository.findOne({
                where: { identificationNumber: identificationNumber }
            });

            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            const paymentRepository = AppDataSource.getRepository(Payment);

            // Buscar pagos pendientes o vencidos
            const pendingPayments = await paymentRepository.find({
                where: [
                    { client: { id: client.id }, status: 'pending' },
                    { client: { id: client.id }, status: 'overdue' }
                ],
                order: { dueDate: 'ASC' }
            });

            const totalPending = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

            // Mapear a un formato seguro para el público
            const publicPayments = pendingPayments.map(p => ({
                month: p.paymentMonth,
                year: p.paymentYear,
                amount: p.amount,
                dueDate: p.dueDate,
                status: p.status,
                type: p.paymentType,
                details: {
                    servicePlan: p.servicePlanAmount,
                    additionalServices: p.additionalServicesAmount,
                    products: p.productInstallmentsAmount,
                    installationFee: p.installationFeeAmount,
                    discount: p.outageDiscountAmount,
                    isProrated: p.isProrated,
                    billedDays: p.billedDays,
                    notes: p.notes
                }
            }));

            res.json({
                clientName: client.fullName,
                identificationNumber: client.identificationNumber,
                totalPending,
                payments: publicPayments
            });

        } catch (error) {
            console.error("Error obteniendo facturación pública:", error);
            res.status(500).json({ message: "Error consultando facturación" });
        }
    }
    /**
     * Deshace la facturación mensual para un periodo específico.
     * Elimina los pagos generados (siempre que no estén marcados como pagados)
     * y restaura el estado de las caídas de servicio aplicadas.
     * DELETE /api/monthly-billing/rollback
     */
    static async rollbackMonthlyBilling(req: AuthRequest, res: Response) {
        console.log(`[Rollback] Iniciando. Body: ${JSON.stringify(req.body)}`);
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Solo admin puede deshacer facturación
            if (!hasPermission(req.user || null, PERMISSIONS.BILLING.DELETE)) {
                console.log(`[Rollback] Permiso denegado para usuario: ${req.user?.id}`);
                return res.status(403).json({ message: 'No tienes permiso para eliminar facturación' });
            }

            const { month, year } = req.body;
            if (!month || !year) {
                console.log(`[Rollback] Faltan parámetros. Month: ${month}, Year: ${year}`);
                return res.status(400).json({ message: "Mes y año son requeridos" });
            }

            console.log(`[Rollback] Buscando pagos para ${month} ${year}`);
            const paymentRepository = queryRunner.manager.getRepository(Payment);
            const outageRepository = queryRunner.manager.getRepository(ServiceOutage);

            // 1. Buscar todos los pagos del mes que NO estén pagados
            const paymentsToDelete = await paymentRepository.find({
                where: {
                    paymentMonth: month,
                    paymentYear: parseInt(year),
                    paymentType: 'monthly',
                    status: In(['pending', 'overdue'])
                }
            });
            console.log(`[Rollback] Pagos encontrados para borrar: ${paymentsToDelete.length}`);

            // 2. Contar si hay pagos ya pagados para informar
            const paidCount = await paymentRepository.count({
                where: {
                    paymentMonth: month,
                    paymentYear: parseInt(year),
                    paymentType: 'monthly',
                    status: 'paid'
                }
            });

            if (paymentsToDelete.length === 0 && paidCount === 0) {
                return res.status(404).json({ message: "No se encontraron cobros para el periodo especificado" });
            }

            let restoredOutages = 0;
            let deletedPayments = 0;

            for (const payment of paymentsToDelete) {
                // Restaurar caídas de servicio vinculadas
                const linkedOutages = await outageRepository.find({
                    where: { appliedToPaymentId: payment.id }
                });

                for (const outage of linkedOutages) {
                    outage.status = 'pending';
                    outage.appliedToPaymentId = null as any;
                    await outageRepository.save(outage);
                    restoredOutages++;
                }

                // Eliminar el pago
                await paymentRepository.remove(payment);
                deletedPayments++;
            }

            await queryRunner.commitTransaction();

            res.json({
                message: "Facturación deshecha con éxito",
                summary: {
                    deletedPayments,
                    restoredOutages,
                    skippedPaidPayments: paidCount,
                    month,
                    year
                }
            });

        } catch (error) {
            await queryRunner.rollbackTransaction();
            console.error("Error al deshacer facturación:", error);
            res.status(500).json({ message: "Error interno al deshacer facturación" });
        } finally {
            await queryRunner.release();
        }
    }
}

// Helper function para convertir nombre de mes a índice
function getMonthIndex(monthName: string): number {
    const months: { [key: string]: number } = {
        'enero': 0,
        'febrero': 1,
        'marzo': 2,
        'abril': 3,
        'mayo': 4,
        'junio': 5,
        'julio': 6,
        'agosto': 7,
        'septiembre': 8,
        'octubre': 9,
        'noviembre': 10,
        'diciembre': 11
    };

    return months[monthName.toLowerCase()] ?? 0;
}

const MONTHS_MAP: { [key: string]: number } = {
    'enero': 0,
    'febrero': 1,
    'marzo': 2,
    'abril': 3,
    'mayo': 4,
    'junio': 5,
    'julio': 6,
    'agosto': 7,
    'septiembre': 8,
    'octubre': 9,
    'noviembre': 10,
    'diciembre': 11
};

// Helper obtener la fecha más reciente de instalación
function getLatestInstallationDate(installations: Installation[] = []): Date {
    if (!installations || installations.length === 0) return new Date(0);
    return installations.reduce((max, ins) => {
        const d = new Date(ins.installationDate);
        return d > max ? d : max;
    }, new Date(0));
}

// Normaliza 'YYYY-MM-DD' a fecha local sin desfase
function parseLocalDate(value: string | Date | undefined): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    const str = value as string;
    if (/T/.test(str)) return new Date(str);
    const [y, m, d] = str.split('-').map(Number);
    if (!y || !m || !d) return new Date(str);
    return new Date(y, m - 1, d);
}
