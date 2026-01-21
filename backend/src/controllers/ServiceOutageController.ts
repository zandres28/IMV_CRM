import { Response } from "express";
import { AppDataSource } from "../config/database";
import { ServiceOutage } from "../entities/ServiceOutage";
import { Installation } from "../entities/Installation";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { createNoteInteraction } from "../utils/interactionUtils";

export class ServiceOutageController {
  /**
   * Calcula el número de días entre dos fechas y el monto a descontar
   */
  private static calculateOutageDetails(
    startDate: Date,
    endDate: Date,
    monthlyFee: number
  ): { days: number; discountAmount: number } {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir ambos días

    // Calcular días del mes (usamos el mes de la fecha de inicio)
    const year = start.getFullYear();
    const month = start.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Descuento prorrateado: (mensualidad / días del mes) * días sin servicio
    const discountAmount = (monthlyFee / daysInMonth) * days;

    return { days, discountAmount: Math.round(discountAmount) };
  }

  /**
   * Crear nueva caída de servicio
   */
  static create = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para crear caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.CREATE)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para crear caídas de servicio' 
        });
      }
      const {
        clientId,
        installationId,
        startDate,
        endDate,
        reason,
        notes,
      } = req.body;

      // Validar fechas
      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          error: "La fecha de inicio debe ser menor o igual a la fecha fin",
        });
      }

      // Obtener la instalación para calcular el descuento
      const installationRepo = AppDataSource.getRepository(Installation);
      const installation = await installationRepo.findOne({
        where: { id: installationId },
        relations: ["servicePlan"],
      });

      if (!installation) {
        return res.status(404).json({ error: "Instalación no encontrada" });
      }

      // Calcular días y monto a descontar
      const { days, discountAmount } = this.calculateOutageDetails(
        new Date(startDate),
        new Date(endDate),
        installation.monthlyFee
      );

      // Crear registro de caída
      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outage = outageRepo.create({
        clientId,
        installationId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        days,
        reason,
        discountAmount,
        status: "pending",
        notes,
      });

      await outageRepo.save(outage);

      if (notes) {
          await createNoteInteraction(
              clientId,
              notes,
              'Caída de Servicio (Creación)',
              req.user?.id
          );
      }

      return res.status(201).json(outage);
    } catch (error) {
      console.error("Error creating service outage:", error);
      return res.status(500).json({ error: "Error al crear caída de servicio" });
    }
  };

  /**
   * Listar todas las caídas de servicio con filtros opcionales
   */
  static list = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para ver caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.VIEW)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para ver caídas de servicio' 
        });
      }
      const { clientId, status, startDate, endDate } = req.query;

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const queryBuilder = outageRepo
        .createQueryBuilder("outage")
        .leftJoinAndSelect("outage.client", "client")
        .leftJoinAndSelect("outage.installation", "installation")
        .leftJoinAndSelect("installation.servicePlan", "servicePlan")
        .orderBy("outage.startDate", "DESC");

      // Aplicar filtros
      if (clientId) {
        queryBuilder.andWhere("outage.clientId = :clientId", { clientId });
      }

      if (status) {
        queryBuilder.andWhere("outage.status = :status", { status });
      }

      if (startDate) {
        queryBuilder.andWhere("outage.startDate >= :startDate", { startDate });
      }

      if (endDate) {
        queryBuilder.andWhere("outage.endDate <= :endDate", { endDate });
      }

      const outages = await queryBuilder.getMany();

      return res.json(outages);
    } catch (error) {
      console.error("Error listing service outages:", error);
      return res.status(500).json({ error: "Error al listar caídas de servicio" });
    }
  };

  /**
   * Obtener una caída de servicio por ID
   */
  static getById = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para ver caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.VIEW)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para ver caídas de servicio' 
        });
      }
      const { id } = req.params;

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outage = await outageRepo.findOne({
        where: { id: parseInt(id) },
        relations: ["client", "installation", "installation.servicePlan"],
      });

      if (!outage) {
        return res.status(404).json({ error: "Caída de servicio no encontrada" });
      }

      return res.json(outage);
    } catch (error) {
      console.error("Error getting service outage:", error);
      return res.status(500).json({ error: "Error al obtener caída de servicio" });
    }
  };

  /**
   * Actualizar una caída de servicio
   */
  static update = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para editar caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.EDIT)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para editar caídas de servicio' 
        });
      }
      const { id } = req.params;
      const { startDate, endDate, reason, notes, status } = req.body;

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outage = await outageRepo.findOne({
        where: { id: parseInt(id) },
        relations: ["installation", "client"],
      });

      if (!outage) {
        return res.status(404).json({ error: "Caída de servicio no encontrada" });
      }

      // Si se actualizan las fechas, recalcular días y monto
      if (startDate || endDate) {
        const newStartDate = startDate ? new Date(startDate) : outage.startDate;
        const newEndDate = endDate ? new Date(endDate) : outage.endDate;

        if (newStartDate > newEndDate) {
          return res.status(400).json({
            error: "La fecha de inicio debe ser menor o igual a la fecha fin",
          });
        }

        const { days, discountAmount } = this.calculateOutageDetails(
          newStartDate,
          newEndDate,
          outage.installation.monthlyFee
        );

        outage.startDate = newStartDate;
        outage.endDate = newEndDate;
        outage.days = days;
        outage.discountAmount = discountAmount;
      }

      // Actualizar otros campos
      if (reason !== undefined) outage.reason = reason;

      if (notes !== undefined && notes !== outage.notes && notes.trim() !== '') {
          if (outage.client) {
              await createNoteInteraction(
                  outage.client.id,
                  notes,
                  'Caída de Servicio (Actualización)',
                  req.user?.id
              );
          }
      }

      if (notes !== undefined) outage.notes = notes;
      if (status !== undefined) outage.status = status;

      await outageRepo.save(outage);

      return res.json(outage);
    } catch (error) {
      console.error("Error updating service outage:", error);
      return res.status(500).json({ error: "Error al actualizar caída de servicio" });
    }
  };

  /**
   * Eliminar una caída de servicio
   */
  static delete = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para eliminar caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.DELETE)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para eliminar caídas de servicio' 
        });
      }
      const { id } = req.params;

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outage = await outageRepo.findOne({
        where: { id: parseInt(id) },
      });

      if (!outage) {
        return res.status(404).json({ error: "Caída de servicio no encontrada" });
      }

      if (outage.status === "applied") {
        return res.status(400).json({
          error: "No se puede eliminar una caída ya aplicada a un pago",
        });
      }

      await outageRepo.remove(outage);

      return res.json({ message: "Caída de servicio eliminada exitosamente" });
    } catch (error) {
      console.error("Error deleting service outage:", error);
      return res.status(500).json({ error: "Error al eliminar caída de servicio" });
    }
  };

  /**
   * Marcar una caída como aplicada
   */
  static markAsApplied = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para editar caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.EDIT)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para marcar caídas como aplicadas' 
        });
      }
      const { id } = req.params;
      const { appliedToPaymentId } = req.body;

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outage = await outageRepo.findOne({
        where: { id: parseInt(id) },
      });

      if (!outage) {
        return res.status(404).json({ error: "Caída de servicio no encontrada" });
      }

      outage.status = "applied";
      outage.appliedToPaymentId = appliedToPaymentId;

      await outageRepo.save(outage);

      return res.json(outage);
    } catch (error) {
      console.error("Error marking outage as applied:", error);
      return res.status(500).json({ error: "Error al marcar caída como aplicada" });
    }
  };

  /**
   * Obtener descuentos pendientes para un cliente
   */
  static getPendingDiscounts = async (req: AuthRequest, res: Response) => {
    try {
      // Verificar permiso para ver caídas de servicio
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.VIEW)) {
        return res.status(403).json({ 
          message: 'No tienes permiso para ver descuentos pendientes' 
        });
      }
      const { clientId } = req.params;

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const pendingOutages = await outageRepo.find({
        where: {
          clientId: parseInt(clientId),
          status: "pending",
        },
        relations: ["installation"],
      });

      const totalDiscount = pendingOutages.reduce(
        (sum, outage) => sum + Number(outage.discountAmount),
        0
      );

      return res.json({
        outages: pendingOutages,
        totalDiscount,
        count: pendingOutages.length,
      });
    } catch (error) {
      console.error("Error getting pending discounts:", error);
      return res.status(500).json({ error: "Error al obtener descuentos pendientes" });
    }
  };
}
