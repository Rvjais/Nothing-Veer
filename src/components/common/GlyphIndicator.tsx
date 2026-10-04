import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { NothingColors } from "../../constants/theme";

export interface GlyphIndicatorProps {
  isPlaying: boolean;
  color?: string;
  size?: number;
}

export const GlyphIndicator: React.FC<GlyphIndicatorProps> = ({
  isPlaying,
  color = NothingColors.red,
  size = 18,
}) => {
  const anim1 = useRef(new Animated.Value(0.3)).current;
  const anim2 = useRef(new Animated.Value(0.7)).current;
  const anim3 = useRef(new Animated.Value(0.4)).current;
  const anim4 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;

    if (isPlaying) {
      const createBarAnim = (anim: Animated.Value, min: number, max: number, duration: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: max,
              duration,
              useNativeDriver: false,
            }),
            Animated.timing(anim, {
              toValue: min,
              duration,
              useNativeDriver: false,
            }),
          ])
        );
      };

      const loop1 = createBarAnim(anim1, 0.2, 1.0, 320);
      const loop2 = createBarAnim(anim2, 0.3, 0.9, 450);
      const loop3 = createBarAnim(anim3, 0.1, 1.0, 280);
      const loop4 = createBarAnim(anim4, 0.4, 0.85, 380);

      loop = Animated.parallel([loop1, loop2, loop3, loop4]);
      loop.start();
    } else {
      Animated.parallel([
        Animated.timing(anim1, { toValue: 0.2, duration: 200, useNativeDriver: false }),
        Animated.timing(anim2, { toValue: 0.2, duration: 200, useNativeDriver: false }),
        Animated.timing(anim3, { toValue: 0.2, duration: 200, useNativeDriver: false }),
        Animated.timing(anim4, { toValue: 0.2, duration: 200, useNativeDriver: false }),
      ]).start();
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [isPlaying, anim1, anim2, anim3, anim4]);

  const barWidth = Math.max(2, size / 6);
  const maxHeight = size;

  return (
    <View style={[styles.container, { height: maxHeight, width: size }]}>
      {[anim1, anim2, anim3, anim4].map((anim, idx) => (
        <Animated.View
          key={idx}
          style={[
            styles.bar,
            {
              backgroundColor: color,
              width: barWidth,
              height: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [2, maxHeight],
              }),
            },
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  bar: {
    borderRadius: 1,
  },
});

