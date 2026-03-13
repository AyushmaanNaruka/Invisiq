#include <windows.h>
#include <string>
#include <iostream>
#include <nlohmann/json.hpp>

using json = nlohmann::json;

#define PIPE_NAME TEXT("\\\\.\\pipe\\GhostAI")

// Manual map DLL injection (simplified)
bool InjectDLL(DWORD pid, const std::string &dllPath)
{
    HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);
    if (!hProcess)
        return false;

    size_t pathLen = dllPath.size() + 1;
    LPVOID pRemote = VirtualAllocEx(hProcess, NULL, pathLen, MEM_COMMIT | MEM_RESERVE, PAGE_READWRITE);
    if (!pRemote)
    {
        CloseHandle(hProcess);
        return false;
    }

    WriteProcessMemory(hProcess, pRemote, dllPath.c_str(), pathLen, NULL);
    HMODULE hKernel32 = GetModuleHandleA("kernel32.dll");
    FARPROC pLoadLibraryA = GetProcAddress(hKernel32, "LoadLibraryA");
    HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)pLoadLibraryA, pRemote, 0, NULL);
    if (!hThread)
    {
        VirtualFreeEx(hProcess, pRemote, 0, MEM_RELEASE);
        CloseHandle(hProcess);
        return false;
    }

    WaitForSingleObject(hThread, INFINITE);
    VirtualFreeEx(hProcess, pRemote, 0, MEM_RELEASE);
    CloseHandle(hThread);
    CloseHandle(hProcess);
    return true;
}

// Launch browser and return PID
DWORD LaunchBrowser()
{
    STARTUPINFOA si = {sizeof(si)};
    PROCESS_INFORMATION pi = {};
    std::string cmd = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe --new-window";
    if (CreateProcessA(NULL, &cmd[0], NULL, NULL, FALSE, 0, NULL, NULL, &si, &pi))
    {
        CloseHandle(pi.hThread);
        DWORD pid = pi.dwProcessId;
        CloseHandle(pi.hProcess);
        return pid;
    }
    return 0;
}

// Named pipe server loop
void RunPipeServer()
{
    HANDLE hPipe = CreateNamedPipe(PIPE_NAME, PIPE_ACCESS_DUPLEX,
                                   PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
                                   1, 512, 512, 0, NULL);

    if (hPipe == INVALID_HANDLE_VALUE)
    {
        std::cerr << "CreateNamedPipe failed, error " << GetLastError() << std::endl;
        return;
    }

    while (true)
    {
        if (ConnectNamedPipe(hPipe, NULL) || GetLastError() == ERROR_PIPE_CONNECTED)
        {
            char buffer[512] = {};
            DWORD bytesRead;
            if (ReadFile(hPipe, buffer, sizeof(buffer) - 1, &bytesRead, NULL))
            {
                buffer[bytesRead] = '\0';
                try
                {
                    json cmd = json::parse(buffer);
                    std::string action = cmd["command"];
                    json response;

                    if (action == "start_overlay")
                    {
                        DWORD pid = LaunchBrowser();
                        if (pid)
                        {
                            Sleep(1500); // Let browser start
                            std::string dllPath = "resources\\ghostai_core.dll";
                            bool ok = InjectDLL(pid, dllPath);
                            response["status"] = ok ? "injected" : "injection_failed";
                            response["pid"] = pid;
                        }
                        else
                        {
                            response["status"] = "launch_failed";
                        }
                    }
                    else if (action == "hide_overlay")
                    {
                        response["status"] = "not_implemented";
                    }
                    else if (action == "get_status")
                    {
                        response["status"] = "running";
                    }
                    else
                    {
                        response["status"] = "unknown_command";
                    }

                    std::string respStr = response.dump();
                    DWORD bytesWritten;
                    WriteFile(hPipe, respStr.c_str(), (DWORD)respStr.size(), &bytesWritten, NULL);
                }
                catch (...)
                {
                    const char *err = "{\"status\":\"parse_error\"}";
                    DWORD bytesWritten;
                    WriteFile(hPipe, err, (DWORD)strlen(err), &bytesWritten, NULL);
                }
            }
            DisconnectNamedPipe(hPipe);
        }
    }
    CloseHandle(hPipe);
}

int main()
{
    RunPipeServer();
    return 0;
}