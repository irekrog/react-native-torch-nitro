import { type HybridObject } from 'react-native-nitro-modules'

/**
 * Main HybridTorch interface (asynchronous)
 */
export interface Torch
  extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  /**
   * Turns on the flashlight.
   * @throws TorchException if the operation fails
   */
  on(): Promise<void>

  /**
   * Turns off the flashlight.
   * @throws TorchException if the operation fails
   */
  off(): Promise<void>

  /**
   * Toggles the flashlight.
   * @throws TorchException if the operation fails
   */
  toggle(): Promise<void>

  /**
   * Callback function that is called when the torch state changes.
   * @param isOn true if the torch is on, false otherwise
   */
  onStateChanged?: (state: boolean) => void

  /**
   * Callback function that is called when the torch level changes.
   * @param level the level of the torch
   */
  onLevelChanged?: (level: number | null) => void

  /**
   * Sets the level of the torch.
   * @param level the level of the torch
   * @throws TorchException if the operation fails
   */
  setLevel(level: number): Promise<void>

  /**
   * Gets the maximum level of the torch.
   * @param dynamic If true (iOS only), returns the current available level which may be lower under thermal stress. If false or not provided, returns the hardware maximum (10 on iOS).
   * @returns the maximum level of the torch
   */
  getMaxLevel(dynamic?: boolean): number | null
}
