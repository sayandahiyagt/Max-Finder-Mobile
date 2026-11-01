import { createClient } from "@supabase/supabase-js";
import {
  dummyConversation,
  dummyMessage,
  dummyReport,
  dummyUsers,
} from "./fixtures/dummy-data";
import { isLocalSupabase } from "./helpers/local-environment";

const supabaseUrl = process.env.TEST_SUPABASE_URL;
const supabaseKey = process.env.TEST_SUPABASE_KEY;
const serviceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

const localClient = () =>
  createClient(supabaseUrl!, supabaseKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
const serviceClient = () =>
  createClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

(isLocalSupabase ? describe : describe.skip)(
  "local Supabase row security",
  () => {
    it("blocks anonymous report reads and limits conversation messages to participants", async () => {
      const anonymous = localClient();
      const { data: anonymousReports } = await anonymous
        .from("lost_pet_reports")
        .select("report_id")
        .eq("status", "LOST");
      expect(anonymousReports ?? []).toEqual([]);

      const owner = localClient();
      const { error: ownerSignInError } = await owner.auth.signInWithPassword({
        email: "owner@example.test",
        password: "local-only-test-password",
      });
      expect(ownerSignInError).toBeNull();
      const { error: deleteError } = await owner
        .from("lost_pet_reports")
        .delete()
        .eq("report_id", dummyReport.reportId);
      expect(deleteError).not.toBeNull();

      const service = serviceClient();
      const { error: markError } = await owner.rpc(
        "mark_conversation_messages_read",
        { target_conversation_id: dummyConversation.conversationId },
      );
      expect(markError).toBeNull();
      const { data: markedMessage, error: markedMessageError } = await service
        .from("messages")
        .select("read_at")
        .eq("message_id", dummyMessage.messageId)
        .single();
      expect(markedMessageError).toBeNull();
      expect(markedMessage?.read_at).not.toBeNull();
      await service
        .from("messages")
        .update({ read_at: null })
        .eq("message_id", dummyMessage.messageId);
      await owner.auth.signOut();

      const finder = localClient();
      const { error: finderSignInError } = await finder.auth.signInWithPassword(
        {
          email: "sam.finder@example.test",
          password: "local-only-test-password",
        },
      );
      expect(finderSignInError).toBeNull();

      const { data: activeReports, error: reportError } = await finder
        .from("lost_pet_reports")
        .select("report_id")
        .eq("status", "LOST");
      expect(reportError).toBeNull();
      expect(activeReports?.map(({ report_id }) => report_id)).toContain(
        dummyReport.reportId,
      );

      const { data: participantMessages, error: participantError } =
        await finder
          .from("messages")
          .select("message_id")
          .eq("conversation_id", dummyConversation.conversationId);
      expect(participantError).toBeNull();
      expect(participantMessages?.map(({ message_id }) => message_id)).toContain(
        dummyMessage.messageId,
      );

      const admin = localClient();
      const { error: adminSignInError } = await admin.auth.signInWithPassword({
        email: "admin@example.test",
        password: "local-only-test-password",
      });
      expect(adminSignInError).toBeNull();
      const { data: createdConversation, error: createConversationError } =
        await admin
          .from("conversations")
          .insert({
            report_id: dummyReport.reportId,
            user_1_id: dummyUsers.owner.userId,
            user_2_id: dummyUsers.admin.userId,
          })
          .select("conversation_id")
          .single();
      expect(createConversationError).toBeNull();
      expect(createdConversation).toMatchObject({
        conversation_id: expect.any(String),
      });

      const { error: invalidPairError } = await admin
        .from("conversations")
        .insert({
          report_id: dummyReport.reportId,
          user_1_id: dummyUsers.finder.userId,
          user_2_id: dummyUsers.admin.userId,
        });
      expect(invalidPairError).not.toBeNull();

      const { error: unauthorizedReadStateError } = await admin.rpc(
        "mark_conversation_messages_read",
        { target_conversation_id: dummyConversation.conversationId },
      );
      expect(unauthorizedReadStateError).toBeNull();
      const { data: unreadMessage } = await service
        .from("messages")
        .select("read_at")
        .eq("message_id", dummyMessage.messageId)
        .single();
      expect(unreadMessage?.read_at).toBeNull();

      if (createdConversation?.conversation_id) {
        const { error: cleanupError } = await service
          .from("conversations")
          .delete()
          .eq("conversation_id", createdConversation.conversation_id);
        expect(cleanupError).toBeNull();
      }

      const { data: privateMessages, error: privateMessageError } = await admin
        .from("messages")
        .select("message_id")
        .eq("conversation_id", dummyConversation.conversationId);
      expect(privateMessageError).toBeNull();
      expect(privateMessages).toEqual([]);

      const { error: sendError } = await admin.from("messages").insert({
        conversation_id: dummyConversation.conversationId,
        sender_id: dummyUsers.admin.userId,
        content: "Unauthorized local test message.",
      });
      expect(sendError).not.toBeNull();

      const resolvingOwner = localClient();
      const { error: resolvingOwnerError } =
        await resolvingOwner.auth.signInWithPassword({
          email: "owner@example.test",
          password: "local-only-test-password",
        });
      expect(resolvingOwnerError).toBeNull();
      try {
        for (const status of ["FOUND", "REMOVED"] as const) {
          const { error: statusError } = await resolvingOwner
            .from("lost_pet_reports")
            .update({ status })
            .eq("report_id", dummyReport.reportId);
          expect(statusError).toBeNull();

          const { data: resolvedMessages, error: readError } = await finder
            .from("messages")
            .select("message_id")
            .eq("conversation_id", dummyConversation.conversationId);
          expect(readError).toBeNull();
          expect(
            resolvedMessages?.map(({ message_id }) => message_id),
          ).toContain(dummyMessage.messageId);

          const { error: resolvedSendError } = await finder
            .from("messages")
            .insert({
              conversation_id: dummyConversation.conversationId,
              sender_id: dummyUsers.finder.userId,
              content: `Blocked after ${status.toLowerCase()}.`,
            });
          expect(resolvedSendError).not.toBeNull();
        }
      } finally {
        const { error: restoreError } = await resolvingOwner
          .from("lost_pet_reports")
          .update({ status: "LOST" })
          .eq("report_id", dummyReport.reportId);
        expect(restoreError).toBeNull();
        await resolvingOwner.auth.signOut();
      }
      await Promise.all([finder.auth.signOut(), admin.auth.signOut()]);
    });

    it("keeps Pet Profile images private while the server can issue signed access", async () => {
      const ownerId = dummyUsers.owner.authProviderId;
      const path = `${ownerId}/pets/storage-rls-test.webp`;
      const service = serviceClient();
      const image = new Blob([new Uint8Array([1, 2, 3])], {
        type: "image/webp",
      });
      const { error: uploadError } = await service.storage
        .from("pet-images")
        .upload(path, image, {
          contentType: "image/webp",
          upsert: true,
        });
      expect(uploadError).toBeNull();

      try {
        const anonymous = await localClient()
          .storage.from("pet-images")
          .download(path);
        expect(anonymous.error).not.toBeNull();

        const owner = localClient();
        const { error: signInError } = await owner.auth.signInWithPassword({
          email: "owner@example.test",
          password: "local-only-test-password",
        });
        expect(signInError).toBeNull();
        const directAccess = await owner.storage
          .from("pet-images")
          .download(path);
        expect(directAccess.error).not.toBeNull();
        await owner.auth.signOut();

        const { data: signedUrl, error: signedUrlError } = await service.storage
          .from("pet-images")
          .createSignedUrl(path, 60);
        expect(signedUrlError).toBeNull();
        if (!signedUrl)
          throw new Error("Expected a signed Pet Profile image URL.");
        expect(signedUrl.signedUrl).toContain("token=");
        const imageResponse = await fetch(signedUrl.signedUrl);
        expect(imageResponse.status).toBe(200);
        expect(new Uint8Array(await imageResponse.arrayBuffer())).toEqual(
          new Uint8Array([1, 2, 3]),
        );
      } finally {
        await service.storage.from("pet-images").remove([path]);
      }
    });
  },
);
