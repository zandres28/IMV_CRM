import { Response } from "express";
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { Payment } from "../entities/Payment";
import { AdditionalService } from "../entities/AdditionalService";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Between, MoreThanOrEqual, Like, Brackets } from "typeorm";

const clientRepository = AppDataSource.getRepository(Client);
const paymentRepository = AppDataSource.getRepository(Payment);
const additionalServiceRepository = AppDataSource.getRepository(AdditionalService);

export const DashboardController = {
    getStats: async (req: AuthRequest, res: Response) => {
        try {
            const { month, year } = req.query;
            const now = new Date();
            
            const currentYear = year ? parseInt(year as string) : now.getFullYear();
            const currentMonth = month ? parseInt(month as string) : now.getMonth(); // 0-11

            // Helper to get start/end of periods
            const getPeriodDates = () => {
                // Month
                const startOfMonth = new Date(currentYear, currentMonth, 1);
                const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

                // Year
                const startOfYear = new Date(currentYear, 0, 1);
                const endOfYear = new Date(currentYear, 11, 31, 23, 59, 59);

                // Week - Calculate based on the first day of the requested month/year
                // or current date if no params provided? 
                // Let's use the current date if no params, otherwise use the 1st of the month.
                const refDate = (month || year) ? new Date(currentYear, currentMonth, 1) : new Date();
                
                const day = refDate.getDay(); // 0 (Sun) - 6 (Sat)
                const diff = refDate.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
                const startOfWeek = new Date(refDate);
                startOfWeek.setDate(diff);
                startOfWeek.setHours(0, 0, 0, 0);
                
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);

                return { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek };
            };

            const { startOfMonth, endOfMonth, startOfYear, endOfYear, startOfWeek, endOfWeek } = getPeriodDates();

            // Helper to count unique clients with installations in a date range
            const countClientsByInstallationDate = async (start: Date, end: Date, status?: string) => {
                const query = clientRepository.createQueryBuilder('client')
                    .innerJoin('client.installations', 'installation')
                    .where('installation.installationDate BETWEEN :start AND :end', { start, end })
                    .andWhere('installation.isDeleted = :isDeleted', { isDeleted: false });
                
                if (status) {
                    query.andWhere('client.status = :status', { status });
                }

                const result = await query.select("COUNT(DISTINCT client.id)", "count").getRawOne();
                return parseInt(result.count || '0');
            };

            // --- Clients Stats (Based on Installation Date) ---
            const newClientsWeek = await countClientsByInstallationDate(startOfWeek, endOfWeek);
            const newClientsMonth = await countClientsByInstallationDate(startOfMonth, endOfMonth);
            const newClientsYear = await countClientsByInstallationDate(startOfYear, endOfYear);
            
            // Total clients for the selected month (same as newClientsMonth in this context)
            const totalClients = newClientsMonth; 

            // Status breakdown for clients installed in the selected month
            const activeClients = await countClientsByInstallationDate(startOfMonth, endOfMonth, 'active');
            const suspendedClients = await countClientsByInstallationDate(startOfMonth, endOfMonth, 'suspended');
            const cancelledClients = await countClientsByInstallationDate(startOfMonth, endOfMonth, 'cancelled');

            // --- Additional Services Stats (Filtered by Client Installation Date) ---
            const countServices = async (patterns: string[]) => {
                const query = additionalServiceRepository.createQueryBuilder('service')
                    .innerJoin('service.client', 'client')
                    .innerJoin('client.installations', 'installation')
                    .where('service.status = :status', { status: 'active' })
                    .andWhere('installation.installationDate BETWEEN :start AND :end', { start: startOfMonth, end: endOfMonth })
                    .andWhere('installation.isDeleted = :isDeleted', { isDeleted: false });

                query.andWhere(new Brackets(qb => {
                    patterns.forEach((pattern, idx) => {
                        const paramName = `pat${idx}`;
                        if (idx === 0) qb.where(`service.serviceName LIKE :${paramName}`, { [paramName]: pattern });
                        else qb.orWhere(`service.serviceName LIKE :${paramName}`, { [paramName]: pattern });
                    });
                }));

                const result = await query.select("COUNT(DISTINCT service.id)", "count").getRawOne();
                return parseInt(result.count || '0');
            };

            const netflixCount = await countServices(['%netflix%']);
            const tvBoxCount = await countServices(['%tv%box%', '%tvbox%']);
            const teleLatinoCount = await countServices(['%tele%latino%']);

            // --- Revenue Stats ---
            const getRevenue = async (fromDate: Date, toDate: Date) => {
                const result = await paymentRepository
                    .createQueryBuilder("payment")
                    .select("SUM(payment.amount)", "total")
                    .where("payment.status = :status", { status: "paid" })
                    .andWhere("payment.paymentDate BETWEEN :fromDate AND :toDate", { fromDate, toDate })
                    .getRawOne();
                return result.total ? parseFloat(result.total) : 0;
            };

            const getRevenueBreakdown = async (fromDate: Date, toDate: Date) => {
                const result = await paymentRepository
                    .createQueryBuilder("payment")
                    .select("SUM(payment.servicePlanAmount)", "servicePlanAmount")
                    .addSelect("SUM(payment.installationFeeAmount)", "installationFeeAmount")
                    .addSelect("SUM(payment.additionalServicesAmount)", "additionalServicesAmount")
                    .addSelect("SUM(payment.productInstallmentsAmount)", "productInstallmentsAmount")
                    .where("payment.status = :status", { status: "paid" })
                    .andWhere("payment.paymentDate BETWEEN :fromDate AND :toDate", { fromDate, toDate })
                    .getRawOne();
                
                return {
                    servicePlan: result.servicePlanAmount ? parseFloat(result.servicePlanAmount) : 0,
                    installations: result.installationFeeAmount ? parseFloat(result.installationFeeAmount) : 0,
                    additionalServices: result.additionalServicesAmount ? parseFloat(result.additionalServicesAmount) : 0,
                    products: result.productInstallmentsAmount ? parseFloat(result.productInstallmentsAmount) : 0
                };
            };

            const countRetirements = async (startDate: Date, endDate: Date) => {
                const result = await clientRepository
                    .createQueryBuilder('client')
                    .where('client.status = :status', { status: 'cancelled' })
                    .andWhere('client.retirementDate BETWEEN :start AND :end', { start: startDate, end: endDate })
                    .getCount();
                return result;
            };

            const revenueWeek = await getRevenue(startOfWeek, endOfWeek);
            const revenueMonth = await getRevenue(startOfMonth, endOfMonth);
            const revenueYear = await getRevenue(startOfYear, endOfYear);
            const breakdown = await getRevenueBreakdown(startOfMonth, endOfMonth);
            const retirosMonth = await countRetirements(startOfMonth, endOfMonth);
            const retirosYear = await countRetirements(startOfYear, endOfYear);
            const totalRetirements = await clientRepository.count({ where: { status: 'cancelled' } });

            return res.json({
                clients: {
                    week: newClientsWeek,
                    month: newClientsMonth,
                    year: newClientsYear,
                    total: totalClients,
                    active: activeClients,
                    suspended: suspendedClients,
                    cancelled: cancelledClients
                },
                services: {
                    netflix: netflixCount,
                    tvBox: tvBoxCount,
                    teleLatino: teleLatinoCount
                },
                revenue: {
                    week: revenueWeek,
                    month: revenueMonth,
                    year: revenueYear,
                    breakdown: breakdown
                },
                retiros: {
                    month: retirosMonth,
                    year: retirosYear,
                    total: totalRetirements
                }
            });

        } catch (error) {
            console.error("Error getting dashboard stats:", error);
            return res.status(500).json({ message: "Error al obtener estadísticas del tablero", error });
        }
    }
};
