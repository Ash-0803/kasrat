import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Platform } from "react-native";
import { Session } from "../types";
import { auth, db } from "./firebase";

const USERS_COLLECTION = "users";
const SESSION_ALARM_MARKER = "kasratSessionAlarm";
const ANDROID_CHANNEL_ID = "session-reminders";

export interface PushRegistrationResult {
  token: string | null;
  permissionGranted: boolean;
  shouldShowPermissionBanner: boolean;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function parseSessionTime(
  time: string,
): { hour: number; minute: number } | null {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);

  if (
    Number.isNaN(hour) ||
    Number.isNaN(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return { hour, minute };
}

function getExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;

  return Constants.easConfig?.projectId ?? extra?.eas?.projectId;
}

async function markPermissionBannerShown(uid: string): Promise<boolean> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);
  const alreadyShown = Boolean(
    userSnap.data()?.notificationPermissionBannerShown,
  );

  if (!alreadyShown) {
    await setDoc(
      userRef,
      {
        notificationPermissionBannerShown: true,
      },
      { merge: true },
    );
  }

  return alreadyShown;
}

function isKasratAlarmData(data: unknown): data is Record<string, unknown> {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Record<string, unknown>)[SESSION_ALARM_MARKER] === true
  );
}

async function getAlarmIdentifiersForSession(
  sessionId?: string,
): Promise<string[]> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const identifiers: string[] = [];

  scheduled.forEach((request) => {
    const { data } = request.content;

    if (!isKasratAlarmData(data)) {
      return;
    }

    if (sessionId) {
      const storedSessionId = data.sessionId;
      if (
        typeof storedSessionId !== "string" ||
        storedSessionId !== sessionId
      ) {
        return;
      }
    }

    identifiers.push(request.identifier);
  });

  return identifiers;
}

export async function registerForPushNotificationsAsync(): Promise<PushRegistrationResult> {
  const currentUser = auth.currentUser;
  if (!currentUser?.uid) {
    return {
      token: null,
      permissionGranted: false,
      shouldShowPermissionBanner: false,
    };
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: "Session reminders",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#4CAF50",
    });
  }

  const permission = await Notifications.getPermissionsAsync();
  let finalStatus = permission.status;

  if (finalStatus !== "granted") {
    const requested = await Notifications.requestPermissionsAsync();
    finalStatus = requested.status;
  }

  if (finalStatus !== "granted") {
    const alreadyShown = await markPermissionBannerShown(currentUser.uid);
    return {
      token: null,
      permissionGranted: false,
      shouldShowPermissionBanner: !alreadyShown,
    };
  }

  if (!Device.isDevice) {
    return {
      token: null,
      permissionGranted: true,
      shouldShowPermissionBanner: false,
    };
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.warn(
      "Expo project ID not found; skipping push token registration.",
    );
    return {
      token: null,
      permissionGranted: true,
      shouldShowPermissionBanner: false,
    };
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await setDoc(
    doc(db, USERS_COLLECTION, currentUser.uid),
    {
      pushToken: token,
    },
    { merge: true },
  );

  return {
    token,
    permissionGranted: true,
    shouldShowPermissionBanner: false,
  };
}

export async function scheduleDailySessionAlarm(
  session: Session,
): Promise<string | null> {
  if (session.status !== "active") {
    return null;
  }

  const parsed = parseSessionTime(session.time);
  if (!parsed) {
    return null;
  }

  await cancelSessionAlarm(session.id);

  const identifier = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to move!",
      body: `Session at ${session.time} - don't forget to log it.`,
      data: {
        [SESSION_ALARM_MARKER]: true,
        sessionId: session.id,
      },
    },
    trigger: {
      hour: parsed.hour,
      minute: parsed.minute,
      repeats: true,
    },
  });

  return identifier;
}

export async function cancelSessionAlarm(sessionId: string): Promise<void> {
  const identifiers = await getAlarmIdentifiersForSession(sessionId);
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    ),
  );
}

export async function clearAllSessionAlarms(): Promise<void> {
  const identifiers = await getAlarmIdentifiersForSession();
  await Promise.all(
    identifiers.map((identifier) =>
      Notifications.cancelScheduledNotificationAsync(identifier),
    ),
  );
}
