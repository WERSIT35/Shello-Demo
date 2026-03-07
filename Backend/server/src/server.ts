import app from "./app";
import { connectDatabase } from "./config/database";
import { env } from "./config/env";
import { ensureSuperAdmin } from "./modules/users/super-admin";
import { logger } from "./utils/logger";

async function startServer(): Promise<void> {
  try {
    await connectDatabase();
    await ensureSuperAdmin();

    app.listen(env.PORT, () => {
      logger.info(`API listening on port ${env.PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
}

startServer();
