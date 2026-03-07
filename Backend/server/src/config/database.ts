import mongoose from "mongoose";

import { env } from "./env";
import { logger } from "../utils/logger";

export async function connectDatabase(): Promise<void> {
  mongoose.set("strictQuery", true);

  mongoose.connection.on("error", (error) => {
    logger.error("MongoDB connection error", error);
  });

  await mongoose.connect(env.MONGO_URI);
  logger.info("MongoDB connected");
}
