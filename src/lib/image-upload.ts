export type ImageUpload = {
  file: File;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export class ImageUploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadValidationError";
  }
}

const maxBytes = 15 * 1024 * 1024;

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function hasImageSignature(bytes: Uint8Array, contentType: ImageUpload["contentType"]) {
  switch (contentType) {
    case "image/jpeg":
      return startsWith(bytes, [0xff, 0xd8, 0xff]);
    case "image/png":
      return startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "image/webp":
      return (
        startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
        startsWith(bytes.slice(8), [0x57, 0x45, 0x42, 0x50])
      );
  }
}

export async function parseImageUpload(
  value: FormDataEntryValue | null,
): Promise<ImageUpload> {
  if (!(value instanceof File) || value.size === 0) {
    throw new ImageUploadValidationError("Choose an image from your device.");
  }
  if (value.size > maxBytes) {
    throw new ImageUploadValidationError(
      "Images must be JPEG, PNG, or WebP files up to 15 MB.",
    );
  }

  let image: ImageUpload;
  switch (value.type) {
    case "image/jpeg":
      image = { file: value, contentType: value.type, extension: "jpg" };
      break;
    case "image/png":
      image = { file: value, contentType: value.type, extension: "png" };
      break;
    case "image/webp":
      image = { file: value, contentType: value.type, extension: "webp" };
      break;
    default:
      throw new ImageUploadValidationError(
        "Images must be JPEG, PNG, or WebP files up to 15 MB.",
      );
  }

  const header = new Uint8Array(await value.slice(0, 12).arrayBuffer());
  if (!hasImageSignature(header, image.contentType)) {
    throw new ImageUploadValidationError(
      "The selected file does not match its image type.",
    );
  }
  return image;
}
