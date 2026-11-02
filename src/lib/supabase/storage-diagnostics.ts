import { isRecord } from "@/lib/record";

type StorageOperation = "upload" | "removal";

export function logStorageFailure(
  operation: StorageOperation,
  bucket: string,
  error: unknown,
) {
  const details: { bucket: string; name?: string; statusCode?: string } = {
    bucket,
  };
  if (error instanceof Error) details.name = error.name;
  if (isRecord(error)) {
    if (typeof error.name === "string") details.name = error.name;
    if (typeof error.statusCode === "string")
      details.statusCode = error.statusCode;
  }
  console.error(`Supabase image ${operation} failed.`, details);
}
