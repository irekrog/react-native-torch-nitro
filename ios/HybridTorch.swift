import AVFoundation
import Foundation
import NitroModules

class HybridTorch: HybridTorchSpec {
  private let device = AVCaptureDevice.default(for: .video)
  private var isTorchOn = false
  private var currentLevel: Double = 1.0
  private var previousLevel: Double? = nil
  
  // iOS supports 10 discrete brightness levels (mapped to 0.1 - 1.0)
  private let maxTorchLevel: Double = 10.0

  // 🔥 Callbacki do JS
  var onStateChanged: ((Bool) -> Void)? = nil
  var onLevelChanged: ((Double?) -> Void)? = nil

  // MARK: - Błędy Torch
  enum TorchError: Error {
    case noDevice
    case noTorch
    case failed(String)

    var code: String {
      switch self {
      case .noDevice: return "NoFlashAvailable"
      case .noTorch: return "NoFlashAvailable"
      case .failed: return "AccessFailed"
      }
    }

    var message: String {
      switch self {
      case .noDevice: return "No camera device available"
      case .noTorch: return "Device has no torch"
      case .failed(let msg): return "Failed: \(msg)"
      }
    }

    func toJSON() -> String {
      let dict = ["code": code, "message": message]
      guard let data = try? JSONSerialization.data(withJSONObject: dict),
            let json = String(data: data, encoding: .utf8)
      else { return "{\"code\":\"\(code)\",\"message\":\"\(message)\"}" }
      return json
    }
  }

  // MARK: - Torch Control
  private func setTorchMode(_ enable: Bool, level: Float? = nil) throws {
    
    guard let device = device else { throw TorchError.noDevice }
    guard device.hasTorch else { throw TorchError.noTorch }

    do {
      try device.lockForConfiguration()

      if enable {
        print("[HybridTorch] 🔦 Turning torch ON")
        print("[HybridTorch]   - Current level before: \(currentLevel)")
        print("[HybridTorch]   - Requested level param: \(level ?? -1)")
        
        // Map discrete level (1-10) to AVCaptureDevice's 0.1-maxAvailableTorchLevel range
        // Note: maxAvailableTorchLevel can be < 1.0 under thermal duress,
        // or Float.greatestFiniteMagnitude when there are no thermal limitations
        let maxAvailable = min(AVCaptureDevice.maxAvailableTorchLevel, 1.0)
        let torchLevel = level ?? Float(currentLevel / maxTorchLevel)
        let clampedLevel = max(0.1, min(maxAvailable, torchLevel))
        
        print("[HybridTorch]   - Max available (thermal): \(maxAvailable)")
        print("[HybridTorch]   - Torch level (normalized): \(torchLevel)")
        print("[HybridTorch]   - Clamped level (final): \(clampedLevel)")
        
        try device.setTorchModeOn(level: clampedLevel)
        
        if let level = level {
          currentLevel = Double(level) * maxTorchLevel
        }
        
        print("[HybridTorch]   - Current level after: \(currentLevel)")
        print("[HybridTorch]   - Current level (1-10): \(Int(round(currentLevel)))")
      } else {
        print("[HybridTorch] 🔦 Turning torch OFF")
        device.torchMode = .off
      }

      device.unlockForConfiguration()
      
      let wasOn = isTorchOn
      isTorchOn = enable
      
      // Powiadamiamy JS o zmianie stanu
      if wasOn != enable {
        print("[HybridTorch] 📢 Calling onStateChanged: \(enable)")
        onStateChanged?(enable)
      } else {
        print("[HybridTorch] ⏭️  Skipping onStateChanged (no change: \(enable))")
      }
      
      // Powiadamiamy JS o zmianie poziomu (tylko gdy wartość się faktycznie zmieniła)
      // Round to avoid floating point precision issues (e.g., 6.9999998 -> 7.0)
      let newLevel: Double? = enable ? round(currentLevel) : nil
      let roundedPrevious: Double? = previousLevel != nil ? round(previousLevel!) : nil
      
      if roundedPrevious != newLevel {
        print("[HybridTorch] 📢 Calling onLevelChanged: \(newLevel ?? -1) (previous: \(roundedPrevious ?? -1))")
        onLevelChanged?(newLevel)
        previousLevel = newLevel
      } else {
        print("[HybridTorch] ⏭️  Skipping onLevelChanged (no change: \(newLevel ?? -1))")
      }

    } catch {
      throw TorchError.failed(error.localizedDescription)
    }
  }

  // MARK: - API

  func on() -> Promise<Void> {
    return Promise.async {
      do {
        try self.setTorchMode(true)
      } catch let error as TorchError {
        throw NSError(
          domain: "HybridTorch",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: error.toJSON()]
        )
      }
    }
  }

  func off() -> Promise<Void> {
    return Promise.async {
      do {
        try self.setTorchMode(false)
      } catch let error as TorchError {
        throw NSError(
          domain: "HybridTorch",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: error.toJSON()]
        )
      }
    }
  }
  
  func toggle() -> Promise<Void> {
    return Promise.async {
      do {
        try self.setTorchMode(!self.isTorchOn)
      } catch let error as TorchError {
        throw NSError(
          domain: "HybridTorch",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: error.toJSON()]
        )
      }
    }
  }
  
  func setLevel(level: Double) -> Promise<Void> {
    return Promise.async {
      do {
        print("[HybridTorch] 🎚️  setLevel called from JS with: \(level)")
        
        guard level >= 1 && level <= self.maxTorchLevel else {
          print("[HybridTorch] ❌ Invalid level: \(level) (must be 1-\(Int(self.maxTorchLevel)))")
          throw TorchError.failed("Level must be between 1 and \(Int(self.maxTorchLevel))")
        }
        
        // Convert discrete level (1-10) to AVCaptureDevice's 0.1-1.0 range
        let normalizedLevel = Float(level / self.maxTorchLevel)
        print("[HybridTorch] 🔄 Normalized level (0.0-1.0): \(normalizedLevel)")
        
        try self.setTorchMode(true, level: normalizedLevel)
        
      } catch let error as TorchError {
        print("[HybridTorch] ❌ Error in setLevel: \(error)")
        throw NSError(
          domain: "HybridTorch",
          code: 1,
          userInfo: [NSLocalizedDescriptionKey: error.toJSON()]
        )
      }
    }
  }
  
  func getMaxLevel(dynamic: Bool?) -> Double? {
    // Check if device has torch capability
    guard let device = device, device.hasTorch else {
      return nil
    }
    
    // If dynamic is true (iOS only), return current available level based on thermal state
    if dynamic == true {
      let currentMax = AVCaptureDevice.maxAvailableTorchLevel
      
      // maxAvailableTorchLevel returns Float.greatestFiniteMagnitude (3.4028235e+38) 
      // when there are no thermal limitations. Clamp to 1.0 in this case.
      let effectiveMax = min(currentMax, 1.0)
      
      // Scale from 0.0-1.0 range to 1-10 range
      return Double(effectiveMax * Float(maxTorchLevel))
    }
    
    // Otherwise return the hardware maximum (10 discrete levels)
    return maxTorchLevel
  }

  // MARK: - Cleanup

  func dispose() {
    do {
      if isTorchOn {
        try setTorchMode(false)
      }
      previousLevel = nil
    } catch {
      print("[HybridTorch] Error disposing torch: \(error)")
    }
  }
}
