import { createSupabaseAdminClient } from "./admin";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 15 * 1024 * 1024;

export async function uploadImage(
  value: FormDataEntryValue | null,
  bucket: "lost-pet-images" | "spotting-images",
  prefix: string,
) {
  if (!(value instanceof File) || value.size === 0) {
    throw new Error("Choose an image from your device.");
  }
  if (!allowedTypes.has(value.type) || value.size > maxBytes) {
    throw new Error("Images must be JPEG, PNG, or WebP files up to 15 MB.");
  }

  const extension = value.type.split("/")[1].replace("jpeg", "jpg");
  const path = `${prefix}/${crypto.randomUUID()}.${extension}`;
  const admin = createSupabaseAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, value, {
    contentType: value.type,
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw new Error("Image upload failed. Please try again.");
  return { admin, path };
}
