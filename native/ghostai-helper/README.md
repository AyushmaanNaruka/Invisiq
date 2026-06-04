# ghostai_helper — InvisiQ stealth capture helper

A standalone Win32 executable that hosts the suppressing `WH_KEYBOARD_LL`
keyboard hook **out of process** for Model B (default-on stealth). It is the
named-pipe **server**; the Electron main process
([`src/main/resilience-controller.ts`](../../src/main/resilience-controller.ts))
is the client. See the header of [`src/main.cpp`](src/main.cpp) for the full
protocol and design rationale.

> This is **not** a Node addon. The project avoids `node-gyp` (`npmRebuild:false`).
> This binary is compiled separately and shipped via electron-builder
> `extraResources`.

## Build (MSVC)

Requires **Visual Studio 2019/2022 Build Tools** (C++ workload) + **CMake ≥ 3.15**.

```powershell
cmake -S . -B build -A x64
cmake --build build --config Release
# → build/Release/ghostai_helper.exe
```

`resolveHelperPath()` in the controller probes exactly
`native/ghostai-helper/build/Release/ghostai_helper.exe` in dev, and
`process.resourcesPath/ghostai_helper.exe` when packaged.

From the repo root you can also run `npm run build:helper`.

## Signing (signing-ready, cert deferred)

Publisher version-info is parametrized. To sign at build time once a cert exists:

```powershell
cmake -S . -B build -A x64 -DHELPER_SIGN=ON -DHELPER_CERT=<SHA1_THUMBPRINT>
cmake --build build --config Release
```

⚠️ The disguise-vs-honest-cert fork: the default version-info publisher is
"Microsoft Corporation" to match the parent app's Task-Manager disguise. A real
code-signing cert cannot be issued as "Microsoft Corporation", and a publisher
mismatch between the signature and the version-info string is itself an
AV/EDR red flag. Before shipping signed, set
`-DHELPER_COMPANY_NAME="<your real company>"` (and product/desc) so the
version-info matches the cert.

## Security invariants (do not break)

- **Zero disk writes, zero network.** A keyboard-hooking binary that also
  touches files or sockets is the exact profile AV quarantines.
- **No captured characters in stdout/stderr** — logging is metadata only.
- The pipe is created with a **user-SID-only DACL** + `PIPE_REJECT_REMOTE_CLIENTS`.
- The hook is installed **only during active capture** and removed on
  `set_capture:false`, session lock, pipe drop, or process exit.
