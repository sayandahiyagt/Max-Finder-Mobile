import "server-only";

import { isRecord } from "@/lib/record";

export function summarizeDatabaseError(error: unknown) {
  if (!(error instanceof Error)) return { name: "UnknownError" };

  const summary: { name: string; code?: string; message: string } = {
    name: error.name,
    message: error.message
      .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, "postgresql://<redacted>")
      .replace(/(password|pwd)=([^\s&]+)/gi, "$1=<redacted>")
      .slice(0, 500),
  };
  if (isRecord(error) && typeof error.code === "string")
    summary.code = error.code;

  return summary;
}
