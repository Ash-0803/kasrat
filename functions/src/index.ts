import * as admin from "firebase-admin";
import { logger } from "firebase-functions";
import * as functions from "firebase-functions/v2";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";

admin.initializeApp();

type SessionDoc = {
  time?: string;
  status?: string;
};

type UserDoc = {
  currentStreak?: number;
  longestStreak?: number;
};

const USERS_COLLECTION = "users";
const SESSION_LOGS_COLLECTION = "session_logs";
const SHAME_COLLECTION = "shame";
const CONFIG_COLLECTION = "config";
const APP_CONFIG_DOC = "app";
const TOKENS_PER_BATCH = 500;
const DAILY_SCHEDULE = "59 23 * * *";
const SCHEDULER_REGION = "us-central1";
const SCHEDULER_TIME_ZONE = "Etc/UTC";
const DEFAULT_MIN_SESSIONS_FOR_STREAK = 3;

const SHAME_BADGE_LABELS = [
  "Phantom Presencer",
  "Couch Champion",
  "Professional Excuse Maker",
  "Certified Ghost",
  "Mute-Button Marathoner",
  "Calendar Acrobat",
  "Desk Chair Olympian",
  "Sneaker Snoozer",
  "Zoom Window Wanderer",
  "Workout Houdini",
];

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

function getDateKey(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const year = formatter
    .formatToParts(date)
    .find((part) => part.type === "year")?.value;
  const month = formatter
    .formatToParts(date)
    .find((part) => part.type === "month")?.value;
  const day = formatter
    .formatToParts(date)
    .find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("Could not derive scheduler date key.");
  }

  return `${year}-${month}-${day}`;
}

function randomShameBadge(): string {
  const index = Math.floor(Math.random() * SHAME_BADGE_LABELS.length);
  return SHAME_BADGE_LABELS[index];
}

async function getMinSessionsForStreak(
  db: FirebaseFirestore.Firestore,
): Promise<number> {
  try {
    const configSnapshot = await db
      .collection(CONFIG_COLLECTION)
      .doc(APP_CONFIG_DOC)
      .get();

    if (!configSnapshot.exists) {
      return DEFAULT_MIN_SESSIONS_FOR_STREAK;
    }

    const candidate = configSnapshot.get("minSessionsForStreak");

    if (typeof candidate !== "number" || !Number.isFinite(candidate)) {
      return DEFAULT_MIN_SESSIONS_FOR_STREAK;
    }

    const rounded = Math.floor(candidate);
    return rounded > 0 ? rounded : DEFAULT_MIN_SESSIONS_FOR_STREAK;
  } catch (error) {
    logger.warn("Could not read minSessionsForStreak config", { error });
    return DEFAULT_MIN_SESSIONS_FOR_STREAK;
  }
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

export const dailyStreakReset = functions.scheduler.onSchedule(
  {
    schedule: DAILY_SCHEDULE,
    region: SCHEDULER_REGION,
    timeZone: SCHEDULER_TIME_ZONE,
  },
  async () => {
    const db = admin.firestore();
    const targetDate = getDateKey(new Date(), SCHEDULER_TIME_ZONE);
    const minSessionsForStreak = await getMinSessionsForStreak(db);

    const usersSnapshot = await db.collection(USERS_COLLECTION).get();

    let incrementedCount = 0;
    let resetCount = 0;

    for (const userDoc of usersSnapshot.docs) {
      const uid = userDoc.id;

      const verifiedLogsSnapshot = await db
        .collection(SESSION_LOGS_COLLECTION)
        .where("uid", "==", uid)
        .where("date", "==", targetDate)
        .where("status", "==", "verified")
        .get();

      const verifiedCount = verifiedLogsSnapshot.size;

      await db.runTransaction(async (transaction) => {
        const userRef = db.collection(USERS_COLLECTION).doc(uid);
        const currentUserSnapshot = await transaction.get(userRef);
        const currentUserData = (currentUserSnapshot.data() ?? {}) as UserDoc;

        const currentStreak =
          typeof currentUserData.currentStreak === "number"
            ? currentUserData.currentStreak
            : 0;
        const longestStreak =
          typeof currentUserData.longestStreak === "number"
            ? currentUserData.longestStreak
            : 0;

        const nextCurrentStreak =
          verifiedCount >= minSessionsForStreak ? currentStreak + 1 : 0;
        const nextLongestStreak = Math.max(longestStreak, nextCurrentStreak);

        transaction.set(
          userRef,
          {
            currentStreak: nextCurrentStreak,
            longestStreak: nextLongestStreak,
            streakUpdatedAt: Date.now(),
          },
          { merge: true },
        );
      });

      if (verifiedCount >= minSessionsForStreak) {
        incrementedCount += 1;
      } else {
        resetCount += 1;
      }
    }

    logger.info("dailyStreakReset completed", {
      targetDate,
      minSessionsForStreak,
      processedUsers: usersSnapshot.size,
      incrementedCount,
      resetCount,
    });
  },
);

export const publishDailyShame = functions.scheduler.onSchedule(
  {
    schedule: DAILY_SCHEDULE,
    region: SCHEDULER_REGION,
    timeZone: SCHEDULER_TIME_ZONE,
  },
  async () => {
    const db = admin.firestore();
    const targetDate = getDateKey(new Date(), SCHEDULER_TIME_ZONE);

    const liedLogsSnapshot = await db
      .collection(SESSION_LOGS_COLLECTION)
      .where("date", "==", targetDate)
      .where("status", "==", "lied")
      .get();

    const uniqueUids = Array.from(
      new Set(
        liedLogsSnapshot.docs
          .map((docSnapshot) => docSnapshot.get("uid"))
          .filter((uid): uid is string => typeof uid === "string"),
      ),
    );

    if (uniqueUids.length === 0) {
      logger.info("publishDailyShame completed with no lied logs", {
        targetDate,
      });
      return;
    }

    const batch = db.batch();
    const entriesCollection = db
      .collection(SHAME_COLLECTION)
      .doc(targetDate)
      .collection("entries");

    uniqueUids.forEach((uid) => {
      batch.set(
        entriesCollection.doc(uid),
        {
          uid,
          date: targetDate,
          badgeLabel: randomShameBadge(),
        },
        { merge: true },
      );
    });

    await batch.commit();

    logger.info("publishDailyShame completed", {
      targetDate,
      liedLogCount: liedLogsSnapshot.size,
      publishedEntryCount: uniqueUids.length,
    });
  },
);
