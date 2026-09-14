export class LoggerService {
  info(message: string, ...context: unknown[]): void { console.info(`[SafePlace] ${message}`, ...context); }
  warn(message: string, ...context: unknown[]): void { console.warn(`[SafePlace] ${message}`, ...context); }
  error(message: string, ...context: unknown[]): void { console.error(`[SafePlace] ${message}`, ...context); }
}
export const loggerService = new LoggerService();
