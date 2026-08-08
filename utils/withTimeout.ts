// Envuelve una promesa con un límite de tiempo — si no resuelve/rechaza
// dentro de `ms`, se rechaza con un error claro en vez de dejar al llamador
// esperando indefinidamente. Usado en las consultas críticas (pedidos,
// usuarios) para que una conexión atascada produzca un error visible en vez
// de una carga infinita silenciosa.
export const withTimeout = <T>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const timeout = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(`Tiempo de espera agotado (${label}). Verifica tu conexión e intenta de nuevo.`));
        }, ms);
    });

    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
};
