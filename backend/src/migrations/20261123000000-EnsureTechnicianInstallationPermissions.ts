import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Asegura que el rol 'tecnico' tenga en la BD los permisos de instalación
 * que ya contemplan la matriz (backend/src/utils/permissions.ts) y el seed
 * (backend/src/scripts/seedAuth.ts):
 *  - installations.view     → ver instalaciones
 *  - installations.edit     → editar instalación desde el detalle del cliente
 *  - installations.assigned → alcance limitado a las instalaciones asignadas
 *
 * El seed solo corre al crear la base de datos, así que una BD ya existente
 * puede quedarse sin installations.edit aunque el código lo contemple y el
 * botón "Editar" del detalle del cliente no aparezca.
 * Idempotente: usa JSON_CONTAINS para no duplicar entradas.
 */
export class EnsureTechnicianInstallationPermissions20261123000000 implements MigrationInterface {
    name = 'EnsureTechnicianInstallationPermissions20261123000000'

    private permissions = ['installations.view', 'installations.edit', 'installations.assigned'];

    public async up(queryRunner: QueryRunner): Promise<void> {
        for (const permission of this.permissions) {
            await queryRunner.query(
                `UPDATE roles
                 SET permissions = JSON_ARRAY_APPEND(permissions, '$', ?)
                 WHERE name = 'tecnico' AND permissions IS NOT NULL
                   AND NOT JSON_CONTAINS(permissions, ?)`,
                [permission, JSON.stringify(permission)]
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        for (const permission of this.permissions) {
            await queryRunner.query(
                `UPDATE roles
                 SET permissions = JSON_REMOVE(permissions, JSON_UNQUOTE(JSON_SEARCH(permissions, 'one', ?)))
                 WHERE name = 'tecnico' AND permissions IS NOT NULL
                   AND JSON_CONTAINS(permissions, ?)`,
                [permission, JSON.stringify(permission)]
            );
        }
    }
}
