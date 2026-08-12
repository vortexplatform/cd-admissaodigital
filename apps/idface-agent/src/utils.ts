export const onlyDigits = (value: string | null | undefined) => (value ?? '').replace(/\D/g, '');

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
