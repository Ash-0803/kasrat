import { MotiView } from "moti";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

type SkeletonVariant = "card" | "row" | "avatar";

type SkeletonProps = {
  variant: SkeletonVariant;
  style?: StyleProp<ViewStyle>;
};

function SkeletonBlock({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <MotiView
      from={{ opacity: 0.35 }}
      animate={{ opacity: 1 }}
      transition={{
        opacity: {
          duration: 900,
          loop: true,
          repeatReverse: true,
          type: "timing",
        },
      }}
      style={[styles.block, style]}
    />
  );
}

export default function Skeleton({ variant, style }: SkeletonProps) {
  if (variant === "avatar") {
    return <SkeletonBlock style={[styles.avatar, style]} />;
  }

  if (variant === "card") {
    return <SkeletonBlock style={[styles.card, style]} />;
  }

  return (
    <View style={[styles.row, style]}>
      <SkeletonBlock style={styles.rowAvatar} />
      <View style={styles.rowCopy}>
        <SkeletonBlock style={styles.rowLinePrimary} />
        <SkeletonBlock style={styles.rowLineSecondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#DFE5F0",
    borderRadius: 10,
  },
  card: {
    borderRadius: 14,
    height: 112,
    width: "100%",
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    width: "100%",
  },
  rowAvatar: {
    borderRadius: 999,
    height: 42,
    width: 42,
  },
  rowCopy: {
    flex: 1,
    gap: 8,
    marginLeft: 12,
  },
  rowLinePrimary: {
    height: 14,
    width: "70%",
  },
  rowLineSecondary: {
    height: 12,
    width: "45%",
  },
  avatar: {
    borderRadius: 999,
    height: 84,
    width: 84,
  },
});
