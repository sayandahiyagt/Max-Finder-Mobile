import { sendMessage } from "@/app/messages/actions";
import { sendConversationMessage } from "@/features/communication/application";
import { requireUser } from "@/lib/auth";
import { dummyUsers } from "./fixtures/dummy-data";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/features/communication/application", () => ({
  sendConversationMessage: jest.fn(),
}));
jest.mock("@/lib/auth", () => {
  const { dummyUsers } = jest.requireActual<
    typeof import("./fixtures/dummy-data")
  >("./fixtures/dummy-data");
  return {
    requireUser: jest.fn().mockResolvedValue({ actor: dummyUsers.finder }),
  };
});

describe("sendMessage action", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(sendConversationMessage).mockResolvedValue(true);
    jest.mocked(requireUser).mockResolvedValue({
      identity: {
        authProviderId: dummyUsers.finder.authProviderId,
        email: "finder@example.test",
        displayName: dummyUsers.finder.displayName,
      },
      actor: dummyUsers.finder,
    });
  });

  it("trims valid text and sends it as the authenticated participant", async () => {
    const formData = new FormData();
    formData.set("conversationId", "conversation-1");
    formData.set("content", "  I spotted Mochi nearby.  ");

    await sendMessage(formData);

    expect(sendConversationMessage).toHaveBeenCalledWith({
      conversationId: "conversation-1",
      senderId: dummyUsers.finder.userId,
      content: "I spotted Mochi nearby.",
    });
  });

  it("rejects uploaded files instead of converting them into message text", async () => {
    const formData = new FormData();
    formData.set("conversationId", "conversation-1");
    formData.set("content", new File(["synthetic"], "message.txt"));

    await expect(sendMessage(formData)).rejects.toThrow("Invalid content.");
    expect(sendConversationMessage).not.toHaveBeenCalled();
  });

  it("rejects messages over the supported length before persistence", async () => {
    const formData = new FormData();
    formData.set("conversationId", "conversation-1");
    formData.set("content", "x".repeat(2001));

    await expect(sendMessage(formData)).rejects.toThrow("Invalid content.");
    expect(sendConversationMessage).not.toHaveBeenCalled();
  });
});
