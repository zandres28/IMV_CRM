import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Client } from '../entities/Client';
import { Installation } from '../entities/Installation';
import { Payment } from '../entities/Payment';
import { AdditionalService } from '../entities/AdditionalService';

export const N8nIntegrationController = {
    // Endpoint para obtener datos de recordatorios de pago para n8n
    getPaymentReminders: async (req: Request, res: Response) => {
        try {
            // Obtener filtros de query params
            const { paymentStatus, clientStatus, reminderType } = req.query;
            
            const clientRepository = AppDataSource.getRepository(Client);
            const paymentRepository = AppDataSource.getRepository(Payment);
            const additionalServiceRepository = AppDataSource.getRepository(AdditionalService);

            // Construir query de clientes con filtros opcionales
            const clientQuery = clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect(
                    'client.installations',
                    'installation',
                    'installation.isDeleted = :isDeleted AND installation.isActive = :isActive',
                    { isDeleted: false, isActive: true }
                )
                .leftJoinAndSelect('installation.servicePlan', 'servicePlan');

            // Filtrar por estado de cliente
            // - active (por defecto si no se envía parámetro)
            // - inactive (cualquier estado distinto a 'active')
            // - all (no filtra por estado)
            if (!clientStatus || clientStatus === 'active') {
                clientQuery.where('client.status = :status', { status: 'active' });
            } else if (clientStatus === 'inactive') {
                clientQuery.where('client.status <> :status', { status: 'active' });
            } // si es 'all', no se aplica filtro
            
            const clients = await clientQuery.getMany();

            const reminders = [];
            const currentDate = new Date();
            const currentMonth = currentDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
            const currentYear = currentDate.getFullYear();

            for (const client of clients) {
                // Obtener instalaciones activas
                const activeInstallations = client.installations?.filter(inst => inst.isActive && !inst.isDeleted) || [];
                
                if (activeInstallations.length === 0) continue;

                // Obtener servicios adicionales activos
                const additionalServices = await additionalServiceRepository.find({
                    where: { 
                        client: { id: client.id },
                        status: 'active' as any
                    }
                });

                // Calcular valor adicional (suma de servicios adicionales)
                const additionalAmount = additionalServices.reduce((sum, service) => sum + service.monthlyFee, 0);

                // Obtener pagos del cliente para el mes actual
                const payments = await paymentRepository.find({
                    where: {
                        client: { id: client.id },
                        paymentMonth: currentMonth,
                        paymentYear: currentYear
                    }
                });

                // Para cada instalación activa, crear un registro de recordatorio
                for (const installation of activeInstallations) {
                    const payment = payments.find(p => p.installation?.id === installation.id);
                    
                    // Calcular días transcurridos desde la fecha de vencimiento
                    let dias = 0;
                    let tipo = 'RECORDATORIO';
                    
                    if (payment && payment.dueDate) {
                        const dueDate = new Date(payment.dueDate);
                        const diffTime = currentDate.getTime() - dueDate.getTime();
                        dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        // Determinar tipo de recordatorio
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

                    // Calcular cuota (número de pago en el mes)
                    const monthPayments = payments.filter(p => p.status === 'completed').length;
                    const cuota = monthPayments + 1;

                    const reminderData = {
                        'ID Cliente': `CL-${String(client.id).padStart(4, '0')}`,
                        'Nombre Completo': client.fullName,
                        'Celular 1': client.primaryPhone,
                        'Celular 2': client.secondaryPhone || '',
                        'PLAN': installation.servicePlan?.name || installation.serviceType,
                        'MES': currentMonth,
                        'DIAS': dias,
                        'VALOR': `$${installation.monthlyFee.toLocaleString('es-CO')}`,
                        'ADICIONAL': additionalAmount,
                        'CUOTA': cuota,
                        'TIPO': tipo,
                        'ENVIADO': 'NO',
                        'estado_pago': payment?.status || 'pending',
                        'installation_id': installation.id
                    };

                    // Aplicar filtros
                    let addReminder = true;
                    
                    // Filtrar por estado de pago si se especifica
                    if (paymentStatus && paymentStatus !== 'all') {
                        const currentPaymentStatus = payment?.status || 'pending';
                        if (paymentStatus !== currentPaymentStatus) {
                            addReminder = false;
                        }
                    }
                    
                    // Filtrar por tipo de recordatorio si se especifica
                    if (addReminder && reminderType && reminderType !== 'all') {
                        if (reminderType !== tipo) {
                            addReminder = false;
                        }
                    }
                    
                    if (addReminder) {
                        reminders.push(reminderData);
                    }
                }
            }

            return res.json(reminders);
        } catch (error) {
            console.error('Error al generar recordatorios:', error);
            return res.status(500).json({ 
                message: 'Error al generar recordatorios de pago',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    },

    // Endpoint para marcar un recordatorio como enviado
    markAsSent: async (req: Request, res: Response) => {
        try {
            const { clientId, installationId } = req.body;

            // Aquí podrías guardar un registro de que se envió el recordatorio
            // Por ahora solo retornamos éxito
            
            return res.json({ 
                success: true,
                message: 'Recordatorio marcado como enviado'
            });
        } catch (error) {
            console.error('Error al marcar recordatorio:', error);
            return res.status(500).json({ 
                message: 'Error al marcar recordatorio',
                error: error instanceof Error ? error.message : 'Error desconocido'
            });
        }
    }
};
