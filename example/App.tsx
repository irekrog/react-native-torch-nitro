/**
 * Torch Control Example App
 * Modern flashlight controller with smooth animations
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTorch } from 'react-native-torch-nitro';
import { Slider } from '@miblanchard/react-native-slider';

const { width } = Dimensions.get('window');

function App() {
  const [isOn, setIsOn] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const glowAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const { toggle, setLevel, getMaxLevel } = useTorch({
    onStateChanged: state => {
      setIsOn(state);
    },
    onError: error => {
      console.log('Torch error:', error.code);
    },
    onLevelChanged: level => {
      setCurrentLevel(level || 0);
    },
  });

  const maxLevel = getMaxLevel() || 10;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [glowAnim]);

  const handleToggle = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    toggle();
  };

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <AppContent
        isOn={isOn}
        currentLevel={currentLevel}
        maxLevel={maxLevel}
        glowOpacity={glowOpacity}
        scaleAnim={scaleAnim}
        onToggle={handleToggle}
        onLevelChange={setLevel}
      />
    </SafeAreaProvider>
  );
}

interface AppContentProps {
  isOn: boolean;
  currentLevel: number;
  maxLevel: number;
  glowOpacity: Animated.AnimatedInterpolation<number>;
  scaleAnim: Animated.Value;
  onToggle: () => void;
  onLevelChange: (level: number) => void;
}

function AppContent({
  isOn,
  currentLevel,
  maxLevel,
  glowOpacity,
  scaleAnim,
  onToggle,
  onLevelChange,
}: AppContentProps) {
  const insets = useSafeAreaInsets();

  const containerStyle = [
    styles.container,
    isOn ? styles.containerOn : styles.containerOff,
    {
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
    },
  ];

  const torchButtonStyle = [
    styles.torchButton,
    isOn ? styles.torchButtonOn : styles.torchButtonOff,
    {
      transform: [{ scale: scaleAnim }],
    },
  ];

  const bulbCircleStyle = [
    styles.bulbCircle,
    isOn ? styles.bulbCircleOn : styles.bulbCircleOff,
  ];

  const bulbBaseStyle = [
    styles.bulbBase,
    isOn ? styles.bulbBaseOn : styles.bulbBaseOff,
  ];

  const bulbSocketStyle = [
    styles.bulbSocket,
    isOn ? styles.bulbSocketOn : styles.bulbSocketOff,
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.header}>
        <Text style={styles.title}>Torch Control</Text>
        <Text style={styles.subtitle}>
          {isOn ? 'Flashlight is ON' : 'Flashlight is OFF'}
        </Text>
      </View>

      <View style={styles.torchContainer}>
        {isOn && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowOpacity,
                transform: [
                  {
                    scale: glowOpacity.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        )}

        <Pressable onPress={onToggle}>
          <Animated.View style={torchButtonStyle}>
            <View style={styles.torchIcon}>
              {/* Bulb circle */}
              <View style={bulbCircleStyle}>
                {isOn && (
                  <>
                    {/* Light rays */}
                    <View style={[styles.ray, styles.rayTop]} />
                    <View style={[styles.ray, styles.rayRight]} />
                    <View style={[styles.ray, styles.rayBottom]} />
                    <View style={[styles.ray, styles.rayLeft]} />
                    <View style={[styles.ray, styles.rayTopRight]} />
                    <View style={[styles.ray, styles.rayTopLeft]} />
                    <View style={[styles.ray, styles.rayBottomRight]} />
                    <View style={[styles.ray, styles.rayBottomLeft]} />
                  </>
                )}
              </View>
              {/* Bulb base */}
              <View style={bulbBaseStyle} />
              <View style={bulbSocketStyle} />
            </View>
          </Animated.View>
        </Pressable>

        <Text style={styles.instruction}>
          Tap to {isOn ? 'turn off' : 'turn on'}
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        <View style={styles.levelInfo}>
          <Text style={styles.levelLabel}>Brightness</Text>
          <Text style={styles.levelValue}>
            {currentLevel} / {maxLevel}
          </Text>
        </View>

        <View style={styles.sliderContainer}>
          <Text style={styles.sliderLabel}>MIN</Text>
          <Slider
            value={currentLevel}
            minimumValue={0}
            maximumValue={maxLevel}
            step={1}
            onValueChange={value => {
              onLevelChange(value[0]);
            }}
            containerStyle={styles.slider}
            minimumTrackTintColor="#ffd700"
            maximumTrackTintColor="#2d2d44"
            thumbTintColor="#ffd700"
            thumbStyle={styles.thumb}
            trackStyle={styles.track}
          />
          <Text style={styles.sliderLabel}>MAX</Text>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.quickActionsTitle}>Quick Actions</Text>
          <View style={styles.quickButtonsRow}>
            <Pressable
              style={({ pressed }) => [
                styles.quickButton,
                pressed && styles.quickButtonPressed,
              ]}
              onPress={() => onLevelChange(Math.round(maxLevel * 0.25))}
            >
              <Text style={styles.quickButtonText}>25%</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickButton,
                pressed && styles.quickButtonPressed,
              ]}
              onPress={() => onLevelChange(Math.round(maxLevel * 0.5))}
            >
              <Text style={styles.quickButtonText}>50%</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickButton,
                pressed && styles.quickButtonPressed,
              ]}
              onPress={() => onLevelChange(Math.round(maxLevel * 0.75))}
            >
              <Text style={styles.quickButtonText}>75%</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.quickButton,
                pressed && styles.quickButtonPressed,
              ]}
              onPress={() => onLevelChange(maxLevel)}
            >
              <Text style={styles.quickButtonText}>MAX</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerOn: {
    backgroundColor: '#1a1a2e',
  },
  containerOff: {
    backgroundColor: '#0f0f1e',
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8e8ea0',
  },
  torchContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  torchButton: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width * 0.25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 10,
  },
  torchButtonOn: {
    backgroundColor: '#ffd700',
  },
  torchButtonOff: {
    backgroundColor: '#2d2d44',
  },
  glow: {
    position: 'absolute',
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: '#ffd700',
  },
  torchIcon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bulbCircleOn: {
    backgroundColor: '#fff',
  },
  bulbCircleOff: {
    backgroundColor: '#4a4a5e',
  },
  ray: {
    position: 'absolute',
    width: 4,
    height: 30,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  rayTop: {
    top: -40,
    left: 33,
  },
  rayBottom: {
    bottom: -40,
    left: 33,
  },
  rayLeft: {
    left: -40,
    top: 33,
    transform: [{ rotate: '90deg' }],
  },
  rayRight: {
    right: -40,
    top: 33,
    transform: [{ rotate: '90deg' }],
  },
  rayTopLeft: {
    top: -32,
    left: -10,
    transform: [{ rotate: '45deg' }],
  },
  rayTopRight: {
    top: -32,
    right: -10,
    transform: [{ rotate: '-45deg' }],
  },
  rayBottomLeft: {
    bottom: -32,
    left: -10,
    transform: [{ rotate: '-45deg' }],
  },
  rayBottomRight: {
    bottom: -32,
    right: -10,
    transform: [{ rotate: '45deg' }],
  },
  bulbBase: {
    width: 40,
    height: 20,
    borderRadius: 4,
    marginBottom: 2,
  },
  bulbBaseOn: {
    backgroundColor: '#f0e68c',
  },
  bulbBaseOff: {
    backgroundColor: '#3a3a4e',
  },
  bulbSocket: {
    width: 30,
    height: 15,
    borderRadius: 2,
  },
  bulbSocketOn: {
    backgroundColor: '#daa520',
  },
  bulbSocketOff: {
    backgroundColor: '#2a2a3e',
  },
  instruction: {
    marginTop: 30,
    fontSize: 16,
    color: '#8e8ea0',
  },
  controlsContainer: {
    paddingHorizontal: 30,
    paddingBottom: 30,
  },
  levelInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  levelLabel: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '600',
  },
  levelValue: {
    fontSize: 24,
    color: '#ffd700',
    fontWeight: 'bold',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  slider: {
    flex: 1,
    marginHorizontal: 15,
  },
  sliderLabel: {
    color: '#8e8ea0',
    fontSize: 12,
    fontWeight: '600',
  },
  thumb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    shadowColor: '#ffd700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 5,
  },
  track: {
    height: 6,
    borderRadius: 3,
  },
  quickActions: {
    marginTop: 10,
  },
  quickActionsTitle: {
    fontSize: 16,
    color: '#8e8ea0',
    marginBottom: 15,
    textAlign: 'center',
  },
  quickButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickButton: {
    flex: 1,
    backgroundColor: '#2d2d44',
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3a3a4e',
  },
  quickButtonPressed: {
    backgroundColor: '#3a3a4e',
    borderColor: '#ffd700',
  },
  quickButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default App;
