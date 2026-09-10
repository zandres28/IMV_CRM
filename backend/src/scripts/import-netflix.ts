import 'reflect-metadata';
import fs from 'fs';
import path from 'path';
import { AppDataSource } from '../config/database';
import { NetflixAccount } from '../entities/NetflixAccount';
import { NetflixSlot } from '../entities/NetflixSlot';
import { AdditionalService } from '../entities/AdditionalService';
import { Client } from '../entities/Client';

interface ImportRow {
    account: string;
    pin: string;
    alias: string;
    estado: string;
    obs: string;
    paymentMethod: string;
    clientId: number | null;
    ad: number | null;
    create: boolean;
}

const NETFLIX_SERVICE_NAME = 'netflix';

const generatePin = (used: Set<string>): string => {
    for (let i = 0; i < 5000; i++) {
        const pin = String(Math.floor(1000 + Math.random() * 9000));
        if (!used.has(pin)) {
            used.add(pin);
            return pin;
        }
    }
    throw new Error('No se pudo generar un PIN libre');
};

const main = async () => {
    await AppDataSource.initialize();
    const accountRepo = AppDataSource.getRepository(NetflixAccount);
    const slotRepo = AppDataSource.getRepository(NetflixSlot);
    const serviceRepo = AppDataSource.getRepository(AdditionalService);
    const clientRepo = AppDataSource.getRepository(Client);

    const dataPath = path.join(__dirname, 'netflix-excel-import-data.json');
    const rows: ImportRow[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

    const summary = {
        accounts: 0,
        slots: 0,
        linked: 0,
        servicesCreated: 0,
        fallbackPins: [] as string[],
        notFound: [] as string[],
    };

    for (const accountEmail of [...new Set(rows.map(r => r.account))]) {
        const group = rows.filter(r => r.account === accountEmail);

        let account = await accountRepo.findOne({ where: { email: accountEmail }, relations: ['slots'] });
        if (!account) {
            account = new NetflixAccount();
            account.email = accountEmail;
            account.maxSlots = group.length;
            account.paymentMethod = group[0]?.paymentMethod || null;
            account.notes = 'Importado desde PLANES NETFLIX.xlsx';
            account = await accountRepo.save(account);
            summary.accounts++;
        }

        const usedPins = new Set<string>((account.slots || []).map(s => s.pin));

        for (let i = 0; i < group.length; i++) {
            const row = group[i];
            const slotIndex = i + 1;

            let pin = row.pin.trim();
            if (row.pin === 'XXXX' || row.pin === 'LIBRE' || !/^\d{4}$/.test(pin)) {
                const existing = await slotRepo.findOne({
                    where: { account: { id: account.id }, slotIndex },
                    select: { id: true, pin: true },
                });
                if (existing && /^\d{4}$/.test(existing.pin)) {
                    pin = existing.pin;
                } else {
                    pin = generatePin(usedPins);
                    summary.fallbackPins.push(`${accountEmail} → ${row.alias} (PIN asignado: ${pin})`);
                }
            }
            usedPins.add(pin);

            let slot = await slotRepo.findOne({
                where: { account: { id: account.id }, slotIndex },
                relations: ['client', 'additionalService'],
            });
            if (!slot) {
                slot = new NetflixSlot();
                slot.account = account;
                slot.slotIndex = slotIndex;
            }

            slot.profileName = row.alias;
            slot.pin = pin;

            let service: AdditionalService | null = null;

            if (row.ad) {
                service = await serviceRepo.findOne({ where: { id: row.ad }, relations: ['client'] });
                if (service) {
                    service.notes = `${accountEmail}\n${pin} ${row.alias}`;
                    await serviceRepo.save(service);
                } else {
                    summary.notFound.push(`servicio adicional ${row.ad} (${accountEmail} / ${row.alias})`);
                }
            } else if (row.create && row.clientId) {
                const existing = await serviceRepo.findOne({
                    where: { client: { id: row.clientId }, status: 'activo' },
                    relations: ['client'],
                });
                service = existing || null;
                if (!service) {
                    const client = await clientRepo.findOneBy({ id: row.clientId });
                    if (client) {
                        service = new AdditionalService();
                        service.client = client;
                        service.serviceName = 'Netflix';
                        service.monthlyFee = 0;
                        service.startDate = new Date();
                        service.status = 'activo';
                        service.notes = `${accountEmail}\n${pin} ${row.alias}`;
                        service = await serviceRepo.save(service);
                        summary.servicesCreated++;
                    } else {
                        summary.notFound.push(`cliente ${row.clientId} (${accountEmail} / ${row.alias})`);
                    }
                }
            }

            if (row.clientId) {
                const client = await clientRepo.findOneBy({ id: row.clientId });
                if (client) {
                    slot.client = client;
                    slot.assignedAt = slot.assignedAt || new Date();
                    summary.linked++;
                } else {
                    summary.notFound.push(`cliente ${row.clientId} (${accountEmail} / ${row.alias})`);
                }
            }

            slot.additionalService = service;
            await slotRepo.save(slot);
            summary.slots++;
        }
    }

    console.log('=== Importación Netflix completada ===');
    console.log(JSON.stringify(summary, null, 2));
    await AppDataSource.destroy();
};

main().catch((err) => {
    console.error(err);
    process.exit(1);
});