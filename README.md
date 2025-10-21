# react-native-torch-nitro

[![npm version](https://img.shields.io/npm/v/react-native-torch-nitro)](https://www.npmjs.com/package/react-native-torch-nitro)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

A high-performance React Native library for controlling the device's flashlight/torch, powered by [NitroModules](https://nitro.margelo.com/).

## Demo

https://github.com/user-attachments/assets/351562d6-ec79-4d46-82a9-35ebfb983840

> **Try it yourself:** Check out the full example app in the [`example/`](./example) folder.

## Features

- **Zero Bridge Overhead** - Direct native module access via NitroModules for maximum performance
- **Full Type Safety** - TypeScript definitions generated from native specs
- **React Hook API** - Simple and intuitive `useTorch()` hook
- **Brightness Control** - Adjust flashlight intensity on iOS (10 levels) and Android 13+ (device-dependent)
- **Real-time State Updates** - Native callbacks when torch state or brightness level changes
- **Cross-Platform** - Works seamlessly on iOS and Android
- **Error Handling** - Comprehensive error types for different failure scenarios

## Requirements

- React Native >= 0.76
- iOS: Deployment Target >= 13.0
- Android:
  - `minSdk` >= 23 (Android 6.0 Marshmallow) for basic torch functionality
  - `compileSdk` >= 34 (required by `react-native-nitro-modules`)
  - For brightness control: API 33+ (Android 13)
- `react-native-nitro-modules` >= 0.3x.x

## Installation

Using npm:

```sh
npm install react-native-torch-nitro react-native-nitro-modules
```

Using yarn:

```sh
yarn add react-native-torch-nitro react-native-nitro-modules
```

Using pnpm:

```sh
pnpm add react-native-torch-nitro react-native-nitro-modules
```

> `react-native-nitro-modules` is required as this library relies on [Nitro Modules](https://nitro.margelo.com/).

## Post Installation

### iOS Setup

```sh
cd ios && pod install
```

No additional configuration required. Camera/flashlight access doesn't require special permissions on iOS for torch usage.

### Android Setup

No additional permissions required! Since Android 6.0 (API 23), the `CameraManager.setTorchMode()` API doesn't require CAMERA permission.

Optionally, you can add a feature declaration to your `AndroidManifest.xml` to indicate flash support:

```xml
<uses-feature android:name="android.hardware.camera.flash" android:required="false" />
```

> The `android:required="false"` attribute allows your app to run on devices without a flash, but you should handle `NoFlashAvailable` errors appropriately.

## Quick Start

```tsx
import React, { useState } from 'react'
import { View, Button, Text, Slider } from 'react-native'
import { useTorch } from 'react-native-torch-nitro'

export default function App() {
  const [currentLevel, setCurrentLevel] = useState<number | null>(null)

  const { on, off, setLevel, getMaxLevel } = useTorch({
    onStateChanged: (state) => {
      console.log('Torch is now:', state ? 'ON' : 'OFF')
    },
    onLevelChanged: (level) => {
      console.log('Brightness level changed to:', level)
      setCurrentLevel(level)
    },
    onError: (error) => {
      console.error('Torch error:', error.code, error.message)
    },
  })

  const maxLevel = getMaxLevel() // null if brightness control not supported

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      <Text style={{ fontSize: 18, marginBottom: 20, textAlign: 'center' }}>
        Torch is {currentLevel !== null ? 'ON 🔦' : 'OFF'}
      </Text>

      <Button title="Turn On" onPress={on} />
      <Button title="Turn Off" onPress={off} />

      {maxLevel && maxLevel > 1 && (
        <View style={{ marginTop: 20 }}>
          <Text>Brightness Level: {currentLevel ?? 'N/A'}</Text>
          <Slider
            minimumValue={1}
            maximumValue={maxLevel}
            step={1}
            value={currentLevel ?? 1}
            onValueChange={(value) => setLevel(value)}
          />
        </View>
      )}
    </View>
  )
}
```

## API Reference

### `useTorch(options?)`

React hook for controlling the device flashlight with real-time state updates.

**Parameters:**

```typescript
interface UseTorchOptions {
  /**
   * Called when the torch state changes (true = on, false = off)
   */
  onStateChanged?: (isOn: boolean) => void

  /**
   * Called when the torch brightness level changes
   * null when torch is off, number (1 to maxLevel) when on
   */
  onLevelChanged?: (level: number | null) => void

  /**
   * Called when an error occurs (e.g., no flash available, access denied)
   */
  onError?: (error: TorchError) => void
}
```

**Returns:**

```typescript
{
  on: () => Promise<void> // Turn the torch on
  off: () => Promise<void> // Turn the torch off
  toggle: () => Promise<void> // Toggle the torch on/off
  setLevel: (level: number) => Promise<void> // Set brightness level (1 to maxLevel)
  getMaxLevel: (dynamic?: boolean) => number | null // Get max brightness level (null if not supported)
  // dynamic: iOS only - if true, returns current available level (may be lower under thermal stress)
  //                    - if false/undefined, returns hardware maximum (10)
  //          Android - parameter is ignored, always returns hardware maximum
}
```

**Example:**

```tsx
const { on, off, toggle, setLevel, getMaxLevel } = useTorch({
  onStateChanged: (state) => {
    console.log('Torch state changed to:', state)
  },
  onLevelChanged: (level) => {
    console.log('Brightness level:', level)
  },
  onError: (error) => {
    if (error.code === 'NoFlashAvailable') {
      Alert.alert('Error', 'Your device does not have a flashlight')
    }
  },
})

// Simple toggle
await toggle()

// Or use on/off explicitly
await on()
await off()

// Check if brightness control is supported
const maxLevel = getMaxLevel()
if (maxLevel && maxLevel > 1) {
  // Device supports brightness control
  await setLevel(maxLevel / 2) // Set to 50% brightness
}

// iOS: Check current available level (may be lower under thermal stress)
const currentMaxLevel = getMaxLevel(true) // iOS only - returns current available level
const hardwareMaxLevel = getMaxLevel() // or getMaxLevel(false) - returns hardware max (10 on iOS)
```

## Error Types

The library provides specific error codes for different failure scenarios:

```typescript
enum TorchExceptionType {
  /**
   * Camera service is not available (Android specific)
   */
  CameraServiceUnavailable = 'CameraServiceUnavailable',

  /**
   * Android API level is too low
   * - For basic torch: < Android 6.0 (API 23)
   * - For brightness control: < Android 13 (API 33)
   */
  ApiLevelTooLow = 'ApiLevelTooLow',

  /**
   * Device does not have a flash/torch
   */
  NoFlashAvailable = 'NoFlashAvailable',

  /**
   * Device does not support brightness control
   * (FLASH_INFO_STRENGTH_MAXIMUM_LEVEL <= 1)
   */
  BrightnessControlNotSupported = 'BrightnessControlNotSupported',

  /**
   * Failed to access or control the torch
   */
  AccessFailed = 'AccessFailed',
}
```

**Error Object:**

```typescript
interface TorchError {
  message: string // Human-readable error message
  code: TorchExceptionType // Error type code
}
```

## Usage Examples

### Basic Toggle

```tsx
function TorchToggle() {
  const [isOn, setIsOn] = useState(false)
  const { toggle } = useTorch({
    onStateChanged: setIsOn,
  })

  return (
    <Button
      title={isOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
      onPress={toggle}
    />
  )
}
```

### Manual On/Off Control

```tsx
function TorchManualControl() {
  const [isOn, setIsOn] = useState(false)
  const { on, off } = useTorch({
    onStateChanged: setIsOn,
  })

  return (
    <View>
      <Button title="Turn On" onPress={on} disabled={isOn} />
      <Button title="Turn Off" onPress={off} disabled={!isOn} />
    </View>
  )
}
```

### Brightness Control

```tsx
function TorchBrightnessControl() {
  const [level, setLevel] = useState<number | null>(null)

  const { setLevel: setTorchLevel, getMaxLevel } = useTorch({
    onLevelChanged: setLevel,
    onError: (error) => {
      if (error.code === 'BrightnessControlNotSupported') {
        Alert.alert(
          'Not Supported',
          'Your device does not support brightness control'
        )
      }
    },
  })

  const maxLevel = getMaxLevel()

  if (!maxLevel || maxLevel <= 1) {
    return <Text>Brightness control not supported on this device</Text>
  }

  return (
    <View>
      <Text>
        Current Level: {level ?? 'Off'} / {maxLevel}
      </Text>
      <Slider
        minimumValue={1}
        maximumValue={maxLevel}
        step={1}
        value={level ?? 1}
        onValueChange={setTorchLevel}
      />
      <Button title="Set to Max" onPress={() => setTorchLevel(maxLevel)} />
      <Button title="Set to Min" onPress={() => setTorchLevel(1)} />
    </View>
  )
}
```

### With Error Handling

```tsx
function TorchWithErrorHandling() {
  const [isOn, setIsOn] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { on, off } = useTorch({
    onStateChanged: setIsOn,
    onError: (error) => {
      switch (error.code) {
        case 'NoFlashAvailable':
          setErrorMessage('Your device does not have a flashlight')
          break
        case 'CameraServiceUnavailable':
          setErrorMessage('Camera service is not available')
          break
        case 'BrightnessControlNotSupported':
          setErrorMessage('Brightness control not supported on this device')
          break
        case 'AccessFailed':
          setErrorMessage('Failed to access flashlight')
          break
        default:
          setErrorMessage(error.message)
      }
    },
  })

  return (
    <View>
      <Button title="Toggle Torch" onPress={isOn ? off : on} />
      {errorMessage && <Text style={{ color: 'red' }}>{errorMessage}</Text>}
    </View>
  )
}
```

### With State Tracking

```tsx
function TorchWithTracking() {
  const [isOn, setIsOn] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const { on, off } = useTorch({
    onStateChanged: (state) => {
      setIsOn(state)
      const timestamp = new Date().toLocaleTimeString()
      const entry = `${timestamp}: Torch ${state ? 'ON' : 'OFF'}`
      setHistory((prev) => [...prev, entry])
    },
    onLevelChanged: (level) => {
      if (level !== null) {
        const timestamp = new Date().toLocaleTimeString()
        const entry = `${timestamp}: Level set to ${level}`
        setHistory((prev) => [...prev, entry])
      }
    },
  })

  return (
    <View>
      <Button title="Toggle" onPress={isOn ? off : on} />
      <Text>Current State: {isOn ? 'ON' : 'OFF'}</Text>
      <Text>History:</Text>
      {history.map((entry, index) => (
        <Text key={index}>{entry}</Text>
      ))}
    </View>
  )
}
```

### Auto-off Timer

```tsx
function TorchWithTimer() {
  const [isOn, setIsOn] = useState(false)
  const { on, off } = useTorch({
    onStateChanged: setIsOn,
  })

  const turnOnWithTimer = async (seconds: number) => {
    await on()
    setTimeout(() => {
      off()
    }, seconds * 1000)
  }

  return (
    <View>
      <Button
        title="Turn on for 5 seconds"
        onPress={() => turnOnWithTimer(5)}
      />
      <Button title="Turn off now" onPress={off} disabled={!isOn} />
    </View>
  )
}
```

## Platform Differences

### iOS

- Uses `AVCaptureDevice` API for torch control
- No special permissions required for flashlight usage
- Supports all devices with a flash/torch
- State changes are tracked automatically via native callbacks
- **Brightness control**: Supports 10 discrete brightness levels (1-10) mapped to AVCaptureDevice's 0.1-1.0 range
- Automatically respects thermal limitations using `maxAvailableTorchLevel` (may reduce brightness under thermal stress)

### Android

- Uses `CameraManager` API (API 23+)
- **No permissions required** - `setTorchMode()` doesn't require CAMERA permission since API 23
- Minimum API level: 23 (Android 6.0 Marshmallow)
- **Brightness control**: Requires API 33+ (Android 13)
  - Automatically detects if device supports brightness control via `FLASH_INFO_STRENGTH_MAXIMUM_LEVEL`
  - Returns `null` from `getMaxLevel()` if not supported
  - Throws `BrightnessControlNotSupported` error when trying to set level on unsupported devices
- Native `TorchCallback` provides real-time updates for state and brightness changes
- Automatically handles camera availability and flash unit detection

## Troubleshooting

### Android: "CameraServiceUnavailable" Error

This usually means the camera service is in use by another app or the system is under heavy load. Try:

1. Close other apps that might be using the camera
2. Restart the device

### Android: "ApiLevelTooLow" Error

**For basic torch control:**

- Your device is running Android below 6.0 (API 23)
- This library requires Android 6.0 or higher

**For brightness control:**

- Your device is running Android below 13 (API 33)
- Brightness control requires Android 13 or higher
- Use `getMaxLevel()` to check if brightness control is available before calling `setLevel()`

### "BrightnessControlNotSupported" Error

Your device's camera flash unit does not support variable brightness levels. This happens when `FLASH_INFO_STRENGTH_MAXIMUM_LEVEL <= 1`.

**Solution:**

```tsx
const maxLevel = getMaxLevel()
if (maxLevel && maxLevel > 1) {
  // Brightness control is supported
  await setLevel(level)
} else {
  // Fall back to basic on/off
  await on()
}
```

### "NoFlashAvailable" Error

Your device doesn't have a flashlight/flash unit. This is common on:

- Tablets without cameras
- Some budget smartphones
- Emulators/simulators

### iOS: Torch not working in Simulator

The iOS Simulator does not have a flashlight. Test on a physical device.

## Performance

Thanks to NitroModules, all operations bypass the traditional React Native bridge:

- **Zero serialization overhead** - Direct C++/Swift/Kotlin communication
- **Synchronous native callbacks** - Real-time state and brightness level updates via native event system
- **Type-safe native calls** - No runtime type checking needed
- **Automatic state tracking** - Android uses `TorchCallback` for system-level event monitoring
- **Minimal overhead** - Brightness changes are detected at the native level without polling

## Brightness Level API Details

### How it works

The brightness control API allows you to adjust the flashlight intensity on supported devices:

1. **Check support**: Call `getMaxLevel()` to get the maximum brightness level
   - Returns `null` if not supported (Android < 13, or device limitation)
   - Returns `10` on iOS (all devices with torch support)
   - Returns a number > 1 on Android 13+ if supported (typically 1-5 or higher depending on device)

2. **Set level**: Call `setLevel(level)` with a value from 1 to `maxLevel`
   - Level 1 is the minimum brightness
   - Level `maxLevel` is the maximum brightness
   - Automatically turns on the torch if it's off

3. **Monitor changes**: Use `onLevelChanged` callback to track brightness changes
   - Receives `null` when torch is off
   - Receives the current level (1 to `maxLevel`) when torch is on

### iOS Implementation

On iOS, the library uses:

- `AVCaptureDevice.setTorchModeOn(level:)` which accepts values from 0.0 to 1.0
- The library maps 10 discrete levels (1-10) to the continuous 0.1-1.0 range
- Level 1 = 0.1 (10% brightness), Level 10 = 1.0 (100% brightness)
- Uses `AVCaptureDevice.maxAvailableTorchLevel` to respect thermal limitations (may be < 1.0 under thermal duress)
- State and level changes are tracked manually and callbacks are fired synchronously

**Dynamic Level Detection (iOS only):**

- `getMaxLevel()` or `getMaxLevel(false)` - returns hardware maximum (always 10)
- `getMaxLevel(true)` - returns current available level based on thermal state
  - Under normal conditions: returns 10 (when `maxAvailableTorchLevel` >= 1.0)
  - Under thermal stress: may return lower values (e.g., 8, 5, 3) as iOS throttles the torch
  - This allows you to detect and respond to thermal limitations in real-time
  - Note: iOS returns `Float.greatestFiniteMagnitude` when there are no thermal limitations, which is automatically clamped to 10

**Important behavior:**

- When the torch is turned ON with a specific level, `onLevelChanged` receives the brightness level (1 to 10)
- When the torch is turned OFF, `onLevelChanged` receives `null`
- Both `onStateChanged` and `onLevelChanged` callbacks are fired on every state/level change
- Under thermal stress, the system may limit the maximum brightness below the requested level

### Android Implementation

On Android 13+, the library uses:

- `CameraCharacteristics.FLASH_INFO_STRENGTH_MAXIMUM_LEVEL` to detect support
- `CameraManager.turnOnTorchWithStrengthLevel()` to set brightness
- `CameraManager.TorchCallback.onTorchStrengthLevelChanged()` for real-time updates

**Important behavior:**

- When the torch is turned ON with a specific level, `onLevelChanged` receives the brightness level (1 to maxLevel)
- When the torch is turned OFF, the native Android callback [`onTorchStrengthLevelChanged()`](<https://developer.android.com/reference/android/hardware/camera2/CameraManager.TorchCallback#onTorchStrengthLevelChanged(java.lang.String,%20int)>) is **not triggered** (even though the strength level internally resets to `FLASH_INFO_STRENGTH_DEFAULT_LEVEL`)
- The library handles this by sending `null` to `onLevelChanged` when `onTorchModeChanged` detects the torch is off
- This ensures you always receive a callback when the torch state changes, with `null` indicating the torch is off

### Example: Progressive brightness

```tsx
function ProgressiveBrightness() {
  const { setLevel, getMaxLevel } = useTorch()
  const maxLevel = getMaxLevel()

  const fadeIn = async () => {
    if (!maxLevel || maxLevel <= 1) return

    for (let level = 1; level <= maxLevel; level++) {
      await setLevel(level)
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
  }

  return <Button title="Fade In" onPress={fadeIn} />
}
```

### Example: Thermal-aware brightness (iOS)

```tsx
function ThermalAwareTorch() {
  const [thermalLevel, setThermalLevel] = useState<number | null>(null)
  const { setLevel, getMaxLevel } = useTorch()

  // Check current thermal state
  const checkThermalState = () => {
    const currentMax = getMaxLevel(true) // iOS: get current available level
    const hardwareMax = getMaxLevel() // Hardware maximum (10)

    setThermalLevel(currentMax)

    if (currentMax && hardwareMax && currentMax < hardwareMax) {
      Alert.alert(
        'Thermal Limitation',
        `Device is hot. Max brightness limited to ${currentMax}/${hardwareMax}`
      )
    }
  }

  const setMaxBrightness = async () => {
    // Use dynamic level to respect thermal limitations
    const safeMaxLevel = getMaxLevel(true) ?? getMaxLevel() ?? 1
    await setLevel(safeMaxLevel)
  }

  return (
    <View>
      <Button title="Check Thermal State" onPress={checkThermalState} />
      <Button title="Set Max (Safe)" onPress={setMaxBrightness} />
      {thermalLevel && <Text>Current max level: {thermalLevel}</Text>}
    </View>
  )
}
```

## Platform Support Matrix

| Feature              | iOS | Android | Notes                                         |
| -------------------- | --- | ------- | --------------------------------------------- |
| Basic On/Off         | ✅  | ✅      | Works on all supported versions               |
| Toggle               | ✅  | ✅      | Toggle between on/off states                  |
| State Callbacks      | ✅  | ✅      | Real-time native callbacks                    |
| Brightness Control   | ✅  | ✅      | iOS: 10 levels, Android 13+: device dependent |
| Level Callbacks      | ✅  | ✅      | iOS: all versions, Android 13+ only           |
| Auto Detection       | ✅  | ✅      | Automatically finds camera with flash         |
| Permissions Required | ❌  | ❌      | No permissions required on either platform    |

## Best Practices

### 1. Always Check Feature Support

Before using brightness control, check if it's supported:

```tsx
const { getMaxLevel, setLevel, on } = useTorch()
const maxLevel = getMaxLevel()

// Safe approach
const setBrightness = async (level: number) => {
  if (maxLevel && maxLevel > 1) {
    await setLevel(level)
  } else {
    // Fall back to basic on/off
    console.warn('Brightness control not supported')
    await on()
  }
}
```

### 2. Handle Errors Gracefully

Always provide fallbacks for error scenarios:

```tsx
const { on, off } = useTorch({
  onError: (error) => {
    switch (error.code) {
      case 'NoFlashAvailable':
        // Show UI message that device has no flash
        showMessage('Your device does not have a flashlight')
        break
      case 'BrightnessControlNotSupported':
        // Fall back to basic on/off mode
        setUseBrightnessControl(false)
        break
      case 'CameraServiceUnavailable':
        // Retry or show message to close other camera apps
        showMessage('Please close other camera apps and try again')
        break
      default:
        showMessage(`Error: ${error.message}`)
    }
  },
})
```

### 3. Clean Up on Unmount

The hook automatically cleans up callbacks, but ensure torch is turned off when appropriate:

```tsx
useEffect(() => {
  return () => {
    // Turn off torch when component unmounts
    off()
  }
}, [off])
```

### 4. Use Callbacks for State Management

Prefer callbacks over polling for better performance:

```tsx
// ✅ Good - uses native callbacks
const [isOn, setIsOn] = useState(false)
const { on, off } = useTorch({
  onStateChanged: setIsOn,
})

// ❌ Bad - polling/checking manually is not possible and unnecessary
```

### 5. Validate Brightness Levels

Always validate user input before setting brightness:

```tsx
const handleBrightnessChange = async (value: number) => {
  const maxLevel = getMaxLevel()
  if (!maxLevel || maxLevel <= 1) {
    console.warn('Brightness control not available')
    return
  }

  // Clamp value to valid range
  const validLevel = Math.max(1, Math.min(maxLevel, Math.round(value)))
  await setLevel(validLevel)
}
```

## FAQ

### Q: Does this library work on iOS and Android?

**A:** Yes! Both platforms support full torch functionality including brightness control. iOS supports 10 discrete brightness levels on all devices with a torch. Android requires API 33+ (Android 13) and device support for brightness control.

### Q: How do I know if brightness control is supported on a device?

**A:** Call `getMaxLevel()`. If it returns a number greater than 1, brightness control is supported. If it returns `null` or 1, only basic on/off is available.

```tsx
const maxLevel = getMaxLevel()
const supportsBrightness = maxLevel !== null && maxLevel > 1
```

### Q: What's the difference between `on()`, `toggle()`, and `setLevel()`?

**A:**

- `on()` - Turns the torch on at default brightness (works on all devices)
- `off()` - Turns the torch off
- `toggle()` - Toggles the torch between on and off states
- `setLevel(level)` - Turns the torch on at a specific brightness level (Android 13+ only, device must support it)

### Q: Do I need to request camera permissions?

**A:** No! Neither iOS nor Android require any permissions for using the flashlight/torch:

- **iOS**: No permissions required
- **Android**: No permissions required since API 23 (Android 6.0) - `CameraManager.setTorchMode()` works without CAMERA permission

### Q: Why is `getMaxLevel()` returning `null` on my Android device?

**A:** This can happen for several reasons:

1. Your Android version is below 13 (API 33)
2. Your device's camera flash doesn't support variable brightness (`FLASH_INFO_STRENGTH_MAXIMUM_LEVEL <= 1`)
3. The camera hasn't been initialized yet (call it after torch is ready)

### Q: What's the difference between `getMaxLevel()` and `getMaxLevel(true)` on iOS?

**A:**

- `getMaxLevel()` or `getMaxLevel(false)` - returns the hardware maximum (always 10 on iOS)
- `getMaxLevel(true)` - returns the current available level based on thermal state
  - Under normal conditions: 10
  - Under thermal stress: may be lower (e.g., 8, 5, 3)
  - Use this to detect thermal throttling and adjust your UI accordingly

On Android, the `dynamic` parameter is ignored and always returns the hardware maximum.

### Q: Can I use this in the background?

**A:** Yes, the torch will stay on even if your app goes to the background. However, it's recommended to turn it off when the app is backgrounded to save battery.

### Q: How do I handle the torch when the app closes?

**A:** The library automatically turns off the torch when the module is disposed. However, you should also handle it in your component cleanup:

```tsx
useEffect(() => {
  return () => off()
}, [off])
```

### Q: Is this library better than other torch libraries?

**A:** Thanks to NitroModules, this library has:

- Zero bridge overhead (direct C++/native communication)
- Type-safe APIs generated from native specs
- Real-time native callbacks for state changes
- Modern architecture designed for React Native's new architecture

### Q: Why am I getting "Module not found" errors?

**A:** Make sure you've installed both packages:

```sh
npm install react-native-torch-nitro react-native-nitro-modules
```

And run pod install on iOS:

```sh
cd ios && pod install
```

## Example App

This repository includes a complete example app demonstrating all features of `react-native-torch-nitro`.

**Location:** The example app is located in the `example/` directory within this repository.

### Running the Example

```sh
# Clone the repository
git clone https://github.com/irekrog/react-native-torch-nitro.git
cd react-native-torch-nitro

# Install library dependencies
npm install

# Navigate to example app
cd example
npm install

# iOS
cd ios && pod install && cd ..
npm run ios

# Android
npm run android
```

The example app demonstrates:

- Basic torch on/off control
- Toggle functionality
- Brightness control with slider (iOS and Android 13+)
- Real-time state and level tracking
- Error handling for unsupported features
- Modern UI with visual feedback

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute to the repository and the development workflow.

## License

MIT

---

Made with [NitroModules](https://nitro.margelo.com/) ⚡️
