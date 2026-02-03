/**
 * Utilidad para manejar fechas evitando problemas de zona horaria.
 * 
 * El backend devuelve fechas DATE como strings 'YYYY-MM-DD' gracias a los transformers.
 * Estas funciones aseguran que se procesen correctamente sin desfases de zona horaria.
 */

/**
 * Parsea una fecha 'YYYY-MM-DD' como fecha local (sin desfase de zona horaria).
 * @param dateString Fecha en formato 'YYYY-MM-DD', ISO completo, o Date.
 * @returns Date object en hora local.
 */
export function parseLocalDate(dateString: string | Date | undefined | null): Date {
    if (!dateString) return new Date();
    if (dateString instanceof Date) return dateString;
    
    const str = String(dateString);
    
    // Si es 'YYYY-MM-DD' (sin hora), parsear como fecha local
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        const [year, month, day] = str.split('-').map(Number);
        return new Date(year, month - 1, day);
    }
    
    // Si viene con hora (ISO completo), usar parse normal
    if (/T/.test(str)) return new Date(str);
    
    // Fallback
    return new Date(str);
}

/**
 * Formatea una fecha como string local (dd/mm/aaaa).
 * @param date Fecha a formatear (string 'YYYY-MM-DD', Date, etc).
 * @returns Fecha formateada en formato local.
 */
export function formatLocalDate(date: string | Date | undefined | null): string {
    if (!date) return '';
    
    // Si ya es string 'YYYY-MM-DD', formatear directamente sin parsearlo como Date
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        const [year, month, day] = date.split('-');
        return `${day}/${month}/${year}`;
    }
    
    const d = parseLocalDate(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
}

/**
 * Convierte una Date o string a formato 'YYYY-MM-DD' para inputs tipo date.
 * @param date Fecha a convertir.
 * @returns String en formato 'YYYY-MM-DD'.
 */
export function toInputDateString(date: Date | string | undefined | null): string {
    if (!date) return new Date().toISOString().split('T')[0];
    
    // Si ya es 'YYYY-MM-DD', retornar tal cual
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return date;
    }
    
    const d = parseLocalDate(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
