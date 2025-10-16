package com.margelo.nitro.nitrotorch

import android.content.Context
import android.hardware.camera2.CameraAccessException
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CameraCharacteristics
import android.os.Build
import android.util.Log
import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise
import org.json.JSONObject

/**
 * Custom exceptions for torch operations
 */
sealed class TorchException(message: String) : Exception(message) {
    object CameraServiceUnavailable : TorchException("Camera service not available")
    object ApiLevelTooLow : TorchException("Android API 23 or higher is required")
    object NoFlashAvailable : TorchException("No camera with flash available")
    object BrightnessControlNotSupported : TorchException("Device does not support torch brightness control")
    class AccessFailed(cause: Throwable) : TorchException("Failed to access torch: ${cause.message}")
}

/**
 * Custom Error with code property for JS
 */
class TorchError(message: String, val code: String) : Error(message)

/**
 * Helper function to create structured error JSON for JS
 */
private fun createTorchErrorJson(code: String, message: String): String {
    val errorJson = JSONObject()
    errorJson.put("code", code)
    errorJson.put("message", message)
    return errorJson.toString()
}

@DoNotStrip
class HybridTorch : HybridTorchSpec() {
    companion object {
        private const val TAG = "HybridTorch"
        private const val MIN_API_LEVEL = Build.VERSION_CODES.M
    }

    private val cameraManager: CameraManager? by lazy {
        try {
            val context = NitroModules.applicationContext
            Log.d(TAG, "Context obtained: ${context?.javaClass?.simpleName}")
            val manager = context?.getSystemService(Context.CAMERA_SERVICE) as? CameraManager
            Log.d(TAG, "CameraManager obtained: ${manager != null}")
            manager
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing CameraManager", e)
            null
        }
    }

    private var cameraId: String? = null
    private var isTorchOn: Boolean = false
    private var previousLevel: Double? = null

    /**
     * TorchCallback for listening to torch state and brightness level changes
     */
    private val torchCallback = object : CameraManager.TorchCallback() {
        override fun onTorchModeChanged(cameraId: String, enabled: Boolean) {
            Log.d(TAG, "TorchCallback: onTorchModeChanged($cameraId, $enabled)")
            isTorchOn = enabled
            onStateChanged?.invoke(enabled)
            if (!enabled) {
                // Only notify if level actually changed to null
                if (previousLevel != null) {
                    onLevelChanged?.invoke(null)
                    previousLevel = null
                }
            }
        }

        override fun onTorchStrengthLevelChanged(cameraId: String, newStrengthLevel: Int) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                Log.d(TAG, "TorchCallback: onTorchStrengthLevelChanged($cameraId, $newStrengthLevel)")
                val newLevel = newStrengthLevel.toDouble()
                // Only notify if level actually changed
                if (previousLevel != newLevel) {
                    onLevelChanged?.invoke(newLevel)
                    previousLevel = newLevel
                }
            }
        }
    }

    init {
        // Register torch callback to listen for changes
        try {
            cameraManager?.registerTorchCallback(torchCallback, null)
            Log.d(TAG, "TorchCallback registered successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register TorchCallback", e)
        }
    }

    /**
     * Finds and initializes the camera ID for the rear camera with flash capability
     */
    private fun ensureCameraId() {
        if (cameraId != null) return

        val manager = cameraManager ?: run {
            Log.e(TAG, "CameraManager is null - camera service not available")
            return
        }

        try {
            Log.d(TAG, "Looking for camera, camera count: ${manager.cameraIdList.size}")
            cameraId = manager.cameraIdList.firstOrNull { id ->
                val characteristics = manager.getCameraCharacteristics(id)
                val hasFlash = characteristics.get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
                val facing = characteristics.get(CameraCharacteristics.LENS_FACING)
                Log.d(TAG, "Camera $id: hasFlash=$hasFlash, facing=$facing")
                hasFlash && facing == CameraCharacteristics.LENS_FACING_BACK
            } ?: manager.cameraIdList.firstOrNull().also {
                Log.d(TAG, "Using fallback camera ID: $it")
            }

            if (cameraId == null) {
                Log.e(TAG, "No suitable camera found with flash")
            } else {
                Log.d(TAG, "Selected camera: $cameraId")
            }
        } catch (e: CameraAccessException) {
            Log.e(TAG, "Cannot access camera", e)
        }
    }

    override var onStateChanged: ((Boolean) -> Unit)? = null
    override var onLevelChanged: ((Double?) -> Unit)? = null

    /**
     * Sets the torch mode to the specified state
     * @param enable true to turn on, false to turn off
     * @throws TorchException if the operation fails
     */
    private fun setTorchMode(enable: Boolean) {
        val manager = cameraManager ?: throw TorchException.CameraServiceUnavailable

        if (Build.VERSION.SDK_INT < MIN_API_LEVEL) {
            Log.e(TAG, "Torch mode requires Android API $MIN_API_LEVEL+")
            throw TorchException.ApiLevelTooLow
        }

        ensureCameraId()
        val id = cameraId ?: run {
            Log.e(TAG, "No camera with flash found")
            throw TorchException.NoFlashAvailable
        }

        if (isTorchOn == enable) {
            val state = if (enable) "ON" else "OFF"
            Log.d(TAG, "Torch is already $state")
            return
        }

        try {
            manager.setTorchMode(id, enable)
            val state = if (enable) "ON" else "OFF"
            Log.d(TAG, "Torch turned $state")
            // State change will be handled by TorchCallback.onTorchModeChanged
        } catch (e: CameraAccessException) {
            val action = if (enable) "on" else "off"
            Log.e(TAG, "Error turning $action torch", e)
            throw TorchException.AccessFailed(e)
        } catch (e: Exception) {
            val action = if (enable) "on" else "off"
            Log.e(TAG, "Unexpected error turning $action torch", e)
            throw TorchException.AccessFailed(e)
        }
    }

    /**
     * Turns the flashlight on asynchronously
     * @return Promise that resolves when torch is turned on
     * @throws TorchException if the operation fails
     */
    override fun on(): Promise<Unit> {
        return Promise.async {
            try {
                setTorchMode(true)
            } catch (e: TorchException) {
                handleTorchException(e)
            }
        }
    }

    /**
     * Turns the flashlight off asynchronously
     * @return Promise that resolves when torch is turned off
     * @throws TorchException if the operation fails
     */
    override fun off(): Promise<Unit> {
        return Promise.async {
            try {
                setTorchMode(false)
            } catch (e: TorchException) {
                handleTorchException(e)
            }
        }
    }

    /**
     * Toggles the flashlight state asynchronously
     * @return Promise that resolves when torch state is toggled
     * @throws TorchException if the operation fails
     */
    override fun toggle(): Promise<Unit> {
        return Promise.async {
            try {
                setTorchMode(!isTorchOn)
            } catch (e: TorchException) {
                handleTorchException(e)
            }
        }
    }

    /**
     * Sets the level of the torch.
     * @param level the level of the torch
     * @throws TorchException if the operation failsA
     */

    override fun setLevel(level: Double): Promise<Unit> {
        return Promise.async {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
                Log.e(TAG, "Torch brightness control requires API 33+")
                handleTorchException(TorchException.ApiLevelTooLow)
            }

            val manager = cameraManager ?: handleTorchException(TorchException.CameraServiceUnavailable)
            ensureCameraId()

            val id = cameraId ?: handleTorchException(TorchException.NoFlashAvailable)

            val characteristics = manager.getCameraCharacteristics(id)
            val maxLevel = characteristics.get(CameraCharacteristics.FLASH_INFO_STRENGTH_MAXIMUM_LEVEL) ?: 1

            // Check if device supports brightness control (maxLevel must be > 1)
            if (maxLevel <= 1) {
                Log.e(TAG, "Device does not support torch brightness control (maxLevel: $maxLevel)")
                handleTorchException(TorchException.BrightnessControlNotSupported)
            }

            if (level < 1 || level > maxLevel) {
                Log.e(TAG, "Invalid torch level: $level (max: $maxLevel)")
                throw IllegalArgumentException("Level must be between 1 and $maxLevel")
            }

            try {
                val levelInt = level.toInt()
                manager.turnOnTorchWithStrengthLevel(id, levelInt)
                Log.d(TAG, "Torch strength level set to $levelInt")
                // Level change will be handled by TorchCallback.onTorchStrengthLevelChanged
            } catch (e: CameraAccessException) {
                throw TorchException.AccessFailed(e)
            }
        }
    }

    /**
     * Cleans up resources and ensures the torch is turned off
     */
    override fun dispose() {
        try {
            if (isTorchOn && Build.VERSION.SDK_INT >= MIN_API_LEVEL) {
                cameraId?.let { id ->
                    cameraManager?.setTorchMode(id, false)
                    isTorchOn = false
                    Log.d(TAG, "Torch turned OFF during dispose")
                }
            }
            
            // Unregister torch callback
            try {
                cameraManager?.unregisterTorchCallback(torchCallback)
                Log.d(TAG, "TorchCallback unregistered successfully")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to unregister TorchCallback", e)
            }
            
            cameraId = null
            previousLevel = null
        } catch (e: Exception) {
            Log.e(TAG, "Error during dispose", e)
        } finally {
            super.dispose()
        }
    }

    override fun getMaxLevel(dynamic: Boolean?): Double? {
        // Android doesn't have dynamic thermal throttling like iOS
        // The 'dynamic' parameter is ignored on Android
        
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU)
            return null

        ensureCameraId()
        val id = cameraId ?: return null
        val manager = cameraManager ?: return null

        return try {
            val characteristics = manager.getCameraCharacteristics(id)
            val maxLevel = characteristics.get(CameraCharacteristics.FLASH_INFO_STRENGTH_MAXIMUM_LEVEL) ?: 1
            
            // Return null if device doesn't support brightness control (maxLevel must be > 1)
            if (maxLevel <= 1) {
                Log.d(TAG, "Device does not support torch brightness control (maxLevel: $maxLevel)")
                null
            } else {
                maxLevel.toDouble()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error accessing max torch level", e)
            null
        }
    }

    /**
     * Helper function to handle torch exceptions and throw structured errors
     */
    private fun handleTorchException(e: TorchException): Nothing {
        val (code, message) = when (e) {
            is TorchException.ApiLevelTooLow -> "ApiLevelTooLow" to (e.message ?: "")
            is TorchException.CameraServiceUnavailable -> "CameraServiceUnavailable" to (e.message ?: "")
            is TorchException.NoFlashAvailable -> "NoFlashAvailable" to (e.message ?: "")
            is TorchException.BrightnessControlNotSupported -> "BrightnessControlNotSupported" to (e.message ?: "")
            is TorchException.AccessFailed -> "AccessFailed" to (e.message ?: "")
        }

        Log.e(TAG, "$code: $message")
        throw Error(createTorchErrorJson(code, message))
    }
}