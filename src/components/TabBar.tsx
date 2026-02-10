import { useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Canvas,
  Line,
  LinearGradient,
  vec,
  BlurMask,
} from '@shopify/react-native-skia';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const SPRING_SNAPPY = { damping: 50, stiffness: 280 };
const LASER_WIDTH = 40;
const BAR_HEIGHT = 56;

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  index: { active: 'pulse', inactive: 'pulse-outline' },
  history: { active: 'bar-chart', inactive: 'bar-chart-outline' },
  settings: { active: 'cog', inactive: 'cog-outline' },
};

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = UnistylesRuntime.getTheme();
  const tabCount = state.routes.length;

  const laserX = useSharedValue(0);

  useEffect(() => {
    // We don't know the exact width, so we compute in the animated style
    // Just track the index
    laserX.value = withSpring(state.index, SPRING_SNAPPY);
  }, [state.index, laserX]);

  const totalHeight = BAR_HEIGHT + insets.bottom;

  return (
    <View style={[styles.container, { height: totalHeight, paddingBottom: insets.bottom }]}>
      {/* Skia top border + laser line */}
      <Canvas style={styles.skiaCanvas}>
        {/* 0.5pt border line across full width */}
        <Line
          p1={vec(0, 0.5)}
          p2={vec(10000, 0.5)}
          color="rgba(255,255,255,0.1)"
          strokeWidth={0.5}
        />
      </Canvas>

      {/* Laser line (Reanimated positioned, Skia rendered) */}
      <LaserLine tabCount={tabCount} activeIndex={laserX} />

      {/* Tab buttons */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel ?? options.title ?? route.name) as string;
          const isFocused = state.index === index;
          const iconConfig = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
            >
              <View style={styles.iconContainer}>
                <Ionicons
                  name={(isFocused ? iconConfig.active : iconConfig.inactive) as any}
                  size={24}
                  color={isFocused ? theme.colors.accent : theme.colors.textTertiary}
                />
                {/* Glow behind active icon */}
                {isFocused && (
                  <View
                    style={[
                      styles.iconGlow,
                      {
                        backgroundColor: theme.colors.accentGlow,
                        shadowColor: theme.colors.accent,
                      },
                    ]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: isFocused ? theme.colors.accent : theme.colors.textTertiary },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function LaserLine({
  tabCount,
  activeIndex,
}: {
  tabCount: number;
  activeIndex: SharedValue<number>;
}) {
  const theme = UnistylesRuntime.getTheme();

  const animStyle = useAnimatedStyle(() => {
    // Estimate tab width based on screen - we use 100%/tabCount approach
    // The laser line translates based on tab center
    const tabFraction = 1 / tabCount;
    const centerFraction = activeIndex.value * tabFraction + tabFraction / 2;
    return {
      left: `${centerFraction * 100}%` as any,
      marginLeft: -LASER_WIDTH / 2,
    };
  });

  return (
    <Animated.View style={[styles.laserContainer, animStyle]}>
      <Canvas style={styles.laserCanvas}>
        {/* Sharp laser line */}
        <Line
          p1={vec(0, 1)}
          p2={vec(LASER_WIDTH, 1)}
          strokeWidth={1}
        >
          <LinearGradient
            start={vec(0, 0)}
            end={vec(LASER_WIDTH, 0)}
            colors={['transparent', theme.colors.accent, 'transparent']}
          />
        </Line>

        {/* Bloom glow underneath */}
        <Line
          p1={vec(4, 2)}
          p2={vec(LASER_WIDTH - 4, 2)}
          strokeWidth={4}
          opacity={0.4}
        >
          <LinearGradient
            start={vec(4, 0)}
            end={vec(LASER_WIDTH - 4, 0)}
            colors={['transparent', theme.colors.accent, 'transparent']}
          />
          <BlurMask blur={6} style="normal" />
        </Line>
      </Canvas>
    </Animated.View>
  );
}

const styles = StyleSheet.create((theme) => ({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  skiaCanvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  laserContainer: {
    position: 'absolute',
    top: 0,
    width: LASER_WIDTH,
    height: 6,
  },
  laserCanvas: {
    width: LASER_WIDTH,
    height: 6,
  },
  tabRow: {
    flex: 1,
    flexDirection: 'row',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    ...({ position: 'absolute' } as const),
    width: 28,
    height: 28,
    borderRadius: 14,
    opacity: 0.25,
    shadowOpacity: 0.8,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  label: {
    fontSize: 11,
    fontWeight: '300',
    letterSpacing: 0.5,
  },
}));
