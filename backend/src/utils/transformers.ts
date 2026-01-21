import { ValueTransformer } from "typeorm";

/**
 * Transformer para columnas DATE de MySQL.
 * Asegura que las fechas se manejen como strings 'YYYY-MM-DD' sin zona horaria.
 * 
 * - Al guardar (to): convierte Date a 'YYYY-MM-DD' en hora local
 * - Al leer (from): mantiene el string tal cual viene de MySQL
 * 
 * Esto evita problemas de timezone donde new Date('2025-11-10') se interpreta
 * como UTC 00:00 y en zonas negativas (ej. UTC-5) se muestra como día anterior.
 */
export const dateOnlyTransformer: ValueTransformer = {
    to: (value: any): string | null => {
        if (!value) return null;
        
        try {
            // Si ya es 'YYYY-MM-DD', retornar tal cual
            if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
                return value;
            }
            
            // Si es Date, convertir a 'YYYY-MM-DD' en hora local
            if (value instanceof Date && !isNaN(value.getTime())) {
                const year = value.getFullYear();
                const month = String(value.getMonth() + 1).padStart(2, '0');
                const day = String(value.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            
            return value;
        } catch (error) {
            console.error('Error en dateOnlyTransformer.to:', error, 'value:', value);
            return null;
        }
    },
    
    from: (value: any): string | null => {
        // MySQL devuelve fechas DATE como strings 'YYYY-MM-DD'
        // Mantenerlas como strings para evitar conversión automática a Date con timezone
        return value || null;
    }
};
