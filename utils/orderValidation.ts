// RTN hondureño: 13 (persona natural) o 14 (persona jurídica) dígitos. Campo opcional.
export const isValidRtn = (rtn: string): boolean => {
    return rtn.length === 13 || rtn.length === 14;
};

// Teléfono hondureño: 8 dígitos una vez quitados los caracteres no numéricos
// (espacios, guiones, etc). Campo opcional.
export const isValidPhone = (phone: string): boolean => {
    return phone.replace(/\D/g, '').length === 8;
};
