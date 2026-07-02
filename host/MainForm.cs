using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace TossHost;

sealed class MainForm : Form
{
    static readonly int[] Ports = [3000, 3001, 3002, 3003];

    readonly WebView2 _web = new() { Dock = DockStyle.Fill };
    Process? _server;
    bool _startedServer;
    int _port;

    public MainForm()
    {
        Text = "Toss";
        FormBorderStyle = FormBorderStyle.None;
        MinimumSize = new Size(960, 640);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        BackColor = Color.FromArgb(5, 5, 8);
        _web.DefaultBackgroundColor = Color.FromArgb(255, 5, 5, 8);
        Controls.Add(_web);

        Load += OnLoadAsync;
        FormClosed += OnClosed;
    }

    async void OnLoadAsync(object? sender, EventArgs e)
    {
        try
        {
            await InitWebViewAsync();
            _web.CoreWebView2.NavigateToString(SplashHtml.Value);
            await EnsureServerAsync();
            _web.Source = new Uri($"http://127.0.0.1:{_port}/receiver/");
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                ex.Message,
                "Toss",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    void OnClosed(object? sender, FormClosedEventArgs e)
    {
        if (!_startedServer || _server is null || _server.HasExited) return;
        try
        {
            _server.Kill(entireProcessTree: true);
        }
        catch
        {
            /* ponytail: best-effort shutdown */
        }
    }

    async Task EnsureServerAsync()
    {
        var serverExe = Path.Combine(AppContext.BaseDirectory, "TossServer.exe");
        if (!File.Exists(serverExe))
        {
            throw new FileNotFoundException(
                "TossServer.exe not found next to Toss.exe.\nRe-extract the full zip.");
        }

        KillSiblingServers(serverExe);
        await Task.Delay(300);

        var psi = new ProcessStartInfo
        {
            FileName = serverExe,
            WorkingDirectory = AppContext.BaseDirectory,
            UseShellExecute = false,
            CreateNoWindow = true,
            WindowStyle = ProcessWindowStyle.Hidden,
        };
        psi.Environment["FILESHARING_OPEN"] = "0";
        psi.Environment["FILESHARING_SERVER_ONLY"] = "1";

        _server = Process.Start(psi)
            ?? throw new InvalidOperationException("Could not start TossServer.exe.");
        _startedServer = true;

        _port = await WaitForServerAsync(TimeSpan.FromSeconds(30));
        if (_port <= 0)
        {
            throw new TimeoutException("Toss server did not start in time.");
        }
    }

    static void KillSiblingServers(string serverExe)
    {
        foreach (var proc in Process.GetProcessesByName("TossServer"))
        {
            try
            {
                if (proc.HasExited) continue;
                var path = proc.MainModule?.FileName;
                if (path is null
                    || !path.Equals(serverExe, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
                proc.Kill(entireProcessTree: true);
            }
            catch
            {
                /* ponytail: best-effort cleanup of stale server */
            }
        }
    }

    async Task InitWebViewAsync()
    {
        var dataDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "Toss",
            "WebView2");
        Directory.CreateDirectory(dataDir);

        var env = await CoreWebView2Environment.CreateAsync(null, dataDir);
        await _web.EnsureCoreWebView2Async(env);

        var settings = _web.CoreWebView2.Settings;
        settings.AreDefaultContextMenusEnabled = false;
        settings.AreDevToolsEnabled = false;
        settings.IsStatusBarEnabled = false;
        settings.IsZoomControlEnabled = false;
        settings.IsWebMessageEnabled = true;

        _web.CoreWebView2.WebMessageReceived += (_, args) =>
        {
            if (args.TryGetWebMessageAsString() == "close")
            {
                BeginInvoke(Close);
            }
        };

        _web.CoreWebView2.NavigationStarting += (_, args) =>
        {
            if (!args.Uri.StartsWith("http://127.0.0.1:", StringComparison.OrdinalIgnoreCase)
                && !args.Uri.StartsWith("http://localhost:", StringComparison.OrdinalIgnoreCase))
            {
                args.Cancel = true;
            }
        };
    }

    static async Task<int> ProbeServerAsync()
    {
        var fromFile = ReadPortFile();
        if (fromFile > 0 && await PingAsync(fromFile)) return fromFile;

        foreach (var port in Ports)
        {
            if (await PingAsync(port)) return port;
        }

        return 0;
    }

    static async Task<int> WaitForServerAsync(TimeSpan timeout)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            var port = await ProbeServerAsync();
            if (port > 0) return port;
            await Task.Delay(250);
        }

        return 0;
    }

    static int ReadPortFile()
    {
        try
        {
            var path = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),
                "Toss",
                "port.txt");
            if (!File.Exists(path)) return 0;
            return int.TryParse(File.ReadAllText(path).Trim(), out var port) ? port : 0;
        }
        catch
        {
            return 0;
        }
    }

    static async Task<bool> PingAsync(int port)
    {
        try
        {
            using var client = new HttpClient { Timeout = TimeSpan.FromMilliseconds(800) };
            using var res = await client.GetAsync($"http://127.0.0.1:{port}/api/ping");
            return res.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }
}
