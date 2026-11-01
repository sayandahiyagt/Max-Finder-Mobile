import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseImageUpload } from "@/lib/image-upload";
import { petImageStorage, spottingImageStorage } from "@/lib/supabase/media";
import { uploadImage } from "@/lib/supabase/upload";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(),
}));

describe("Storage image upload", () => {
  const upload = jest.fn();
  const from = jest.fn(() => ({ upload }));
  const errorLog = jest.spyOn(console, "error").mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createSupabaseAdminClient).mockReturnValue({
      storage: { from },
    } as never);
  });

  afterAll(() => errorLog.mockRestore());

  it("uploads the validated file with its content type and a random path", async () => {
    const file = new File(
      [new Uint8Array([0xff, 0xd8, 0xff])],
      "pet.jpg",
      { type: "image/jpeg" },
    );
    const image = await parseImageUpload(file);
    upload.mockResolvedValue({ error: null });

    const result = await uploadImage(image, "pet-images", "owner/pets");

    expect(result.path).toMatch(/^owner\/pets\/[\da-f-]+\.jpg$/i);
    expect(upload).toHaveBeenCalledWith(
      result.path,
      file,
      {
        contentType: "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      },
    );
    expect(errorLog).not.toHaveBeenCalled();
  });

  it("hides provider details from callers and logs the upload failure", async () => {
    const image = await parseImageUpload(
      new File(
        [new Uint8Array([0xff, 0xd8, 0xff])],
        "pet.jpg",
        { type: "image/jpeg" },
      ),
    );
    upload.mockResolvedValue({
      error: {
        statusCode: "503",
        name: "StorageError",
        message: "provider unavailable",
      },
    });

    await expect(
      uploadImage(image, "pet-images", "owner/pets"),
    ).rejects.toThrow("Image upload failed. Please try again.");
    expect(errorLog).toHaveBeenCalledWith(
      "Supabase image upload failed.",
      {
        bucket: "pet-images",
        statusCode: "503",
        name: "StorageError",
      },
    );
    expect(errorLog).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ message: expect.anything() }),
    );
  });

  it("keeps Pet Profile and Spotting image paths inside their adapters", async () => {
    const image = await parseImageUpload(
      new File(
        [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        "pet.png",
        { type: "image/png" },
      ),
    );
    upload.mockResolvedValue({ error: null });

    const petPath = await petImageStorage.upload(image, "auth-user");
    expect(petPath).toMatch(/^auth-user\/pets\/[\da-f-]+\.png$/i);
    expect(from).toHaveBeenLastCalledWith("pet-images");

    const spottingPath = await spottingImageStorage.upload(image);
    expect(spottingPath).toMatch(/^anonymous\/[\da-f-]+\.png$/i);
    expect(from).toHaveBeenLastCalledWith("spotting-images");
  });
});
