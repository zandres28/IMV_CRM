import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from "typeorm";
import { Installation } from "../entities/Installation";
import { Client } from "../entities/Client";

@EventSubscriber()
export class InstallationSubscriber implements EntitySubscriberInterface<Installation> {
    listenTo() {
        return Installation;
    }

    async afterInsert(event: InsertEvent<Installation>): Promise<void> {
        const installation = event.entity;
        if (!installation.client) return;

        try {
            const clientRepo = event.manager.getRepository(Client);
            const clientId = (installation.client as any).id || installation.client.id;
            const client = await clientRepo.findOne({
                where: { id: clientId },
                relations: ['installations']
            });
            if (!client) return;

            if (installation.serviceStatus === 'activo') {
                client.status = 'activo';
                await clientRepo.save(client);
            }
        } catch (error) {
            console.error('[InstallationSubscriber] Error en afterInsert:', error);
        }
    }

    async afterUpdate(event: UpdateEvent<Installation>): Promise<void> {
        const installation = event.entity as Installation;
        if (!installation || !installation.client) return;

        try {
            const clientRepo = event.manager.getRepository(Client);
            const clientId = (installation.client as any).id || installation.client.id;
            const client = await clientRepo.findOne({
                where: { id: clientId },
                relations: ['installations']
            });
            if (!client) return;

            const hasActivo = client.installations?.some(
                inst => inst.id !== installation.id && inst.serviceStatus === 'activo' && !inst.isDeleted
            );

            if (installation.serviceStatus === 'activo') {
                client.status = 'activo';
            } else if (installation.serviceStatus === 'retirado') {
                const allRetirado = (client.installations || [])
                    .filter(inst => inst.id !== installation.id && !inst.isDeleted)
                    .every(inst => inst.serviceStatus === 'retirado');
                if (allRetirado) {
                    client.status = 'retirado';
                } else if (!hasActivo) {
                    client.status = 'suspendido';
                }
            } else if (installation.serviceStatus === 'suspendido') {
                if (!hasActivo) {
                    client.status = 'suspendido';
                }
            }

            await clientRepo.save(client);
        } catch (error) {
            console.error('[InstallationSubscriber] Error en afterUpdate:', error);
        }
    }
}
