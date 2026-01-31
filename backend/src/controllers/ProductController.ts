import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { ProductSold } from '../entities/ProductSold';
import { ProductInstallment } from '../entities/ProductInstallment';
import { Client } from '../entities/Client';
import { createNoteInteraction } from '../utils/interactionUtils';

export class ProductController {
    private productRepository = AppDataSource.getRepository(ProductSold);
    private installmentRepository = AppDataSource.getRepository(ProductInstallment);
    private clientRepository = AppDataSource.getRepository(Client);

    // Convierte 'YYYY-MM-DD' en fecha local para evitar desfases por zona horaria
    private parseLocalDate(value: string | Date | undefined): Date | undefined {
        if (!value) return undefined;
        if (value instanceof Date) return value;
        if (/T/.test(value)) return new Date(value);
        const [y, m, d] = value.split('-').map(Number);
        if (!y || !m || !d) return new Date(value);
        return new Date(y, m - 1, d);
    }

    async createProduct(req: Request, res: Response) {
        try {
            const { 
                clientId, 
                productName, 
                totalAmount, 
                installments,
                saleDate,
                notes 
            } = req.body;

            const client = await this.clientRepository.findOne({ where: { id: clientId } });
            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            const installmentAmount = Math.round(totalAmount / installments);

            const product = this.productRepository.create({
                client,
                productName,
                totalAmount,
                installments,
                installmentAmount,
                saleDate: this.parseLocalDate(saleDate)!,
                notes
            });

            await this.productRepository.save(product);

            // Crear las cuotas
            const baseDate = this.parseLocalDate(saleDate)!;
            const installmentPromises = Array.from({ length: installments }, (_, index) => {
                // Nueva regla: Cuota 1 vence el 5 del mes siguiente a la venta.
                // Cuota 2 vence el 5 del mes subsiguiente, etc.
                // Ej: Venta Enero. Cuota 1 vence 05 Feb. Cuota 2 vence 05 Mar.
                const dueDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1 + index, 5);
                
                return this.installmentRepository.create({
                    product,
                    installmentNumber: index + 1,
                    amount: installmentAmount,
                    dueDate: dueDate,
                    status: 'pending'
                });
            });

            await this.installmentRepository.save(installmentPromises);

            if (notes) {
                await createNoteInteraction(
                    clientId, 
                    notes, 
                    'Venta de Producto (Creación)', 
                    (req as any).user?.id
                );
            }

            return res.status(201).json(product);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al crear el producto' });
        }
    }

    /**
     * Generar (o regenerar) cuotas faltantes para un producto específico.
     * POST /api/products/:productId/backfill-installments
     */
    async backfillInstallments(req: Request, res: Response) {
        try {
            const { productId } = req.params;
            const product = await this.productRepository.findOne({
                where: { id: parseInt(productId) },
                relations: ['installmentPayments']
            });
            if (!product) return res.status(404).json({ message: 'Producto no encontrado' });

            const existing = product.installmentPayments || [];
            const pending = existing.filter(i => i.status === 'pending');
            const completed = existing.filter(i => i.status === 'completed');

            // Si faltan crear cuotas (por número) o alguna cuota quedó sin generar
            const need = product.installments - existing.length;
            const created: ProductInstallment[] = [];

            // Base para fechas: usar saleDate o última dueDate existente
            let current = this.parseLocalDate(product.saleDate)!;
            if (existing.length > 0) {
                const lastDue = existing.reduce((acc, cur) => (acc > cur.dueDate ? acc : cur.dueDate), existing[0].dueDate);
                current = this.parseLocalDate(lastDue)!;
            }

            for (let i = 0; i < need; i++) {
                current.setMonth(current.getMonth() + 1);
                const inst = this.installmentRepository.create({
                    product,
                    installmentNumber: existing.length + i + 1,
                    amount: product.installmentAmount,
                    dueDate: new Date(current),
                    status: 'pending'
                });
                await this.installmentRepository.save(inst);
                created.push(inst);
            }

            return res.json({
                message: 'Backfill completado',
                productId: product.id,
                existing: existing.length,
                created: created.length,
                totalExpected: product.installments
            });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error en backfill de cuotas' });
        }
    }

    /**
     * Backfill global para todos los productos con cuotas faltantes.
     * POST /api/products/backfill-installments
     */
    async backfillAllInstallments(_req: Request, res: Response) {
        try {
            const products = await this.productRepository.find({ relations: ['installmentPayments'] });
            const summary: any[] = [];
            for (const product of products) {
                const existing = product.installmentPayments || [];
                const need = product.installments - existing.length;
                if (need <= 0) {
                    summary.push({ productId: product.id, created: 0, skipped: true });
                    continue;
                }
                let current = this.parseLocalDate(product.saleDate)!;
                if (existing.length > 0) {
                    const lastDue = existing.reduce((acc, cur) => (acc > cur.dueDate ? acc : cur.dueDate), existing[0].dueDate);
                    current = this.parseLocalDate(lastDue)!;
                }
                for (let i = 0; i < need; i++) {
                    current.setMonth(current.getMonth() + 1);
                    const inst = this.installmentRepository.create({
                        product,
                        installmentNumber: existing.length + i + 1,
                        amount: product.installmentAmount,
                        dueDate: new Date(current),
                        status: 'pending'
                    });
                    await this.installmentRepository.save(inst);
                }
                summary.push({ productId: product.id, created: need, skipped: false });
            }
            return res.json({ message: 'Backfill global completado', summary });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error en backfill global de cuotas' });
        }
    }

    async getByClient(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const products = await this.productRepository.find({
                where: { client: { id: parseInt(clientId) } },
                relations: ['installmentPayments'],
                order: { created_at: 'DESC' }
            });
            return res.json(products);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al obtener los productos' });
        }
    }

    async updateProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { productName, notes, status, totalAmount, installments, saleDate } = req.body;

            const product = await this.productRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['installmentPayments', 'client']
            });

            if (!product) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }

            // Crear interacción si la nota cambia
            if (notes !== undefined && notes !== product.notes && notes.trim() !== '') {
                if (product.client) {
                     await createNoteInteraction(
                        product.client.id, 
                        notes, 
                        'Venta de Producto (Actualización)', 
                        (req as any).user?.id
                    );
                }
            }

            // Si cambia el monto total o el número de cuotas, recalcular el monto por cuota
            if (totalAmount !== undefined && installments !== undefined) {
                const installmentAmount = Math.round(totalAmount / installments);
                Object.assign(product, {
                    productName,
                    notes,
                    status,
                    totalAmount,
                    installments,
                    installmentAmount,
                    saleDate: saleDate ? this.parseLocalDate(saleDate)! : product.saleDate
                });

                // Actualizar o crear las cuotas según sea necesario
                if (product.installmentPayments) {
                    // Eliminar cuotas pendientes existentes
                    await this.installmentRepository.delete({
                        product: { id: product.id },
                        status: 'pending'
                    });

                    // Crear nuevas cuotas
                    const currentDate = this.parseLocalDate(saleDate || (product.saleDate as unknown as string))!;
                    const newInstallments = Array.from({ length: installments }, (_, index) => {
                        const existingInstallment = product.installmentPayments.find(
                            ip => ip.installmentNumber === index + 1
                        );

                        if (existingInstallment && existingInstallment.status === 'completed') {
                            return existingInstallment;
                        }

                        currentDate.setMonth(currentDate.getMonth() + 1);
                        return this.installmentRepository.create({
                            product,
                            installmentNumber: index + 1,
                            amount: installmentAmount,
                            dueDate: new Date(currentDate),
                            status: 'pending'
                        });
                    });

                    await this.installmentRepository.save(newInstallments);
                }
            } else {
                // Si no hay cambios en monto o cuotas, solo actualizar los otros campos
                Object.assign(product, {
                    productName,
                    notes,
                    status,
                    saleDate: saleDate ? this.parseLocalDate(saleDate)! : product.saleDate
                });
            }

            await this.productRepository.save(product);
            
            // Recargar el producto con las cuotas actualizadas
            const updatedProduct = await this.productRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['installmentPayments']
            });

            return res.json(updatedProduct);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al actualizar el producto' });
        }
    }

    async updateInstallment(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { paymentDate, status, notes } = req.body;

            const installment = await this.installmentRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ['product', 'product.client']
            });

            if (!installment) {
                return res.status(404).json({ message: 'Cuota no encontrada' });
            }

            // Crear interacción si la nota cambia
            if (notes !== undefined && notes !== installment.notes && notes.trim() !== '') {
                if (installment.product && installment.product.client) {
                     await createNoteInteraction(
                        installment.product.client.id, 
                        notes, 
                        `Cuota Producto ${installment.installmentNumber} (Actualización)`, 
                        (req as any).user?.id
                    );
                }
            }

            Object.assign(installment, {
                paymentDate: paymentDate ? this.parseLocalDate(paymentDate)! : null,
                status,
                notes
            });

            await this.installmentRepository.save(installment);

            // Actualizar estado del producto si todas las cuotas están pagadas
            if (status === 'completed') {
                const allInstallments = await this.installmentRepository.find({
                    where: { product: { id: installment.product.id } }
                });

                const allPaid = allInstallments.every(inst => inst.status === 'completed');
                if (allPaid) {
                    await this.productRepository.update(
                        installment.product.id,
                        { status: 'completed' }
                    );
                }
            }

            return res.json(installment);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al actualizar la cuota' });
        }
    }

    async deleteProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const product = await this.productRepository.findOne({ 
                where: { id: parseInt(id) },
                relations: ['installmentPayments'] 
            });

            if (!product) {
                return res.status(404).json({ message: 'Producto no encontrado' });
            }
            
            if (product.installmentPayments && product.installmentPayments.length > 0) {
                await this.installmentRepository.remove(product.installmentPayments);
            }

            await this.productRepository.remove(product);
            
            return res.json({ message: 'Producto eliminado correctamente' });
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al eliminar el producto' });
        }
    }

    async getInstallments(req: Request, res: Response) {
        try {
            const { productId } = req.params;
            const installments = await this.installmentRepository.find({
                where: { product: { id: parseInt(productId) } },
                order: { installmentNumber: 'ASC' }
            });
            return res.json(installments);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al obtener las cuotas' });
        }
    }
}