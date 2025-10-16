import { useCallback, useEffect } from 'react'
import { Torch } from './Torch'
import type { TorchError } from './types'

/**
 * Hook configuration type - allows passing callbacks
 */
interface UseTorchOptions {
  /**
   * Called when the torch state changes (true = on, false = off)
   * Callback is called only when the value actually changes, not on every on()/off() call
   */
  onStateChanged?: (state: boolean) => void

  /**
   * Called when an error occurs (e.g. missing permissions, no flash, etc.)
   */
  onError?: (error: TorchError) => void

  /**
   * Called when the torch level changes
   * Callback is called only when the value actually changes, not on every setLevel() call
   */
  onLevelChanged?: (level: number | null) => void
}

/**
 * React hook for controlling the native torch through Nitro Module.
 *
 * @example
 * const { isOn, on, off } = useTorch({
 *   onTorchStateChanged: (state) => console.log('Torch:', state),
 *   onError: (error) => console.error('Torch error:', error)
 * })
 */
export function useTorch(options?: UseTorchOptions) {
  // -- listen to native event (Swift/Kotlin)
  useEffect(() => {
    Torch.onStateChanged = (state) => {
      options?.onStateChanged?.(state)
    }

    return () => {
      Torch.onStateChanged = undefined
    }
  }, [options])

  useEffect(() => {
    Torch.onLevelChanged = (level) => {
      options?.onLevelChanged?.(level)
    }

    return () => {
      Torch.onLevelChanged = undefined
    }
  }, [options])

  // -- Turn on
  const on = useCallback(async () => {
    try {
      await Torch.on()
    } catch (err) {
      const torchError = err as TorchError
      options?.onError?.(torchError)
    }
  }, [options])

  // -- Turn off
  const off = useCallback(async () => {
    try {
      await Torch.off()
    } catch (err) {
      const torchError = err as TorchError
      options?.onError?.(torchError)
    }
  }, [options])

  const toggle = useCallback(async () => {
    try {
      await Torch.toggle()
    } catch (err) {
      const torchError = err as TorchError
      options?.onError?.(torchError)
    }
  }, [options])

  const setLevel = useCallback(
    async (level: number) => {
      try {
        await Torch.setLevel(level)
      } catch (err) {
        const torchError = err as TorchError
        options?.onError?.(torchError)
      }
    },
    [options]
  )

  const getMaxLevel = useCallback(
    (dynamic?: boolean) => {
      try {
        return Torch.getMaxLevel(dynamic)
      } catch (err) {
        const torchError = err as TorchError
        options?.onError?.(torchError)
        return null
      }
    },
    [options]
  )

  return { on, off, toggle, setLevel, getMaxLevel }
}
