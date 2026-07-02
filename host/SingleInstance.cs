using System.Diagnostics;
using System.Runtime.InteropServices;

namespace TossHost;

static class SingleInstance
{
    const int SwRestore = 9;
    static Mutex? _mutex;

    [DllImport("user32.dll")]
    static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    public static bool TryAcquire()
    {
        _mutex = new Mutex(true, @"Local\Toss.SingleInstance", out var created);
        if (created) return true;

        ActivateExisting();
        return false;
    }

    static void ActivateExisting()
    {
        var self = Process.GetCurrentProcess();
        foreach (var proc in Process.GetProcessesByName(self.ProcessName))
        {
            if (proc.Id == self.Id) continue;
            var handle = proc.MainWindowHandle;
            if (handle == IntPtr.Zero) continue;
            ShowWindow(handle, SwRestore);
            SetForegroundWindow(handle);
            return;
        }
    }
}
