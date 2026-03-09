import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";

import { env } from "../../config/env";
import { requireAuth } from "../../middleware/auth.middleware";
import { requireAdmin } from "../../middleware/role.middleware";
import { HttpError } from "../../utils/http-error";

const router = Router();

const uploadDir = path.join(process.cwd(), "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
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
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new HttpError(400, "INVALID_FILE_TYPE", "Only images are allowed"));
    }

    return cb(null, true);
  }
});

router.post("/images", requireAuth, requireAdmin, upload.array("images", MAX_FILES), (req, res) => {
  const host = req.get("host") ?? "";
  const protocol = env.NODE_ENV === "production" ? "https" : req.protocol;
  const files = (req.files as Express.Multer.File[]) ?? [];
  const images = files.map((file) => ({
    url: `${protocol}://${host}/uploads/${file.filename}`,
    filename: file.filename
  }));

  return res.status(201).json({ images });
});

router.use((error: unknown, _req: unknown, _res: unknown, next: (err: unknown) => void) => {
  if (error instanceof multer.MulterError) {
    return next(new HttpError(400, "UPLOAD_FAILED", error.message));
  }

  return next(error);
});

export default router;
