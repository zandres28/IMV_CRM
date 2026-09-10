import { Request, Response } from 'express';
import { Not } from 'typeorm';
import { AppDataSource } from '../config/database';
import { NetflixAccount } from '../entities/NetflixAccount';
import { NetflixSlot } from '../entities/NetflixSlot';
import { Client } from '../entities/Client';
import { AdditionalService } from '../entities/AdditionalService';
import { createNoteInteraction } from '../utils/interactionUtils';

const NETFLIX_SERVICE_NAME = 'netflix';

const generatePins = (existingPins: string[], count: number): string[] => {
    const used = new Set(existingPins);
    const pins: string[] = [];
    let attempts = 0;
    while (pins.length < count && attempts < 5000) {
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        attempts++;
        if (used.has(pin)) continue;
        used.add(pin);
        pins.push(pin);
    }
    return pins;
};

interface SlotPayload {
    id: number;
    slotIndex: number;
    profileName: string;
    pin: string;
    assignedAt: string | null;
    free: boolean;
    client: { id: number; fullName: string; primaryPhone: string } | null;
}

interface AccountPayload {
    id: number;
    email: string;
    maxSlots: number;
    notes: string | null;
    slots: SlotPayload[];
    freeSlots: number;
    occupiedSlots: number;
    full: boolean;
}

const serializeSlot = (slot: NetflixSlot): SlotPayload => ({
    id: slot.id,
    slotIndex: slot.slotIndex,
    profileName: slot.profileName,
    pin: slot.pin,
    assignedAt: slot.assignedAt ? slot.assignedAt.toISOString() : null,
    free: !slot.client,
    client: slot.client ? { id: slot.client.id, fullName: slot.client.fullName, primaryPhone: slot.client.primaryPhone } : null
});

const serializeAccount = (account: NetflixAccount): AccountPayload => {
    const slots = (account.slots || []).sort((a, b) => a.slotIndex - b.slotIndex);
    const occupied = slots.filter(s => s.client).length;
    return {
        id: account.id,
        email: account.email,
        maxSlots: account.maxSlots,
        notes: account.notes,
        slots: slots.map(serializeSlot),
        freeSlots: slots.length - occupied,
        occupiedSlots: occupied,
        full: slots.length > 0 && occupied >= slots.length
    };
};

const findActiveNetflixService = async (clientId: number): Promise<AdditionalService | null> => {
    try {
        const services = await AppDataSource.getRepository(AdditionalService).find({
            where: { client: { id: clientId }, status: 'activo' },
            relations: ['client'],
            order: { startDate: 'DESC' }
        });
        return services.find(s => (s.serviceName || '').toLowerCase() === NETFLIX_SERVICE_NAME) || null;
    } catch (e) {
        console.error('Error buscando servicio Netflix activo:', e);
        return null;
    }
};

export class NetflixAccountController {
    private accountRepository = AppDataSource.getRepository(NetflixAccount);
    private slotRepository = AppDataSource.getRepository(NetflixSlot);
    private clientRepository = AppDataSource.getRepository(Client);

    async getAll(req: Request, res: Response) {
        try {
            const accounts = await this.accountRepository.find({
                relations: ['slots', 'slots.client'],
                order: { email: 'ASC', slots: { slotIndex: 'ASC' } }
            });
            return res.json(accounts.map(serializeAccount));
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al obtener las cuentas de Netflix' });
        }
    }

    async create(req: Request, res: Response) {
        try {
            const { email, maxSlots, notes } = req.body;
            if (!email || !String(email).trim()) {
                return res.status(400).json({ message: 'El email de la cuenta es obligatorio' });
            }
            const count = Math.max(1, Math.min(Number(maxSlots) || 5, 8));

            const existingEmail = await this.accountRepository.findOne({ where: { email: String(email).trim() } });
            if (existingEmail) {
                return res.status(400).json({ message: 'Ya existe una cuenta con ese email' });
            }

            const account = new NetflixAccount();
            account.email = String(email).trim();
            account.maxSlots = count;
            account.notes = notes || null;

            const saved = await this.accountRepository.save(account);

            const pins = generatePins([], count);
            const slots = pins.map((pin, i) => {
                const slot = new NetflixSlot();
                slot.account = saved;
                slot.slotIndex = i + 1;
                slot.profileName = `Perfil ${i + 1}`;
                slot.pin = pin;
                slot.client = null;
                slot.additionalService = null;
                slot.assignedAt = null;
                return slot;
            });
            await this.slotRepository.save(slots);

            const full = await this.accountRepository.findOne({
                where: { id: saved.id },
                relations: ['slots', 'slots.client']
            });
            if (!full) {
                return res.status(500).json({ message: 'Error al crear la cuenta de Netflix' });
            }
            return res.status(201).json(serializeAccount(full));
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al crear la cuenta de Netflix' });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { email, maxSlots, notes } = req.body;

            const account = await this.accountRepository.findOne({
                where: { id: parseInt(id) },
                relations: ['slots', 'slots.client']
            });
            if (!account) {
                return res.status(404).json({ message: 'Cuenta de Netflix no encontrada' });
            }

            if (email !== undefined && String(email).trim() && String(email).trim() !== account.email) {
                const existing = await this.accountRepository.findOne({ where: { email: String(email).trim() } });
                if (existing && existing.id !== account.id) {
                    return res.status(400).json({ message: 'Ya existe otra cuenta con ese email' });
                }
                account.email = String(email).trim();
            }

            const prevMax = account.slots.length;
            const newMax = maxSlots !== undefined ? Math.max(1, Math.min(Number(maxSlots) || prevMax, 8)) : prevMax;

            if (newMax < prevMax) {
                const removable = account.slots
                    .filter(s => !s.client)
                    .sort((a, b) => b.slotIndex - a.slotIndex);
                const toRemove = removable.slice(0, prevMax - newMax);
                if (toRemove.length < prevMax - newMax) {
                    return res.status(400).json({ message: 'No se puede reducir la capacidad: hay perfiles ocupados' });
                }
                await this.slotRepository.remove(toRemove);
            } else if (newMax > prevMax) {
                const existingPins = account.slots.map(s => s.pin);
                const newPins = generatePins(existingPins, newMax - prevMax);
                const slots = newPins.map((pin, i) => {
                    const slot = new NetflixSlot();
                    slot.account = account;
                    slot.slotIndex = prevMax + i + 1;
                    slot.profileName = `Perfil ${prevMax + i + 1}`;
                    slot.pin = pin;
                    slot.client = null;
                    slot.additionalService = null;
                    slot.assignedAt = null;
                    return slot;
                });
                await this.slotRepository.save(slots);
            }

            if (notes !== undefined) account.notes = notes || null;
            account.maxSlots = newMax;
            await this.accountRepository.save(account);

            const full = await this.accountRepository.findOne({
                where: { id: account.id },
                relations: ['slots', 'slots.client']
            });
            if (!full) {
                return res.status(500).json({ message: 'Error al actualizar la cuenta de Netflix' });
            }
            return res.json(serializeAccount(full));
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al actualizar la cuenta de Netflix' });
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.accountRepository.delete(parseInt(id));
            if (result.affected === 0) {
                return res.status(404).json({ message: 'Cuenta de Netflix no encontrada' });
            }
            return res.status(204).send();
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al eliminar la cuenta de Netflix' });
        }
    }

    async assignSlot(req: Request, res: Response) {
        try {
            const { slotId } = req.params;
            const { clientId, pin } = req.body;

            const client = await this.clientRepository.findOneBy({ id: parseInt(clientId) });
            if (!client) {
                return res.status(404).json({ message: 'Cliente no encontrado' });
            }

            const slot = await this.slotRepository.findOne({
                where: { id: parseInt(slotId) },
                relations: ['account', 'client']
            });
            if (!slot) {
                return res.status(404).json({ message: 'Perfil de Netflix no encontrado' });
            }
            if (slot.client) {
                return res.status(400).json({ message: 'Ese perfil ya está asignado a un cliente' });
            }

            if (pin !== undefined && pin !== null && String(pin).trim()) {
                const newPin = String(pin).trim().padStart(4, '0').slice(0, 4);
                const dup = await this.slotRepository.count({
                    where: { account: { id: slot.account.id }, pin: newPin }
                });
                if (dup > 0) {
                    return res.status(400).json({ message: 'Ese PIN ya está en uso en esta cuenta' });
                }
                slot.pin = newPin;
            }

            slot.client = client;
            slot.assignedAt = new Date();

            const netflixService = await findActiveNetflixService(client.id);
            slot.additionalService = netflixService;

            await this.slotRepository.save(slot);

            await createNoteInteraction(
                client.id,
                `Netflix asignado — Cuenta: ${slot.account.email} · ${slot.profileName} · PIN: ${slot.pin}`,
                'Cuentas Netflix (Asignación)',
                (req as any).user?.id
            );

            const full = await this.accountRepository.findOne({
                where: { id: slot.account.id },
                relations: ['slots', 'slots.client']
            });
            if (!full) {
                return res.status(500).json({ message: 'Error al procesar la operación' });
            }
            return res.json(serializeAccount(full));
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al asignar el perfil de Netflix' });
        }
    }

    async releaseSlot(req: Request, res: Response) {
        try {
            const { slotId } = req.params;

            const slot = await this.slotRepository.findOne({
                where: { id: parseInt(slotId) },
                relations: ['account', 'client']
            });
            if (!slot) {
                return res.status(404).json({ message: 'Perfil de Netflix no encontrado' });
            }
            if (!slot.client) {
                return res.status(400).json({ message: 'Ese perfil ya está libre' });
            }

            const clientId = slot.client.id;
            const accountEmail = slot.account.email;
            const profileName = slot.profileName;
            const pin = slot.pin;

            slot.client = null;
            slot.additionalService = null;
            slot.assignedAt = null;
            await this.slotRepository.save(slot);

            await createNoteInteraction(
                clientId,
                `Netflix liberado — Cuenta: ${accountEmail} · ${profileName} · PIN: ${pin}`,
                'Cuentas Netflix (Liberación)',
                (req as any).user?.id
            );

            const full = await this.accountRepository.findOne({
                where: { id: slot.account.id },
                relations: ['slots', 'slots.client']
            });
            if (!full) {
                return res.status(500).json({ message: 'Error al procesar la operación' });
            }
            return res.json(serializeAccount(full));
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al liberar el perfil de Netflix' });
        }
    }

    async updateSlot(req: Request, res: Response) {
        try {
            const { slotId } = req.params;
            const { profileName, pin } = req.body;

            const slot = await this.slotRepository.findOne({
                where: { id: parseInt(slotId) },
                relations: ['account']
            });
            if (!slot) {
                return res.status(404).json({ message: 'Perfil de Netflix no encontrado' });
            }

            if (profileName !== undefined && String(profileName).trim()) {
                slot.profileName = String(profileName).trim();
            }

            if (pin !== undefined && pin !== null && String(pin).trim()) {
                const newPin = String(pin).trim().padStart(4, '0').slice(0, 4);
                const dup = await this.slotRepository.count({
                    where: { account: { id: slot.account.id }, pin: newPin, id: Not(slot.id) }
                });
                if (dup > 0) {
                    return res.status(400).json({ message: 'Ese PIN ya está en uso en esta cuenta' });
                }
                slot.pin = newPin;
            }

            await this.slotRepository.save(slot);

            const full = await this.accountRepository.findOne({
                where: { id: slot.account.id },
                relations: ['slots', 'slots.client']
            });
            if (!full) {
                return res.status(500).json({ message: 'Error al procesar la operación' });
            }
            return res.json(serializeAccount(full));
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al actualizar el perfil de Netflix' });
        }
    }

    async getByClient(req: Request, res: Response) {
        try {
            const { clientId } = req.params;
            const slots = await this.slotRepository.find({
                where: { client: { id: parseInt(clientId) } },
                relations: ['account'],
                order: { assignedAt: 'DESC' }
            });
            const payload = slots.map(s => ({
                id: s.id,
                profileName: s.profileName,
                pin: s.pin,
                slotIndex: s.slotIndex,
                assignedAt: s.assignedAt ? s.assignedAt.toISOString() : null,
                account: { id: s.account.id, email: s.account.email }
            }));
            return res.json(payload);
        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error al obtener el Netflix del cliente' });
        }
    }
}