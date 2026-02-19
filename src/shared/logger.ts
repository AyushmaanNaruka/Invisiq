/**
 * Production-safe logger.
 * - `log()` only prints in development
 * - `error()` always prints (including production)
 * - `warn()` always prints
 */

const isDev = process.env.NODE_ENV !== 'production';

export const logger = {
  log(...args: unknown[]): void {
    if (isDev) {
      console.log(...args);
    }
  },

  warn(...args: unknown[]): void {
    console.warn(...args);
  },

  error(...args: unknown[]): void {
    console.error(...args);
  },
};
