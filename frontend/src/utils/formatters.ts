
// Elimina el prefijo 57 de los números de teléfono para visualización
export const formatPhoneForDisplay = (phone: string | null | undefined): string => {
    if (!phone) return '';
    
    // Si empieza por 57 y tiene 12 dígitos, quitamos el 57
    if (phone.length === 12 && phone.startsWith('57')) {
        return phone.substring(2);
    }
    
    return phone;
};
