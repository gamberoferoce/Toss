namespace TossHost;

static class Program
{
    [STAThread]
    static void Main()
    {
        if (!SingleInstance.TryAcquire()) return;

        ApplicationConfiguration.Initialize();
        Application.Run(new MainForm());
    }
}
