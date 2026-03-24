import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";

import { env } from "./config/env";
import { buildCorsOptions } from "./config/security";
import { errorHandler } from "./middleware/error.middleware";
import { globalRateLimiter } from "./middleware/rate-limit.middleware";
import { authRouter } from "./modules/auth";
import { contentRouter } from "./modules/content";
import { productRouter } from "./modules/products";
import { orderRouter } from "./modules/orders";
import userRouter from "./modules/users/user.routes";
import uploadRouter from "./modules/uploads/upload.routes";
import { streamImageFromGridFs } from "./modules/uploads/gridfs.service";

const app = express();
const uploadDir = env.UPLOAD_DIR || path.join(process.cwd(), "uploads");

app.disable("x-powered-by");
app.set("trust proxy", env.TRUST_PROXY);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);
app.use(cors(buildCorsOptions(env)));
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(globalRateLimiter);
app.use("/uploads", express.static(uploadDir));
app.get("/uploads/:filename", async (req, res, next) => {
  try {
    const found = await streamImageFromGridFs(req.params.filename, res);
    if (!found) {
      return next();
    }
    return;
  } catch (error) {
    return next(error);
  }
});

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/content", contentRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/uploads", uploadRouter);

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not Found" } });
});

app.use(errorHandler);

export default app;
