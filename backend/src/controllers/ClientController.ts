import { Response, Request } from "express";
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { createNoteInteraction } from "../utils/interactionUtils";
import { ServicePlan } from "../entities/ServicePlan";
import { PublicConsentLog } from "../entities/PublicConsentLog";
import { User } from "../entities/User";
import { NotificationService } from "../services/NotificationService";
import { OltService } from "../services/OltService";

const clientRepository = AppDataSource.getRepository(Client);
const servicePlanRepository = AppDataSource.getRepository(ServicePlan);
const consentLogRepository = AppDataSource.getRepository(PublicConsentLog);

export const ClientController = {
    // Registro público de clientes
    registerPublic: async (req: Request, res: Response) => {
        try {
            const { 
                fullName, 
                identificationNumber, 
                installationAddress, 
                city, 
                primaryPhone, 
                secondaryPhone,
                planId,
                dataPolicyAccepted,
                policyUrl
            } = req.body;

            // Validaciones básicas
            if (!fullName || !identificationNumber || !primaryPhone || !planId) {
                return res.status(400).json({ message: "Faltan datos requeridos" });
            }

            if (dataPolicyAccepted !== true) {
                return res.status(400).json({ message: "Debes autorizar el tratamiento de datos personales" });
            }

            // Verificar si el cliente ya existe
            const existingClient = await clientRepository.findOne({ 
                where: { identificationNumber },
                withDeleted: true
            });

            if (existingClient) {
                return res.status(400).json({ message: "Ya existe un cliente con este número de documento" });
            }

            // Obtener el plan seleccionado
            const plan = await servicePlanRepository.findOne({ where: { id: planId } });
            if (!plan) {
                return res.status(400).json({ message: "El plan seleccionado no es válido" });
            }

            // Crear el cliente
            const newClient = clientRepository.create({
                fullName: fullName.toUpperCase().trim(),
                identificationNumber: identificationNumber.trim(),
                installationAddress: installationAddress,
                city: city || 'Unknown', // Ajustar según requerimientos
                primaryPhone: primaryPhone,
                secondaryPhone: secondaryPhone || null,
                email: 'pending@email.com', // Email temporal o pedirlo en el form
                status: 'pendiente_instalacion', // Estado específico para identificarlo
                requestedPlanId: plan.id,
                requestedPlanName: plan.name,
                requestedPlanSpeedMbps: plan.speedMbps,
                requestedPlanMonthlyFee: Number(plan.monthlyFee),
                requestedInstallationFee: Number(plan.installationFee)
            });

            await clientRepository.save(newClient);

            const consentLog = consentLogRepository.create({
                identificationNumber: identificationNumber.trim(),
                fullName: fullName.toUpperCase().trim(),
                source: 'solicitud',
                accepted: true,
                policyUrl: policyUrl ? String(policyUrl).trim() : '/Politica_Tratamiento_Datos_IMV.pdf',
                clientId: newClient.id,
                ipAddress: req.ip || null,
                userAgent: req.headers['user-agent'] || null
            });

            await consentLogRepository.save(consentLog);

            // Crear nota/interacción con el plan solicitado
            const noteContent = `Solicitud de Servicio desde Web.\nPlan solicitado: ${plan.name} (${plan.speedMbps} Mbps) - ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(plan.monthlyFee)}\nCliente registrado automáticamente.`;
            
            // Usamos un ID de sistema o null para el usuario creador (createNoteInteraction maneja userId opcional?)
            // createNoteInteraction espera un userId. Si es publico, quizás null o 1 (admin).
            // Revisaré createNoteInteraction. Asumiré que puedo pasar null o un usuario sistema.
            // Por ahora paso null y que la función lo maneje o falle si es strict number.
            
            // Re-importante check interactionUtils
            
            await createNoteInteraction(
                newClient.id,
                noteContent,
                'Solicitud Web',
                undefined // System user
            );

            // Notificar a los administradores sobre la nueva solicitud
            try {
                const userRepo = AppDataSource.getRepository(User);
                const potentialRecipients = await userRepo.find({ relations: ['roles'] });
                const admins = potentialRecipients.filter(user =>
                    (user.roles || []).some(role => role.name?.toLowerCase().includes('admin'))
                );

                const notificationMessage = `Nueva solicitud web: ${newClient.fullName} - ${plan.name}`;
                const link = `/clients/${newClient.id}?tab=crm`;

                for (const admin of admins) {
                    await NotificationService.create(admin, notificationMessage, link);
                }
            } catch (notifyError) {
                console.error('Error enviando notificación de solicitud web:', notifyError);
            }

            return res.status(201).json({ message: "Solicitud recibida correctamente", clientId: newClient.id });

        } catch (error) {
            console.error("Error en registro público:", error);
            return res.status(500).json({ message: "Error al procesar la solicitud" });
        }
    },

    // Obtener todos los clientes, ordenados por fecha de instalación más reciente (desc)
    getAll: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver clientes
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver la lista de clientes' 
                });
            }

            const { includeDeleted } = req.query;
            const user = req.user; // Get user from AuthRequest

            let query = clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.installations', 'installation', 'installation.isDeleted = :isDeleted', { isDeleted: false });

            // FILTRO POR SUCURSAL: Admin global (sin sucursal) ve todo;
            // cualquier otro usuario solo ve los clientes de su sucursal.
            const isGlobalAdmin = user && user.roles && user.roles.some((r: any) => r.name === 'admin') && !user.sucursal;
            if (user && user.sucursal && !isGlobalAdmin) {
                query = query.andWhere('client.sucursal = :sucursal', { sucursal: user.sucursal });
            }

            // ROL DE TÉCNICO: Filtrar clientes asignados
            // Asumimos que la asignación es por nombre en installation.technician
            if (user && user.roles && user.roles.some((r: any) => r.name === 'Technician')) {
                const technicianName = `${user.firstName} ${user.lastName}`;
                // Usamos un subquery o join para asegurar que SOLO traiga clientes con instalaciones de este técnico
                query = query.andWhere(qb => {
                    const subQuery = qb.subQuery()
                        .select("1")
                        .from("installations", "i")
                        .where("i.clientId = client.id")
                        .andWhere("i.technician LIKE :techName")
                        .getQuery();
                    return "EXISTS " + subQuery;
                }).setParameter("techName", `%${technicianName}%`);
            }

            if (includeDeleted === 'true') {
                query = query.withDeleted();
            } else {
                query = query.andWhere('client.deletedAt IS NULL');
            }

            const clients = await query.getMany();

            // Agregar campo latestInstallationDate calculado para cada cliente y ordenar
            const clientsWithLatestDate = clients.map(client => {
                const latestInstallation = client.installations && client.installations.length > 0
                    ? client.installations.reduce((latest, inst) => {
                        const instDate = new Date(inst.installationDate);
                        const latestDate = new Date(latest.installationDate);
                        return instDate > latestDate ? inst : latest;
                    })
                    : null;

                return {
                    ...client,
                    latestInstallationDate: latestInstallation?.installationDate || null
                };
            });

            // Ordenar por latestInstallationDate DESC, luego por fullName ASC
            clientsWithLatestDate.sort((a, b) => {
                // Primero por fecha de instalación más reciente (DESC)
                const dateA = a.latestInstallationDate ? new Date(a.latestInstallationDate).getTime() : 0;
                const dateB = b.latestInstallationDate ? new Date(b.latestInstallationDate).getTime() : 0;
                if (dateB !== dateA) {
                    return dateB - dateA;
                }
                // Luego por nombre (ASC)
                return (a.fullName || '').localeCompare(b.fullName || '');
            });

            return res.json(clientsWithLatestDate);
        } catch (error) {
            console.error('Error al obtener los clientes:', error);
            return res.status(500).json({ message: "Error al obtener los clientes", error });
        }
    },

    // Normalizar nombres de todos los clientes: UPPER(TRIM(fullName))
    normalizeAllNames: async (req: AuthRequest, res: Response) => {
        try {
            // Solo admin puede normalizar nombres
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para normalizar nombres' 
                });
            }
            const clients = await clientRepository.find();
            for (const c of clients) {
                if (c.fullName) c.fullName = c.fullName.toUpperCase().trim();
            }
            await clientRepository.save(clients);
            return res.json({ message: "Nombres normalizados a mayúsculas", affected: clients.length });
        } catch (error) {
            return res.status(500).json({ message: "Error al normalizar nombres", error });
        }
    },

    // Obtener un cliente por ID o Número de Identificación
    getById: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver clientes
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver clientes' 
                });
            }
            let { id } = req.params;
            id = id.trim();
            const user = req.user;
            
            // Estrategia de búsqueda dual:
            // 1. Intentar buscar por ID (Primary Key) si es un número válido
            // 2. Si no se encuentra o no es número, buscar por identificationNumber
            
            let client = null;
            const idAsNumber = parseInt(id);

            // Nota: Para verificar asignación de técnico necesitamos las instalaciones
            const isTechnician = user && user.roles && user.roles.some((r: any) => r.name === 'Technician');
            const relations = isTechnician ? ['installations'] : [];

            if (!isNaN(idAsNumber)) {
                client = await clientRepository.findOne({ 
                    where: { id: idAsNumber },
                    relations: relations
                });
            }

            if (!client) {
                client = await clientRepository.findOne({ 
                    where: { identificationNumber: id },
                    relations: relations
                });
            }
            
            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            // ROL DE TÉCNICO: Verificar asignación
            if (isTechnician) {
                const technicianName = `${user.firstName} ${user.lastName}`;
                // Verificar si alguna instalación pertenece al técnico
                // Nota: Las instalaciones se cargaron arriba en 'relations'
                const hasAssignedInstallation = client.installations && client.installations.some(inst => 
                    inst.technician && inst.technician.toLowerCase().includes(technicianName.toLowerCase())
                );

                if (!hasAssignedInstallation) {
                     return res.status(403).json({ 
                        message: 'No tienes permiso para ver este cliente (no asignado)' 
                    });
                }
                
                // Limpiar instalaciones para no enviarlas si no es necesario (el frontend las carga aparte)
                // O dejarlas, no hace daño.
                 // delete client.installations; // Comentado para evitar error TS2790
            }

            return res.json(client);
        } catch (error) {
            console.error("Error al obtener cliente:", error);
            return res.status(500).json({ message: "Error al obtener el cliente", error });
        }
    },

    // Crear un nuevo cliente
    create: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para crear clientes
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.CREATE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para crear clientes' 
                });
            }

            const { identificationNumber } = req.body;

            // Verificar si ya existe un cliente con este documento (incluso eliminado)
            const existingClient = await clientRepository.findOne({
                where: { identificationNumber },
                withDeleted: true
            });

            if (existingClient) {
                if (existingClient.deletedAt) {
                    return res.status(409).json({
                        message: `Ya existe un cliente eliminado con este documento (${identificationNumber}).`,
                        hint: 'El cliente existe pero está en la papelera. Contacte al administrador si desea restaurarlo.',
                        existingClient: {
                            id: existingClient.id,
                            fullName: existingClient.fullName,
                            deletedAt: existingClient.deletedAt
                        }
                    });
                } else {
                    return res.status(409).json({
                        message: `Ya existe un cliente activo con este documento (${identificationNumber}).`,
                        existingClient: {
                            id: existingClient.id,
                            fullName: existingClient.fullName
                        }
                    });
                }
            }

            // Heredar sucursal del usuario que crea el cliente
            const clientData = { ...req.body };
            if (req.user?.sucursal && !clientData.sucursal) {
                clientData.sucursal = req.user.sucursal;
            }
            const newClient = clientRepository.create(clientData);
            const result = await clientRepository.save(newClient);
            return res.status(201).json(result);
        } catch (error: any) {
            console.error("Error al crear cliente:", error);
            // Capturar error de duplicado (MySQL Error 1062)
            if (error.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ 
                    message: "Ya existe un cliente con este número de identificación (posiblemente eliminado).",
                    error: error.sqlMessage 
                });
            }
            return res.status(500).json({ message: "Error al crear el cliente", error });
        }
    },

    // Actualizar un cliente
    update: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para editar clientes
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para editar clientes' 
                });
            }
            const { id } = req.params;
            const client = await clientRepository.findOneBy({ id: parseInt(id) });
            
            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            // Sanitizar body para evitar actualizar cosas que no se deben o manejar conversiones
            const { suspension_extension_date, ...rest } = req.body;
            
            clientRepository.merge(client, rest);

            if (suspension_extension_date !== undefined) {
                // Si viene null o string vacio, limpiar. Si viene fecha, asignar.
                client.suspension_extension_date = suspension_extension_date ? new Date(suspension_extension_date) : null;
            }

            const result = await clientRepository.save(client);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar el cliente", error });
        }
    },

    // Eliminar un cliente con validaciones ESTRICTAS: bloqueo si tiene instalaciones
    delete: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para eliminar clientes
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.DELETE)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para eliminar clientes' 
                });
            }
            const { id } = req.params;
            const clientId = parseInt(id);

            const client = await clientRepository.findOne({
                where: { id: clientId },
                relations: ['installations', 'payments']
            });

            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            // Solo bloquear si hay instalaciones activas (isDeleted = false)
            const activeInstallations = (client.installations || []).filter(i => !i.isDeleted);
            if (activeInstallations.length > 0) {
                return res.status(400).json({
                    message: 'No se puede eliminar el cliente: tiene instalaciones asociadas',
                    hint: 'Debes eliminar todas las instalaciones activas del cliente antes de poder eliminarlo',
                    installations: activeInstallations.map(i => ({
                        id: i.id,
                        serviceStatus: i.serviceStatus,
                        installationDate: i.installationDate,
                        serviceType: i.serviceType
                    }))
                });
            }

            // Validar que esté al día en pagos (sin pendientes ni vencidos)
            const paymentRepository = AppDataSource.getRepository(require('../entities/Payment').Payment);
            const pendingOrOverdue = await paymentRepository.find({
                where: {
                    client: { id: clientId },
                    status: require('typeorm').In(['pending', 'overdue'])
                }
            });

            if (pendingOrOverdue.length > 0) {
                return res.status(400).json({
                    message: 'No se puede eliminar: tiene pagos pendientes o vencidos',
                    hint: 'El cliente debe estar al día en todos los pagos antes de eliminarlo',
                    pendingPayments: pendingOrOverdue.map(p => ({
                        id: p.id,
                        amount: p.amount,
                        status: p.status,
                        paymentMonth: p.paymentMonth,
                        paymentYear: p.paymentYear
                    }))
                });
            }

            // Si pasa todas las validaciones, eliminar el cliente (soft delete)
            const result = await clientRepository.softDelete(clientId);
            if (result.affected === 0) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            return res.json({ message: 'Cliente eliminado con éxito' });

        } catch (error: any) {
            console.error('Error al eliminar cliente:', error);
            
            // Capturar error de FK y transformarlo en mensaje claro
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({
                    message: 'No se puede eliminar: el cliente tiene datos asociados',
                    hint: 'Elimina primero todas las instalaciones, pagos y registros relacionados',
                    detail: error.sqlMessage
                });
            }

            return res.status(500).json({ 
                message: 'Error al eliminar el cliente', 
                error: error.message || error 
            });
        }
    },

    // Obtener pagos de un cliente
    getPayments: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para ver clientes (o facturación)
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.VIEW)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para ver pagos del cliente' 
                });
            }
            const { id } = req.params;
            const paymentRepository = AppDataSource.getRepository(require('../entities/Payment').Payment);
            
            const payments = await paymentRepository.find({
                where: { client: { id: parseInt(id) } },
                order: { dueDate: 'DESC' }
            });

            return res.json(payments);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los pagos del cliente", error });
        }
    },

    // Retirar un cliente (marcar como cancelado y registrar fecha/motivo)
    retireClient: async (req: AuthRequest, res: Response) => {
        try {
            // Verificar permiso para editar clientes
            if (!hasPermission(req.user || null, PERMISSIONS.CLIENTS.LIST.EDIT)) {
                return res.status(403).json({ 
                    message: 'No tienes permiso para retirar clientes' 
                });
            }

            const { id } = req.params;
            const { retirementDate, reason } = req.body;
            const oltDisconnectTime: string | undefined = req.body.oltDisconnectTime || undefined;

            if (!retirementDate || !reason) {
                return res.status(400).json({
                    message: 'Faltan datos requeridos: retirementDate y reason son obligatorios'
                });
            }

            const client = await clientRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ['installations']
            });

            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            // Actualizar datos de retiro del cliente
            client.status = 'cancelled';
            client.retirementDate = new Date(retirementDate);
            client.retirementReason = reason;

            // Marcar todas sus instalaciones como inactivas y gestionar desconexión de OLT
            if (client.installations && client.installations.length > 0) {
                const installationRepository = AppDataSource.getRepository(require('../entities/Installation').Installation);
                const oltService = new OltService();

                const retirementDateObj = new Date(retirementDate);
                retirementDateObj.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const disconnectImmediately = retirementDateObj <= today;

                for (const installation of client.installations) {
                    if (installation.isActive && !installation.isDeleted) {
                        installation.isActive = false;
                        installation.serviceStatus = 'cancelled';
                        installation.retirementDate = new Date(retirementDate);

                        if (installation.ponId && installation.onuId) {
                            if (disconnectImmediately) {
                                // Desconectar ONU de la OLT de forma inmediata
                                try {
                                    await oltService.deactivateOnu(installation.ponId, installation.onuId);
                                    console.log(`[RetireClient] ONU desconectada de OLT: SN=${installation.onuSerialNumber}, PON=${installation.ponId}, ID=${installation.onuId}`);
                                } catch (oltError: any) {
                                    console.error(`[RetireClient] Error al desconectar ONU ${installation.onuSerialNumber} de OLT:`, oltError.message);
                                    // Continuar con el retiro aunque falle la OLT
                                }
                                // Liberar datos de OLT para reasignación
                                (installation as any).onuSerialNumber = null;
                                installation.ponId = undefined;
                                installation.onuId = undefined;
                                installation.oltDisconnectScheduled = false;
                                installation.oltDisconnectTime = undefined;
                            } else {
                                // Programar desconexión para la fecha (y hora) de retiro
                                installation.oltDisconnectScheduled = true;
                                installation.oltDisconnectTime = oltDisconnectTime;
                                console.log(`[RetireClient] Desconexión de ONU programada para ${retirementDate}${oltDisconnectTime ? ' a las ' + oltDisconnectTime : ''}: SN=${installation.onuSerialNumber}`);
                            }
                        } else {
                            // Sin datos de OLT, solo limpiar
                            (installation as any).onuSerialNumber = null;
                            installation.ponId = undefined;
                            installation.onuId = undefined;
                        }

                        await installationRepository.save(installation);
                    }
                }
            }

            await clientRepository.save(client);

            // Crear nota de interacción con el retiro
            await createNoteInteraction(
                client.id,
                `Cliente dado de baja.\nFecha de retiro: ${retirementDate}\nMotivo: ${reason}`,
                'Retiro de Cliente',
                req.user?.id
            );

            return res.json({
                success: true,
                message: 'Cliente retirado exitosamente',
                client
            });
        } catch (error) {
            console.error('Error al retirar cliente:', error);
            return res.status(500).json({ 
                message: 'Error al retirar el cliente', 
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
};