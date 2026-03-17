import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

admin.initializeApp();

type SessionDoc = {
  time?: string;
  status?: string;
};

const USERS_COLLECTION = "users";
const TOKENS_PER_BATCH = 500;

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function getUpdateMessage(
  before: SessionDoc,
  after: SessionDoc,
): string | null {
  const wasCancelled = before.status === "cancelled";
  const isCancelled = after.status === "cancelled";
  const timeChanged = before.time !== after.time;

  if (!timeChanged && !(isCancelled && !wasCancelled)) {
    return null;
  }

  const sessionTime = after.time ?? before.time ?? "time TBD";
  if (isCancelled && !wasCancelled) {
    return `Session ${sessionTime} has been cancelled`;
  }

  return `Session ${sessionTime} has been updated`;
}

export const onSessionUpdated = onDocumentUpdated(
  {
    document: "sessions/{sessionId}",
    region: "us-central1",
  },
  async (event) => {
    const before = event.data?.before.data() as SessionDoc | undefined;
    const after = event.data?.after.data() as SessionDoc | undefined;

    if (!before || !after) {
      return;
    }

    const messageBody = getUpdateMessage(before, after);
    if (!messageBody) {
      return;
    }

    const usersSnapshot = await admin
      .firestore()
      .collection(USERS_COLLECTION)
      .get();

    const tokens = usersSnapshot.docs
      .map((userDoc) => userDoc.get("pushToken"))
      .filter(
        (token): token is string =>
          typeof token === "string" && token.length > 0,
      );

    if (tokens.length === 0) {
      logger.info("No push tokens found for onSessionUpdated notification.");
      return;
    }

    const uniqueTokens = [...new Set(tokens)];
    const batches = chunk(uniqueTokens, TOKENS_PER_BATCH);

    let successCount = 0;
    let failureCount = 0;

    for (const tokenBatch of batches) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokenBatch,
        notification: {
          title: "Kasrat Update",
          body: messageBody,
        },
        data: {
          sessionId: String(event.params.sessionId),
        },
      });

      successCount += response.successCount;
      failureCount += response.failureCount;
    }

    logger.info("onSessionUpdated notification summary", {
      sessionId: event.params.sessionId,
      messageBody,
      recipientCount: uniqueTokens.length,
      successCount,
      failureCount,
    });
  },
);
