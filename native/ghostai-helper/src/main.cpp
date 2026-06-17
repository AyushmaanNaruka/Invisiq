// ───────────────────────────────────────────────────────────────────────────
//  ghostai_helper.exe — InvisiQ stealth capture helper
//
//  Hosts the SUPPRESSING WH_KEYBOARD_LL keyboard hook out-of-process so that:
//    • keystrokes can be captured while the overlay HWND is WS_EX_NOACTIVATE
//      (never the foreground window) — the whole point of Model B;
//    • the suppressed keys do NOT leak into the foreground app (hook returns 1);
//    • the keylogger signature is isolated to this optional, separately-signable
//      binary instead of the main process.
//
//  Protocol: newline-delimited JSON over a named pipe. This process is the pipe
//  SERVER; the Electron main process (resilience-controller.ts) is the client.
//    IN  (client→server): {"type":"set_capture","payload":{"active":true,"epoch":3}}
//                         {"type":"ping"} {"type":"get_status"} {"type":"shutdown"}
//    OUT (server→client): {"type":"ready"} {"type":"pong"} {"type":"ack"}
//                         {"type":"key","payload":{"seq":N,"epoch":E,"kind":"char","char":"é"}}
//                         {"type":"proctor","payload":{"detected":true,"names":["MsbWindowCef"]}}
//                         {"type":"capture_failed","payload":{"reason":"session-locked"}}
//
//  HARD RULES (AV/EDR posture): zero disk writes, zero network, and NEVER any
//  captured character in stdout/stderr — logging is metadata only.
//
//  argv[1] = pipe name (without the \\.\pipe\ prefix). argv[2] = parent PID.
// ───────────────────────────────────────────────────────────────────────────
#define WIN32_LEAN_AND_MEAN
// Target Windows 10/11 — needed for PIPE_REJECT_REMOTE_CLIENTS, NormalizeString,
// ToUnicodeEx wFlags=0x4, and the WTS session-notification APIs.
#ifndef _WIN32_WINNT
#define _WIN32_WINNT 0x0A00
#endif
#ifndef NTDDI_VERSION
#define NTDDI_VERSION 0x0A000000
#endif
#include <windows.h>
#include <winuser.h>
#include <tlhelp32.h>
#include <wtsapi32.h>
#include <sddl.h>

#include <atomic>
#include <chrono>
#include <condition_variable>
#include <cstdio>
#include <cstdlib>
#include <cwchar>
#include <cwctype>
#include <deque>
#include <mutex>
#include <set>
#include <string>
#include <thread>
#include <vector>

// ── Custom thread/window messages ───────────────────────────────────────────
static const UINT WM_APP_SETCAPTURE = WM_APP + 1; // wParam=active, lParam=epoch
static const UINT WM_APP_SHUTDOWN   = WM_APP + 2;

// ── Global state ────────────────────────────────────────────────────────────
static std::atomic<bool>      g_running{true};
static std::atomic<bool>      g_captureActive{false};
static std::atomic<long long> g_seq{0};
static std::atomic<long long> g_epoch{0};

static HHOOK  g_hook = nullptr;        // touched only on the hook thread
static HWND   g_msgWindow = nullptr;   // message-only window (hook thread)
static HANDLE g_pipe = INVALID_HANDLE_VALUE;

// Keyboard state we track ourselves — GetKeyboardState() is unreliable on the
// LL hook thread (it fires before the foreground thread's state updates).
static BYTE g_keyState[256] = {0};
// Per-VK record of whether we suppressed the key-DOWN, so the matching key-UP is
// suppressed iff its down was — keeping up/down perfectly symmetric (no orphaned
// or swallowed ups leaking to / stuck in the foreground app). Hook thread only.
static bool g_suppressedDown[256] = {false};
// Pending dead-key composition (hook thread only). 0 = none.
static wchar_t g_pendingCombining = 0; // combining-mark codepoint
static wchar_t g_pendingSpacing   = 0; // original spacing diacritic (fallback)

// ── Single-writer output queue ──────────────────────────────────────────────
// All pipe writes go through ONE thread. The LL hook callback, the proctor
// thread, and the reader thread only ENQUEUE — they never WriteFile. This keeps
// JSON lines from interleaving and keeps the hook callback non-blocking.
static std::mutex              g_outMx;
static std::condition_variable g_outCv;
static std::deque<std::string> g_outQ;

static void enqueue(std::string line) {
    {
        std::lock_guard<std::mutex> lk(g_outMx);
        g_outQ.push_back(std::move(line));
    }
    g_outCv.notify_one();
}

// ── Metadata-only logging (NEVER characters) ────────────────────────────────
static void logmeta(const char* msg) {
    std::fprintf(stderr, "[helper] %s\n", msg);
    std::fflush(stderr);
}

// ── JSON helpers ────────────────────────────────────────────────────────────
// Escape a UTF-16 string into an ASCII-only JSON string body using \uXXXX for
// anything non-trivial. Output is always valid UTF-8 (pure ASCII).
static std::string jsonEscapeW(const wchar_t* s, int len) {
    std::string out;
    out.reserve(len * 6);
    char tmp[8];
    for (int i = 0; i < len; ++i) {
        wchar_t c = s[i];
        if (c == L'"')       out += "\\\"";
        else if (c == L'\\') out += "\\\\";
        else if (c >= 0x20 && c <= 0x7E) out += static_cast<char>(c);
        else {
            std::snprintf(tmp, sizeof(tmp), "\\u%04x", static_cast<unsigned>(c));
            out += tmp;
        }
    }
    return out;
}

// Modifier bit flags forwarded on nav/edit keys (must match CAPTURE_MOD_* in
// src/shared/types.ts): shift extends a selection, ctrl moves/deletes by word.
// NB: not MOD_SHIFT/MOD_CTRL — those are Win32 hotkey macros from winuser.h.
static const int CAP_MOD_SHIFT = 1;
static const int CAP_MOD_CTRL  = 2;

static void emitKeyMods(const char* kind, const wchar_t* chars, int charLen, int mods) {
    long long seq = g_seq.fetch_add(1);
    long long epoch = g_epoch.load();
    std::string line = "{\"type\":\"key\",\"payload\":{\"seq\":";
    line += std::to_string(seq);
    line += ",\"epoch\":";
    line += std::to_string(epoch);
    line += ",\"kind\":\"";
    line += kind;
    line += "\"";
    if (chars && charLen > 0) {
        line += ",\"char\":\"";
        line += jsonEscapeW(chars, charLen);
        line += "\"";
    }
    if (mods) {
        line += ",\"mods\":";
        line += std::to_string(mods);
    }
    line += "}}\n";
    enqueue(std::move(line));
}

static void emitKey(const char* kind, const wchar_t* chars, int charLen) {
    emitKeyMods(kind, chars, charLen, 0);
}

static void emitSimple(const char* type) {
    std::string line = "{\"type\":\"";
    line += type;
    line += "\"}\n";
    enqueue(std::move(line));
}

static void emitCaptureFailed(const char* reason) {
    std::string line = "{\"type\":\"capture_failed\",\"payload\":{\"reason\":\"";
    line += reason;
    line += "\"}}\n";
    enqueue(std::move(line));
}

// ── Dead-key spacing-diacritic → combining-mark map (Latin + EU scope) ───────
static wchar_t spacingToCombining(wchar_t c) {
    switch (c) {
        case 0x005E: return 0x0302; // ^  circumflex
        case 0x0060: return 0x0300; // `  grave
        case 0x00B4: return 0x0301; // ´  acute
        case 0x00A8: return 0x0308; // ¨  diaeresis/umlaut
        case 0x007E: return 0x0303; // ~  tilde
        case 0x00B0: return 0x030A; // °  ring
        case 0x02DA: return 0x030A; // ˚  ring above
        case 0x00B8: return 0x0327; // ¸  cedilla
        case 0x02C7: return 0x030C; // ˇ  caron
        case 0x02D8: return 0x0306; // ˘  breve
        case 0x02DD: return 0x030B; // ˝  double acute
        case 0x00AF: return 0x0304; // ¯  macron
        case 0x02C6: return 0x0302; // ˆ  modifier circumflex
        case 0x02DC: return 0x0303; // ˜  small tilde
        default:     return 0;
    }
}

// Compose base char(s) + pending combining mark via NormalizeString(NFC).
// Returns true and fills `out` with the composed result; false if no composition.
static bool composeDeadKey(const wchar_t* base, int baseLen, std::wstring& out) {
    if (g_pendingCombining == 0) return false;
    std::wstring src;
    src.append(base, baseLen);
    src.push_back(g_pendingCombining); // combining mark follows the base char
    int needed = NormalizeString(NormalizationC, src.c_str(), (int)src.size(), nullptr, 0);
    if (needed <= 0) return false;
    out.assign(needed, L'\0');
    int got = NormalizeString(NormalizationC, src.c_str(), (int)src.size(), &out[0], needed);
    if (got <= 0) return false;
    out.resize(got);
    return true;
}

// ── Modifier helpers ────────────────────────────────────────────────────────
static inline bool down(int vk) { return (g_keyState[vk] & 0x80) != 0; }

static void refreshAggregateModifiers() {
    g_keyState[VK_SHIFT]   = (down(VK_LSHIFT)   || down(VK_RSHIFT))   ? 0x80 : 0;
    g_keyState[VK_CONTROL] = (down(VK_LCONTROL) || down(VK_RCONTROL)) ? 0x80 : 0;
    g_keyState[VK_MENU]    = (down(VK_LMENU)    || down(VK_RMENU))    ? 0x80 : 0;
}

static bool isModifierVk(int vk) {
    switch (vk) {
        case VK_SHIFT: case VK_LSHIFT: case VK_RSHIFT:
        case VK_CONTROL: case VK_LCONTROL: case VK_RCONTROL:
        case VK_MENU: case VK_LMENU: case VK_RMENU:
        case VK_LWIN: case VK_RWIN: case VK_CAPITAL:
            return true;
        default: return false;
    }
}

// Nav/edit keys we capture as discrete events. Returns kind or nullptr.
static const char* navEditKind(int vk) {
    switch (vk) {
        case VK_BACK:   return "backspace";
        case VK_DELETE: return "delete";
        case VK_RETURN: return "enter";
        case VK_LEFT:   return "left";
        case VK_RIGHT:  return "right";
        case VK_HOME:   return "home";
        case VK_END:    return "end";
        default: return nullptr;
    }
}

// ── The low-level keyboard hook (runs on the hook thread) ────────────────────
//
//  CRITICAL: this callback must NOT block. It only updates state, translates,
//  enqueues, and returns. Blocking past LowLevelHooksTimeout (~300ms) makes
//  Windows silently uninstall the hook → keys would start leaking.
static LRESULT CALLBACK LowLevelKeyboardProc(int nCode, WPARAM wParam, LPARAM lParam) {
    if (nCode != HC_ACTION || !g_captureActive.load()) {
        return CallNextHookEx(g_hook, nCode, wParam, lParam);
    }

    const KBDLLHOOKSTRUCT* kb = reinterpret_cast<KBDLLHOOKSTRUCT*>(lParam);
    const DWORD vk = kb->vkCode;
    const bool isDown = (wParam == WM_KEYDOWN || wParam == WM_SYSKEYDOWN);
    const bool isUp   = (wParam == WM_KEYUP   || wParam == WM_SYSKEYUP);

    // 1. Maintain our own key state. Toggle CapsLock parity ONLY on the
    //    down-transition — auto-repeat sends repeated WM_KEYDOWN, but the OS
    //    toggles caps once per physical press; flipping on repeat would desync.
    if (vk < 256) {
        const bool wasDown = (g_keyState[vk] & 0x80) != 0;
        if (isDown) {
            if (vk == VK_CAPITAL && !wasDown) g_keyState[VK_CAPITAL] ^= 0x01;
            g_keyState[vk] |= 0x80;
        } else if (isUp) {
            g_keyState[vk] &= ~0x80;
        }
    }
    refreshAggregateModifiers();

    // 2. Key-up: mirror exactly what we did to the matching key-down. This keeps
    //    up/down symmetric — no orphaned up leaks to (and no up gets swallowed
    //    from) the foreground app, regardless of how the down was classified.
    if (isUp) {
        const bool suppressed = (vk < 256) && g_suppressedDown[vk];
        if (vk < 256) g_suppressedDown[vk] = false;
        return suppressed ? 1 : CallNextHookEx(g_hook, nCode, wParam, lParam);
    }

    // ── key-down only below ──
    auto passthrough = [&]() -> LRESULT {
        if (vk < 256) g_suppressedDown[vk] = false;
        return CallNextHookEx(g_hook, nCode, wParam, lParam);
    };
    auto suppress = [&]() -> LRESULT {
        if (vk < 256) g_suppressedDown[vk] = true;
        return 1;
    };

    // Modifiers always pass through.
    if (isModifierVk(vk)) return passthrough();

    // Chord context. AltGr = RMENU (which Windows pairs with LCTRL).
    const bool altGr   = down(VK_RMENU);
    const bool realCtrl = down(VK_RCONTROL) || (down(VK_LCONTROL) && !altGr);
    const bool winKey  = down(VK_LWIN) || down(VK_RWIN);
    const bool altReal = down(VK_LMENU);
    const bool shiftDown = down(VK_SHIFT);

    // Nav/edit keys (arrows, home/end, backspace/delete, enter) belong to the
    // InvisiQ input while capturing. Capture them WITH their shift/ctrl mods —
    // shift extends a selection, ctrl moves/deletes by word — so the renderer can
    // do full editing (select, bulk-delete, word ops). We still defer to the OS
    // for Alt/Win-chorded nav (Alt+Left = back, Win+Arrow = snap).
    if (const char* kind = navEditKind((int)vk)) {
        if (winKey || altReal || altGr) {
            return passthrough();
        }
        const int mods = (shiftDown ? CAP_MOD_SHIFT : 0) | (realCtrl ? CAP_MOD_CTRL : 0);
        emitKeyMods(kind, nullptr, 0, mods);
        return suppress();
    }

    // Pass through remaining OS/global chords (Ctrl+C/V/X/A/Z so the foreground
    // clipboard + our Ctrl+Shift+* globalShortcuts survive), plus Escape (lets the
    // hide-overlay hotkey fire) and Tab.
    if (winKey || realCtrl || altReal || vk == VK_ESCAPE || vk == VK_TAB) {
        return passthrough();
    }

    // Translate printable keys via ToUnicodeEx. Flag 0x4 = do NOT mutate the
    // shared per-HKL keyboard/dead-key state → the foreground app's own dead-key
    // composition is never corrupted.
    HWND fg = GetForegroundWindow();
    DWORD tid = fg ? GetWindowThreadProcessId(fg, nullptr) : 0;
    HKL hkl = GetKeyboardLayout(tid);
    wchar_t buf[8] = {0};
    int rc = ToUnicodeEx(vk, kb->scanCode, g_keyState, buf, 8, 0x4, hkl);

    if (rc == -1) {
        // Dead key: stash the combining mark; emit nothing; suppress.
        g_pendingSpacing = buf[0];
        g_pendingCombining = spacingToCombining(buf[0]);
        return suppress();
    }
    if (rc >= 1) {
        if (g_pendingCombining != 0 || g_pendingSpacing != 0) {
            std::wstring composed;
            if (composeDeadKey(buf, rc, composed) &&
                composed.size() < (size_t)rc + 1 /*actually composed*/) {
                emitKey("char", composed.c_str(), (int)composed.size());
            } else {
                // Could not compose → emit the spacing diacritic, then base.
                if (g_pendingSpacing) emitKey("char", &g_pendingSpacing, 1);
                emitKey("char", buf, rc);
            }
            g_pendingCombining = 0;
            g_pendingSpacing = 0;
        } else {
            emitKey("char", buf, rc);
        }
        return suppress();
    }
    // rc == 0: no character (F-keys, Insert, PgUp/Dn, etc.) → pass through.
    return passthrough();
}

// ── Hook install / uninstall (MUST run on the hook thread) ───────────────────
static void installHook(long long epoch) {
    if (g_hook) return;
    // Reset translation state for a clean session.
    ZeroMemory(g_keyState, sizeof(g_keyState));
    ZeroMemory(g_suppressedDown, sizeof(g_suppressedDown));
    g_keyState[VK_CAPITAL] = (GetKeyState(VK_CAPITAL) & 1) ? 0x01 : 0x00;
    g_pendingCombining = 0;
    g_pendingSpacing = 0;
    g_seq.store(0);
    g_epoch.store(epoch);

    g_hook = SetWindowsHookExW(WH_KEYBOARD_LL, LowLevelKeyboardProc, GetModuleHandleW(nullptr), 0);
    if (g_hook) {
        g_captureActive.store(true);
        logmeta("hook installed");
        emitSimple("ack");
    } else {
        logmeta("hook install FAILED");
        emitCaptureFailed("hook-unavailable");
    }
}

static void uninstallHook() {
    if (!g_hook) return;
    UnhookWindowsHookEx(g_hook);
    g_hook = nullptr;
    g_captureActive.store(false);
    g_pendingCombining = 0;
    g_pendingSpacing = 0;
    logmeta("hook uninstalled");
}

// ── Message-only window proc (hook thread) ───────────────────────────────────
static LRESULT CALLBACK MsgWndProc(HWND hWnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_APP_SETCAPTURE:
            if (wParam) installHook((long long)lParam);
            else        uninstallHook();
            return 0;
        case WM_APP_SHUTDOWN:
            uninstallHook();
            PostQuitMessage(0);
            return 0;
        case WM_WTSSESSION_CHANGE:
            // Secure desktop / lock screen deliver no input to LL hooks. Force
            // capture off on lock so we never strand the user mid-session.
            if (wParam == WTS_SESSION_LOCK && g_captureActive.load()) {
                uninstallHook();
                emitCaptureFailed("session-locked");
            }
            return 0;
        default:
            return DefWindowProcW(hWnd, msg, wParam, lParam);
    }
}

// ── Hook thread: owns the message-only window, WTS registration, and the hook ─
static void hookThreadMain() {
    const wchar_t* cls = L"InvisiQHelperMsgWnd";
    WNDCLASSW wc = {};
    wc.lpfnWndProc = MsgWndProc;
    wc.hInstance = GetModuleHandleW(nullptr);
    wc.lpszClassName = cls;
    RegisterClassW(&wc);

    g_msgWindow = CreateWindowExW(0, cls, L"", 0, 0, 0, 0, 0,
                                  HWND_MESSAGE, nullptr, wc.hInstance, nullptr);
    if (!g_msgWindow) {
        logmeta("message window creation failed");
        return;
    }
    WTSRegisterSessionNotification(g_msgWindow, NOTIFY_FOR_THIS_SESSION);

    MSG msg;
    while (GetMessageW(&msg, nullptr, 0, 0) > 0) {
        TranslateMessage(&msg);
        DispatchMessageW(&msg);
    }

    WTSUnRegisterSessionNotification(g_msgWindow);
    uninstallHook();
}

// ── Overlapped pipe I/O ──────────────────────────────────────────────────────
// The pipe is opened FILE_FLAG_OVERLAPPED so the reader thread's blocking read
// and the writer thread's writes proceed CONCURRENTLY on the same handle. With a
// synchronous handle they serialize → a blocked ReadFile holds the handle and
// outgoing messages (e.g. the initial 'ready') never send — a duplex deadlock.
static bool pipeWrite(HANDLE h, const char* data, DWORD len) {
    OVERLAPPED ov{};
    ov.hEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    if (!ov.hEvent) return false;
    DWORD written = 0;
    BOOL r = WriteFile(h, data, len, nullptr, &ov);
    if (!r && GetLastError() == ERROR_IO_PENDING) {
        WaitForSingleObject(ov.hEvent, INFINITE);
        r = GetOverlappedResult(h, &ov, &written, FALSE);
    } else if (r) {
        GetOverlappedResult(h, &ov, &written, FALSE);
    }
    CloseHandle(ov.hEvent);
    return r != 0;
}

static int pipeRead(HANDLE h, char* buf, DWORD cap) {
    OVERLAPPED ov{};
    ov.hEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    if (!ov.hEvent) return -1;
    DWORD got = 0;
    BOOL r = ReadFile(h, buf, cap, nullptr, &ov);
    if (!r && GetLastError() == ERROR_IO_PENDING) {
        WaitForSingleObject(ov.hEvent, INFINITE);
        r = GetOverlappedResult(h, &ov, &got, FALSE);
    } else if (r) {
        GetOverlappedResult(h, &ov, &got, FALSE);
    }
    CloseHandle(ov.hEvent);
    return r ? (int)got : -1;
}

// ── Writer thread: the ONLY thread that calls WriteFile on the pipe ──────────
static void writerThreadMain() {
    while (g_running.load()) {
        std::string line;
        {
            std::unique_lock<std::mutex> lk(g_outMx);
            g_outCv.wait(lk, [] { return !g_outQ.empty() || !g_running.load(); });
            if (!g_running.load() && g_outQ.empty()) break;
            line = std::move(g_outQ.front());
            g_outQ.pop_front();
        }
        if (g_pipe == INVALID_HANDLE_VALUE) continue;
        if (!pipeWrite(g_pipe, line.data(), (DWORD)line.size())) {
            logmeta("pipe write failed — client gone");
            g_running.store(false);
            break;
        }
    }
}

// ── Proctor detection thread (confirmation only, ~1.5s cadence) ──────────────
static const wchar_t* kProctorProcSubstrings[] = {
    L"msb",            // Mettl Secure Browser
    L"mettl",
    L"lockdownbrowser",// Respondus
    L"proctoru",
    L"proctorio",
    L"honorlock",
    L"examroot",
    L"safeexambrowser",
};
static const wchar_t* kProctorWindowClasses[] = {
    L"MsbWindowCef",   // Mettl Secure Browser main window class
};

static bool icontains(const std::wstring& hay, const wchar_t* needle) {
    std::wstring h = hay, n = needle;
    for (auto& c : h) c = (wchar_t)towlower(c);
    return h.find(n) != std::wstring::npos;
}

struct EnumCtx { std::set<std::wstring>* found; };
static BOOL CALLBACK enumWndProc(HWND hWnd, LPARAM lp) {
    wchar_t cls[256] = {0};
    if (GetClassNameW(hWnd, cls, 256) > 0) {
        for (const wchar_t* pc : kProctorWindowClasses) {
            if (_wcsicmp(cls, pc) == 0) {
                reinterpret_cast<EnumCtx*>(lp)->found->insert(pc);
            }
        }
    }
    return TRUE;
}

static void proctorThreadMain() {
    std::set<std::wstring> last;
    while (g_running.load()) {
        std::set<std::wstring> found;

        HANDLE snap = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (snap != INVALID_HANDLE_VALUE) {
            PROCESSENTRY32W pe = {}; pe.dwSize = sizeof(pe);
            if (Process32FirstW(snap, &pe)) {
                do {
                    std::wstring name = pe.szExeFile;
                    for (const wchar_t* sub : kProctorProcSubstrings) {
                        if (icontains(name, sub)) { found.insert(name); break; }
                    }
                } while (Process32NextW(snap, &pe));
            }
            CloseHandle(snap);
        }
        EnumCtx ctx{&found};
        EnumWindows(enumWndProc, reinterpret_cast<LPARAM>(&ctx));

        if (found != last) {
            last = found;
            std::string line = "{\"type\":\"proctor\",\"payload\":{\"detected\":";
            line += (found.empty() ? "false" : "true");
            line += ",\"names\":[";
            bool first = true;
            for (const auto& n : found) {
                if (!first) line += ",";
                first = false;
                line += "\"";
                line += jsonEscapeW(n.c_str(), (int)n.size());
                line += "\"";
            }
            line += "]}}\n";
            enqueue(std::move(line));
        }

        for (int i = 0; i < 15 && g_running.load(); ++i)
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
    }
}

// ── Parent-death watchdog: parent dies → we exit → OS removes the LL hook ────
static void watchdogThreadMain(DWORD parentPid) {
    if (parentPid == 0) return;
    HANDLE parent = OpenProcess(SYNCHRONIZE, FALSE, parentPid);
    if (!parent) return;
    WaitForSingleObject(parent, INFINITE);
    CloseHandle(parent);
    logmeta("parent exited — shutting down");
    g_running.store(false);
    if (g_msgWindow) PostMessageW(g_msgWindow, WM_APP_SHUTDOWN, 0, 0);
    g_outCv.notify_all();
    // Give cleanup a brief moment, then guarantee exit (process death removes the hook).
    std::this_thread::sleep_for(std::chrono::milliseconds(200));
    ExitProcess(0);
}

// ── Pipe DACL: grant ONLY the current user (deny everyone else) ──────────────
static PSECURITY_DESCRIPTOR buildUserOnlySD() {
    HANDLE tok = nullptr;
    if (!OpenProcessToken(GetCurrentProcess(), TOKEN_QUERY, &tok)) return nullptr;
    DWORD len = 0;
    GetTokenInformation(tok, TokenUser, nullptr, 0, &len);
    std::vector<BYTE> buf(len);
    PSECURITY_DESCRIPTOR sd = nullptr;
    if (GetTokenInformation(tok, TokenUser, buf.data(), len, &len)) {
        TOKEN_USER* tu = reinterpret_cast<TOKEN_USER*>(buf.data());
        LPWSTR sidStr = nullptr;
        if (ConvertSidToStringSidW(tu->User.Sid, &sidStr)) {
            // Grant generic-all to the current user only.
            std::wstring sddl = L"D:(A;;GA;;;";
            sddl += sidStr;
            sddl += L")";
            ConvertStringSecurityDescriptorToSecurityDescriptorW(
                sddl.c_str(), SDDL_REVISION_1, &sd, nullptr);
            LocalFree(sidStr);
        }
    }
    CloseHandle(tok);
    return sd;
}

// ── Minimal JSON field extraction for our small, controlled command set ──────
static std::string extractType(const std::string& line) {
    auto p = line.find("\"type\"");
    if (p == std::string::npos) return "";
    p = line.find('"', p + 6);
    if (p == std::string::npos) return "";
    auto q = line.find('"', p + 1);
    if (q == std::string::npos) return "";
    return line.substr(p + 1, q - p - 1);
}
static bool extractBool(const std::string& line, const char* key, bool def) {
    auto p = line.find(key);
    if (p == std::string::npos) return def;
    auto t = line.find("true", p);
    auto f = line.find("false", p);
    if (t != std::string::npos && (f == std::string::npos || t < f)) return true;
    if (f != std::string::npos) return false;
    return def;
}
static long long extractInt(const std::string& line, const char* key, long long def) {
    auto p = line.find(key);
    if (p == std::string::npos) return def;
    p += std::char_traits<char>::length(key);
    while (p < line.size() && (line[p] == '"' || line[p] == ':' || line[p] == ' ')) ++p;
    long long v = 0; bool any = false;
    while (p < line.size() && line[p] >= '0' && line[p] <= '9') { v = v * 10 + (line[p] - '0'); ++p; any = true; }
    return any ? v : def;
}

static void dispatchCommand(const std::string& line) {
    std::string type = extractType(line);
    if (type == "set_capture") {
        bool active = extractBool(line, "\"active\"", false);
        long long epoch = extractInt(line, "\"epoch\"", g_epoch.load());
        // If the hook/UI thread never created its message window, set_capture
        // would silently no-op (PostMessage to NULL goes nowhere useful) — surface
        // it so the controller degrades instead of leaving a dead textarea.
        if (!g_msgWindow) {
            if (active) emitCaptureFailed("hook-unavailable");
            return;
        }
        PostMessageW(g_msgWindow, WM_APP_SETCAPTURE, active ? 1 : 0, (LPARAM)epoch);
    } else if (type == "ping") {
        emitSimple("pong");
    } else if (type == "get_status") {
        std::string s = "{\"type\":\"status\",\"payload\":{\"capturing\":";
        s += g_captureActive.load() ? "true" : "false";
        s += "}}\n";
        enqueue(std::move(s));
    } else if (type == "shutdown") {
        g_running.store(false);
        if (g_msgWindow) PostMessageW(g_msgWindow, WM_APP_SHUTDOWN, 0, 0);
        g_outCv.notify_all();
    }
}

// ── main ─────────────────────────────────────────────────────────────────────
int wmain(int argc, wchar_t** argv) {
    std::wstring pipeName = (argc > 1) ? argv[1] : L"InvisiQ";
    DWORD parentPid = (argc > 2) ? (DWORD)_wtoi(argv[2]) : 0;

    std::wstring pipePath = L"\\\\.\\pipe\\" + pipeName;

    PSECURITY_DESCRIPTOR sd = buildUserOnlySD();
    SECURITY_ATTRIBUTES sa = {};
    sa.nLength = sizeof(sa);
    sa.lpSecurityDescriptor = sd; // null → default (still fine, but we prefer user-only)
    sa.bInheritHandle = FALSE;

    g_pipe = CreateNamedPipeW(
        pipePath.c_str(),
        PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED,
        PIPE_TYPE_BYTE | PIPE_READMODE_BYTE | PIPE_WAIT | PIPE_REJECT_REMOTE_CLIENTS,
        1, 64 * 1024, 64 * 1024, 0, &sa);

    if (g_pipe == INVALID_HANDLE_VALUE) {
        logmeta("CreateNamedPipe failed");
        if (sd) LocalFree(sd);
        return 1;
    }

    // Pipe exists → the client can connect now. (Replaces the fixed 500ms wait.)
    std::printf("READY\n");
    std::fflush(stdout);

    // Start the hook/UI thread first so PostMessage targets are valid. It does
    // not write to the pipe until a key is captured (only after set_capture,
    // which arrives after the client connects).
    std::thread hookThread(hookThreadMain);
    for (int i = 0; i < 50 && !g_msgWindow; ++i)
        std::this_thread::sleep_for(std::chrono::milliseconds(10));

    std::thread watchdog;
    if (parentPid) watchdog = std::thread(watchdogThreadMain, parentPid);

    // Threads that WRITE to the pipe must not start until a client is connected,
    // otherwise an early WriteFile on an unconnected server pipe would fail and
    // prematurely shut us down.
    std::thread writerThread;
    std::thread proctorThread;

    // Block until the client (Electron main) connects. Overlapped pipe → use an
    // OVERLAPPED for ConnectNamedPipe (it returns 0/ERROR_IO_PENDING when async).
    OVERLAPPED cov{};
    cov.hEvent = CreateEventW(nullptr, TRUE, FALSE, nullptr);
    BOOL connected = ConnectNamedPipe(g_pipe, &cov);
    DWORD cerr = GetLastError();
    if (!connected) {
        if (cerr == ERROR_PIPE_CONNECTED) {
            connected = TRUE; // client connected between CreateNamedPipe and here
        } else if (cerr == ERROR_IO_PENDING) {
            WaitForSingleObject(cov.hEvent, INFINITE);
            DWORD unused = 0;
            connected = GetOverlappedResult(g_pipe, &cov, &unused, FALSE);
        }
    }
    if (cov.hEvent) CloseHandle(cov.hEvent);

    if (connected) {
        writerThread = std::thread(writerThreadMain);
        proctorThread = std::thread(proctorThreadMain);
        emitSimple("ready");
        logmeta("client connected");

        // Command read loop (this thread is the single reader; overlapped reads
        // run concurrently with the writer thread's overlapped writes).
        std::string acc;
        char rbuf[4096];
        while (g_running.load()) {
            int got = pipeRead(g_pipe, rbuf, sizeof(rbuf));
            if (got <= 0) break; // pipe closed / error
            acc.append(rbuf, (size_t)got);
            size_t nl;
            while ((nl = acc.find('\n')) != std::string::npos) {
                std::string line = acc.substr(0, nl);
                acc.erase(0, nl + 1);
                if (!line.empty()) dispatchCommand(line);
            }
        }
    }

    // Pipe dropped or shutdown — tear everything down. Process exit guarantees
    // the LL hook is removed even if a thread is wedged.
    logmeta("read loop ended — shutting down");
    g_running.store(false);
    if (g_msgWindow) PostMessageW(g_msgWindow, WM_APP_SHUTDOWN, 0, 0);
    g_outCv.notify_all();

    if (hookThread.joinable())   hookThread.join();
    if (writerThread.joinable()) writerThread.join();
    if (proctorThread.joinable())proctorThread.join();
    if (watchdog.joinable())     watchdog.detach(); // may be blocked on parent

    if (g_pipe != INVALID_HANDLE_VALUE) {
        DisconnectNamedPipe(g_pipe);
        CloseHandle(g_pipe);
    }
    if (sd) LocalFree(sd);
    return 0;
}
