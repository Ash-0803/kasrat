import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef } from "react";
import { Animated, StyleProp, StyleSheet, Text, ViewStyle } from "react-native";

type Tone = {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
};

interface StreakBadgeProps {
  streak: number;
  style?: StyleProp<ViewStyle>;
}

function getTone(streak: number): Tone {
  if (streak <= 0) {
    return {
      backgroundColor: "#ECEFF4",
      borderColor: "#D5DBE5",
      textColor: "#6B7280",
    };
  }

  if (streak <= 4) {
    return {
      backgroundColor: "#FFF1E4",
      borderColor: "#FFD5AD",
      textColor: "#D97706",
    };
  }

  if (streak <= 9) {
    return {
      backgroundColor: "#FEE6E6",
      borderColor: "#FECACA",
      textColor: "#DC2626",
    };
  }

  return {
    backgroundColor: "#F1E8FF",
    borderColor: "#DCC7FF",
    textColor: "#7C3AED",
  };
}

export default function StreakBadge({ streak, style }: StreakBadgeProps) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (streak >= 10) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, {
            toValue: 1.08,
            duration: 700,
            useNativeDriver: true,
          }),
          Animated.timing(pulse, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
          }),
        ]),
      );

      loop.start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }

    return () => {
      if (loop) {
        loop.stop();
      }
    };
  }, [pulse, streak]);

  const tone = getTone(streak);

  return (
    <Animated.View
      style={[
        styles.badge,
        {
          backgroundColor: tone.backgroundColor,
          borderColor: tone.borderColor,
        },
        streak >= 10 && { transform: [{ scale: pulse }] },
        style,
      ]}
    >
      <Ionicons name="flame" size={14} color={tone.textColor} />
      <Text style={[styles.value, { color: tone.textColor }]}>{streak}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  value: {
    fontSize: 13,
    fontWeight: "700",
  },
});
