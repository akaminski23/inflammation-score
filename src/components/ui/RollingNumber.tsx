import { useEffect, useMemo } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

const SPRING_SYNCED = { damping: 40, stiffness: 160 };

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

interface RollingDigitProps {
  digit: number;
  fontSize: number;
  color: string;
  digitHeight: number;
}

function RollingDigit({ digit, fontSize, color, digitHeight }: RollingDigitProps) {
  const translateY = useSharedValue(-digit * digitHeight);

  useEffect(() => {
    translateY.value = withSpring(-digit * digitHeight, SPRING_SYNCED);
  }, [digit, digitHeight, translateY]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={{ height: digitHeight, overflow: 'hidden', width: fontSize * 0.7 }}>
      <Animated.View style={animStyle}>
        {DIGITS.map((d) => (
          <Text
            key={d}
            style={{
              fontSize,
              fontWeight: '200',
              color,
              letterSpacing: -1,
              height: digitHeight,
              lineHeight: digitHeight,
              textAlign: 'center',
            }}
          >
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

interface RollingNumberProps {
  value: number;
  fontSize?: number;
  color?: string;
}

export default function RollingNumber({
  value,
  fontSize = 56,
  color = '#FFFFFF',
}: RollingNumberProps) {
  const digitHeight = fontSize * 1.1;

  const digits = useMemo(() => {
    const str = String(Math.max(0, Math.round(value)));
    return str.split('').map((d) => parseInt(d, 10));
  }, [value]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {digits.map((digit, index) => (
        <RollingDigit
          key={`pos-${digits.length - index}`}
          digit={digit}
          fontSize={fontSize}
          color={color}
          digitHeight={digitHeight}
        />
      ))}
    </View>
  );
}
