import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPetImageUrls, removeImage, removePetImage } from "@/lib/supabase/storage";

jest.mock("server-only", () => ({}), { virtual: true });
jest.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: jest.fn(),
}));

describe("Supabase Storage integration", () => {
  const remove = jest.fn();
  const createSignedUrls = jest.fn();
  const storageFrom = jest.fn((bucket: string) => ({
    remove,
    createSignedUrls: (paths: string[], expiresIn: number) =>
      createSignedUrls(bucket, paths, expiresIn),
  }));
  const errorLog = jest.spyOn(console, "error").mockImplementation();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(createSupabaseAdminClient).mockReturnValue({
      storage: { from: storageFrom },
    } as never);
    createSignedUrls.mockImplementation(
      async (bucket: string, paths: string[]) => ({
        data: paths.map((path) => ({
          error: null,
          path,
          signedUrl: `https://images.example/${bucket}/${path}`,
        })),
        error: null,
      }),
    );
  });

  afterAll(() => errorLog.mockRestore());

  it("removes an image from the requested bucket", async () => {
    remove.mockResolvedValue({ error: null });

    await expect(removeImage("pet-images", "owner/pets/photo.jpg"))
      .resolves.toBe(true);
    expect(remove).toHaveBeenCalledWith(["owner/pets/photo.jpg"]);
    expect(errorLog).not.toHaveBeenCalled();
  });

  it.each(["owner/pets/photo.jpg", "owner/legacy.jpg"])(
    "removes Pet Profile image %s from the private bucket regardless of path shape",
    async (path) => {
    remove.mockResolvedValue({ error: null });
    await expect(removePetImage(path)).resolves.toBe(true);
    expect(storageFrom).toHaveBeenCalledWith("pet-images");
    expect(remove).toHaveBeenCalledWith([path]);
    },
  );

  it("reports provider failures without exposing the object path", async () => {
    const error = {
      statusCode: "500",
      name: "StorageError",
      message: "provider unavailable",
    };
    remove.mockResolvedValue({ error });

    await expect(removeImage("spotting-images", "anonymous/photo.jpg"))
      .resolves.toBe(false);
    expect(errorLog).toHaveBeenCalledWith(
      "Supabase image removal failed.",
      {
        bucket: "spotting-images",
        statusCode: "500",
        name: "StorageError",
      },
    );
    expect(errorLog).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: "anonymous/photo.jpg" }),
    );
    expect(errorLog).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ message: expect.anything() }),
    );
  });

  it("returns false when creating the privileged Storage client throws", async () => {
    jest
      .mocked(createSupabaseAdminClient)
      .mockImplementation(() => {
        throw new Error("local Storage configuration unavailable");
      });

    await expect(
      removeImage("pet-images", "owner/pets/photo.jpg"),
    ).resolves.toBe(false);
    expect(errorLog).toHaveBeenCalledWith(
      "Supabase image removal failed.",
      { bucket: "pet-images", name: "Error" },
    );
    expect(errorLog).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ path: "owner/pets/photo.jpg" }),
    );
  });

  it("signs unique Pet Profile images from the private bucket regardless of path shape", async () => {
    await expect(
      getPetImageUrls([
        "owner/pets/mochi.png",
        "owner/legacy.png",
        null,
        "owner/pets/mochi.png",
      ]),
    ).resolves.toEqual([
      "https://images.example/pet-images/owner/pets/mochi.png",
      "https://images.example/pet-images/owner/legacy.png",
      null,
      "https://images.example/pet-images/owner/pets/mochi.png",
    ]);
    expect(createSignedUrls).toHaveBeenCalledTimes(1);
    expect(createSignedUrls).toHaveBeenCalledWith(
      "pet-images",
      ["owner/pets/mochi.png", "owner/legacy.png"],
      3600,
    );
  });

  it("returns null for individual images rejected by batch signing", async () => {
    createSignedUrls.mockResolvedValue({
      data: [{ error: "object not found", path: "missing.png", signedUrl: null }],
      error: null,
    });

    await expect(getPetImageUrls(["missing.png"])).resolves.toEqual([null]);
  });
});
