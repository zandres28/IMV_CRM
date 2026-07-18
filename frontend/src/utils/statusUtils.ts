export const CLIENT_STATUS = {
  activo: { label: 'Activo', color: 'success' as const },
  suspendido: { label: 'Suspendido', color: 'warning' as const },
  retirado: { label: 'Retirado', color: 'error' as const },
  inactivo: { label: 'Inactivo', color: 'default' as const },
  pendiente_instalacion: { label: 'Pendiente Inst.', color: 'info' as const },
};

export const INSTALLATION_STATUS = {
  activo: { label: 'Activo', color: 'success' as const },
  suspendido: { label: 'Suspendido', color: 'warning' as const },
  retirado: { label: 'Retirado', color: 'error' as const },
};

export const PAYMENT_STATUS = {
  pendiente: { label: 'Pendiente', color: 'warning' as const },
  pagado: { label: 'Pagado', color: 'success' as const },
  vencido: { label: 'Vencido', color: 'error' as const },
  anulado: { label: 'Anulado', color: 'default' as const },
};

export const INTERACTION_STATUS = {
  pendiente: { label: 'Pendiente', color: 'warning' as const },
  en_progreso: { label: 'En Progreso', color: 'info' as const },
  completado: { label: 'Completado', color: 'success' as const },
  cancelado: { label: 'Cancelado', color: 'error' as const },
  pospuesto: { label: 'Pospuesto', color: 'default' as const },
  rechazado: { label: 'Rechazado', color: 'error' as const },
};

export const OUTAGE_STATUS = {
  pendiente: { label: 'Pendiente', color: 'warning' as const },
  aplicado: { label: 'Aplicado', color: 'success' as const },
  anulado: { label: 'Anulado', color: 'error' as const },
};

export const TRANSFER_STATUS = {
  pendiente: { label: 'Pendiente', color: 'warning' as const },
  en_progreso: { label: 'En Progreso', color: 'info' as const },
  completado: { label: 'Completado', color: 'success' as const },
  anulado: { label: 'Anulado', color: 'error' as const },
};

export const PRODUCT_STATUS = {
  pendiente: { label: 'Pendiente', color: 'warning' as const },
  completado: { label: 'Completado', color: 'success' as const },
};

export const ADDITIONAL_SERVICE_STATUS = {
  activo: { label: 'Activo', color: 'success' as const },
  inactivo: { label: 'Inactivo', color: 'default' as const },
};

export function getStatusProps(status: string, config: Record<string, { label: string; color: string }>) {
  return config[status] || { label: status, color: 'default' };
}
