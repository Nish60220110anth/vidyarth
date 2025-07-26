export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout | null = null;
    let inProgress = false;

    return async (...args: Parameters<T>) => {
        if (inProgress) return;

        if (timeout) clearTimeout(timeout);

        timeout = setTimeout(async () => {
            inProgress = true;
            try {
                await func(...args);
            } finally {
                inProgress = false;
            }
        }, wait);
    };
}
