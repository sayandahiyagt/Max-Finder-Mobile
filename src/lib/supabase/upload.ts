import "server-only";

import { createSupabaseAdminClient } from "./admin";
import type { ImageUpload } from "../image-upload";
import { logStorageFailure } from "./storage-diagnostics";

export async function uploadImage(
  image: ImageUpload,
  bucket: "pet-images" | "lost-pet-images" | "spotting-images",
  prefix: string,
) {
  const path = `${prefix}/${crypto.randomUUID()}.${image.extension}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, image.file, {
    contentType: image.contentType,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) {
    logStorageFailure("upload", bucket, error);
    throw new Error("Image upload failed. Please try again.");
  }
  return { path };
}
