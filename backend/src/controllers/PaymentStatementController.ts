import { Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import { AppDataSource } from '../config/database';
import { Client } from '../entities/Client';
import { Payment } from '../entities/Payment';
import { AdditionalService } from '../entities/AdditionalService';
import { ProductInstallment } from '../entities/ProductInstallment';
import { PaymentStatement } from '../entities/PaymentStatement';
import { IMV_LOGO_BASE64 } from '../assets/imvLogoBase64';

const MONTH_NAMES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
const MONTH_NAMES_LOWER = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// Datos fijos del cobrador (plantilla oficial cuentas de cobro IMV)
const COBRADOR = {
    nombre: 'IMV INTERNET',
    nit: '98390966-8',
    direccion: 'Cra 50 # 13A-59',
    telefono: '333 400 6212',
};

// Base del consecutivo 2026: la numeración manual llegó hasta 0011 (cc FCR4 julio 2026)
const BASE_CONSECUTIVE_2026 = 11;

// Colores (identidad Nexum/IMV)
const AZUL = '#2D5BFF';
const TINTA = '#0E1330';
const TINTA_SUAVE = '#3A4163';
const APAGADO = '#6B7290';
const BORDE = '#E2E6F0';
const HUNDIDO = '#EDF0F7';
const AZUL_SUAVE = '#EAF0FF';

// ---------- Número a letras (pesos) ----------
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

function decenasALetras(n: number): string {
    if (n <= 29) return UNIDADES[n];
    const d = Math.floor(n / 10);
    const u = n % 10;
    return u === 0 ? DECENAS[d] : `${DECENAS[d]} y ${UNIDADES[u]}`;
}

function centenasALetras(n: number): string {
    if (n < 100) return decenasALetras(n);
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100);
    const resto = n % 100;
    const centena = CENTENAS[c];
    return resto === 0 ? centena : `${centena} ${decenasALetras(resto)}`;
}

function milesALetras(n: number): string {
    if (n < 1000) return centenasALetras(n);
    const m = Math.floor(n / 1000);
    const resto = n % 1000;
    const miles = m === 1 ? 'mil' : `${centenasALetras(m)} mil`;
    return resto === 0 ? miles : `${miles} ${centenasALetras(resto)}`;
}

function numeroALetras(n: number): string {
    const entero = Math.floor(n);
    let letras: string;
    if (entero === 0) {
        letras = 'cero';
    } else if (entero < 1000000) {
        letras = milesALetras(entero);
    } else {
        const millones = Math.floor(entero / 1000000);
        const resto = entero % 1000000;
        const prefijo = millones === 1 ? 'un millón' : `${milesALetras(millones)} millones`;
        letras = resto === 0 ? prefijo : `${prefijo} ${milesALetras(resto)}`;
    }
    // Primera letra mayúscula
    letras = (letras.charAt(0).toUpperCase() + letras.slice(1)).trim();
    const centavos = Math.round((n - entero) * 100);
    return centavos > 0 ? `${letras} pesos con ${centavos} centavos` : `${letras} pesos`;
}

const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;

// ---------- Consecutivo idempotente ----------
async function getOrCreateStatement(clientId: number, year: number, month: string, amount: number): Promise<PaymentStatement> {
    const repo = AppDataSource.getRepository(PaymentStatement);
    const existing = await repo.findOneBy({ clientId, statementYear: year, statementMonth: month });
    if (existing) return existing;

    const maxRow = await repo.createQueryBuilder('s')
        .select('MAX(s.consecutive)', 'max')
        .where('s.statementYear = :year', { year })
        .getRawOne();
    let consecutive = (maxRow?.max ? Number(maxRow.max) : 0) + 1;
    // 2026 arranca en 12 porque la numeración manual llegó hasta 0011
    if (year === 2026) consecutive = Math.max(consecutive, BASE_CONSECUTIVE_2026 + 1);

    const accountNumber = `${clientId}-${String(consecutive).padStart(4, '0')}-${year}`;
    try {
        const saved = await repo.save({
            clientId, statementYear: year, statementMonth: month,
            consecutive, accountNumber, amount, issuedAt: new Date(),
        } as PaymentStatement);
        return saved;
    } catch (e: any) {
        // Carrera: otro request insertó primero → devolver el existente
        if (e?.code === 'ER_DUP_ENTRY') {
            const again = await repo.findOneBy({ clientId, statementYear: year, statementMonth: month });
            if (again) return again;
        }
        throw e;
    }
}

// ---------- Helpers de dibujo ----------
interface DetalleFila { concepto: string; valor: number; cantidad: number }

function buildStatementPdf(data: {
    accountNumber: string;
    fechaEmision: string;
    periodo: string;
    fechaLimite: string;
    clienteNombre: string;
    clienteId: string;
    detalles: DetalleFila[];
    subtotal: number;
    descuento: number;
    adicionales: number;
    total: number;
    valorLetras: string;
}): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: 'LETTER', margins: { top: 34, bottom: 34, left: 50, right: 50 } });
        const chunks: Buffer[] = [];
        doc.on('data', (c: Buffer) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const X = 50; // margen izquierdo — contenido centrado (50pt por lado)
        const W = doc.page.width - 100; // ancho útil

        const sectionHeader = (title: string) => {
            doc.rect(X, doc.y, W, 17).fill(AZUL);
            doc.fill('#FFFFFF').font('Helvetica-Bold').fontSize(9)
                .text(title.toUpperCase(), X + 8, doc.y + 4.5, { characterSpacing: 0.8 });
            doc.fill(TINTA).font('Helvetica');
            doc.y += 17;
        };

        const row = (label: string, value: string, opts: { boldValue?: boolean } = {}) => {
            const top = doc.y;
            doc.font('Helvetica').fontSize(9);
            const h = Math.max(14, doc.heightOfString(value, { width: W * 0.62 })) + 6;
            doc.fontSize(8.5).fillColor(APAGADO).text(label, X + 8, top + 4, { width: W * 0.32 });
            doc.font(opts.boldValue ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(TINTA)
                .text(value, X + W * 0.34, top + 4, { width: W * 0.64 });
            doc.moveTo(X, top + h).lineTo(X + W, top + h).lineWidth(0.5).strokeColor(BORDE).stroke();
            doc.y = top + h + 1;
            doc.fillColor(TINTA).font('Helvetica');
        };

        // ===== Header: logo + título =====
        const logoBuffer = Buffer.from(IMV_LOGO_BASE64, 'base64');
        try {
            doc.image(logoBuffer, X, doc.y, { fit: [140, 42] });
        } catch {
            // si el logo falla, continuar sin él
        }
        const headerTop = doc.y;
        doc.font('Helvetica-Bold').fontSize(17).fillColor(AZUL)
            .text('CUENTA DE COBRO', X + W - 220, headerTop + 2, { width: 220, align: 'right' });
        doc.font('Helvetica').fontSize(9.5).fillColor(TINTA_SUAVE)
            .text(`Número de Cuenta: ${data.accountNumber}`, X + W - 220, headerTop + 25, { width: 220, align: 'right' });
        doc.y = Math.max(doc.y, headerTop + 42) + 8;
        doc.moveTo(X, doc.y).lineTo(X + W, doc.y).lineWidth(2).strokeColor(AZUL).stroke();
        doc.y += 10;

        // ===== Información General =====
        sectionHeader('Información General');
        row('Fecha de Emisión', data.fechaEmision);
        row('Período del Servicio', data.periodo);
        row('Fecha Límite de Pago', data.fechaLimite, { boldValue: true });
        doc.y += 7;

        // ===== Datos del Cobrador =====
        sectionHeader('Datos del Cobrador');
        row('Nombre / Razón Social', COBRADOR.nombre, { boldValue: true });
        row('NIT / C.C.', COBRADOR.nit);
        row('Dirección', COBRADOR.direccion);
        row('Teléfono', COBRADOR.telefono);
        doc.y += 7;

        // ===== Datos del Cliente =====
        sectionHeader('Datos del Cliente');
        row('Nombre del Cliente', data.clienteNombre, { boldValue: true });
        row('NIT / C.C. Cliente', data.clienteId);
        doc.y += 7;

        // ===== Detalle del Servicio =====
        sectionHeader('Detalle del Servicio');
        // cabecera tabla
        doc.rect(X, doc.y, W, 16).fill(HUNDIDO);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(APAGADO);
        const hdrTop = doc.y;
        doc.text('CONCEPTO', X + 8, hdrTop + 4.5, { width: W * 0.55, characterSpacing: 0.5 });
        doc.text('VALOR UNITARIO', X + W * 0.55, hdrTop + 4.5, { width: W * 0.3, align: 'right', characterSpacing: 0.5 });
        doc.text('CANTIDAD', X + W * 0.85, hdrTop + 4.5, { width: W * 0.15 - 8, align: 'right', characterSpacing: 0.5 });
        doc.y = hdrTop + 16;
        doc.font('Helvetica').fillColor(TINTA);
        for (const d of data.detalles) {
            const top = doc.y;
            doc.font('Helvetica').fontSize(9);
            const h = Math.max(14, doc.heightOfString(d.concepto, { width: W * 0.53 })) + 6;
            doc.fillColor(TINTA)
                .text(d.concepto, X + 8, top + 3.5, { width: W * 0.53 });
            doc.fontSize(9).text(fmtCOP(d.valor), X + W * 0.55, top + 3.5, { width: W * 0.3, align: 'right' });
            doc.text(String(d.cantidad), X + W * 0.85, top + 3.5, { width: W * 0.15 - 8, align: 'right' });
            doc.moveTo(X, top + h).lineTo(X + W, top + h).lineWidth(0.5).strokeColor(BORDE).stroke();
            doc.y = top + h + 1;
        }
        doc.y += 8;

        // ===== Totales =====
        sectionHeader('Totales');
        const totalRow = (label: string, value: string, opts: { bold?: boolean; shade?: boolean; color?: string } = {}) => {
            const top = doc.y;
            const h = opts.bold ? 18 : 15;
            if (opts.shade) {
                doc.rect(X, top, W, h).fill(AZUL_SUAVE);
            }
            doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 10 : 9)
                .fillColor(opts.color || (opts.bold ? AZUL : APAGADO))
                .text(label, X + 8, top + 3.5, { width: W * 0.6 });
            doc.font(opts.bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(opts.bold ? 10 : 9)
                .fillColor(opts.color || (opts.bold ? AZUL : TINTA))
                .text(value, X + W * 0.5, top + 3.5, { width: W * 0.5 - 8, align: 'right' });
            doc.y = top + h + 1;
            doc.fillColor(TINTA).font('Helvetica');
        };
        totalRow('Subtotal', fmtCOP(data.subtotal));
        if (data.descuento > 0) totalRow('Descuento por interrupción del servicio', `-${fmtCOP(data.descuento)}`, { color: '#E5484D' });
        if (data.adicionales > 0) totalRow('Servicios y productos adicionales', fmtCOP(data.adicionales));
        totalRow('Total a Pagar', fmtCOP(data.total), { bold: true, shade: true });
        doc.y += 4;
        row('Valor en Letras', data.valorLetras, { boldValue: true });
        doc.y += 7;

        // ===== Datos de Pago =====
        sectionHeader('Datos de Pago');
        doc.moveDown(0.2);
        doc.font('Helvetica').fontSize(9).fillColor(TINTA).lineGap(2);
        doc.text('Transferencia desde cualquier banco a la llave Bre-B: ', { continued: true });
        doc.font('Helvetica-Bold').text('3334006212', { continued: true });
        doc.font('Helvetica').text('.');
        doc.font('Helvetica').text('Cuenta de Ahorros Bancolombia: ', { continued: true });
        doc.font('Helvetica-Bold').text('912-478680-17', { continued: true });
        doc.font('Helvetica').text(' a nombre de Alvaro Andrés Zambrano.');
        doc.font('Helvetica');
        doc.lineGap(0);
        doc.y += 7;

        // ===== Notas =====
        sectionHeader('Notas');
        doc.moveDown(0.2);
        doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(APAGADO)
            .text('Régimen Tributario: Declaro que no soy responsable de IVA (régimen simplificado).');
        doc.font('Helvetica');

        doc.end();
    });
}

export const PaymentStatementController = {
    /**
     * GET /api/n8n/payment-statement?clientId=73&month=JULIO&year=2026[&format=json]
     * Genera (o recupera) la cuenta de cobro del cliente para el mes indicado y devuelve el PDF.
     * El número de cuenta es {clientId}-{consecutivo anual}-{año} y es idempotente por cliente+mes.
     */
    getPaymentStatement: async (req: Request, res: Response) => {
        try {
            const clientId = parseInt(req.query.clientId as string, 10);
            if (!clientId || Number.isNaN(clientId)) {
                return res.status(400).json({ error: 'Parámetro clientId es requerido (numérico)' });
            }

            const now = new Date();
            const month = ((req.query.month as string) || MONTH_NAMES[now.getMonth()]).trim().toUpperCase();
            const year = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();
            const monthIndex = MONTH_NAMES.indexOf(month);
            if (monthIndex === -1) {
                return res.status(400).json({ error: `Mes inválido: ${month}. Usar ${MONTH_NAMES.join('/')}` });
            }

            const clientRepository = AppDataSource.getRepository(Client);
            const client = await clientRepository
                .createQueryBuilder('client')
                .leftJoinAndSelect('client.installations', 'installation',
                    'installation.isDeleted = :isDeleted AND installation.isActive = :isActive',
                    { isDeleted: false, isActive: true })
                .leftJoinAndSelect('installation.servicePlan', 'servicePlan')
                .where('client.id = :id', { id: clientId })
                .getOne();

            if (!client) {
                return res.status(404).json({ error: 'Cliente no encontrado' });
            }
            if (!client.installations || client.installations.length === 0) {
                return res.status(404).json({ error: 'El cliente no tiene instalaciones activas' });
            }

            // --- Pago del mes (misma prioridad que payment-reminders) ---
            const paymentRepository = AppDataSource.getRepository(Payment);
            const payments = await paymentRepository.find({
                where: [
                    { client: { id: clientId }, paymentMonth: month, paymentYear: year },
                    { client: { id: clientId }, paymentMonth: month.toLowerCase(), paymentYear: year },
                ],
                relations: ['client'],
            });
            let payment = payments.find(p => p.paymentType === 'monthly');
            if (!payment) payment = payments.find(p => p.paymentType !== 'installation');

            // --- Valor del plan ---
            const activeInstallations = client.installations.filter(i => i.isActive && !i.isDeleted);
            let valorPlan = activeInstallations.reduce((sum, inst) => sum + Number(inst.monthlyFee || 0), 0);
            let descuento = 0;
            if (payment) {
                descuento = Number(payment.outageDiscountAmount || 0);
                valorPlan = Math.max(0, Number(payment.servicePlanAmount) - descuento);
            }

            // --- Servicios adicionales activos ---
            const additionalServiceRepository = AppDataSource.getRepository(AdditionalService);
            const additionalServices = await additionalServiceRepository.find({
                where: { client: { id: clientId }, status: 'activo' as any },
            });
            const additionalAmount = additionalServices.reduce((sum, s) => sum + Number(s.monthlyFee || 0), 0);

            // --- Cuotas de productos pendientes del período ---
            const productInstallmentRepository = AppDataSource.getRepository(ProductInstallment);
            const allInstallments = await productInstallmentRepository.find({
                where: { product: { client: { id: clientId } }, status: 'pendiente' },
                relations: ['product'],
            });
            const roundToHundred = (amount: number) => Math.ceil(amount / 100) * 100;
            const currentMonthIndex = year * 12 + monthIndex;
            const dueInstallments = allInstallments.filter(p => {
                const saleDate = new Date(p.product.saleDate);
                const saleMonthIndex = saleDate.getFullYear() * 12 + saleDate.getMonth();
                const targetMonthIndex = saleMonthIndex + (p.installmentNumber - 1);
                return targetMonthIndex <= currentMonthIndex;
            });
            const productNames = [...new Set(dueInstallments.map(p => p.product.productName))];
            const productDebt = dueInstallments.reduce((acc, p) => acc + roundToHundred(Number(p.amount)), 0);

            // --- Detalle (concepto, valor, cantidad) ---
            const detalles: DetalleFila[] = [];
            const planesPorNombre = new Map<string, { fee: number; count: number }>();
            for (const inst of activeInstallations) {
                const velocidad = `${inst.servicePlan?.speedMbps} Megas`;
                const nombre = inst.servicePlan
                    ? (inst.servicePlan.name.includes(velocidad)
                        ? inst.servicePlan.name
                        : `${inst.servicePlan.name} (${velocidad})`)
                    : (inst.serviceType || 'Servicio de Internet');
                const prev = planesPorNombre.get(nombre) || { fee: 0, count: 0 };
                planesPorNombre.set(nombre, { fee: Number(inst.monthlyFee || 0), count: prev.count + 1 });
            }
            let planIdx = 0;
            const planNames = [...planesPorNombre.keys()];
            const totalPlanFee = [...planesPorNombre.values()].reduce((s, v) => s + v.fee * v.count, 0);
            for (const [nombre, info] of planesPorNombre) {
                // Si hay un solo grupo de plan, usar valorPlan (ya con descuento aplicado) para que coincida con Totales
                const valor = planNames.length === 1 && planIdx === 0 && totalPlanFee > 0
                    ? valorPlan
                    : info.fee;
                detalles.push({ concepto: `Internet ${nombre}`, valor, cantidad: info.count });
                planIdx++;
            }
            for (const s of additionalServices) {
                detalles.push({ concepto: `${s.serviceName} (servicio adicional)`, valor: Number(s.monthlyFee || 0), cantidad: 1 });
            }
            for (const name of productNames) {
                const cuotas = dueInstallments.filter(p => p.product.productName === name);
                const monto = cuotas.reduce((acc, p) => acc + roundToHundred(Number(p.amount)), 0);
                const cuotaTxt = cuotas.length > 1
                    ? ` (cuotas ${cuotas.map(c => `${c.installmentNumber}/${c.product.installments}`).join(', ')})`
                    : (cuotas[0] ? ` (cuota ${cuotas[0].installmentNumber}/${cuotas[0].product.installments})` : '');
                detalles.push({ concepto: `${name}${cuotaTxt}`, valor: monto, cantidad: 1 });
            }

            const subtotal = valorPlan + descuento;
            const adicionales = additionalAmount + productDebt;
            const total = valorPlan + adicionales;

            // --- Consecutivo / número de cuenta (idempotente) ---
            const statement = await getOrCreateStatement(clientId, year, month, total);

            // --- Fechas ---
            const fechaEmision = `${now.getDate()} de ${MONTH_NAMES_LOWER[now.getMonth()]} de ${now.getFullYear()}`;
            const lastDay = new Date(year, monthIndex + 1, 0).getDate();
            const mm = String(monthIndex + 1).padStart(2, '0');
            const periodo = `01-${mm}-${year} hasta ${lastDay}-${mm}-${year}`;
            let fechaLimite: string;
            if (payment?.dueDate) {
                const dd = new Date(payment.dueDate);
                fechaLimite = `${dd.getDate()} de ${MONTH_NAMES_LOWER[dd.getMonth()]} de ${dd.getFullYear()}`;
            } else {
                const dl = new Date(year, monthIndex + 1, 5);
                fechaLimite = `5 de ${MONTH_NAMES_LOWER[dl.getMonth()]} de ${dl.getFullYear()}`;
            }

            // Modo JSON: metadatos sin PDF (pruebas / n8n)
            if (req.query.format === 'json') {
                return res.json({
                    accountNumber: statement.accountNumber,
                    consecutive: statement.consecutive,
                    clientId,
                    month,
                    year,
                    total,
                    valorLetras: numeroALetras(total),
                });
            }

            const pdfBuffer = await buildStatementPdf({
                accountNumber: statement.accountNumber,
                fechaEmision,
                periodo,
                fechaLimite,
                clienteNombre: client.fullName,
                clienteId: client.identificationNumber || 'N/A',
                detalles,
                subtotal,
                descuento,
                adicionales,
                total,
                valorLetras: numeroALetras(total),
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="CuentaCobro-${statement.accountNumber}.pdf"`);
            return res.send(pdfBuffer);
        } catch (error) {
            console.error('[PaymentStatementController] Error generando cuenta de cobro:', error);
            return res.status(500).json({ error: 'Error interno generando la cuenta de cobro' });
        }
    },
};
