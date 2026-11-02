import { deleteLostPet, updateLostPet } from "@/app/lost-pets/actions";
import {
  removeLostPetReport,
  updateLostPetReport,
} from "@/features/lost-pets/application";
import {
  initialLostPetReportRemovalActionState,
  initialLostPetReportUpdateActionState,
} from "@/features/lost-pets/form-state";
import { redirect } from "next/navigation";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("next/navigation", () => ({ redirect: jest.fn() }));
jest.mock("@/features/lost-pets/application", () => ({
  createReportForOwnedPet: jest.fn(),
  removeLostPetReport: jest.fn(),
  updateLostPetReport: jest.fn(),
}));
jest.mock("@/lib/auth", () => ({
  requireUser: jest.fn().mockResolvedValue({
    actor: { userId: "local-owner-id" },
  }),
}));

function reportForm(status = "FOUND") {
  const formData = new FormData();
  formData.set("id", "local-report-id");
  formData.set("status", status);
  formData.set("description", "Synthetic report details.");
  return formData;
}

describe("Lost Pet Report mutation actions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("rejects REMOVED from normal status editing", async () => {
    const state = await updateLostPet(
      initialLostPetReportUpdateActionState,
      reportForm("REMOVED"),
    );

    expect(state).toMatchObject({
      kind: "error",
      message: "Choose Lost or Found.",
      values: { id: "local-report-id", status: "REMOVED" },
    });
    expect(updateLostPetReport).not.toHaveBeenCalled();
  });

  it("updates only the authenticated owner's report and redirects", async () => {
    jest.mocked(updateLostPetReport).mockResolvedValue(true);

    await updateLostPet(initialLostPetReportUpdateActionState, reportForm());

    expect(updateLostPetReport).toHaveBeenCalledWith({
      reportId: "local-report-id",
      ownerId: "local-owner-id",
      changes: { status: "FOUND", description: "Synthetic report details." },
    });
    expect(redirect).toHaveBeenCalledWith(
      "/lost-pets/reports/local-report-id",
    );
  });

  it("returns safe feedback when an update fails", async () => {
    jest
      .mocked(updateLostPetReport)
      .mockRejectedValue(new Error("database internals"));

    const state = await updateLostPet(
      initialLostPetReportUpdateActionState,
      reportForm(),
    );

    expect(state).toMatchObject({
      kind: "error",
      message: "Report could not be updated. Please try again.",
      values: {
        id: "local-report-id",
        status: "FOUND",
        description: "Synthetic report details.",
      },
    });
    expect(state.message).not.toContain("database internals");
  });

  it("removes the authenticated owner's report through the lifecycle operation", async () => {
    const formData = new FormData();
    formData.set("id", "local-report-id");
    jest.mocked(removeLostPetReport).mockResolvedValue(true);

    await deleteLostPet(initialLostPetReportRemovalActionState, formData);

    expect(removeLostPetReport).toHaveBeenCalledWith({
      reportId: "local-report-id",
      ownerId: "local-owner-id",
    });
    expect(redirect).toHaveBeenCalledWith("/profile");
  });

  it("returns safe feedback when removal fails", async () => {
    const formData = new FormData();
    formData.set("id", "local-report-id");
    jest
      .mocked(removeLostPetReport)
      .mockRejectedValue(new Error("database internals"));

    const state = await deleteLostPet(
      initialLostPetReportRemovalActionState,
      formData,
    );

    expect(state).toMatchObject({
      kind: "error",
      message: "Report could not be removed. Refresh and try again.",
    });
    expect(state.message).not.toContain("database internals");
  });
});
