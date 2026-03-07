export const logger = {
  info: (message: string): void => {
    console.log(`[info] ${message}`);
  },
  warn: (message: string): void => {
    console.warn(`[warn] ${message}`);
  },
  error: (message: string, error?: unknown): void => {
    if (error instanceof Error) {
      console.error(`[error] ${message}`, error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      return;
    }

    if (error !== undefined) {
      console.error(`[error] ${message}`, error);
      return;
    }

    console.error(`[error] ${message}`);
  }
};
