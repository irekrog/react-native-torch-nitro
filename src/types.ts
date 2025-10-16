/**
 * Error struct returned by native code
 */

interface TorchError {
  message: string
  code: TorchExceptionType
}

/**
 * Exception types that HybridTorch can throw
 */
const enum TorchExceptionType {
  CameraServiceUnavailable = 'CameraServiceUnavailable',
  ApiLevelTooLow = 'ApiLevelTooLow',
  NoFlashAvailable = 'NoFlashAvailable',
  BrightnessControlNotSupported = 'BrightnessControlNotSupported',
  AccessFailed = 'AccessFailed',
  LevelUnavailable = 'LevelUnavailable',
  // non native
  Unknown = 'Unknown',
}

export { TorchExceptionType, type TorchError }
