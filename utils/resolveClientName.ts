export interface ClientNameRuleLike {
    keyword: string;
    canonicalName: string;
}

// Normaliza a minúsculas y sin acentos, para que "Barato" y "BARATO" o
// "colonia"/"Colonía" se traten como el mismo texto.
const normalize = (value: string): string =>
    value.normalize('NFD').replace(new RegExp('[\\u0300-\\u036f]', 'g'), '').toLowerCase();

// Agrupa nombres de cliente con variantes (ej. vendedores que le agregan
// "orden#123" o un texto distinto cada vez al mismo negocio) bajo un único
// nombre canónico para efectos de reportería — nunca modifica el clientName
// original guardado en la orden. Reglas más específicas (keyword más largo)
// se evalúan primero, para que una regla genérica no gane sobre una precisa.
export const resolveClientName = (clientName: string, rules: ClientNameRuleLike[]): string => {
    if (!clientName || rules.length === 0) return clientName;

    const normalizedClientName = normalize(clientName);
    const sortedRules = [...rules].sort((a, b) => b.keyword.length - a.keyword.length);

    for (const rule of sortedRules) {
        if (!rule.keyword) continue;
        if (normalizedClientName.includes(normalize(rule.keyword))) {
            return rule.canonicalName;
        }
    }

    return clientName;
};
