#include <jni.h>
#include "NitroTorchOnLoad.hpp"

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void*) {
  return margelo::nitro::nitrotorch::initialize(vm);
}
