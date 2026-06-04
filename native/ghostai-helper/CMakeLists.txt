# ───────────────────────────────────────────────────────────────────────────
#  ghostai_helper — InvisiQ stealth capture helper (Win32, MSVC)
#
#  A standalone Win32 executable (NOT a node addon — node-gyp is intentionally
#  avoided project-wide via npmRebuild:false). It hosts the suppressing
#  WH_KEYBOARD_LL keyboard hook out-of-process so the keylogger signature is
#  isolated to an optional, separately-signable binary.
#
#  Build (from this directory):
#     cmake -S . -B build -A x64
#     cmake --build build --config Release
#  Output: build/Release/ghostai_helper.exe
#  (resolveHelperPath in src/main/resilience-controller.ts probes exactly this path.)
#
#  Signing-ready (cert deferred): pass -DHELPER_SIGN=ON -DHELPER_CERT=<thumbprint>
#  to enable the post-build signtool step. Publisher identity is parametrized so
#  the disguise-vs-honest-cert decision can be flipped at cert-purchase time.
# ───────────────────────────────────────────────────────────────────────────
cmake_minimum_required(VERSION 3.15)
project(ghostai_helper LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Parametrized version-info (kept in sync with the parent disguise by default).
set(HELPER_COMPANY_NAME "Microsoft Corporation" CACHE STRING "VERSIONINFO CompanyName")
set(HELPER_PRODUCT_NAME "Runtime Broker"        CACHE STRING "VERSIONINFO ProductName")
set(HELPER_FILE_DESC    "Runtime Broker"        CACHE STRING "VERSIONINFO FileDescription")
set(HELPER_VERSION      "1.2.0.0"               CACHE STRING "File/Product version (a.b.c.d)")

# Signing (off by default — feature is built signing-ready, cert deferred).
option(HELPER_SIGN "Sign the helper exe with signtool after build" OFF)
set(HELPER_CERT "" CACHE STRING "Code-signing cert SHA1 thumbprint (store) for signtool /sha1")
set(HELPER_TIMESTAMP_URL "http://timestamp.digicert.com" CACHE STRING "RFC3161 timestamp URL")

# Configure the version resource from the template.
string(REPLACE "." "," HELPER_VERSION_COMMA "${HELPER_VERSION}")
configure_file(
  "${CMAKE_CURRENT_SOURCE_DIR}/res/version.rc.in"
  "${CMAKE_CURRENT_BINARY_DIR}/version.rc"
  @ONLY)

add_executable(ghostai_helper
  src/main.cpp
  "${CMAKE_CURRENT_BINARY_DIR}/version.rc")

# CONSOLE subsystem: stdout carries the READY handshake + metadata logging that
# resilience-controller.ts captures. windowsHide:true on the spawn hides the console.
if(MSVC)
  set_target_properties(ghostai_helper PROPERTIES LINK_FLAGS "/SUBSYSTEM:CONSOLE /MANIFEST:NO")
  target_compile_options(ghostai_helper PRIVATE /W4 /permissive- /utf-8 /EHsc)
  # Static CRT so the helper has no VC++ redistributable runtime dependency.
  set_property(TARGET ghostai_helper PROPERTY MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")
endif()

# Embed the asInvoker application manifest (NEVER requireAdministrator).
target_sources(ghostai_helper PRIVATE res/app.manifest)
if(MSVC)
  set_target_properties(ghostai_helper PROPERTIES
    LINK_FLAGS "/SUBSYSTEM:CONSOLE /MANIFEST:EMBED /MANIFESTINPUT:${CMAKE_CURRENT_SOURCE_DIR}/res/app.manifest")
endif()

target_link_libraries(ghostai_helper PRIVATE
  user32       # SetWindowsHookEx, ToUnicodeEx, message loop
  advapi32     # token / SID for the pipe DACL
  wtsapi32     # WTSRegisterSessionNotification (lock/unlock safety)
  Normaliz)    # NormalizeString (dead-key composition)

# Optional signing — gated on cert presence (signing-ready, cert deferred).
if(HELPER_SIGN AND HELPER_CERT)
  add_custom_command(TARGET ghostai_helper POST_BUILD
    COMMAND signtool sign /sha1 ${HELPER_CERT} /fd SHA256
            /tr ${HELPER_TIMESTAMP_URL} /td SHA256
            "$<TARGET_FILE:ghostai_helper>"
    VERBATIM
    COMMENT "Signing ghostai_helper.exe")
endif()
