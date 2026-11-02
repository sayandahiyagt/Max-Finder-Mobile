import { parseImageUpload } from "@/lib/image-upload";

describe("parseImageUpload", () => {
  it.each([
    ["image/jpeg", "jpg", [0xff, 0xd8, 0xff]],
    ["image/png", "png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", "webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ] as const)(
    "accepts %s with the %s extension",
    async (contentType, extension, signature) => {
      const file = new File([new Uint8Array(signature)], `pet.${extension}`, {
        type: contentType,
      });

      await expect(parseImageUpload(file)).resolves.toEqual({
        file,
        contentType,
        extension,
      });
    },
  );

  it("rejects missing and unsupported image values", async () => {
    await expect(parseImageUpload(null)).rejects.toThrow(
      "Choose an image from your device.",
    );
    await expect(
      parseImageUpload(
        new File(["synthetic image data"], "pet.gif", {
          type: "image/gif",
        }),
      ),
    ).rejects.toThrow("Images must be JPEG, PNG, or WebP files up to 15 MB.");
  });

  it("rejects a file whose bytes do not match its declared image type", async () => {
    const file = new File(["not an image"], "pet.jpg", {
      type: "image/jpeg",
    });

    await expect(parseImageUpload(file)).rejects.toThrow(
      "The selected file does not match its image type.",
    );
  });
});
