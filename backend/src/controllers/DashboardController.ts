import { Response } from "express";
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { Payment } from "../entities/Payment";
import { Installation } from "../entities/Installation";
import { ServicePlan } from "../entities/ServicePlan";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Between, LessThan, MoreThanOrEqual } from "typeorm";

const clientRepository = AppDataSource.getRepository(Client);
const paymentRepository = AppDataSource.getRepository(Payment);
const installationRepository = AppDataSource.getRepository(Installation);
const planRepository = AppDataSource.getRepository(ServicePlan);

export const DashboardController = {
    getStats: async (req: AuthRequest, res: Response) => {
        try {
            const { month, year } = req.query;
            const now = new Date();
            
            // Default to current month/year if not provided
            const currentYear = year ? parseInt(year as string) : now.getFullYear();
            const currentMonth = month ? parseInt(month as string) : now.getMonth(); // 0-11

            // Helper for date ranges
            const startOfMonth = new Date(currentYear, currentMonth, 1);
            const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

            const startOfYear = new Date(currentYear, 0, 1);
            const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

            // --- 0. HELPER FUNCTION ---
            // Function to get count of new clients based on first installation date
            const countNewClientsByInstallDate = async (start: Date, end: Date) => {
                const result = await installationRepository.query(`
                    SELECT COUNT(DISTINCT i1.clientId) as count
                    FROM installations i1
                    WHERE i1.installationDate BETWEEN ? AND ?
                    AND i1.installationDate = (
                        SELECT MIN(i2.installationDate)
                        FROM installations i2
                        WHERE i2.clientId = i1.clientId
                    )
                `, [start, end]);
                return parseInt(result[0].count || '0');
            };

            // --- 1. GROWTH MODULE ---

            // Active Clients (Current Snapshot)
            const totalActiveClients = await clientRepository.count({
                where: { status: 'active' }
            });

            // New Clients (This Month)
            const newClientsMonth = await countNewClientsByInstallDate(startOfMonth, endOfMonth);

            // New Clients (YTD)
            const newClientsYTD = await countNewClientsByInstallDate(startOfYear, endOfYear);

            // Retirements (This Month)
            const retiredClientsMonth = await clientRepository.count({
                where: {
                    retirementDate: Between(startOfMonth, endOfMonth)
                }
            });

             // Retirements (YTD)
             const retiredClientsYTD = await clientRepository.count({
                where: {
                    retirementDate: Between(startOfYear, endOfYear)
                }
            });

            // Net Growth
            const netGrowth = newClientsMonth - retiredClientsMonth;

            // Clients Start of Month (Approximate for Churn/Growth Rate)
            const clientsStartOfMonth = totalActiveClients - newClientsMonth + retiredClientsMonth;
            
            // Growth Rate
            const growthRate = clientsStartOfMonth > 0 
                ? ((totalActiveClients - clientsStartOfMonth) / clientsStartOfMonth) * 100 
                : 0;

            // Sign-ups by Plan (This Month)
            const signupsByPlanRaw = await installationRepository.createQueryBuilder("installation")
                .leftJoin("installation.servicePlan", "plan")
                .where("installation.installationDate BETWEEN :start AND :end", { start: startOfMonth, end: endOfMonth })
                .select("plan.name", "name")
                .addSelect("COUNT(installation.id)", "count")
                .groupBy("plan.name")
                .getRawMany();

            const signupsByPlan = signupsByPlanRaw.map(r => ({ name: r.name || 'Sin Plan', value: parseInt(r.count) }));

            // --- 2. RETENTION & CHURN MODULE ---

            // Churn Rate (Monthly)
            const churnRate = clientsStartOfMonth > 0 
                ? (retiredClientsMonth / clientsStartOfMonth) * 100 
                : 0;

            // Retirement Reasons
            const retirementReasonsRaw = await clientRepository.createQueryBuilder("client")
                .select("client.retirementReason", "reason")
                .addSelect("COUNT(client.id)", "count")
                .where("client.retirementDate BETWEEN :start AND :end", { start: startOfMonth, end: endOfMonth })
                .groupBy("client.retirementReason")
                .getRawMany();

            const retirementReasons = retirementReasonsRaw.map(r => ({ name: r.reason || 'No especificado', value: parseInt(r.count) }));

            // Retirements by Plan
             const retirementsByPlanRaw = await clientRepository.createQueryBuilder("client")
                .leftJoin("client.installations", "installation")
                .leftJoin("installation.servicePlan", "plan")
                .select("plan.name", "name")
                .addSelect("COUNT(DISTINCT client.id)", "count")
                .where("client.retirementDate BETWEEN :start AND :end", { start: startOfMonth, end: endOfMonth })
                .groupBy("plan.name")
                .getRawMany();
            
            const retirementsByPlan = retirementsByPlanRaw.map(r => ({ name: r.name || 'Sin Plan', value: parseInt(r.count) }));

            // --- 3. FINANCIAL MODULE ---

            // Monthly Billing (Facturación del mes - generated invoices/payments)
            // Assuming we check payments due in this month
            // or created in this month. For 'Facturación', it's usually payments where month/year matches
            const monthlyBillingRaw = await paymentRepository.createQueryBuilder("payment")
                .select("SUM(payment.amount)", "total")
                .where("payment.paymentMonth = :month", { month: (currentMonth + 1).toString() }) 
                .andWhere("payment.paymentYear = :year", { year: currentYear })
                .getRawOne();
            
            const monthlyBilling = parseFloat(monthlyBillingRaw?.total || '0');

            // Accumulated Billing (YTD)
            const yearlyBillingRaw = await paymentRepository.createQueryBuilder("payment")
                .select("SUM(payment.amount)", "total")
                .where("payment.paymentYear = :year", { year: currentYear })
                .getRawOne();
            const yearlyBilling = parseFloat(yearlyBillingRaw?.total || '0');

            // Real Collection (Recaudo Real del Mes - Money received)
            const realCollectionRaw = await paymentRepository.createQueryBuilder("payment")
                .select("SUM(payment.amount)", "total")
                .where("payment.paymentDate BETWEEN :start AND :end", { start: startOfMonth, end: endOfMonth })
                .andWhere("payment.status = 'paid'")
                .getRawOne();
            const realCollection = parseFloat(realCollectionRaw?.total || '0');

            // ARPU
            const arpu = totalActiveClients > 0 ? monthlyBilling / totalActiveClients : 0;

            // Projected Revenue (Next Month)
            // Sum of active plans
            const projectedRevenueRaw = await installationRepository.createQueryBuilder("installation")
                .leftJoin("installation.servicePlan", "plan")
                .leftJoin("installation.client", "client")
                .select("SUM(plan.monthlyFee)", "total")
                .where("client.status = :status", { status: 'active' })
                .andWhere("installation.serviceStatus = :svcStatus", { svcStatus: 'active' })
                .getRawOne();
            const projectedRevenue = parseFloat(projectedRevenueRaw?.total || '0');


            // --- 4. COLLECTION & PORTFOLIO ---

            // Collection Efficiency
            const collectionEfficiency = monthlyBilling > 0 
                ? (realCollection / monthlyBilling) * 100 
                : 0;

            // Portfolio (Cartera Vencida - Total Overdue)
            // Status 'overdue' or 'pending' with dueDate < now
            const totalOverdueRaw = await paymentRepository.createQueryBuilder("payment")
                .select("SUM(payment.amount)", "total")
                .where("payment.status IN (:...statuses)", { statuses: ['overdue', 'pending'] })
                .andWhere("payment.dueDate < :now", { now: new Date() })
                .getRawOne();
            const totalOverdue = parseFloat(totalOverdueRaw?.total || '0');

            // Portfolio by Age
            // 0-30, 31-60, 61-90, 90+
            // We can do this with conditional sums in SQL
            // Using DATEDIFF in MySQL/MariaDB: DATEDIFF(expr1, expr2) returns expr1 - expr2
            // We want (NOW - dueDate) > X
            
            const portfolioAgeQuery = paymentRepository.createQueryBuilder("payment")
            .select("SUM(CASE WHEN DATEDIFF(NOW(), payment.dueDate) BETWEEN 0 AND 30 THEN payment.amount ELSE 0 END)", "range0_30")
            .addSelect("SUM(CASE WHEN DATEDIFF(NOW(), payment.dueDate) BETWEEN 31 AND 60 THEN payment.amount ELSE 0 END)", "range31_60")
            .addSelect("SUM(CASE WHEN DATEDIFF(NOW(), payment.dueDate) BETWEEN 61 AND 90 THEN payment.amount ELSE 0 END)", "range61_90")
            .addSelect("SUM(CASE WHEN DATEDIFF(NOW(), payment.dueDate) > 90 THEN payment.amount ELSE 0 END)", "range90_plus")
            .where("payment.status IN (:...statuses)", { statuses: ['overdue', 'pending'] })
            .andWhere("payment.dueDate < :now", { now: new Date() });

            const portfolioAgeRaw = await portfolioAgeQuery.getRawOne();
            
            const portfolioByAge = {
                range0_30: parseFloat(portfolioAgeRaw?.range0_30 || '0'),
                range31_60: parseFloat(portfolioAgeRaw?.range31_60 || '0'),
                range61_90: parseFloat(portfolioAgeRaw?.range61_90 || '0'),
                range90_plus: parseFloat(portfolioAgeRaw?.range90_plus || '0')
            };

            // Clients in Default (Clientes en Mora)
            const clientsInDefaultRaw = await paymentRepository.createQueryBuilder("payment")
                .select("COUNT(DISTINCT payment.clientId)", "count")
                .where("payment.status = 'overdue'") // Or check dueDate < now + pending
                .getRawOne();
            const clientsInDefault = parseInt(clientsInDefaultRaw?.count || '0');

             // --- 5. OPERATIONS (Basic) ---
            const installationsMonth = await installationRepository.count({
                where: {
                    installationDate: Between(startOfMonth, endOfMonth)
                }
            });

             // --- 6. HISTORICAL DATA FOR CHARTS ---
             // Last 6 months growth
            const growthHistory = [];
            for (let i = 5; i >= 0; i--) {
                // Calculate month offset manually to avoid date-fns dependency if not present, but simple JS Date math works
                const d = new Date(currentYear, currentMonth - i, 1); 
                const s = new Date(d.getFullYear(), d.getMonth(), 1);
                const e = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

                // Use helper function for consistent calculation
                const newC = await countNewClientsByInstallDate(s, e);
                const retC = await clientRepository.count({ where: { retirementDate: Between(s, e) } });

                const monthName = s.toLocaleString('default', { month: 'short' });
                
                growthHistory.push({
                    month: monthName,
                    newClients: newC,
                    retiredClients: retC,
                    netGrowth: newC - retC
                });
            }
            // --- 7. REVENUE HISTORY ---
            const revenueHistory = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(currentYear, currentMonth - i, 1); 
                // Using paymentMonth based query to be consistent with 'Billing'
                const pMonth = (d.getMonth() + 1).toString();
                const pYear = d.getFullYear();

                const billingRaw = await paymentRepository.createQueryBuilder("payment")
                .select("SUM(payment.amount)", "total")
                .where("payment.paymentMonth = :month", { month: pMonth }) 
                .andWhere("payment.paymentYear = :year", { year: pYear })
                .getRawOne();

                const collectedRaw = await paymentRepository.createQueryBuilder("payment")
                .select("SUM(payment.amount)", "total")
                .where("payment.paymentDate BETWEEN :start AND :end", { 
                    start: new Date(d.getFullYear(), d.getMonth(), 1), 
                    end: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59) 
                })
                .andWhere("payment.status = 'paid'")
                .getRawOne();

                const monthName = d.toLocaleString('default', { month: 'short' });
             
                revenueHistory.push({
                    month: monthName,
                    billed: parseFloat(billingRaw?.total || '0'),
                    collected: parseFloat(collectedRaw?.total || '0')
                });
            }


            res.json({
                growth: {
                    newClientsMonth,
                    newClientsYTD,
                    totalActiveClients,
                    netGrowth,
                    growthRate: parseFloat(growthRate.toFixed(2)),
                    signupsByPlan
                },
                retention: {
                    retiredClientsMonth,
                    churnRate: parseFloat(churnRate.toFixed(2)),
                    churnYTD: retiredClientsYTD, 
                    retirementReasons,
                    retirementsByPlan,
                    // avgTenure: TODO 
                },
                finance: {
                    monthlyBilling,
                    yearlyBilling,
                    arpu: parseFloat(arpu.toFixed(2)),
                    projectedRevenue,
                    // revenueByPlan: [] 
                },
                collection: {
                    realCollection,
                    collectionEfficiency: parseFloat(collectionEfficiency.toFixed(2)),
                    totalOverdue,
                    portfolioByAge,
                    clientsInDefault
                },
                operations: {
                    installationsMonth
                },
                history: {
                    growth: growthHistory,
                    revenue: revenueHistory
                }
            });

        } catch (error) {
            console.error("Error fetching dashboard stats:", error);
            res.status(500).json({ message: "Error fetching dashboard stats" });
        }
    }
};
