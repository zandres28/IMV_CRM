import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Client } from '../entities/Client';
import { Installation } from '../entities/Installation';
import { Payment } from '../entities/Payment';
import { AdditionalService } from '../entities/AdditionalService';
import { ProductInstallment } from '../entities/ProductInstallment';
import { Interaction } from '../entities/Interaction';
import { SystemSetting } from '../entities/SystemSetting';
import { InteractionType } from '../entities/InteractionType';
import { In, Between, Like } from 'typeorm';

export const N8nIntegrationController = {
    // Endpoint para obtener datos de recordatorios de pago para n8n
    getPaymentReminders: async (req: Request, res: Response) => {
        try {
            // Obtener filtros de query params
            const { paymentStatus, clientStatus, reminderType, sentFilter } = req.query;
            
            const clientRepository = AppDataSource.getRepository(Client);
            const paymentRepository = AppDataSource.getRepository(Payment);
            const additionalServiceRepository = AppDataSource.getRepository(AdditionalService);
            const productInstallmentRepository = AppDataSource.getRepository(ProductInstallment);
            const interactionRepository = AppDataSource.getRepository(Interaction);

            // Rango de fechas del mes actual para buscar interacciones de envío previo
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999); // Fix for full day coverage

            // Obtener interacciones de tipo "Recordatorio Enviado" del mes actual
            const sentReminders = await interactionRepository.find({
                where: {
                    subject: 'Recordatorio WhatsApp Automático',
                    created_at: Between(startOfMonth, endOfMonth)
                }
            });

            // Mapa de clientes que ya recibieron recordatorio este mes
            const sentClientIds = new Set(sentReminders.map(i => i.clientId));

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
            // Normalizar el estado recibido
            const statusParam = (clientStatus as string || '').trim().toLowerCase();

            // - active (por defecto si no se envía parámetro o es desconocido)
            // - inactive (cualquier estado distinto a 'active')
            // - all (no filtra por estado)
            if (statusParam === 'all') {
                // No aplicar filtro de estado
            } else if (statusParam === 'inactive') {
                clientQuery.where('client.status <> :status', { status: 'active' });
            } else {
                // Por defecto o si es explícitamente 'active'
                clientQuery.where('client.status = :status', { status: 'active' });
            }
            
            const clients = await clientQuery.getMany();

            const clientIds = clients.map(c => c.id);
            if (clientIds.length === 0) {
                return res.json([]);
            }

            const currentDate = new Date();
            
            // Lógica para determinar el mes y año de consulta
            // 1. Por defecto: Mes/Año actual
            // 2. Si se reciben parámetros ?month=...&year=..., se usan esos (Prioridad)
            let queryMonth = currentDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
            let queryYear = currentDate.getFullYear();

            if (req.query.month) {
                queryMonth = (req.query.month as string).trim().toUpperCase();
            }
            if (req.query.year) {
                queryYear = parseInt(req.query.year as string, 10);
            }

            // --- OPTIMIZACIÓN DE CONSULTAS (BULK FETCH) ---
            // Traer todos los datos relacionados en 3 consultas masivas en lugar de N consultas por cliente

            // 1. Obtener todos los servicios adicionales activos para estos clientes
            const allAdditionalServices = await additionalServiceRepository.find({
                where: { 
                    client: { id: In(clientIds) },
                    status: 'active' as any
                },
                relations: ['client']
            });

            // 2. Obtener todas las cuotas pendientes de productos
            const allFetchedProductInstallments = await productInstallmentRepository.find({
                where: {
                    product: { client: { id: In(clientIds) } },
                    status: 'pending'
                },
                relations: ['product', 'product.client']
            });

            // 3. Obtener todos los pagos del mes SOLICITADO
            const allPayments = await paymentRepository.find({
                where: [
                    { client: { id: In(clientIds) }, paymentMonth: queryMonth, paymentYear: queryYear },
                    { client: { id: In(clientIds) }, paymentMonth: queryMonth.toLowerCase(), paymentYear: queryYear }
                ],
                relations: ['installation', 'client']
            });

            // Agrupar datos en Mapas por ClientID para acceso O(1)
            const servicesMap = new Map<number, AdditionalService[]>();
            allAdditionalServices.forEach(s => {
                const cid = s.client.id;
                if (!servicesMap.has(cid)) servicesMap.set(cid, []);
                servicesMap.get(cid)?.push(s);
            });

            const installmentsMap = new Map<number, ProductInstallment[]>();
            allFetchedProductInstallments.forEach(p => {
                const cid = p.product.client.id;
                if (!installmentsMap.has(cid)) installmentsMap.set(cid, []);
                installmentsMap.get(cid)?.push(p);
            });

            const paymentsMap = new Map<number, Payment[]>();
            allPayments.forEach(p => {
                const cid = p.client.id;
                if (!paymentsMap.has(cid)) paymentsMap.set(cid, []);
                paymentsMap.get(cid)?.push(p);
            });
            // ----------------------------------------------

            const reminders = [];

            // Helper para calcular indices de mes
            const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            const queryMonthIndex = monthNames.indexOf(queryMonth);
            const safeMonthIndex = queryMonthIndex !== -1 ? queryMonthIndex : currentDate.getMonth();

            // Calcular fecha límite (5 del mes siguiente al consultado)
            const deadlineDate = new Date(queryYear, safeMonthIndex + 1, 5);
            const deadlineMonthName = deadlineDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
            const formattedDeadline = `05 de ${deadlineMonthName}`;

            // Obtener configuración de días de recordatorio
            const systemSettingRepository = AppDataSource.getRepository(SystemSetting);
            let vencidoMinSetting = await systemSettingRepository.findOneBy({ key: 'reminder_vencido_min' });
            let vencidoMaxSetting = await systemSettingRepository.findOneBy({ key: 'reminder_vencido_max' });

            const vencidoMin = vencidoMinSetting ? parseInt(vencidoMinSetting.value) : 0;
            const vencidoMax = vencidoMaxSetting ? parseInt(vencidoMaxSetting.value) : 15;

            for (const client of clients) {
                // Obtener instalaciones activas
                const activeInstallations = client.installations?.filter(inst => inst.isActive && !inst.isDeleted) || [];
                
                if (activeInstallations.length === 0) continue;

                // Obtener servicios adicionales activos (Desde cache)
                const additionalServices = servicesMap.get(client.id) || [];

                // Calcular valor adicional (suma de servicios adicionales)
                const additionalAmount = additionalServices.reduce((sum, service) => sum + service.monthlyFee, 0);
                // Obtener nombres de los servicios adicionales
                const additionalDetails = additionalServices.map(s => s.serviceName).join(', ');

                // Obtener pagos pendientes de productos (cuotas) (Desde cache)
                const allProductInstallments = installmentsMap.get(client.id) || [];
                
                // Filtrar solo las cuotas que corresponden al mes actual (o anteriores vencidas) based en Fecha de Venta
                const productInstallments = allProductInstallments.filter(p => {
                    const saleDate = new Date(p.product.saleDate);
                    
                    // Indice de mes absoluto: (Año * 12) + Mes (0-11)
                    const saleMonthIndex = saleDate.getFullYear() * 12 + saleDate.getMonth();
                    
                    // El mes al que corresponde esta cuota específica
                    // Cuota 1 => Mes de venta, Cuota 2 => Mes siguiente, etc.
                    const targetMonthIndex = saleMonthIndex + (p.installmentNumber - 1);
                    
                    // Indice del mes actual de facturación (o el consultado via query params)
                    const currentMonthIndex = queryYear * 12 + safeMonthIndex;

                    // Si el mes objetivo es menor o igual al actual, se cobra.
                    return targetMonthIndex <= currentMonthIndex;
                });

                // Función de redondeo a la centena superior (Ej: 53333 -> 53400)
                const roundToHundred = (amount: number) => Math.ceil(amount / 100) * 100;

                const productDebt = productInstallments.reduce((acc, curr) => acc + roundToHundred(Number(curr.amount)), 0);
                
                // Generar detalle limpio (Ej: "TVBOX" en lugar de "TVBOX (Ct 1)")
                // Usamos Set para evitar duplicados si hay varias cuotas del mismo producto vencidas
                const productNames = [...new Set(productInstallments.map(p => p.product.productName))].join(', ');
                
                const productDetails = productNames;

                // Obtener pagos del cliente para el mes actual (buscando tanto mayúsculas como minúsculas) (Desde cache)
                const payments = paymentsMap.get(client.id) || [];


                // Para cada instalación activa, crear un registro de recordatorio
                for (const installation of activeInstallations) {
                    // Buscar pago específico para esta instalación
                    // PRIORIDAD: 
                    // 1. Pago mensual explícito (monthly) asociado a la instalación.
                    // 2. Pago mensual explícito (monthly) SIN instalación (genérico).
                    // 3. Fallback: Cualquier pago asociado a la instalación que NO sea de instalación (type != 'installation')
                    // 4. Fallback: Cualquier pago general que NO sea de instalación.

                    // EXCLUSIÓN: Ignorar pagos de tipo 'installation' (costo de activación) para el cálculo de deuda mensual,
                    // a menos que sea lo único que existe (caso raro, pero se maneja por defecto si todo falla).

                    let payment = payments.find(p => p.installation?.id === installation.id && p.paymentType === 'monthly');
                    
                    if (!payment) {
                        // Buscar pago mensual genérico
                        payment = payments.find(p => !p.installation && p.paymentType === 'monthly');
                    }

                    if (!payment) {
                        // Fallback: Buscar pago asociado que NO sea 'installation'
                        payment = payments.find(p => p.installation?.id === installation.id && p.paymentType !== 'installation');
                    }

                    if (!payment) {
                         // Fallback final: Buscar pago general que NO sea 'installation'
                         payment = payments.find(p => !p.installation && p.paymentType !== 'installation');
                    }

                    // FIX: Si no se encontró pago específico o está pendiente, pero existe al menos un pago PAGADO
                    // para este cliente en el mes, asumimos que está al día (para evitar cobros duplicados en multi-servicio).
                    if (!payment || payment.status !== 'paid') {
                        const paidPayment = payments.find(p => p.status === 'paid');
                        if (paidPayment) {
                            payment = paidPayment;
                        }
                    }
                    
                    // Calcular días transcurridos desde la fecha de vencimiento
                    let dias = 0;
                    let tipo = 'RECORDATORIO';
                    
                    if (payment && payment.status === 'paid') {
                        // Si ya pagó, no calcular días de mora ni marcar como vencido
                        tipo = 'PAGADO';
                        dias = 0;
                    } else if (payment && payment.dueDate) {
                        const dueDate = new Date(payment.dueDate);
                        // Ajustar zona horaria si es necesario o trabajar con fechas puras
                        // Se asume que dueDate en DB es medianoche local o UTC correctamente manejada env-wise.
                        const diffTime = currentDate.getTime() - dueDate.getTime();
                        dias = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        
                        // Determinar tipo de recordatorio
                        if (dias < vencidoMin) {
                            tipo = 'PROXIMO';
                        } else if (dias >= vencidoMin && dias <= vencidoMax) {
                            tipo = 'VENCIDO';
                        } else {
                            tipo = 'ULTIMO';
                        }
                    }

                    // CALCULO DEL VALOR (PRORRATEO)
                    // Si existe un pago generado, usar su desglose.
                    // Prioridad: servicePlanAmount del pago encontrado.
                    // Fallback: installation.monthlyFee (pero esto ignora prorrateo si no hay pago generado)
                    let valorMensualidad = Number(installation.monthlyFee);
                    
                    if (payment) {
                        // Si hay pago, confiar en el cálculo del generador de facturas
                        // servicePlanAmount contiene el valor base (prorrateado o completo)
                        valorMensualidad = Number(payment.servicePlanAmount);
                    }

                    // Calcular información de cuotas de productos (Ej: "1/3")
                    const cuota = productInstallments.length > 0 
                        ? productInstallments.map(p => `${p.installmentNumber}/${p.product.installments}`).join(', ') 
                        : '';

                    const reminderData = {
                        'ID Cliente': `CL-${String(client.id).padStart(4, '0')}`,
                        'Nombre Completo': client.fullName,
                        'Celular 1': client.primaryPhone,
                        'Celular 2': client.secondaryPhone || '',
                        'PLAN': installation.servicePlan?.name || installation.serviceType,
                        'MES': queryMonth,
                        'FECHA_LIMITE': formattedDeadline,
                        'DIAS': dias,
                        'VALOR': valorMensualidad, // Ahora usa el valor real (posiblemente prorrateado) del pago
                        'ADICIONAL': Number(additionalAmount) + Number(productDebt),
                        'DETALLE_ADICIONAL': [additionalDetails, productDetails].filter(d => d && d !== '').join(', ') || 'Ninguno',
                        'CUOTA': cuota,
                        'TIPO': tipo,
                        'ENVIADO': sentClientIds.has(client.id) ? 'YES' : 'NO',
                        'estado_pago': payment?.status || 'pending',
                        'installation_id': installation.id
                    };

                    reminders.push(reminderData);
                }
            }

            // --- FILTER LOGIC (IN-MEMORY) ---
            // Aplicar filtros finales si se han solicitado params específicos
            // - sentFilter: 'false', 'NO' -> solo NO enviados
            // - paymentStatus: overrides previous simple filter with more flexible options

            let filteredReminders = reminders;

            if (sentFilter) {
                const sFilter = String(sentFilter).toUpperCase();
                if (sFilter === 'FALSE' || sFilter === 'NO') {
                    filteredReminders = filteredReminders.filter(r => r.ENVIADO === 'NO');
                } else if (sFilter === 'TRUE' || sFilter === 'YES') {
                    filteredReminders = filteredReminders.filter(r => r.ENVIADO === 'YES');
                }
            }

            // Apply paymentStatus filter (if passed query param matches our logic)
            if (paymentStatus) {
                const pFilter = String(paymentStatus).toLowerCase();
                if (pFilter === 'pending') {
                    // Mostrar pendientes, incluyendo los que técnicamente están vencidos si así lo desea la gestión simple,
                    // O ser estricto. Para coincidir con el panel de facturación que suele mostrar "Pendiente" como categoría general,
                    // a veces se incluye todo.
                    // Pero si el usuario pidió explícitamente "overdue" en otra query, aquí 'pending' debería ser solo lo vigente.
                    // Sin embargo, en N8n a menudo 'pending' se usa para "no pagado".
                    // Revisando MonthlyBillingController: "pending" include ['pending', 'overdue'].
                    
                    // Lógica alineada con MonthlyBillingController: "Pendiente" trae todo lo no pagado.
                    filteredReminders = filteredReminders.filter(r => r.estado_pago === 'pending' || r.estado_pago === 'overdue');
                } else if (pFilter === 'overdue') {
                    // Vencidos explícitos (status='overdue') O Pendientes que segun cálculo de días ya vencieron (TIPO='VENCIDO' o 'ULTIMO')
                    // recordatorio.TIPO se calcula arriba basado en fecha.
                    filteredReminders = filteredReminders.filter(r => 
                        r.estado_pago === 'overdue' || 
                        (r.estado_pago === 'pending' && (r.TIPO === 'VENCIDO' || r.TIPO === 'ULTIMO'))
                    );
                } else if (pFilter === 'paid' || pFilter === 'approved') {
                    filteredReminders = filteredReminders.filter(r => r.estado_pago === 'approved' || r.estado_pago === 'paid');
                }
            }

            // Apply reminderType filter
            if (reminderType && reminderType !== 'all') {
                 filteredReminders = filteredReminders.filter(r => r.TIPO === reminderType);
            }

            return res.json(filteredReminders);


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
            
            if (!clientId) {
                return res.status(400).json({ message: 'Client ID is required' });
            }

            const interactionRepository = AppDataSource.getRepository(Interaction);
            const interactionTypeRepository = AppDataSource.getRepository(InteractionType);
            const clientRepository = AppDataSource.getRepository(Client);

            const client = await clientRepository.findOne({ where: { id: Number(clientId) } });
            if (!client) {
                return res.status(404).json({ message: 'Client not found' });
            }

            // Buscar o crear el tipo de interacción
            let type = await interactionTypeRepository.findOne({ where: { name: 'Recordatorio WhatsApp' } });
            if (!type) {
                type = interactionTypeRepository.create({
                    name: 'Recordatorio WhatsApp',
                    description: 'Recordatorios de pago enviados automáticamente vía N8N',
                    isSystem: true
                });
                await interactionTypeRepository.save(type);
            }

            // Crear interacción de registro
            const interaction = interactionRepository.create({
                client: client,
                clientId: client.id,
                subject: 'Recordatorio WhatsApp Automático',
                interactionType: type,
                notes: `Se envió recordatorio automático de pago para el cliente ${client.fullName}.`,
                description: `Se envió recordatorio automático de pago vía N8N el ${new Date().toLocaleString()}.`,
            });

            await interactionRepository.save(interaction);
            
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
    },

    // Endpoint para enviar promociones (usado por n8n)
    // Requiere header `x-n8n-api-key` igual a process.env.N8N_API_KEY
    sendPromotions: async (req: Request, res: Response) => {
        try {
            // Aceptar tanto `x-n8n-api-key` como `x-api-key` y también ?apiKey query param
            const apiKeyHeader = String(req.headers['x-n8n-api-key'] || req.headers['x-api-key'] || req.query.apiKey || '');
            const validApiKey = process.env.N8N_API_KEY;

            if (!validApiKey) {
                console.error('N8N_API_KEY is not defined in environment variables');
                return res.status(500).json({ message: 'Server configuration error' });
            }

            if (!apiKeyHeader || apiKeyHeader !== validApiKey) {
                return res.status(401).json({ message: 'Invalid or missing API Key' });
            }

            const { message, images } = req.body as { message?: string; images?: string[] };

            if (!message && !images) {
                return res.status(400).json({ message: 'message or images required' });
            }

            const clientRepository = AppDataSource.getRepository(Client);

            // Obtener clientes con al menos una instalación activa (no borrada) y estado active
            const clients = await clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect(
                    'client.installations',
                    'installation',
                    'installation.isDeleted = :isDeleted AND installation.isActive = :isActive',
                    { isDeleted: false, isActive: true }
                )
                .where('client.status = :status', { status: 'active' })
                .getMany();

            // Filtrar clientes con teléfono y que tengan instalación activa
            const recipients = clients
                .filter(c => (c.primaryPhone && c.primaryPhone.trim() !== '') && (c.installations && c.installations.length > 0))
                .map(c => ({
                    clientId: c.id,
                    fullName: c.fullName,
                    phone: c.primaryPhone,
                    message: message || '',
                    images: Array.isArray(images) ? images : []
                }));

            return res.json({ count: recipients.length, recipients });
        } catch (error) {
            console.error('Error sendPromotions:', error);
            return res.status(500).json({ message: 'Internal error', error: error instanceof Error ? error.message : 'unknown' });
        }
    },

    // Obtener deuda actual de un cliente por teléfono

    // Obtener detalles del cliente por teléfono para sincronización con Chatwoot
    getClientByPhone: async (req: Request, res: Response) => {
        try {
            const { phone } = req.query;

            if (!phone) {
                return res.status(400).json({ message: 'Phone number is required' });
            }

            const clientRepository = AppDataSource.getRepository(Client);
            
            // Limpiar el teléfono entrante para búsqueda flexible
            const cleanPhone = String(phone).replace(/\D/g, '');
            // Tomar los últimos 10 dígitos para asegurar coincidencia si viene con 57
            const searchPhone = cleanPhone.length > 10 ? cleanPhone.slice(-10) : cleanPhone;

            // Buscar cliente donde el teléfono termine en los últimos 10 dígitos proporcionados
            const client = await clientRepository.createQueryBuilder('client')
                .where('client.primaryPhone LIKE :phone', { phone: `%${searchPhone}` })
                .orWhere('client.secondaryPhone LIKE :phone', { phone: `%${searchPhone}` })
                .getOne();

            if (!client) {
                return res.status(404).json({ message: 'Client not found' });
            }

            return res.json({
                id: client.id,
                name: client.fullName,
                email: client.email,
                phone: client.primaryPhone,
                identifier: client.identificationNumber,
                city: client.city,
                address: client.installationAddress
            });

        } catch (error) {
            console.error('Error getting client details:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    getClientDebt: async (req: Request, res: Response) => {
        try {
            const { phone } = req.query;
            
            if (!phone) {
                return res.status(400).json({ message: 'Phone number is required' });
            }

            const clientRepository = AppDataSource.getRepository(Client);
            const paymentRepository = AppDataSource.getRepository(Payment);

            // Buscar cliente por teléfono (LIKE para flexibilidad)
            const client = await clientRepository.createQueryBuilder('client')
                .where('client.primaryPhone LIKE :phone', { phone: `%${phone}%` })
                .getOne();

            if (!client) {
                return res.status(404).json({ message: 'Client not found' });
            }

            // Buscar facturas pendientes
            const pendingPayments = await paymentRepository.find({
                where: {
                    client: { id: client.id },
                    status: In(['pending', 'overdue'])
                },
                order: {
                    paymentYear: 'ASC',
                    paymentMonth: 'ASC'
                }
            });

            const totalDebt = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

            return res.json({
                clientId: client.id,
                clientName: client.fullName,
                totalDebt,
                pendingInvoices: pendingPayments.map(p => ({
                    id: p.id,
                    month: p.paymentMonth,
                    year: p.paymentYear,
                    amount: Number(p.amount), // Asegurar númerico
                    dueDate: p.dueDate
                }))
            });

        } catch (error) {
            console.error('Error getting client debt:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Registrar un pago desde N8N (WhatsApp)
    registerPayment: async (req: Request, res: Response) => {
        try {
            const { phone, amount, paymentMethod, reference, date } = req.body;

            if (!phone || !amount) {
                return res.status(400).json({ message: 'Phone and amount are required' });
            }

            const clientRepository = AppDataSource.getRepository(Client);
            const paymentRepository = AppDataSource.getRepository(Payment);

            // 1. Buscar cliente
            const client = await clientRepository.createQueryBuilder('client')
                .where('client.primaryPhone LIKE :phone', { phone: `%${phone}%` })
                .getOne();

            if (!client) {
                return res.status(404).json({ message: 'Client not found via phone' });
            }

            // 2. Buscar FACTURA A PAGAR (la más antigua pendiente)
            const pendingPayments = await paymentRepository.find({
                where: {
                    client: { id: client.id },
                    status: In(['pending', 'overdue'])
                },
                order: {
                    paymentDate: 'ASC' // Usamos paymentDate o dueDate como proxy de antigüedad
                }
            });
            // Ordenar por ID mejor, para asegurar cronología de creación
            pendingPayments.sort((a, b) => a.id - b.id);

            if (pendingPayments.length === 0) {
                return res.json({ 
                    success: false,
                    message: 'No pending invoices found for this client',
                    client: client.fullName
                });
            }

            // Estrategia: "Matar" la factura más antigua.
            // (Futura mejora: match exacto por monto)
            const targetPayment = pendingPayments[0];

            // 3. Procesar el pago
            targetPayment.status = 'paid';
            targetPayment.paymentDate = date ? new Date(date) : new Date();
            targetPayment.paymentMethod = paymentMethod || 'whatsapp_integration';
            targetPayment.externalId = reference || `WHATSAPP-${Date.now()}`;
            
            await paymentRepository.save(targetPayment);

            return res.json({
                success: true,
                message: 'Payment registered successfully',
                paymentId: targetPayment.id,
                month: targetPayment.paymentMonth,
                amountPaid: amount,
                client: client.fullName
            });

        } catch (error) {
            console.error('Error registering payment webhook:', error);
            return res.status(500).json({ message: 'Internal server error processing payment' });
        }
    },

    // Modificar estado de recordatorio (Enviado / No Enviado)
    setReminderStatus: async (req: Request, res: Response) => {
        try {
            const { clientId, clientIds, sent } = req.body;
            // sent = true -> Marcar como enviado (Crear interacción)
            // sent = false -> Resetear (Borrar interacción)

            const interactionRepository = AppDataSource.getRepository(Interaction);
            const interactionTypeRepository = AppDataSource.getRepository(InteractionType);
            
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            
            console.log(`[setReminderStatus] Range: ${startOfMonth.toISOString()} - ${endOfMonth.toISOString()}`);

            const targetIds = clientId ? [clientId] : (clientIds || []);
            
            if (targetIds.length === 0) {
                 return res.status(400).json({ success: false, message: 'Faltan IDs de cliente' });
            }

            if (sent) {
                // MARK AS SENT
                let type = await interactionTypeRepository.findOne({ where: { name: Like('%Whatsapp%') } });
                if (!type) {
                    type = await interactionTypeRepository.findOne({ where: { id: 1 } });
                }

                if (!type) {
                     return res.status(500).json({ message: "No se encontró un tipo de interacción válido (Whatsapp/ID:1)" });
                }

                let createdCount = 0;
                for (const id of targetIds) {
                    const existing = await interactionRepository.findOne({
                        where: {
                            clientId: id,
                            subject: 'Recordatorio WhatsApp Automático',
                            created_at: Between(startOfMonth, endOfMonth)
                        }
                    });

                    if (!existing) {
                        const interaction = interactionRepository.create({
                             clientId: id,
                             subject: 'Recordatorio WhatsApp Automático',
                             description: 'Marcado como enviado manualmente desde el panel de facturación.',
                             notes: 'Simulación de envío para evitar duplicados.',
                             interactionType: type,
                             priority: 'media',
                             status: 'completado',
                             created_at: new Date()
                        });
                        await interactionRepository.save(interaction);
                        createdCount++;
                    }
                }
                return res.json({ success: true, message: `Marcados como enviados: ${createdCount}` });
            } else {
                // RESET (DELETE)
                const result = await interactionRepository.delete({
                     clientId: In(targetIds),
                     subject: 'Recordatorio WhatsApp Automático',
                     created_at: Between(startOfMonth, endOfMonth)
                });
                return res.json({ success: true, message: `Reseteados: ${result.affected}` });
            }

        } catch (error) {
            console.error('Error setting reminder status:', error);
            return res.status(500).json({ message: 'Internal server error' });
        }
    },

    // Resetear estado de recordatorio (eliminar interacción de envío)
    resetRemindersStatus: async (req: Request, res: Response) => {
        try {
            const { phone, all } = req.body;
            const interactionRepository = AppDataSource.getRepository(Interaction);
            const clientRepository = AppDataSource.getRepository(Client);

            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
            const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);

            // Base criteria: Auto Reminder + Current Month
            let criteria: any = {
                subject: 'Recordatorio WhatsApp Automático',
                created_at: Between(startOfMonth, endOfMonth)
            };

            if (all === true || all === 'true') {
                 // Reset ALL
            } else if (phone) {
                // Find client by phone
                const client = await clientRepository.findOne({
                    where: [
                        { primaryPhone: Like(`%${phone}%`) },
                        { secondaryPhone: Like(`%${phone}%`) }
                    ]
                });

                if (!client) {
                    return res.status(404).json({ 
                        success: false,
                        message: `No se encontró cliente con el teléfono ${phone}` 
                    });
                }
                
                criteria.clientId = client.id;
            } else {
                 return res.status(400).json({ 
                     success: false,
                     message: "Debe proporcionar 'phone' (para uno) o 'all': true (para todos)" 
                 });
            }

            const result = await interactionRepository.delete(criteria);
            
            return res.json({ 
                success: true, 
                message: `Reseteados ${result.affected} registro(s) de recordatorio.`,
                affected: result.affected
            });

        } catch (error) {
             console.error(error);
             return res.status(500).json({ message: "Error al resetear recordatorios", error });
        }
    },

    getSuspensionCandidates: async (req: Request, res: Response) => {
        try {
            const clientRepository = AppDataSource.getRepository(Client);
            const paymentRepository = AppDataSource.getRepository(Payment);

            const currentDate = new Date();
            // Parametros opcionales, defecto mes actual (si se corre el 6 de Feb, busca pagos de FEBRERO)
            let queryMonth = currentDate.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
            let queryYear = currentDate.getFullYear();

            // Soportar override para pruebas o lógica específica (ej: consultar mes anterior)
            if (req.query.month) queryMonth = (req.query.month as string).trim().toUpperCase();
            if (req.query.year) queryYear = parseInt(req.query.year as string, 10);
            
            // 1. Obtener clientes activos con sus instalaciones
             const clients = await clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.installations', 'installation', 'installation.isDeleted = :isDeleted AND installation.isActive = :isActive', { isDeleted: false, isActive: true })
                .where('client.status = :status', { status: 'active' })
                .getMany();

            const candidates = [];
            const today = new Date();
            today.setHours(0,0,0,0);

            // Optimización: traer todos los pagos PAGADOS del mes de una vez
            const clientIds = clients.map(c => c.id);
            if (clientIds.length === 0) return res.json([]);

            const monthNames = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
            const queryMonthIndex = monthNames.indexOf(queryMonth.toUpperCase());
            // Calcular el último día del mes consultado para comparaciones
            // Si queryMonthIndex es -1 (error), usamos mes actual 0 por seguridad, aunque idealmente validar
            const safeMonthIndex = queryMonthIndex !== -1 ? queryMonthIndex : 0;
            const endOfQueryPeriod = new Date(queryYear, safeMonthIndex + 1, 0, 23, 59, 59); // Ultimo dia del mes consultado

            const allPayments = await paymentRepository.find({
                where: [
                    { client: { id: In(clientIds) }, paymentMonth: queryMonth, paymentYear: queryYear, status: 'paid' },
                    { client: { id: In(clientIds) }, paymentMonth: queryMonth.toLowerCase(), paymentYear: queryYear, status: 'paid' }
                ],
                relations: ['client'] 
            });
            
            const paidClientIds = new Set(allPayments.map(p => p.client.id));

            for (const client of clients) {
                // 1. Chequeo de Extensión de Suspensión
                if (client.suspension_extension_date) {
                    const extDate = new Date(client.suspension_extension_date);
                    // Ajustar zona horaria local ignorando horas para comparación de fecha pura
                    extDate.setHours(23, 59, 59, 999);
                    
                    // Si la fecha de extensión es HOY o FUTURO, se respeta.
                    if (extDate >= today) {
                        continue; // SALTAR: El cliente tiene plazo extendido
                    }
                }

                // 2. Chequeo de Pago
                // Si el cliente tiene AL MENOS un pago registrado como 'paid' para este mes/año, se salva.
                if (paidClientIds.has(client.id)) {
                    continue; // SALTAR: Ya pagó (o al menos una parte, asumimos ok para no cortar error)
                }

                // 3. Chequeo de Fecha de Instalación (NUEVO)
                // Si TODAS las instalaciones del cliente son posteriores al periodo cobrado, no es moroso
                // Si tiene al menos una instalacion vieja (que debio pagar) y no pagó, es candidato.
                
                // Filtrar instalaciones activas que debieron facturar en este periodo
                const billableInstallations = (client.installations || []).filter(inst => {
                    if (!inst.installationDate) return true; // Si no tiene fecha, asumimos antigua (cobrable)
                    const installDate = new Date(inst.installationDate);
                    // Una instalacion es cobrable si se instaló ANTES o DURANTE el mes consultado.
                    // Ej: Consultado ENERO. Fin periodo: 31 Enero.
                    // Instalado 15 Enero -> Cobrable.
                    // Instalado 1 Febrero -> InstallDate > EndOfPeriod -> NO Cobrable.
                    return installDate <= endOfQueryPeriod;
                });

                if (billableInstallations.length === 0) {
                     continue; // SALTAR: Cliente nuevo (sus instalaciones son posteriores al mes de deuda)
                }

                // 4. Es candidato a suspensión (Moroso). Agregar sus instalaciones OLT.
                for (const installation of billableInstallations) {
                    // Solo incluimos instalaciones controlables (con SN o PON/ONU ID)
                    // Opcional: Incluir todas para reporte manual
                    const hasOltData = (installation.ponId && installation.onuId) || installation.onuSerialNumber;
                    
                    candidates.push({
                        clientId: client.id,
                        clientName: client.fullName,
                        installationId: installation.id,
                        // Datos para el endpoint de corte
                        action_identifier: installation.onuSerialNumber || installation.id, 
                        ponId: installation.ponId,
                        onuId: installation.onuId,
                        onuSerialNumber: installation.onuSerialNumber,
                        address: client.installationAddress,
                        phone: client.primaryPhone,
                        reason: `Sin pago registrado para ${queryMonth} ${queryYear}`,
                        extensionDate: client.suspension_extension_date,
                        automatable: !!hasOltData
                    });
                }
            }

            return res.json({
                period: `${queryMonth} ${queryYear}`,
                total_candidates: candidates.length,
                candidates: candidates
            });

        } catch (error: any) {
            console.error("Error getting suspension candidates:", error);
            return res.status(500).json({ message: "Error interno", error: error.message });
        }
    }
};
