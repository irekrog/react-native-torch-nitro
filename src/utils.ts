import { TorchExceptionType, type TorchError } from './types'

function parseAndNormalizeError(error: any): TorchError {
  if (error instanceof Error) {
    const parsed = parseTorchError(error)
    return {
      message: parsed.message,
      code: parsed.code,
    }
  }
  return {
    message: String(error ?? 'Unknown error'),
    code: TorchExceptionType.AccessFailed,
  }
}

function parseTorchError(error: any): TorchError {
  try {
    const message = error.message || 'Unknown error'
    const jsonMatch = message.match(/\{[^}]*"type"[^}]*"message"[^}]*\}/)
    if (jsonMatch) {
      const errorData = JSON.parse(jsonMatch[0]) as TorchError
      return {
        message: errorData.message,
        code: errorData.code,
      }
    }
    const errorData = JSON.parse(message) as TorchError
    return {
      message: errorData.message,
      code: errorData.code,
    }
  } catch {
    return {
      message: error.message ?? 'Unknown error',
      code: TorchExceptionType.Unknown,
    }
  }
}

export { parseAndNormalizeError, parseTorchError }
