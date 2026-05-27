/**
 * Utilidades de Validación para Formularios
 */

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export const Validators = {
  /**
   * Valida que un campo no esté vacío
   */
  required: (value: any, fieldName: string): string | null => {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return `${fieldName} es requerido`;
    }
    return null;
  },
  
  /**
   * Valida RTN (Registro Tributario Nacional) - máximo 14 dígitos numéricos
   */
  rtn: (rtn: string): string | null => {
    if (!rtn) return null; // Campo opcional
    if (!/^[0-9]{1,14}$/.test(rtn)) {
      return 'RTN debe contener máximo 14 dígitos numéricos';
    }
    return null;
  },
  
  /**
   * Valida número de teléfono (8-15 dígitos, permite +, -, espacios)
   */
  phone: (phone: string): string | null => {
    if (!phone) return null; // Campo opcional
    const cleaned = phone.replace(/[\s\-\+]/g, '');
    if (!/^[\d]{8,15}$/.test(cleaned)) {
      return 'Teléfono inválido (debe tener 8-15 dígitos)';
    }
    return null;
  },
  
  /**
   * Valida email básico
   */
  email: (email: string): string | null => {
    if (!email) return null;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Email inválido';
    }
    return null;
  },
  
  /**
   * Valida longitud mínima
   */
  minLength: (value: string, min: number, fieldName: string): string | null => {
    if (!value) return null;
    if (value.length < min) {
      return `${fieldName} debe tener al menos ${min} caracteres`;
    }
    return null;
  },
  
  /**
   * Valida longitud máxima
   */
  maxLength: (value: string, max: number, fieldName: string): string | null => {
    if (!value) return null;
    if (value.length > max) {
      return `${fieldName} debe tener máximo ${max} caracteres`;
    }
    return null;
  },
  
  /**
   * Valida número en rango
   */
  range: (value: number, min: number, max: number, fieldName: string): string | null => {
    if (value === undefined || value === null) return null;
    if (value < min || value > max) {
      return `${fieldName} debe estar entre ${min} y ${max}`;
    }
    return null;
  },
  
  /**
   * Valida formato numérico
   */
  numeric: (value: string, fieldName: string): string | null => {
    if (!value) return null;
    if (!/^[0-9]+$/.test(value)) {
      return `${fieldName} debe ser numérico`;
    }
    return null;
  }
};

/**
 * Combina múltiples validadores para un campo
 */
export const validateField = (
  value: any,
  validators: Array<(val: any, ...args: any[]) => string | null>,
  fieldName: string
): string | null => {
  for (const validator of validators) {
    const error = validator(value, fieldName);
    if (error) return error;
  }
  return null;
};

/**
 * Valida formulario completo
 */
export const validateForm = <T extends Record<string, any>>(
  formData: T,
  rules: Record<keyof T, Array<(val: any, fieldName: string) => string | null>>
): ValidationResult => {
  const errors: Record<string, string> = {};
  
  Object.entries(rules).forEach(([field, validators]) => {
    const value = formData[field as keyof T];
    for (const validator of validators) {
      const error = validator(value, field as string);
      if (error) {
        errors[field] = error;
        break;
      }
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
