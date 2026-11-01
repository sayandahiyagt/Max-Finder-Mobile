import {
  captureTextFields,
  readRawTextField,
  readTextField,
} from "@/lib/form-data";

describe("readRawTextField", () => {
  it("preserves password whitespace and rejects non-text entries", () => {
    const formData = new FormData();
    formData.set("password", "  local password  ");
    formData.set("email", new File(["synthetic"], "email.txt"));

    expect(readRawTextField(formData, "password")).toBe("  local password  ");
    expect(readRawTextField(formData, "email")).toBe("");
  });
});

describe("captureTextFields", () => {
  it("restores bounded text fields and ignores missing or file values", () => {
    const formData = new FormData();
    formData.set("name", "Milo the dog");
    formData.set("image", new File(["synthetic"], "image.png"));

    expect(
      captureTextFields(formData, { name: 4, description: 20, image: 20 }),
    ).toEqual({ name: "Milo", description: "", image: "" });
  });
});

describe("readTextField", () => {
  it("trims text and treats a missing field as empty", () => {
    const formData = new FormData();
    formData.set("description", "  A synthetic note.  ");

    expect(readTextField(formData, "description")).toBe("A synthetic note.");
    expect(readTextField(formData, "missing")).toBe("");
  });

  it("rejects text over its field limit", () => {
    const formData = new FormData();
    formData.set("name", "x".repeat(5));

    expect(() => readTextField(formData, "name", 4)).toThrow(
      "Invalid name.",
    );
  });

  it("rejects a file submitted where a text field is expected", () => {
    const formData = new FormData();
    formData.set("name", new File(["synthetic"], "name.txt"));

    expect(() => readTextField(formData, "name")).toThrow("Invalid name.");
  });
});
