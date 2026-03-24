import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { Router } from "express";
import type { Request } from "express";
import multer, { MulterError } from "multer";

import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { HttpError } from "../../utils/http-error";

const router = Router();

type MulterFile = {
  originalname: string;
  mimetype: string;
  filename?: string;
};

const uploadDir = env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req: Request, _file: MulterFile, cb: (error: Error | null, destination: string) => void) => {
    cb(null, uploadDir);
  },
  filename: (_req: Request, file: MulterFile, cb: (error: Error | null, filename: string) => void) => {
    const ext = path.extname(file.originalname) || ".bin";
    const name = randomBytes(16).toString("hex");
    cb(null, `${name}${ext.toLowerCase()}`);
  }
});

const MAX_FILES = 8;
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: MAX_FILES
  },
  fileFilter: (_req: Request, file: MulterFile, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new HttpError(400, "INVALID_FILE_TYPE", "Only images are allowed"));
    }

    return cb(null, true);
  }
});

router.post("/images", requireAuth, requireAdmin, upload.array("images", MAX_FILES), (req, res) => {
  const host = req.get("host") ?? "";
  const protocol = env.NODE_ENV === "production" ? "https" : req.protocol;
  const files = (req.files as Array<{ filename: string }> | undefined) ?? [];
  const images = files.map((file) => ({
    url: `${protocol}://${host}/uploads/${file.filename}`,
    filename: file.filename
  }));

  return res.status(201).json({ images });
});

router.use((error: unknown, _req: unknown, _res: unknown, next: (err: unknown) => void) => {
  if (error instanceof MulterError) {
    return next(new HttpError(400, "UPLOAD_FAILED", error.message));
  }

  if (error instanceof Error) {
    return next(error);
  }

  return next(new HttpError(500, "UPLOAD_FAILED", "Upload failed"));
});

export default router;
