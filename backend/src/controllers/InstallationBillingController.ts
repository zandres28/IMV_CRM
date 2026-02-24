import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Payment } from '../entities/Payment';
import { Client } from '../entities/Client';
import { createNoteInteraction } from '../utils/interactionUtils';

export class InstallationBillingController {
  /**
   * Listar pagos de instalación (paymentType='installation') opcionalmente filtrados por mes/año/estado
   * GET /api/installation-billing?month=noviembre&year=2025&status=paid
   */
  static async list(req: Request, res: Response) {
    try {
      const { month, year, status } = req.query;
      const paymentRepo = AppDataSource.getRepository(Payment);
      const query = paymentRepo.createQueryBuilder('payment')
        .leftJoinAndSelect('payment.client', 'client')
        .leftJoinAndSelect('payment.installation', 'installation')
        .where('payment.paymentType = :type', { type: 'installation' })
        .andWhere('client.deletedAt IS NULL');

      // Filter by installation date instead of payment month/year
      if (month) {
        const monthMap: { [key: string]: number } = {
          'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
          'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12
        };
        const monthNum = monthMap[String(month).toLowerCase()];
        if (monthNum) {
          query.andWhere('MONTH(installation.installationDate) = :monthNum', { monthNum });
        }
      }
      
      if (year) {
        query.andWhere('YEAR(installation.installationDate) = :year', { year: parseInt(String(year)) });
      }

      if (status) query.andWhere('payment.status = :status', { status: String(status) });
      
      // Ordenar por fecha de pago descendente
      query.orderBy('payment.paymentDate', 'DESC');
      query.addOrderBy('payment.created_at', 'DESC');

      const payments = await query.getMany();

      // Ensure amount reflects installationFee
      payments.forEach(p => {
        if (p.installation && p.installation.installationFee) {
            p.amount = Number(p.installation.installationFee);
        }
      });

      const stats = {
        total: payments.length,
        paid: payments.filter(p => p.status === 'paid').length,
        pending: payments.filter(p => p.status === 'pending').length,
        totalAmount: payments.reduce((s, p) => s + Number(p.amount), 0),
        paidAmount: payments.filter(p => p.status === 'paid').reduce((s, p) => s + Number(p.amount), 0),
        pendingAmount: payments.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.amount), 0)
      };

      res.json({ payments, statistics: stats });
    } catch (err) {
      console.error('Error listando pagos de instalación:', err);
      res.status(500).json({ message: 'Error listando pagos de instalación' });
    }
  }

  /**
   * Detalle de un pago de instalación
   * GET /api/installation-billing/:id
   */
  static async detail(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const paymentRepo = AppDataSource.getRepository(Payment);
      const payment = await paymentRepo.findOne({
        where: { id: parseInt(id), paymentType: 'installation' },
        relations: ['client', 'installation']
      });
      if (!payment) return res.status(404).json({ message: 'Pago de instalación no encontrado' });
      res.json(payment);
    } catch (err) {
      console.error('Error obteniendo detalle:', err);
      res.status(500).json({ message: 'Error obteniendo detalle de pago de instalación' });
    }
  }

  /**
   * Marcar pago de instalación como pagado
   * PUT /api/installation-billing/:id/pay
   */
  static async markPaid(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentMethod, paymentDate } = req.body;
      const paymentRepo = AppDataSource.getRepository(Payment);
      const payment = await paymentRepo.findOne({ where: { id: parseInt(id), paymentType: 'installation' } });
      if (!payment) return res.status(404).json({ message: 'Pago de instalación no encontrado' });
      payment.status = 'paid';
      payment.paymentMethod = paymentMethod || payment.paymentMethod;
      payment.paymentDate = paymentDate ? new Date(paymentDate) : new Date();
      await paymentRepo.save(payment);
      res.json({ message: 'Pago de instalación marcado como pagado', payment });
    } catch (err) {
      console.error('Error marcando pago instalación:', err);
      res.status(500).json({ message: 'Error marcando pago de instalación' });
    }
  }

  /**
   * Actualizar detalles de pago (fecha, método)
   * PUT /api/installation-billing/:id
   */
  static async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { paymentDate, paymentMethod, status, notes } = req.body;
      const paymentRepo = AppDataSource.getRepository(Payment);
      
      const payment = await paymentRepo.findOne({ where: { id: parseInt(id) } });

      if (!payment) return res.status(404).json({ message: 'Pago no encontrado' });

      if (paymentDate) payment.paymentDate = new Date(paymentDate);
      if (paymentMethod) payment.paymentMethod = paymentMethod;
      if (status) payment.status = status;
      if (notes) payment.notes = notes;

      const updatedPayment = await paymentRepo.save(payment);
      res.json({ message: 'Pago actualizado correctamente', payment: updatedPayment });      
    } catch (err) {
      console.error('Error actualizando pago:', err);
      res.status(500).json({ message: 'Error actualizando pago' });
    }
  }

  /**
   * Crear pago de instalación manual (en caso de que no se haya creado automáticamente)
   * POST /api/installation-billing/manual
   * body: { clientId, installationId, amount, date, notes }
   */
  static async createManual(req: Request, res: Response) {
    try {
      const { clientId, installationId, amount, date, notes, paymentMethod } = req.body;
      if (!clientId || !installationId || !amount) {
        return res.status(400).json({ message: 'clientId, installationId y amount son requeridos' });
      }
      const clientRepo = AppDataSource.getRepository(Client);
      const paymentRepo = AppDataSource.getRepository(Payment);
      const client = await clientRepo.findOne({ where: { id: clientId } });
      if (!client) return res.status(404).json({ message: 'Cliente no encontrado' });
      const dateObj = date ? new Date(date) : new Date();
      const monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const payment = paymentRepo.create({
        client,
        installation: { id: installationId } as any,
        amount: Number(amount),
        paymentMonth: monthNames[dateObj.getMonth()],
        paymentYear: dateObj.getFullYear(),
        dueDate: dateObj,
        status: 'paid',
        paymentDate: dateObj,
        paymentMethod: paymentMethod || 'efectivo',
        paymentType: 'installation',
        servicePlanAmount: 0,
        additionalServicesAmount: 0,
        productInstallmentsAmount: 0,
        installationFeeAmount: Number(amount),
        outageDiscountAmount: 0,
        outageDays: 0,
        notes: notes || 'Cobro de instalación (manual)'
      });
      await paymentRepo.save(payment);

      if (notes) {
          await createNoteInteraction(
              clientId,
              notes,
              'Pago de Instalación (Manual)',
              (req as any).user?.id
          );
      }

      res.status(201).json({ message: 'Pago de instalación creado', payment });
    } catch (err) {
      console.error('Error creando pago instalación manual:', err);
      res.status(500).json({ message: 'Error creando pago instalación manual' });
    }
  }
}
