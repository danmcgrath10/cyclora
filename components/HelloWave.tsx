import { ThemedText } from '@/components/ThemedText';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

export function HelloWave() {
  const rotationAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const wave = () => {
      Animated.sequence([
        Animated.timing(rotationAnim, {
          toValue: 25,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(rotationAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          Animated.sequence([
            Animated.timing(rotationAnim, {
              toValue: 25,
              duration: 150,
              useNativeDriver: true,
            }),
            Animated.timing(rotationAnim, {
              toValue: 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      });
    };
    wave();
  }, [rotationAnim]);

  const animatedStyle = {
    transform: [
      {
        rotate: rotationAnim.interpolate({
          inputRange: [0, 25],
          outputRange: ['0deg', '25deg'],
        }),
      },
    ],
  };

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 32,
    textAlign: 'center',
  },
});
