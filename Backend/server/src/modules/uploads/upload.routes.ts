import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import multer, { MulterError } from "multer";

import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { HttpError } from "../../utils/http-error";
import { saveImageToGridFs } from "./gridfs.service";

const router = Router();

type UploadFile = {
  originalname: string;
  mimetype: string;
  buffer: Buffer;
};

const MAX_FILES = 8;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: MAX_FILES
  },
  fileFilter: (_req: Request, file: UploadFile, cb: (error: Error | null, acceptFile?: boolean) => void) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new HttpError(400, "INVALID_FILE_TYPE", "Only images are allowed"));
    }

    return cb(null, true);
  }
});

router.post("/images", requireAuth, requireAdmin, upload.array("images", MAX_FILES), async (req, res, next) => {
  try {
  const host = req.get("host") ?? "";
  const protocol = env.NODE_ENV === "production" ? "https" : req.protocol;
    const files = (req.files as UploadFile[] | undefined) ?? [];
    const stored = await Promise.all(files.map((file) => saveImageToGridFs(file)));
    const images = stored.map((file) => ({
      url: `${protocol}://${host}/uploads/${file.filename}`,
      filename: file.filename
    }));

    return res.status(201).json({ images });
  } catch (error) {
    return next(error);
  }
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
