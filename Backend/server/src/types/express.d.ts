export {};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        lastName: string;
        email: string;
        pinCode: string;
        role: "user" | "admin";
        tokenVersion: number;
      };
      files?: unknown;
    }
  }
}
