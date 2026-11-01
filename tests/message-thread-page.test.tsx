import { renderToStaticMarkup } from "react-dom/server";
import MessageThreadPage from "@/app/messages/[id]/page";
import { getConversationThread } from "@/features/communication/application";

jest.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); } }));
jest.mock("@/app/messages/actions", () => ({ sendMessage: jest.fn() }));
jest.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => children }));
jest.mock("@/lib/auth", () => ({ requireUser: jest.fn().mockResolvedValue({ actor: { userId: "user" } }) }));
jest.mock("@/features/communication/application", () => ({ getConversationThread: jest.fn() }));

it.each(["LOST", "FOUND", "REMOVED"])("renders the appropriate controls for %s", async (status) => {
  jest.mocked(getConversationThread).mockResolvedValue({
    id: "conversation", otherDisplayName: "Finder", messages: [],
    report: { status, petName: "Pet", species: "dog", breed: null, locationLabel: "Park" },
  });
  const page = await MessageThreadPage({ params: Promise.resolve({ id: "conversation" }), searchParams: Promise.resolve({}) });
  const html = renderToStaticMarkup(page);
  expect(html.includes('name="content"')).toBe(status === "LOST");
  expect(html.includes("This conversation is read-only.")).toBe(status !== "LOST");
});
