import { Response } from 'express';
import { AppDataSource } from '../config/database';
import { Client } from '../entities/Client';
import { Payment } from '../entities/Payment';
import { AdditionalService } from '../entities/AdditionalService';
import { AuthRequest } from '../middlewares/auth.middleware';
import { hasPermission, PERMISSIONS, getDataScopeForUser } from '../utils/permissions';
import { Brackets } from 'typeorm';

export const ReportController = {
    search: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver consultas
            const canViewAll = hasPermission(req.user, PERMISSIONS.QUERIES.VIEW);
            const canViewOwn = hasPermission(req.user, PERMISSIONS.QUERIES.OWN);

            if (!canViewAll && !canViewOwn) {
                return res.status(403).json({
                    message: 'No tienes permiso para realizar consultas'
                });
            }

            // Determinar el alcance de datos para el usuario
            const dataScope = getDataScopeForUser(req.user!);

            // Si solo puede ver sus propios datos, retornar mensaje informativo
            // Los usuarios normales no tienen clientes asignados
            if (dataScope === 'own') {
                return res.json({
                    clients: [],
                    total: 0,
                    page: 1,
                    pageSize: 25,
                    totalPages: 0,
                    message: 'Los usuarios regulares no tienen acceso a listados de clientes'
                });
            }
            const {
                clientStatus = 'active',
                paymentStatus = 'all',
                reminderType = 'all',
                search = '',
                page = '1',
                pageSize = '25',
                planId,
                installationMonth,
                installationYear,
                reportType = 'account_status' // nuevo parámetro
            } = req.query;

            const pageNum = parseInt(page as string, 10);
            const pageSizeNum = parseInt(pageSize as string, 10);
            const skip = (pageNum - 1) * pageSizeNum;

            const clientRepository = AppDataSource.getRepository(Client);
            const paymentRepository = AppDataSource.getRepository(Payment);
            const additionalServiceRepository = AppDataSource.getRepository(AdditionalService);

            // ==========================================
            // REPORTE DE RETIRADOS
            // ==========================================
            if (reportType === 'retired') {
                let queryBuilder = clientRepository
                    .createQueryBuilder('client')
                    .leftJoinAndSelect('client.installations', 'installation')
                    .where('client.retirementDate IS NOT NULL')
                    .andWhere('client.status != :status', { status: 'active' });

                if (search) {
                    queryBuilder.andWhere(
                        '(client.fullName LIKE :search OR client.identificationNumber LIKE :search)',
                        { search: `%${search}%` }
                    );
                }

                // Filtro por fecha de retiro (opcional, usando installationMonth/Year como proxy de fecha de retiro si se desea, 
                // pero por ahora lo dejamos simple o reutilizamos los params)
                if (installationMonth && installationYear) {
                    const monthIndex = parseInt(installationMonth as string) - 1;
                    const year = parseInt(installationYear as string);
                    const startDate = new Date(year, monthIndex, 1);
                    const endDate = new Date(year, monthIndex + 1, 0);
                    queryBuilder.andWhere('client.retirementDate BETWEEN :startDate AND :endDate', { startDate, endDate });
                }

                const total = await queryBuilder.getCount();
                const clients = await queryBuilder
                    .orderBy('client.retirementDate', 'DESC')
                    .skip(skip)
                    .take(pageSizeNum)
                    .getMany();

                const rows = clients.map(client => ({
                    id: `CL-${String(client.id).padStart(4, '0')}`,
                    clientId: client.id,
                    fullName: client.fullName,
                    primaryPhone: client.primaryPhone,
                    retirementDate: client.retirementDate,
                    retirementReason: client.retirementReason,
                    installationDate: client.installations?.find(i => !i.isDeleted)?.installationDate || null,
                    city: client.city
                }));

                return res.json({
                    data: rows,
                    summary: { totalFiltered: total },
                    pagination: { page: pageNum, pageSize: pageSizeNum, total }
                });
            }

            // ==========================================
            // REPORTE DE SERVICIOS ADICIONALES
            // ==========================================
            if (reportType === 'services') {
                // Buscamos clientes que tengan servicios adicionales activos O productos pendientes/activos

                let queryBuilder = clientRepository
                    .createQueryBuilder('client')
                    .leftJoinAndSelect('client.additionalServices', 'service', 'service.status = :svcStatus', { svcStatus: 'active' })
                    .leftJoinAndSelect('client.productsSold', 'product', 'product.status = :prodStatus', { prodStatus: 'pending' })
                    .where('client.status = :status', { status: 'active' });

                if (search) {
                    queryBuilder.andWhere(
                        '(client.fullName LIKE :search OR client.identificationNumber LIKE :search)',
                        { search: `%${search}%` }
                    );
                }

                const { serviceType = 'all' } = req.query;

                // Filtrar para que tenga AL MENOS uno de los dos (servicio o producto) dependiendo del filtro
                queryBuilder.andWhere(new Brackets(qb => {
                    if (serviceType === 'service') {
                        qb.where('service.id IS NOT NULL');
                    } else if (serviceType === 'product') {
                        qb.where('product.id IS NOT NULL');
                    } else {
                        // 'all' (default): uno u otro
                        qb.where('service.id IS NOT NULL')
                            .orWhere('product.id IS NOT NULL');
                    }
                }));

                const total = await queryBuilder.getCount();
                const clients = await queryBuilder
                    .skip(skip)
                    .take(pageSizeNum)
                    .getMany();

                const rows = clients.map(client => {
                    const services = client.additionalServices?.map(s => `${s.serviceName} ($${s.monthlyFee})`) || [];
                    const products = client.productsSold?.map(p => `${p.productName} (Cuota: $${p.installmentAmount})`) || [];

                    const combinedList = [...services, ...products].join(', ');

                    const servicesTotal = client.additionalServices?.reduce((sum, s) => sum + Number(s.monthlyFee), 0) || 0;
                    const productsTotal = client.productsSold?.reduce((sum, p) => sum + Number(p.installmentAmount), 0) || 0;

                    const totalAdditional = servicesTotal + productsTotal;

                    return {
                        id: `CL-${String(client.id).padStart(4, '0')}`,
                        clientId: client.id,
                        fullName: client.fullName,
                        primaryPhone: client.primaryPhone,
                        plan: 'N/A',
                        servicesList: combinedList,
                        totalAdditional: totalAdditional,
                        city: client.city
                    };
                });

                return res.json({
                    data: rows,
                    summary: {
                        totalFiltered: total,
                        totalRevenue: rows.reduce((sum, r) => sum + r.totalAdditional, 0)
                    },
                    pagination: { page: pageNum, pageSize: pageSizeNum, total }
                });
            }

            // ==========================================
            // REPORTE POR DEFECTO: ESTADO DE CUENTA
            // ==========================================

            // Construir query base
            let queryBuilder = clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect(
                    'client.installations',
                    'installation',
                    'installation.isDeleted = :isDeleted',
                    { isDeleted: false }
                )
                .leftJoinAndSelect('installation.servicePlan', 'servicePlan');

            // Filtrar por fecha de instalación (Mes y Año)
            if (installationMonth && installationYear) {
                const monthIndex = parseInt(installationMonth as string) - 1; // 0-based index
                const year = parseInt(installationYear as string);
                const startDate = new Date(year, monthIndex, 1);
                const endDate = new Date(year, monthIndex + 1, 0); // Last day of month

                queryBuilder.andWhere('installation.installationDate BETWEEN :startDate AND :endDate', {
                    startDate,
                    endDate
                });
            }

            // Filtrar por estado de cliente
            if (clientStatus === 'active') {
                queryBuilder.where('client.status = :status', { status: 'active' });
            } else if (clientStatus === 'inactive') {
                queryBuilder.where('client.status <> :status', { status: 'active' });
            }

            // Búsqueda por texto
            if (search) {
                queryBuilder.andWhere(
                    '(client.fullName LIKE :search OR client.primaryPhone LIKE :search OR client.secondaryPhone LIKE :search OR client.id LIKE :search)',
                    { search: `%${search}%` }
                );
            }

            // Obtener total para paginación
            const total = await queryBuilder.getCount();

            // Obtener clientes con paginación
            const clients = await queryBuilder
                .skip(skip)
                .take(pageSizeNum)
                .getMany();

            const currentDate = new Date();
            const MONTHS = [
                'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
            ];
            const currentMonth = MONTHS[currentDate.getMonth()];
            const currentYear = currentDate.getFullYear();

            const rows = [] as any[];
            let totalExpectedRevenue = 0;
            let totalCollectedRevenue = 0;
            let totalDaysDue = 0;
            let countMorosos = 0;
            let arrearsAmount = 0;
            const reminderCounts: Record<string, number> = {
                PROXIMO: 0,
                VENCIMIENTO: 0,
                RECORDATORIO: 0,
                ULTIMO: 0
            };

            for (const client of clients) {
                // Si estamos filtrando por fecha de instalación, queremos ver todas las que coincidan (activas o no)
                // Si no, mantenemos el comportamiento original de solo ver activas
                const filterActive = !(installationMonth && installationYear);

                const activeInstallations = client.installations?.filter(inst =>
                    !inst.isDeleted && (filterActive ? inst.isActive : true)
                ) || [];

                if (activeInstallations.length === 0) continue;

                // Obtener servicios adicionales activos
                const additionalServices = await additionalServiceRepository.find({
                    where: {
                        client: { id: client.id },
                        status: 'active' as any
                    }
                });

                const additionalAmount = additionalServices.reduce((sum, service) => sum + service.monthlyFee, 0);

                // Obtener pagos del mes actual
                const payments = await paymentRepository.find({
                    where: {
                        client: { id: client.id },
                        paymentMonth: currentMonth,
                        paymentYear: currentYear
                    }
                });

                for (const installation of activeInstallations) {
                    // Filtro por plan si se especifica planId
                    const planIdNum = planId ? parseInt(planId as string, 10) : undefined;
                    if (planIdNum && installation.servicePlan && installation.servicePlan.id !== planIdNum) {
                        continue;
                    }
                    const payment = payments.find(p => p.installation?.id === installation.id);

                    let dias = 0;
                    let tipo = 'RECORDATORIO';

                    if (payment && payment.dueDate) {
                        const dueDate = new Date(payment.dueDate);
                        const diffTime = currentDate.getTime() - dueDate.getTime();
                        dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (dias < 0) {
                            tipo = 'PROXIMO';
                        } else if (dias >= 0 && dias <= 5) {
                            tipo = 'VENCIMIENTO';
                        } else if (dias > 5 && dias <= 15) {
                            tipo = 'RECORDATORIO';
                        } else {
                            tipo = 'ULTIMO';
                        }
                    }

                    const currentPaymentStatus = payment?.status || 'pending';
                    const totalMensual = installation.monthlyFee + additionalAmount;

                    // Aplicar filtros
                    let includeRow = true;

                    if (paymentStatus !== 'all' && paymentStatus !== currentPaymentStatus) {
                        includeRow = false;
                    }

                    if (reminderType !== 'all' && reminderType !== tipo) {
                        includeRow = false;
                    }

                    if (includeRow) {
                        rows.push({
                            id: `CL-${String(client.id).padStart(4, '0')}`,
                            clientId: client.id,
                            fullName: client.fullName,
                            primaryPhone: client.primaryPhone,
                            secondaryPhone: client.secondaryPhone || '',
                            plan: installation.servicePlan?.name || installation.serviceType,
                            speedMbps: installation.speedMbps,
                            monthlyFee: installation.monthlyFee,
                            additional: additionalAmount,
                            totalMensual,
                            paymentStatus: currentPaymentStatus,
                            daysDue: dias,
                            reminderType: tipo,
                            installationId: installation.id,
                            installationDate: installation.installationDate
                        });

                        totalExpectedRevenue += totalMensual;
                        if (currentPaymentStatus === 'completed') {
                            totalCollectedRevenue += totalMensual;
                        }
                        if (dias > 0) {
                            countMorosos++;
                            totalDaysDue += dias;
                            if (currentPaymentStatus !== 'completed') {
                                arrearsAmount += totalMensual;
                            }
                        }

                        if (reminderCounts[tipo] !== undefined) {
                            reminderCounts[tipo] += 1;
                        }
                    }
                }
            }

            const summary = {
                totalClients: total,
                totalFiltered: rows.length,
                morosos: countMorosos,
                expectedRevenue: totalExpectedRevenue,
                collectedRevenue: totalCollectedRevenue,
                averageDaysDue: countMorosos > 0 ? Math.round(totalDaysDue / countMorosos) : 0,
                arrearsAmount,
                reminderCounts,
                arpuExpected: rows.length > 0 ? Math.round(totalExpectedRevenue / rows.length) : 0,
                collectionRate: totalExpectedRevenue > 0 ? Math.round((totalCollectedRevenue / totalExpectedRevenue) * 100) : 0
            };

            return res.json({
                data: rows,
                summary,
                pagination: {
                    page: pageNum,
                    pageSize: pageSizeNum,
                    total
                }
            });
        } catch (error) {
            console.error('Error en búsqueda de reportes:', error);
            return res.status(500).json({
                message: 'Error al buscar reportes',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
};
