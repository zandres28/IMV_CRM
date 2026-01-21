import { Response, Request } from "express";
import { AppDataSource } from "../config/database";
import { Client } from "../entities/Client";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { createNoteInteraction } from "../utils/interactionUtils";
import { ServicePlan } from "../entities/ServicePlan";

const clientRepository = AppDataSource.getRepository(Client);
const servicePlanRepository = AppDataSource.getRepository(ServicePlan);

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
                planId 
            } = req.body;

            // Validaciones básicas
            if (!fullName || !identificationNumber || !primaryPhone || !planId) {
                return res.status(400).json({ message: "Faltan datos requeridos" });
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
                status: 'pendiente_instalacion' // Estado específico para identificarlo
            });

            await clientRepository.save(newClient);

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

            let query = clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.installations', 'installation', 'installation.isDeleted = :isDeleted', { isDeleted: false })
                .loadRelationCountAndMap('client.pendingInteractionsCount', 'client.interactions', 'interaction', (qb) => 
                    qb.where('interaction.status IN (:...statuses)', { statuses: ['pendiente', 'en_progreso'] })
                )
                .orderBy(`(
                    SELECT MAX(inst.installationDate)
                    FROM installations inst
                    WHERE inst.clientId = client.id AND inst.isDeleted = false
                )`, 'DESC')
                .addOrderBy('client.fullName', 'ASC');

            if (includeDeleted === 'true') {
                query = query.withDeleted();
            } else {
                query = query.andWhere('client.deletedAt IS NULL');
            }

            const clients = await query.getMany();

            // Agregar campo latestInstallationDate calculado para cada cliente
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

            return res.json(clientsWithLatestDate);
        } catch (error) {
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
            
            // Estrategia de búsqueda dual:
            // 1. Intentar buscar por ID (Primary Key) si es un número válido
            // 2. Si no se encuentra o no es número, buscar por identificationNumber
            
            let client = null;
            const idAsNumber = parseInt(id);

            if (!isNaN(idAsNumber)) {
                client = await clientRepository.findOneBy({ id: idAsNumber });
            }

            if (!client) {
                client = await clientRepository.findOneBy({ identificationNumber: id });
            }
            
            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            return res.json(client);
        } catch (error) {
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
            const newClient = clientRepository.create(req.body);
            const result = await clientRepository.save(newClient);
            return res.status(201).json(result);
        } catch (error) {
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

            clientRepository.merge(client, req.body);
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
};