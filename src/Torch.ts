import { NitroModules } from 'react-native-nitro-modules'
import { type Torch as TorchType } from './specs/Torch.nitro'
import { parseAndNormalizeError } from './utils'

const _HybridTorch = NitroModules.createHybridObject<TorchType>('Torch')

/**
 * Prywatny obiekt Nitro – nie eksportowany publicznie.
 * Używany tylko wewnątrz hooka useTorch().
 */
export const Torch = {
  // ASYNC METHODS
  async on(): Promise<void> {
    try {
      await _HybridTorch.on()
    } catch (error) {
      throw parseAndNormalizeError(error)
    }
  },

  async off(): Promise<void> {
    try {
      await _HybridTorch.off()
    } catch (error) {
      throw parseAndNormalizeError(error)
    }
  },

  async toggle(): Promise<void> {
    try {
      await _HybridTorch.toggle()
    } catch (error) {
      throw parseAndNormalizeError(error)
    }
  },

  async setLevel(level: number): Promise<void> {
    try {
      await _HybridTorch.setLevel(level)
    } catch (error) {
      throw parseAndNormalizeError(error)
    }
  },

  // EVENTS
  set onStateChanged(callback: ((isOn: boolean) => void) | undefined) {
    _HybridTorch.onStateChanged = callback
  },
  get onStateChanged(): ((isOn: boolean) => void) | undefined {
    return _HybridTorch.onStateChanged
  },

  set onLevelChanged(callback: ((level: number | null) => void) | undefined) {
    if (callback) {
      _HybridTorch.onLevelChanged = (level: number | null) => {
        callback(
          typeof level === 'number' ? parseInt(level.toString(), 10) : null
        )
      }
    } else {
      _HybridTorch.onLevelChanged = undefined
    }
  },
  get onLevelChanged(): ((level: number | null) => void) | undefined {
    return _HybridTorch.onLevelChanged
  },

  // GETTERS
  getMaxLevel(dynamic?: boolean): number | null {
    try {
      return _HybridTorch.getMaxLevel(dynamic)
    } catch (error) {
      throw parseAndNormalizeError(error)
    }
  },
}
