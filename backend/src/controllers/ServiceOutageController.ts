import { Response } from "express";
import { AppDataSource } from "../config/database";
import { ServiceOutage } from "../entities/ServiceOutage";
import { Installation } from "../entities/Installation";
import { AuthRequest } from "../middlewares/auth.middleware";
import { hasPermission, PERMISSIONS } from "../utils/permissions";
import { createNoteInteraction } from "../utils/interactionUtils";
import { In } from "typeorm";

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

    // Regla de negocio: prorrateo siempre sobre base de 30 días.
    const daysInMonth = 30;

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
   * Listar PON IDs disponibles para registro masivo
   */
  static listPonOptions = async (req: AuthRequest, res: Response) => {
    try {
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.VIEW)) {
        return res.status(403).json({
          message: 'No tienes permiso para ver caídas de servicio',
        });
      }

      const installationRepo = AppDataSource.getRepository(Installation);
      const rows = await installationRepo
        .createQueryBuilder('installation')
        .select('DISTINCT installation.ponId', 'ponId')
        .where('installation.ponId IS NOT NULL')
        .andWhere("TRIM(installation.ponId) <> ''")
        .andWhere('installation.isDeleted = :isDeleted', { isDeleted: false })
        .orderBy('installation.ponId', 'ASC')
        .getRawMany();

      return res.json(rows.map((row: any) => row.ponId));
    } catch (error) {
      console.error('Error listing PON options for outages:', error);
      return res.status(500).json({ error: 'Error al listar PON IDs disponibles' });
    }
  };

  /**
   * Crear caída masiva para todas las instalaciones activas de un PON
   */
  static bulkCreateByPon = async (req: AuthRequest, res: Response) => {
    try {
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.CREATE)) {
        return res.status(403).json({
          message: 'No tienes permiso para crear caídas de servicio',
        });
      }

      const { ponId, startDate, endDate, reason, notes } = req.body;

      if (!ponId || String(ponId).trim() === '') {
        return res.status(400).json({ error: 'El PON ID es obligatorio' });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias' });
      }

      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          error: 'La fecha de inicio debe ser menor o igual a la fecha fin',
        });
      }

      const normalizedPonId = String(ponId).trim();
      const installationRepo = AppDataSource.getRepository(Installation);
      const installations = await installationRepo
        .createQueryBuilder('installation')
        .leftJoinAndSelect('installation.client', 'client')
        .where('LOWER(installation.ponId) = LOWER(:ponId)', { ponId: normalizedPonId })
        .andWhere('installation.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('installation.isActive = :isActive', { isActive: true })
        .andWhere('installation.serviceStatus = :serviceStatus', { serviceStatus: 'active' })
        .getMany();

      if (installations.length === 0) {
        return res.status(404).json({
          error: `No se encontraron instalaciones activas para el PON ${normalizedPonId}`,
        });
      }

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const installationIds = installations.map((installation) => installation.id);
      const existingOutages = await outageRepo.find({
        where: {
          installationId: In(installationIds),
          status: 'pending',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      });
      const existingInstallationIds = new Set(existingOutages.map((outage) => outage.installationId));

      const outagesToCreate: ServiceOutage[] = [];
      for (const installation of installations) {
        if (existingInstallationIds.has(installation.id)) {
          continue;
        }

        const { days, discountAmount } = this.calculateOutageDetails(
          new Date(startDate),
          new Date(endDate),
          installation.monthlyFee
        );

        const outage = outageRepo.create({
          clientId: installation.client?.id,
          installationId: installation.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          days,
          reason,
          discountAmount,
          status: 'pending',
          notes,
        });

        outagesToCreate.push(outage);
      }

      if (outagesToCreate.length > 0) {
        await outageRepo.save(outagesToCreate);
      }

      if (notes && notes.trim() !== '') {
        for (const installation of installations) {
          if (!installation.client?.id) {
            continue;
          }

          await createNoteInteraction(
            installation.client.id,
            notes,
            'Caída de Servicio (Creación Masiva por PON)',
            req.user?.id
          );
        }
      }

      return res.status(201).json({
        message: `Caída masiva registrada para PON ${normalizedPonId}`,
        ponId: normalizedPonId,
        totalInstallations: installations.length,
        createdCount: outagesToCreate.length,
        skippedCount: installations.length - outagesToCreate.length,
      });
    } catch (error) {
      console.error('Error creating bulk outage by PON:', error);
      return res.status(500).json({ error: 'Error al registrar caída masiva por PON' });
    }
  };

  /**
   * Previsualizar impacto de caída masiva por PON
   */
  static previewByPon = async (req: AuthRequest, res: Response) => {
    try {
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.VIEW)) {
        return res.status(403).json({
          message: 'No tienes permiso para ver caídas de servicio',
        });
      }

      const { ponId } = req.query;
      const normalizedPonId = String(ponId || '').trim();

      if (!normalizedPonId) {
        return res.status(400).json({ error: 'El PON ID es obligatorio' });
      }

      const installationRepo = AppDataSource.getRepository(Installation);
      const installations = await installationRepo
        .createQueryBuilder('installation')
        .leftJoinAndSelect('installation.client', 'client')
        .where('LOWER(installation.ponId) = LOWER(:ponId)', { ponId: normalizedPonId })
        .andWhere('installation.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('installation.isActive = :isActive', { isActive: true })
        .andWhere('installation.serviceStatus = :serviceStatus', { serviceStatus: 'active' })
        .getMany();

      const uniqueClientNames = Array.from(
        new Set(
          installations
            .map((installation) => installation.client?.fullName)
            .filter((name): name is string => !!name && name.trim() !== '')
        )
      );

      return res.json({
        ponId: normalizedPonId,
        totalInstallations: installations.length,
        totalClients: uniqueClientNames.length,
        sampleClients: uniqueClientNames.slice(0, 5),
      });
    } catch (error) {
      console.error('Error previewing outage by PON:', error);
      return res.status(500).json({ error: 'Error al previsualizar caída por PON' });
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
      const { clientId, status, startDate, endDate, ponId } = req.query;

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

      if (ponId) {
        queryBuilder.andWhere("LOWER(installation.ponId) = LOWER(:ponId)", {
          ponId: String(ponId).trim(),
        });
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
   * Actualizar fechas y razón en bloque para caídas pendientes
   */
  static bulkUpdate = async (req: AuthRequest, res: Response) => {
    try {
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.EDIT)) {
        return res.status(403).json({
          message: 'No tienes permiso para editar caídas de servicio',
        });
      }

      const { outageIds, startDate, endDate, reason, notes } = req.body;

      if (!Array.isArray(outageIds) || outageIds.length === 0) {
        return res.status(400).json({
          error: 'Debe seleccionar al menos un registro para actualizar en bloque',
        });
      }

      if (!startDate || !endDate) {
        return res.status(400).json({
          error: 'Las fechas de inicio y fin son obligatorias',
        });
      }

      if (new Date(startDate) > new Date(endDate)) {
        return res.status(400).json({
          error: 'La fecha de inicio debe ser menor o igual a la fecha fin',
        });
      }

      const numericIds = outageIds
        .map((id: any) => parseInt(id, 10))
        .filter((id: number) => Number.isInteger(id) && id > 0);

      if (numericIds.length === 0) {
        return res.status(400).json({
          error: 'Los IDs enviados no son válidos',
        });
      }

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outages = await outageRepo.find({
        where: { id: In(numericIds) },
        relations: ["installation", "client"],
      });

      if (outages.length !== numericIds.length) {
        return res.status(404).json({
          error: 'Uno o más registros seleccionados no existen',
        });
      }

      const nonPending = outages.filter((outage) => outage.status !== "pending");
      if (nonPending.length > 0) {
        return res.status(400).json({
          error: 'Solo se pueden actualizar en bloque caídas en estado pendiente',
          invalidIds: nonPending.map((outage) => outage.id),
        });
      }

      for (const outage of outages) {
        const { days, discountAmount } = this.calculateOutageDetails(
          new Date(startDate),
          new Date(endDate),
          outage.installation.monthlyFee
        );

        outage.startDate = new Date(startDate);
        outage.endDate = new Date(endDate);
        outage.days = days;
        outage.discountAmount = discountAmount;
        outage.reason = reason;
        if (notes !== undefined) {
          outage.notes = notes;
        }
      }

      await outageRepo.save(outages);

      if (notes && notes.trim() !== '') {
        for (const outage of outages) {
          if (outage.client) {
            await createNoteInteraction(
              outage.client.id,
              notes,
              'Caída de Servicio (Actualización Masiva)',
              req.user?.id
            );
          }
        }
      }

      return res.json({
        message: 'Actualización masiva realizada exitosamente',
        updatedCount: outages.length,
        updatedIds: outages.map((outage) => outage.id),
      });
    } catch (error) {
      console.error("Error bulk updating service outages:", error);
      return res.status(500).json({ error: 'Error al actualizar caídas en bloque' });
    }
  };

  /**
   * Eliminar caídas en bloque (solo pendientes)
   */
  static bulkDelete = async (req: AuthRequest, res: Response) => {
    try {
      if (!hasPermission(req.user, PERMISSIONS.CLIENTS.OUTAGES.DELETE)) {
        return res.status(403).json({
          message: 'No tienes permiso para eliminar caídas de servicio',
        });
      }

      const { outageIds } = req.body;

      if (!Array.isArray(outageIds) || outageIds.length === 0) {
        return res.status(400).json({
          error: 'Debe seleccionar al menos un registro para eliminar',
        });
      }

      const numericIds = outageIds
        .map((id: any) => parseInt(id, 10))
        .filter((id: number) => Number.isInteger(id) && id > 0);

      if (numericIds.length === 0) {
        return res.status(400).json({
          error: 'Los IDs enviados no son válidos',
        });
      }

      const outageRepo = AppDataSource.getRepository(ServiceOutage);
      const outages = await outageRepo.find({
        where: { id: In(numericIds) },
      });

      if (outages.length !== numericIds.length) {
        return res.status(404).json({
          error: 'Uno o más registros seleccionados no existen',
        });
      }

      const nonPending = outages.filter((outage) => outage.status !== 'pending');
      if (nonPending.length > 0) {
        return res.status(400).json({
          error: 'Solo se pueden eliminar en bloque caídas en estado pendiente',
          invalidIds: nonPending.map((outage) => outage.id),
        });
      }

      await outageRepo.remove(outages);

      return res.json({
        message: 'Eliminación masiva realizada exitosamente',
        deletedCount: outages.length,
        deletedIds: outages.map((outage) => outage.id),
      });
    } catch (error) {
      console.error('Error bulk deleting service outages:', error);
      return res.status(500).json({ error: 'Error al eliminar caídas en bloque' });
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
