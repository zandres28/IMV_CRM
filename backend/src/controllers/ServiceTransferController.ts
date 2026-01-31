import { Response } from "express";
import { AppDataSource } from "../config/database";
import { ServiceTransfer } from "../entities/ServiceTransfer";
import { Client } from "../entities/Client";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createNoteInteraction } from "../utils/interactionUtils";

const transferRepository = AppDataSource.getRepository(ServiceTransfer);
const clientRepository = AppDataSource.getRepository(Client);

export const ServiceTransferController = {
    getAll: async (req: AuthRequest, res: Response) => {
        try {
            const transfers = await transferRepository.find({
                order: { requestDate: 'DESC' },
                relations: ['client', 'technician']
            });
            return res.json(transfers);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los traslados", error });
        }
    },

    getByClient: async (req: AuthRequest, res: Response) => {
        try {
            const { clientId } = req.params;
            const transfers = await transferRepository.find({
                where: { clientId: parseInt(clientId) },
                order: { requestDate: 'DESC' },
                relations: ['technician']
            });
            return res.json(transfers);
        } catch (error) {
            return res.status(500).json({ message: "Error al obtener los traslados del cliente", error });
        }
    },

    create: async (req: AuthRequest, res: Response) => {
        try {
            const { 
                clientId, 
                newAddress, 
                requestDate, 
                notes, 
                cost,
                scheduledDate,
                technicianId,
                status
            } = req.body;
            
            const client = await clientRepository.findOneBy({ id: clientId });
            if (!client) {
                return res.status(404).json({ message: "Cliente no encontrado" });
            }

            const transfer = transferRepository.create({
                clientId,
                previousAddress: client.installationAddress, // Dirección actual
                newAddress,
                requestDate: requestDate ? new Date(requestDate) : new Date(),
                scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
                status: status || 'pending',
                cost: cost || 0,
                notes,
                technicianId: technicianId ? parseInt(technicianId) : null
            } as any);

            const result = await transferRepository.save(transfer);

            // Crear interacción automática si hay nota
            if (notes) {
                await createNoteInteraction(
                    clientId, 
                    notes, 
                    'Traslado de Servicio (Creación)', 
                    req.user ? req.user.id : undefined
                );
            }

            return res.status(201).json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al crear la solicitud de traslado", error });
        }
    },

    update: async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const { status, scheduledDate, completionDate, technicianId, notes, cost, newAddress } = req.body;

            const transfer = await transferRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ['client']
            });

            if (!transfer) {
                return res.status(404).json({ message: "Traslado no encontrado" });
            }

            // Si se marca como completado y antes no lo estaba
            if (status === 'completed' && transfer.status !== 'completed') {
                // Actualizar la dirección del cliente
                if (transfer.client) {
                    transfer.client.installationAddress = transfer.newAddress;
                    // También actualizar la ciudad si cambió? Por ahora asumimos que es dentro de la misma ciudad o que el usuario actualiza la ciudad manualmente si es necesario.
                    // O podríamos pedir la ciudad en el traslado.
                    // Por simplicidad, solo actualizamos la dirección de instalación.
                    await clientRepository.save(transfer.client);
                }
                transfer.completionDate = completionDate || new Date();
            }

            transferRepository.merge(transfer, req.body);

            // Crear interacción automática si cambia la nota
            if (notes !== undefined && notes !== transfer.notes && notes.trim() !== '') {
                if (transfer.client) {
                    await createNoteInteraction(
                        transfer.client.id, 
                        notes, 
                        'Traslado de Servicio (Actualización)', 
                        req.user ? req.user.id : undefined
                    );
                }
            }

            const result = await transferRepository.save(transfer);
            return res.json(result);
        } catch (error) {
            return res.status(500).json({ message: "Error al actualizar el traslado", error });
        }
    },

    delete: async (req: AuthRequest, res: Response) => {
        try {
            const { id } = req.params;
            const result = await transferRepository.delete(id);
            if (result.affected === 0) {
                return res.status(404).json({ message: "Traslado no encontrado" });
            }
            return res.json({ message: "Traslado eliminado" });
        } catch (error) {
            return res.status(500).json({ message: "Error al eliminar el traslado", error });
        }
    }
};
