import "server-only";

import { createSupabaseAdminClient } from "./admin";
import { logStorageFailure } from "./storage-diagnostics";

export async function getPetImageUrls(paths: (string | null)[]) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => !!path))];
  if (uniquePaths.length === 0) return paths.map(() => null);

  const client = createSupabaseAdminClient();
  const urlsByPath = new Map<string, string | null>();
  const { data, error } = await client.storage
    .from("pet-images")
    .createSignedUrls(uniquePaths, 60 * 60);
  if (error) return paths.map(() => null);
  for (const result of data) {
    if (result.path)
      urlsByPath.set(result.path, result.error ? null : result.signedUrl);
  }

  return paths.map((path) => (path ? (urlsByPath.get(path) ?? null) : null));
}

export async function getPetImageUrl(path: string | null) {
  const [url] = await getPetImageUrls([path]);
  return url ?? null;
}

export function getPublicImageUrl(
  bucket: "spotting-images",
  path: string | null,
) {
  if (!path) return null;
  return createSupabaseAdminClient()
    .storage.from(bucket)
    .getPublicUrl(path).data.publicUrl;
}

export async function removePetImage(path: string) {
  return removeImage("pet-images", path);
}

export async function removeImage(
  bucket: "pet-images" | "lost-pet-images" | "spotting-images",
  path: string,
) {
  try {
    const { error } = await createSupabaseAdminClient()
      .storage.from(bucket)
      .remove([path]);
    if (!error) return true;
    logStorageFailure("removal", bucket, error);
    return false;
  } catch (error) {
    logStorageFailure("removal", bucket, error);
    return false;
  }
}
