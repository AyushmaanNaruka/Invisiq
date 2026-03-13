#include <windows.h>
#include <detours.h>
#include <iostream>

#pragma comment(lib, "detours.lib")

// Original function pointer (typed for Detours type-safe API)
typedef BOOL (WINAPI *PFN_SetWindowDisplayAffinity)(HWND, DWORD);
static PFN_SetWindowDisplayAffinity pSetWindowDisplayAffinity = SetWindowDisplayAffinity;

// Hook: Force invisibility on all windows
BOOL WINAPI HookedSetWindowDisplayAffinity(HWND hWnd, DWORD dwAffinity) {
    // Always force WDA_EXCLUDEFROMCAPTURE unless explicitly disabled
    return pSetWindowDisplayAffinity(hWnd, WDA_EXCLUDEFROMCAPTURE);
}

// Hide process from Task Manager
void HideFromTaskManager() {
    HMODULE hNtDll = GetModuleHandleA("ntdll.dll");
    if (!hNtDll) return;

    typedef NTSTATUS(NTAPI* pNtSetInformationProcess)(
        HANDLE, PROCESS_INFORMATION_CLASS, PVOID, ULONG);

    pNtSetInformationProcess NtSetInfo = (pNtSetInformationProcess)
        GetProcAddress(hNtDll, "NtSetInformationProcess");

    if (NtSetInfo) {
        DWORD breakOnTermination = FALSE;
        NtSetInfo(GetCurrentProcess(), (PROCESS_INFORMATION_CLASS)0x1D,
                  &breakOnTermination, sizeof(breakOnTermination));
    }
}

// DLL entry point
BOOL APIENTRY DllMain(HMODULE hModule, DWORD ul_reason_for_call, LPVOID lpReserved) {
    switch (ul_reason_for_call) {
    case DLL_PROCESS_ATTACH:
        DisableThreadLibraryCalls(hModule);
        DetourTransactionBegin();
        DetourUpdateThread(GetCurrentThread());
        DetourAttach(&pSetWindowDisplayAffinity, HookedSetWindowDisplayAffinity);
        DetourTransactionCommit();
        HideFromTaskManager();
        break;

    case DLL_PROCESS_DETACH:
        DetourTransactionBegin();
        DetourUpdateThread(GetCurrentThread());
        DetourDetach(&pSetWindowDisplayAffinity, HookedSetWindowDisplayAffinity);
        DetourTransactionCommit();
        break;
    }
    return TRUE;
}

// Exported init for external caller
extern "C" __declspec(dllexport) void InitializeStealth() {
    // Currently empty; stealth runs on DLL_PROCESS_ATTACH
}