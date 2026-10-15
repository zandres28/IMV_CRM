import { In } from 'typeorm';

/**
 * Arrastre de saldo anterior entre facturas mensuales.
 *
 * Contexto: cuando un cobro mensual impago de un mes anterior no se logra
 * notificar (o simplemente queda vencido), su monto se incluye en la factura del
 * mes siguiente (`previousDebtAmount`) para que la deuda no se pierda. Para que
 * el cliente no pague dos veces el mismo concepto, la factura vieja se marca
 * como 'pagado' cuando se paga la nueva (y viceversa: si la vieja se paga por
 * separado, la nueva se reajusta).
 */

/** Extrae los IDs de facturas arrastradas desde `previousDebtPayments` (CSV). */
export function extractPaymentIds(raw?: string | null): number[] {
    if (!raw) return [];
    return String(raw)
        .split(',')
        .map(s => parseInt(s.trim(), 10))
        .filter(n => !Number.isNaN(n));
}

/**
 * Salda las facturas anteriores que fueron absorbidas por `payment`.
 * Devuelve cuántas facturas se marcaron como pagadas.
 */
export async function absorbPreviousDebtPayments(paymentRepository: any, payment: any): Promise<number> {
    const ids = extractPaymentIds(payment?.previousDebtPayments);
    if (ids.length === 0) return 0;

    const previous = await paymentRepository.findBy({ id: In(ids) });
    let count = 0;
    for (const old of previous) {
        if (old.status === 'pagado' || old.status === 'anulado') continue;
        old.status = 'pagado';
        old.paymentDate = payment.paymentDate || new Date();
        if (payment.paymentMethod) old.paymentMethod = payment.paymentMethod;
        old.notes = (old.notes ? old.notes + ' | ' : '') +
            `Absorbida en la factura de ${payment.paymentMonth} ${payment.paymentYear}`;
        await paymentRepository.save(old);
        count++;
    }
    return count;
}

/**
 * Reajusta el saldo anterior de las facturas NUEVAS impagas de un cliente cuando
 * una factura anterior se salda por separado (p. ej. el flujo de WhatsApp paga
 * siempre la más antigua), para no cobrar dos veces el mismo concepto.
 * Devuelve cuántas facturas se reajustaron.
 */
export async function syncCarryOverAfterPayment(
    paymentRepository: any,
    clientId: number,
    paidPaymentId: number
): Promise<number> {
    if (!clientId || !paidPaymentId) return 0;

    const invoices = await paymentRepository.find({
        where: {
            client: { id: clientId },
            paymentType: 'monthly',
            status: In(['pendiente', 'vencido'])
        }
    });

    let adjusted = 0;
    for (const invoice of invoices) {
        const ids = extractPaymentIds(invoice.previousDebtPayments);
        if (!ids.includes(paidPaymentId)) continue;

        const remaining = ids.filter(id => id !== paidPaymentId);
        const remainingRows = remaining.length ? await paymentRepository.findBy({ id: In(remaining) }) : [];
        const stillUnpaid = remainingRows.filter((p: any) => p.status !== 'pagado' && p.status !== 'anulado');
        const newCarry = stillUnpaid.reduce((s: number, p: any) => s + Number(p.amount), 0);
        const diff = Number(invoice.previousDebtAmount || 0) - newCarry;
        if (diff === 0) continue;

        invoice.previousDebtAmount = newCarry;
        invoice.previousDebtPayments = stillUnpaid.map((p: any) => p.id).join(',') || null;
        invoice.amount = Math.max(0, Number(invoice.amount) - diff);
        invoice.notes = (invoice.notes || '') +
            ` | Saldo anterior reajustado (-$${Math.round(diff).toLocaleString('es-CO')})`;
        await paymentRepository.save(invoice);
        adjusted++;
    }
    return adjusted;
}
