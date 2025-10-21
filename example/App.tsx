/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { NewAppScreen } from '@react-native/new-app-screen';
import {
  Button,
  StatusBar,
  StyleSheet,
  useColorScheme,
  View,
} from 'react-native';
import { Text } from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useTorch } from 'react-native-torch-nitro';
import { useState } from 'react';
import { Slider } from '@miblanchard/react-native-slider';

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [currentLevel, setCurrentLevel] = useState(0);

  const { on, off, toggle, setLevel, getMaxLevel } = useTorch({
    onStateChanged: state => {
      console.log('Torch state changed:', state);
    },
    onError: error => {
      console.log('Error', error.code);
    },
    onLevelChanged: level => {
      console.log('Torch level changed:', level);
      setCurrentLevel(level || 0);
    },
  });

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
      <Text style={{ color: 'white', padding: 10 }}>
        Max Level: {getMaxLevel(false)}
      </Text>
      <Text style={{ color: 'white', padding: 10 }}>
        Current Level: {currentLevel}
      </Text>
      <Button onPress={toggle} title="Toggle" />
      <Button onPress={on} title="On" />
      <Button onPress={off} title="Off" />
      <Button onPress={() => setLevel(5)} title="Set Level 5" />
      <Button onPress={() => setLevel(7)} title="Set Level 7" />
      <Button onPress={() => setLevel(10)} title="Set Level 10" />
      <Button onPress={() => setLevel(11)} title="Set Level 11" />
      <View style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        <Slider
          value={currentLevel}
          minimumValue={0}
          maximumValue={getMaxLevel() || 100}
          step={1}
          onValueChange={value => {
            setLevel(value[0]);
          }}
          minimumTrackTintColor="#FFFFFF"
          maximumTrackTintColor="#888888"
          thumbTintColor="#FFFFFF"
        />
      </View>
    </SafeAreaProvider>
  );
}

function AppContent() {
  const safeAreaInsets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <NewAppScreen
        templateFileName="App.tsx"
        safeAreaInsets={safeAreaInsets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
