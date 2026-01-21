import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Installation } from '../entities/Installation';

async function run() {
  const technicianName = 'Yamid Arturo Molina Figueroa';
  console.log('Iniciando asignación de técnico a todas las instalaciones...');
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Installation);

  const total = await repo.count();
  console.log(`Total instalaciones: ${total}`);

  // Actualizar todas las instalaciones (sin condición) según requerimiento
  const result = await repo.createQueryBuilder()
    .update(Installation)
    .set({ technician: technicianName })
    .execute();

  console.log(`Filas afectadas: ${result.affected}`);

  // Verificación rápida: contar distintas values
  const distinctTechnicians = await repo.createQueryBuilder('i')
    .select('i.technician')
    .distinct(true)
    .getRawMany();

  console.log('Técnicos distintos ahora en la tabla:', distinctTechnicians.map(r => r.i_technician));

  await AppDataSource.destroy();
  console.log('✓ Asignación completada.');
}

run().catch(err => {
  console.error('Error asignando técnico:', err);
  process.exit(1);
});
