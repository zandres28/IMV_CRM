import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Agrega los permisos del módulo de Visitas Técnicas a los roles existentes:
 *  - admin/operador → visits.view, visits.create, visits.edit (programar y reasignar)
 *  - tecnico        → visits.view (solo ve sus visitas asignadas; el filtrado
 *                     por técnico asignado lo hace el controller)
 * Idempotente: usa JSON_CONTAINS para no duplicar entradas.
 */
export class AddVisitPermissionsToRoles20260925000001 implements MigrationInterface {
    name = 'AddVisitPermissionsToRoles20260925000001'

    private async addPermissions(queryRunner: QueryRunner, roleName: string, permissions: string[]): Promise<void> {
        for (const permission of permissions) {
            await queryRunner.query(
                `UPDATE roles
                 SET permissions = JSON_ARRAY_APPEND(permissions, '$', ?)
                 WHERE name = ? AND permissions IS NOT NULL
                   AND NOT JSON_CONTAINS(permissions, ?)`,
                [permission, roleName, JSON.stringify(permission)]
            );
        }
    }

    public async up(queryRunner: QueryRunner): Promise<void> {
        await this.addPermissions(queryRunner, 'admin', ['visits.view', 'visits.create', 'visits.edit']);
        await this.addPermissions(queryRunner, 'operador', ['visits.view', 'visits.create', 'visits.edit']);
        await this.addPermissions(queryRunner, 'tecnico', ['visits.view']);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const permissions = ['visits.view', 'visits.create', 'visits.edit'];
        for (const roleName of ['admin', 'operador', 'tecnico']) {
            for (const permission of permissions) {
                await queryRunner.query(
                    `UPDATE roles
                     SET permissions = JSON_REMOVE(permissions, JSON_UNQUOTE(JSON_SEARCH(permissions, 'one', ?)))
                     WHERE name = ? AND permissions IS NOT NULL
                       AND JSON_CONTAINS(permissions, ?)`,
                    [permission, roleName, JSON.stringify(permission)]
                );
            }
        }
    }
}
