import { randomBytes } from "crypto";
import path from "path";
import { GridFSBucket, ObjectId } from "mongodb";
import type { Response } from "express";
import mongoose from "mongoose";

import { env } from "../../config/env";

type StoredFile = {
  id: ObjectId;
  filename: string;
  contentType: string | undefined;
  length: number;
};

let cachedBucket: GridFSBucket | null = null;

function getBucket(): GridFSBucket {
  if (cachedBucket) {
    return cachedBucket;
  }

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("MongoDB connection is not ready");
  }

  cachedBucket = new GridFSBucket(db, { bucketName: env.UPLOAD_BUCKET || "uploads" });
  return cachedBucket;
}

function buildFilename(originalname: string): string {
  const ext = path.extname(originalname || "") || ".bin";
  const name = randomBytes(16).toString("hex");
  return `${name}${ext.toLowerCase()}`;
}

export async function saveImageToGridFs(
  file: { originalname: string; mimetype: string; buffer: Buffer }
): Promise<StoredFile> {
  const bucket = getBucket();
  const filename = buildFilename(file.originalname);

  const stream = bucket.openUploadStream(filename, {
    contentType: file.mimetype,
    metadata: { originalname: file.originalname }
  });

  await new Promise<void>((resolve, reject) => {
    stream.on("error", reject);
    stream.on("finish", () => resolve());
    stream.end(file.buffer);
  });

  return {
    id: stream.id as ObjectId,
    filename,
    contentType: file.mimetype,
    length: file.buffer.length
  };
}

export async function streamImageFromGridFs(filename: string, res: Response): Promise<boolean> {
  const bucket = getBucket();
  const file = await bucket.find({ filename }).sort({ uploadDate: -1 }).limit(1).next();

  if (!file?._id) {
    return false;
  }

  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  if (file.contentType) {
    res.setHeader("Content-Type", file.contentType);
  }
  if (typeof file.length === "number") {
    res.setHeader("Content-Length", String(file.length));
  }

  await new Promise<void>((resolve, reject) => {
    const downloadStream = bucket.openDownloadStream(file._id);
    downloadStream.on("error", reject);
    downloadStream.on("end", () => resolve());
    downloadStream.pipe(res);
  });

  return true;
}
