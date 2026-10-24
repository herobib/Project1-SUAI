# Additional clean files
cmake_minimum_required(VERSION 3.16)

if("${CONFIG}" STREQUAL "" OR "${CONFIG}" STREQUAL "")
  file(REMOVE_RECURSE
  "app.js.S"
  "bootloader\\bootloader.bin"
  "bootloader\\bootloader.elf"
  "bootloader\\bootloader.map"
  "config\\sdkconfig.cmake"
  "config\\sdkconfig.h"
  "esp-idf\\mbedtls\\x509_crt_bundle"
  "flash_app_args"
  "flash_bootloader_args"
  "flash_project_args"
  "flasher_args.json"
  "flasher_args.json.in"
  "index.html.S"
  "ldgen_libraries"
  "ldgen_libraries.in"
  "mic-player-worklet.js.S"
  "project_elf_src_esp32s3.c"
  "style.css.S"
  "usb_camera_mic_spk.bin"
  "usb_camera_mic_spk.map"
  "x509_crt_bundle.S"
  )
endif()
